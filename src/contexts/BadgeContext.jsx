import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BadgeContext = createContext({})

export const useBadge = () => useContext(BadgeContext)

export function BadgeProvider({ children }) {
    const { user, isAdmin } = useAuth()

    // Admin: orders needing action (pending verify OR menunggu diproses)
    const [ordersActionCount, setOrdersActionCount] = useState(0)
    // Admin: custom requests pending
    const [requestsCount, setRequestsCount] = useState(0)
    // All users: unread chat notifications
    const [unreadChatCount, setUnreadChatCount] = useState(0)

    const fetchOrdersAction = useCallback(async () => {
        if (!user || !isAdmin) return
        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .or("status_pembayaran.eq.Menunggu Verifikasi,status_pekerjaan.eq.Menunggu Diproses")
        setOrdersActionCount(count || 0)
    }, [user, isAdmin])

    const fetchRequestsCount = useCallback(async () => {
        if (!user || !isAdmin) return
        const { count } = await supabase
            .from('custom_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
        setRequestsCount(count || 0)
    }, [user, isAdmin])

    const fetchUnreadChat = useCallback(async () => {
        if (!user) return
        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'chat_message')
            .eq('is_read', false)
        setUnreadChatCount(count || 0)
    }, [user])

    // Mark all chat notifications for a specific order as read
    const markChatRead = useCallback(async (orderId) => {
        if (!user) return
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('type', 'chat_message')
            .contains('data', { order_id: orderId })
        fetchUnreadChat()
    }, [user, fetchUnreadChat])

    useEffect(() => {
        if (!user) {
            setOrdersActionCount(0)
            setRequestsCount(0)
            setUnreadChatCount(0)
            return
        }

        // Initial fetch
        fetchOrdersAction()
        fetchRequestsCount()
        fetchUnreadChat()

        const channels = []

        // Watch orders changes (admin only)
        if (isAdmin) {
            const ordersChannel = supabase
                .channel('badge-orders')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrdersAction)
                .subscribe()
            channels.push(ordersChannel)

            const requestsChannel = supabase
                .channel('badge-requests')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_requests' }, fetchRequestsCount)
                .subscribe()
            channels.push(requestsChannel)
        }

        // Watch notifications for chat badge (all users)
        const notifsChannel = supabase
            .channel(`badge-notifs-${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, fetchUnreadChat)
            .subscribe()
        channels.push(notifsChannel)

        return () => channels.forEach(c => supabase.removeChannel(c))
    }, [user, isAdmin, fetchOrdersAction, fetchRequestsCount, fetchUnreadChat])

    // Helper: format badge number (cap at 9+)
    const fmt = (n) => n > 9 ? '9+' : String(n)

    return (
        <BadgeContext.Provider value={{
            ordersActionCount,
            requestsCount,
            unreadChatCount,
            markChatRead,
            fmt,
        }}>
            {children}
        </BadgeContext.Provider>
    )
}
