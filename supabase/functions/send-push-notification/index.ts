// Supabase Edge Function: send-push-notification
// Triggered by Database Webhook on INSERT to notifications table
// Sends Web Push to all subscribed devices for the target user

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// =============================================
// Web Push VAPID signing utilities (Deno-native)
// =============================================

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i)
  }
  return arr
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = ''
  for (const byte of arr) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generateVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
) {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  }

  const encoder = new TextEncoder()
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKeyBytes = base64UrlToUint8Array(privateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // Try JWK format for raw private key
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: privateKey,
      x: publicKey.substring(0, 43),
      y: publicKey.substring(43),
    }
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  })

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      encoder.encode(unsignedToken)
    )
  )

  const signatureB64 = uint8ArrayToBase64Url(signature)
  return `${unsignedToken}.${signatureB64}`
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
) {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`

  // Encode payload
  const encoder = new TextEncoder()
  const payloadBytes = encoder.encode(payload)

  // Generate encryption keys
  const localKey = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKey.publicKey)
  )

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    base64UrlToUint8Array(subscription.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subscriberKey },
      localKey.privateKey,
      256
    )
  )

  const authBytes = base64UrlToUint8Array(subscription.auth)

  // HKDF-based key derivation for push encryption (RFC 8291)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Simplified: Use raw payload for now, real implementation needs aes128gcm
  // For production, use a proper web-push library
  // This is a simplified version that sends the push with proper VAPID auth

  const jwt = await generateVapidAuthHeader(
    audience,
    'mailto:admin@jokihub.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: payloadBytes,
  })

  return response
}

// =============================================
// Main handler
// =============================================

serve(async (req) => {
  try {
    const { record } = await req.json()

    if (!record || !record.user_id) {
      return new Response(JSON.stringify({ error: 'No notification record' }), { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', record.user_id)

    if (error || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', count: 0 }),
        { status: 200 }
      )
    }

    const payload = JSON.stringify({
      title: record.title,
      body: record.body,
      url: getNotificationUrl(record),
      tag: record.type,
      notificationId: record.id,
    })

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        )

        if (response.status === 201 || response.status === 200) {
          sent++
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          failed++
        } else {
          console.error(`Push failed with status ${response.status}`)
          failed++
        }
      } catch (err) {
        console.error('Push send error:', err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

function getNotificationUrl(notification: { type: string; data: Record<string, unknown> }) {
  const data = notification.data || {}
  switch (notification.type) {
    case 'new_order':
      return '/admin/orders'
    case 'order_status':
    case 'payment_update':
      return data.order_id ? `/order/${data.order_id}` : '/pesanan-saya'
    case 'custom_request':
      return data.order_id ? `/order/${data.order_id}` : '/pesanan-saya'
    default:
      return '/'
  }
}
