import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useBadge } from '../contexts/BadgeContext'
import { ChatCircle, PaperPlaneRight, SpinnerGap } from '@phosphor-icons/react'
import { timeAgo } from '../lib/utils'

export default function OrderChat({ orderId }) {
    const { user, profile } = useAuth()
    const { markChatRead } = useBadge()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [newMsg, setNewMsg] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef(null)

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('order_messages')
            .select('*, profiles(full_name, avatar_url, role)')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })
        if (!error) setMessages(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchMessages()
        markChatRead(orderId)

        const channel = supabase
            .channel(`order-chat-${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${orderId}`,
            }, async (payload) => {
                const { data } = await supabase
                    .from('order_messages')
                    .select('*, profiles(full_name, avatar_url, role)')
                    .eq('id', payload.new.id)
                    .single()
                if (data) setMessages(prev => [...prev, data])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [orderId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMsg.trim() || sending) return
        setSending(true)
        const { error } = await supabase.from('order_messages').insert({
            order_id: orderId,
            sender_id: user.id,
            content: newMsg.trim(),
        })
        if (!error) setNewMsg('')
        setSending(false)
    }

    const isOwn = (msg) => msg.sender_id === user.id

    const getSenderLabel = (msg) => {
        if (isOwn(msg)) return 'Kamu'
        if (msg.profiles?.role === 'admin') return 'Admin'
        return msg.profiles?.full_name || 'Pengguna'
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mt-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <ChatCircle weight="fill" className="w-5 h-5 text-brand-500" /> Diskusi
            </h3>

            {/* Message list */}
            <div className="space-y-3 max-h-[40vh] md:max-h-72 overflow-y-auto mb-4 pr-1">
                {loading ? (
                    <div className="flex justify-center py-6">
                        <SpinnerGap className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Belum ada pesan. Mulai diskusi!</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex gap-2 ${isOwn(msg) ? 'flex-row-reverse' : ''}`}>
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 overflow-hidden">
                                {msg.profiles?.avatar_url
                                    ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    : (msg.profiles?.full_name?.[0] || '?').toUpperCase()
                                }
                            </div>
                            <div className={`max-w-[75%] ${isOwn(msg) ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                                <p className={`text-[10px] text-slate-400 ${isOwn(msg) ? 'text-right' : ''}`}>
                                    {getSenderLabel(msg)}
                                    {' · '}{timeAgo(msg.created_at)}
                                </p>
                                <div className={`px-3.5 py-2 rounded-2xl text-sm break-words ${isOwn(msg)
                                    ? 'bg-brand-500 text-white rounded-tr-sm'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2">
                <input
                    type="text"
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Tulis pesan..."
                    maxLength={2000}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all text-sm"
                />
                <button type="submit" disabled={sending || !newMsg.trim()}
                    className="px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-all disabled:opacity-40 shrink-0">
                    {sending ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <PaperPlaneRight weight="fill" className="w-4 h-4" />}
                </button>
            </form>
        </div>
    )
}
