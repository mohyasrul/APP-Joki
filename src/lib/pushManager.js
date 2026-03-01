import { supabase } from './supabase'

// VAPID public key — ganti setelah generate: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Convert VAPID key from base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default', 'granted', 'denied'
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  const result = await Notification.requestPermission()
  return result
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPush(userId) {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported')
    return null
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VAPID public key not configured! Check VITE_VAPID_PUBLIC_KEY env var.')
    return null
  }

  console.log('[Push] VAPID key present, length:', VAPID_PUBLIC_KEY.length)

  try {
    // Step 1: Request permission (must be inside user gesture on mobile)
    console.log('[Push] Requesting notification permission...')
    const permission = await requestPermission()
    console.log('[Push] Permission result:', permission)
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission not granted:', permission)
      return null
    }

    // Step 2: Wait for service worker to be ready
    console.log('[Push] Waiting for service worker ready...')
    const registration = await navigator.serviceWorker.ready
    console.log('[Push] Service worker ready, scope:', registration.scope)
    
    // Step 3: Check existing subscription
    let subscription = await registration.pushManager.getSubscription()
    console.log('[Push] Existing subscription:', subscription ? 'YES' : 'NO')
    
    if (!subscription) {
      console.log('[Push] Creating new push subscription...')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      console.log('[Push] New subscription created:', subscription.endpoint)
    }

    // Step 4: Save subscription to Supabase
    const subscriptionJSON = subscription.toJSON()
    console.log('[Push] Saving to Supabase for user:', userId)
    console.log('[Push] Endpoint:', subscriptionJSON.endpoint)
    console.log('[Push] p256dh length:', subscriptionJSON.keys?.p256dh?.length)
    console.log('[Push] auth length:', subscriptionJSON.keys?.auth?.length)

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('[Push] Failed to save push subscription:', error)
      return null
    }

    console.log('[Push] ✅ Push subscription saved successfully!')
    return subscription
  } catch (err) {
    console.error('[Push] Push subscription FAILED:', err)
    console.error('[Push] Error name:', err?.name, '| message:', err?.message)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Remove from DB first
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)

      // Then unsubscribe
      await subscription.unsubscribe()
    }

    return true
  } catch (err) {
    console.error('Unsubscribe failed:', err)
    return false
  }
}

/**
 * Check if user already has an active subscription
 */
export async function checkSubscription() {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
