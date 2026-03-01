import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isPushSupported, checkSubscription, subscribeToPush, getPermissionStatus } from '../lib/pushManager'

const STORAGE_KEY_SUBSCRIBED = 'push-subscribed'
const STORAGE_KEY_DISMISSED = 'push-prompt-dismissed'

/**
 * Floating banner that prompts the user to enable push notifications.
 * Only shows when:
 * - Push is supported (SW + PushManager + Notification API)
 * - User is logged in
 * - No existing push subscription
 * - Permission is not 'denied'
 * - User hasn't dismissed the banner permanently
 * 
 * Requires explicit user tap → satisfies mobile Chrome user-gesture requirement.
 */
export default function PushPrompt() {
    const { user } = useAuth()
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')

    useEffect(() => {
        if (!user) return
        if (!isPushSupported()) {
            console.log('[PushPrompt] Push not supported in this browser')
            return
        }

        // Don't show if already subscribed successfully
        if (localStorage.getItem(STORAGE_KEY_SUBSCRIBED) === user.id) return

        // Don't show if user dismissed (persists across sessions)
        const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED)
        if (dismissed) {
            // Re-show after 3 days
            const dismissedAt = parseInt(dismissed, 10)
            if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return
        }

        // Don't show if permission already denied (can't re-ask)
        if (getPermissionStatus() === 'denied') {
            console.log('[PushPrompt] Notification permission denied by browser')
            return
        }

        // Check if already subscribed via PushManager
        checkSubscription().then((hasSub) => {
            if (hasSub) {
                // Already subscribed, mark it
                localStorage.setItem(STORAGE_KEY_SUBSCRIBED, user.id)
            } else {
                console.log('[PushPrompt] No push subscription found, showing banner')
                setVisible(true)
            }
        })
    }, [user])

    const handleEnable = async () => {
        setLoading(true)
        setStatus('Meminta izin...')
        try {
            console.log('[PushPrompt] User tapped Aktifkan, calling subscribeToPush...')
            const result = await subscribeToPush(user.id)
            if (result) {
                console.log('[PushPrompt] Push subscription SUCCESS:', result.endpoint)
                localStorage.setItem(STORAGE_KEY_SUBSCRIBED, user.id)
                localStorage.removeItem(STORAGE_KEY_DISMISSED)
                setStatus('Berhasil! ✓')
                setTimeout(() => setVisible(false), 1500)
            } else {
                console.warn('[PushPrompt] subscribeToPush returned null')
                setStatus('Gagal - cek izin browser')
                setTimeout(() => {
                    setVisible(false)
                    localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()))
                }, 2000)
            }
        } catch (err) {
            console.error('[PushPrompt] Error:', err)
            setStatus('Error: ' + (err?.message || 'Unknown'))
            setTimeout(() => setVisible(false), 2000)
        } finally {
            setLoading(false)
        }
    }

    const handleDismiss = () => {
        setVisible(false)
        localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()))
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md slide-up">
            <div className="glass rounded-2xl border border-primary/20 shadow-2xl shadow-primary/10 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-primary-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">Aktifkan Notifikasi</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Dapatkan notifikasi langsung di HP saat ada update pesanan atau request baru.
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <button
                                onClick={handleEnable}
                                disabled={loading}
                                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-all disabled:opacity-50"
                            >
                                {loading ? (status || 'Mengaktifkan...') : status || 'Aktifkan'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                Nanti saja
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
