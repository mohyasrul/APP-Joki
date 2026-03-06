import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ClockCounterClockwise, CaretDown, CaretUp, SpinnerGap, Package, CurrencyDollar, Plus } from '@phosphor-icons/react'
import { timeAgo } from '../lib/utils'

const ACTION_ICONS = {
    order_created: Plus,
    status_pekerjaan: Package,
    status_pembayaran: CurrencyDollar,
}

const ACTION_LABELS = {
    order_created: 'Order dibuat',
    status_pekerjaan: 'Status pekerjaan berubah',
    status_pembayaran: 'Status pembayaran berubah',
}

const ACTION_COLORS = {
    order_created: 'text-blue-600 bg-blue-50 border-blue-100',
    status_pekerjaan: 'text-purple-600 bg-purple-50 border-purple-100',
    status_pembayaran: 'text-emerald-600 bg-emerald-50 border-emerald-100',
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mt-4">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between text-left"
            >
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <ClockCounterClockwise weight="bold" className="w-5 h-5 text-brand-500" />
                    Riwayat Aktivitas
                    {activities.length > 0 && (
                        <span className="text-xs text-slate-400 font-normal">({activities.length})</span>
                    )}
                </h3>
                {expanded
                    ? <CaretUp weight="bold" className="w-4 h-4 text-slate-400" />
                    : <CaretDown weight="bold" className="w-4 h-4 text-slate-400" />
                }
            </button>

            {expanded && (
                <div className="mt-4 space-y-0">
                    {activities.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Belum ada aktivitas</p>
                    ) : (
                        activities.map((act, idx) => {
                            const Icon = ACTION_ICONS[act.action] || ClockCounterClockwise
                            const color = ACTION_COLORS[act.action] || 'text-slate-400 bg-slate-50 border-slate-200'
                            return (
                                <div key={act.id} className="flex gap-3">
                                    {/* Timeline line & dot */}
                                    <div className="flex flex-col items-center">
                                        <div className={`relative w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${color} ${idx === 0 ? 'ring-2 ring-orange-100 bg-orange-50 text-orange-500 border-orange-200' : ''
                                            }`}>
                                            <Icon weight="bold" className="w-3.5 h-3.5" />
                                        </div>
                                        {idx < activities.length - 1 && (
                                            <div className="w-px flex-1 bg-slate-100 mt-1" />
                                        )}
                                    </div>
                                    {/* Content */}
                                    <div className="pb-4 min-w-0">
                                        <p className="text-sm font-medium text-slate-700">
                                            {ACTION_LABELS[act.action] || act.action}
                                        </p>
                                        {act.old_value && act.new_value && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                <span className="line-through opacity-60">{act.old_value}</span>
                                                {' → '}
                                                <span className="text-brand-600 font-medium">{act.new_value}</span>
                                            </p>
                                        )}
                                        {act.action === 'order_created' && act.new_value && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Status awal: <span className="text-brand-600 font-medium">{act.new_value}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-1">
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
