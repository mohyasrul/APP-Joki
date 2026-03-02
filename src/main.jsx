import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { ensureSubscription, isPushSupported } from './lib/pushManager'
import { supabase } from './lib/supabase'

// Register service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Auto-update the SW when a new version is available
    updateSW(true)
  },
  onOfflineReady() {
    console.log('Jokskuy siap digunakan offline')
  },
})

// Listen for SW messages (e.g. push subscription lost after SW update)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'PUSH_SUBSCRIPTION_LOST') {
      console.log('[Main] SW reported push subscription lost, attempting re-subscribe...')
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isPushSupported() && Notification.permission === 'granted') {
          const ok = await ensureSubscription(user.id)
          console.log('[Main] Re-subscribe after SW update:', ok ? 'SUCCESS' : 'FAILED')
        }
      } catch (err) {
        console.error('[Main] Re-subscribe after SW update error:', err)
      }
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
