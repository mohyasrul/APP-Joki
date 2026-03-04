import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { History, ChevronDown, ChevronUp, Loader2, Package, DollarSign, Plus } from 'lucide-react'
import { timeAgo } from '../lib/utils'

const ACTION_ICONS = {
    order_created: Plus,
    status_pekerjaan: Package,
    status_pembayaran: DollarSign,
}

const ACTION_LABELS = {
    order_created: 'Order dibuat',
    status_pekerjaan: 'Status pekerjaan berubah',
    status_pembayaran: 'Status pembayaran berubah',
}

const ACTION_COLORS = {
    order_created: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    status_pekerjaan: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    status_pembayaran: 'text-green-400 bg-green-500/15 border-green-500/30',
}

export default function OrderTimeline({ orderId }) {
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        const fetchActivities = async () => {
            const { data, error } = await supabase
                .from('order_activities')
                .select('*, profiles(full_name, role)')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false })
            if (!error) setActivities(data || [])
            setLoading(false)
        }
        fetchActivities()
    }, [orderId])

    if (loading) return null

    return (
        <div className="glass rounded-2xl p-5 mt-4">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between text-left"
            >
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-primary-light" />
                    Riwayat Aktivitas
                    {activities.length > 0 && (
                        <span className="text-xs text-slate-500 font-normal">({activities.length})</span>
                    )}
                </h3>
                {expanded
                    ? <ChevronUp className="w-4 h-4 text-slate-500" />
                    : <ChevronDown className="w-4 h-4 text-slate-500" />
                }
            </button>

            {expanded && (
                <div className="mt-4 space-y-3">
                    {activities.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">Belum ada aktivitas</p>
                    ) : (
                        activities.map((act, idx) => {
                            const Icon = ACTION_ICONS[act.action] || History
                            const color = ACTION_COLORS[act.action] || 'text-slate-400 bg-white/5 border-white/10'
                            return (
                                <div key={act.id} className="flex gap-3">
                                    {/* Timeline line */}
                                    <div className="flex flex-col items-center">
                                        <div className={`relative w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${color}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                            {idx === 0 && (
                                                <span aria-hidden="true" className="absolute -inset-1 rounded-full border border-current opacity-30 animate-ping" />
                                            )}
                                        </div>
                                        {idx < activities.length - 1 && (
                                            <div className="w-px flex-1 bg-white/10 mt-1" />
                                        )}
                                    </div>
                                    {/* Content */}
                                    <div className="pb-3 min-w-0">
                                        <p className="text-sm font-medium text-white">
                                            {ACTION_LABELS[act.action] || act.action}
                                        </p>
                                        {act.old_value && act.new_value && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                <span className="line-through opacity-60">{act.old_value}</span>
                                                {' → '}
                                                <span className="text-primary-light">{act.new_value}</span>
                                            </p>
                                        )}
                                        {act.action === 'order_created' && act.new_value && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Status awal: <span className="text-primary-light">{act.new_value}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            {act.profiles?.role === 'admin' ? 'Admin' : (act.profiles?.full_name || 'Sistem')}
                                            {' · '}{timeAgo(act.created_at)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
