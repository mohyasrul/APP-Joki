// Supabase Edge Function: send-push-notification
// Triggered by Database Webhook on INSERT to notifications table
// Sends Web Push to all subscribed devices for the target user
// Implements RFC 8292 (VAPID) + RFC 8291 (aes128gcm encryption)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// =============================================
// Base64 URL utilities
// =============================================

function b64url_decode(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(b64 + pad)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function b64url_encode(arr: Uint8Array): string {
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0)
  const result = new Uint8Array(len)
  let offset = 0
  for (const a of arrays) { result.set(a, offset); offset += a.length }
  return result
}

// =============================================
// VAPID JWT (RFC 8292) — ES256
// =============================================

async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: 'mailto:admin@jokihub.com',
  }

  const enc = new TextEncoder()
  const headerB64 = b64url_encode(enc.encode(JSON.stringify(header)))
  const claimsB64 = b64url_encode(enc.encode(JSON.stringify(claims)))
  const unsignedToken = `${headerB64}.${claimsB64}`

  // Import VAPID private key as JWK
  // VAPID keys from web-push are raw 32-byte (d) and 65-byte uncompressed (pub)
  const pubBytes = b64url_decode(VAPID_PUBLIC_KEY) // 65 bytes: 0x04 || x(32) || y(32)
  const x = b64url_encode(pubBytes.slice(1, 33))
  const y = b64url_encode(pubBytes.slice(33, 65))

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: VAPID_PRIVATE_KEY,
    x,
    y,
  }

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      enc.encode(unsignedToken)
    )
  )

  return `${unsignedToken}.${b64url_encode(sig)}`
}

// =============================================
// HKDF helper (RFC 5869)
// =============================================

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  )
  return new Uint8Array(bits)
}

// =============================================
// RFC 8291 aes128gcm encryption
// =============================================

async function encryptPayload(
  plaintext: Uint8Array,
  subscriberPubKeyB64: string,
  authSecretB64: string
): Promise<{ encrypted: Uint8Array; serverPubKey: Uint8Array; salt: Uint8Array }> {
  const enc = new TextEncoder()

  // 1. Decode subscriber keys
  const subscriberPubKeyRaw = b64url_decode(subscriberPubKeyB64) // 65 bytes uncompressed P-256
  const authSecret = b64url_decode(authSecretB64) // 16 bytes

  // 2. Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const serverPubKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  ) // 65 bytes

  // 3. Import subscriber public key for ECDH
  const subscriberPubKey = await crypto.subtle.importKey(
    'raw',
    subscriberPubKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // 4. ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subscriberPubKey },
      serverKeyPair.privateKey,
      256
    )
  ) // 32 bytes

  // 5. HKDF extract+expand: IKM from shared secret, salt = auth_secret
  //    info = "WebPush: info\0" || subscriber_pub(65) || server_pub(65)
  const ikm_info = concat(
    enc.encode('WebPush: info\0'),
    subscriberPubKeyRaw,
    serverPubKeyRaw
  )
  const ikm = await hkdf(authSecret, sharedSecret, ikm_info, 32)

  // 6. Random 16-byte salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // 7. Derive Content Encryption Key (16 bytes) and Nonce (12 bytes)
  const cek_info = concat(enc.encode('Content-Encoding: aes128gcm\0'))
  const nonce_info = concat(enc.encode('Content-Encoding: nonce\0'))

  const cek = await hkdf(salt, ikm, cek_info, 16) // AES-128 key
  const nonce = await hkdf(salt, ikm, nonce_info, 12) // 96-bit nonce

  // 8. Pad plaintext: plaintext || 0x02 (delimiter) || zero padding
  //    Record size = 4096, but we just need to add the delimiter
  const padded = concat(plaintext, new Uint8Array([2]))

  // 9. AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      padded
    )
  )

  // 10. Build aes128gcm body:
  //     salt(16) || rs(4, big-endian) || idlen(1) || keyid(65=server_pub) || ciphertext
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false) // record size = 4096, big-endian

  const idlen = new Uint8Array([65]) // length of server public key

  const encrypted = concat(salt, rs, idlen, serverPubKeyRaw, ciphertext)

  return { encrypted, serverPubKey: serverPubKeyRaw, salt }
}

