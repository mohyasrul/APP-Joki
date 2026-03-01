import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isPushSupported, checkSubscription, subscribeToPush, getPermissionStatus } from '../lib/pushManager'

/**
 * Floating banner that prompts the user to enable push notifications.
 * Only shows when:
 * - Push is supported (SW + PushManager + Notification API)
 * - User is logged in
 * - No existing push subscription
 * - Permission is not 'denied'
 * - User hasn't dismissed the banner this session
 * 
 * Requires explicit user tap → satisfies mobile Chrome user-gesture requirement.
 */
export default function PushPrompt() {
    const { user } = useAuth()
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!user) return
        if (!isPushSupported()) return

        // Don't show if user previously dismissed (this session)
        if (sessionStorage.getItem('push-prompt-dismissed')) return

        // Don't show if permission already denied (can't re-ask)
        if (getPermissionStatus() === 'denied') return

        // Check if already subscribed
        checkSubscription().then((hasSub) => {
            if (!hasSub) setVisible(true)
        })
    }, [user])

    const handleEnable = async () => {
        setLoading(true)
        try {
            const result = await subscribeToPush(user.id)
            if (result) {
                setVisible(false)
            } else {
                // Permission denied or failed
                setVisible(false)
                sessionStorage.setItem('push-prompt-dismissed', '1')
            }
        } catch {
            setVisible(false)
        } finally {
            setLoading(false)
        }
    }

    const handleDismiss = () => {
        setVisible(false)
        sessionStorage.setItem('push-prompt-dismissed', '1')
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
                                {loading ? 'Mengaktifkan...' : 'Aktifkan'}
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