// =============================================
// Send a single Web Push message
// =============================================

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payloadString: string
): Promise<Response> {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`

  // 1. Create VAPID JWT
  const jwt = await createVapidJwt(audience)

  // 2. Encrypt payload per RFC 8291
  const plaintext = new TextEncoder().encode(payloadString)
  const { encrypted } = await encryptPayload(
    plaintext,
    subscription.p256dh,
    subscription.auth
  )

  // 3. Send to push service
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(encrypted.byteLength),
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: encrypted,
  })

  const statusCode = response.status
  const responseBody = await response.text()
  console.log(`[PUSH] Push service response: ${statusCode} - ${responseBody}`)

  if (statusCode >= 400) {
    console.error(`[PUSH] Push service ERROR ${statusCode}: ${responseBody}`)
  }

  return new Response(responseBody, { status: statusCode, headers: response.headers })
}

// =============================================
// Main handler
// =============================================

serve(async (req: Request) => {
  try {
    const body = await req.json()
    console.log('[MAIN] Webhook payload keys:', Object.keys(body))
    console.log('[MAIN] type:', body.type, '| table:', body.table)

    // Database webhook sends { type, table, record, ... }
    const record = body.record || body
    console.log('[MAIN] Notification record:', JSON.stringify({ id: record.id, user_id: record.user_id, type: record.type, title: record.title }))

    if (!record || !record.user_id) {
      console.warn('[MAIN] No user_id in record, aborting')
      return new Response(JSON.stringify({ error: 'No notification record' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', record.user_id)

    console.log('[MAIN] Subscriptions query for user', record.user_id, ':', error ? `ERROR: ${error.message}` : `Found ${subscriptions?.length || 0} subscriptions`)

    if (error || !subscriptions?.length) {
      console.warn('[MAIN] No subscriptions — returning early')
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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
        console.log(`[SEND] Sending to endpoint: ${sub.endpoint.substring(0, 80)}...`)
        console.log(`[SEND] p256dh length: ${sub.p256dh?.length}, auth length: ${sub.auth?.length}`)
        const response = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        )

        console.log(`[SEND] Push service returned: ${response.status}`)

        if (response.status === 201 || response.status === 200) {
          sent++
        } else if (response.status === 410 || response.status === 404) {
          console.warn(`[SEND] Subscription expired (${response.status}), removing sub ${sub.id}`)
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          failed++
        } else {
          console.error(`[SEND] Unexpected status: ${response.status}`)
          failed++
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(`[SEND] Push send EXCEPTION: ${errMsg}`)
        failed++
      }
    }

    console.log(`[MAIN] Done. sent=${sent}, failed=${failed}, total=${subscriptions.length}`)
    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? `${err.message}\n${err.stack}` : 'Unknown error'
    console.error('[MAIN] Edge function EXCEPTION:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function getNotificationUrl(notification: { type: string; data: Record<string, unknown> }) {
  const data = notification.data || {}
  switch (notification.type) {
    case 'new_order':
      // Admin receives this — go to orders management
      return '/admin/orders'
    case 'order_status':
    case 'payment_update':
      // Client receives this — go to order detail
      return data.order_id ? `/order/${data.order_id}` : '/pesanan-saya'
    case 'custom_request':
      // Could be admin (new request) or client (status update)
      // If has order_id, it's a client notification (request accepted → order created)
      // If has request_id only, it's an admin notification (new request incoming)
      if (data.order_id) return `/order/${data.order_id}`
      if (data.request_id && !data.order_id) return '/admin/requests'
      return '/pesanan-saya'
    default:
      return '/'
  }
}
