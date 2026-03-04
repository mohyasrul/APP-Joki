import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import {
    LayoutDashboard, DollarSign, Clock, AlertTriangle,
    TrendingUp, ArrowRight, CheckCircle, Package,
    BookOpen, ClipboardList, CreditCard, Inbox, Settings, Zap, Star, MessageSquare
} from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalIncome: 0, activeOrders: 0, pendingVerify: 0, completedOrders: 0, pendingRequests: 0, avgRating: 0 })
    const [recentOrders, setRecentOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchDashboard()
    }, [])

    const fetchDashboard = async () => {
        try {
            const { data, error } = await supabase.rpc('get_dashboard_stats')
            if (error) throw error

            if (data) {
                setStats({
                    totalIncome: data.totalIncome || 0,
                    activeOrders: data.activeOrders || 0,
                    pendingVerify: data.pendingVerify || 0,
                    completedOrders: data.completedOrders || 0,
                    pendingRequests: data.pendingRequests || 0,
                    avgRating: data.avgRating || 0,
                })
                setRecentOrders((data.recentOrders || []).map(o => ({
                    ...o,
                    layanan: { judul_tugas: o.layanan_judul },
                    profiles: { full_name: o.client_name },
                })))
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err)
        }
        setLoading(false)
    }

    const statCards = [
        { label: 'Total Pemasukan', value: formatRupiah(stats.totalIncome), icon: DollarSign, gradient: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400' },
        { label: 'Order Aktif', value: stats.activeOrders, icon: Clock, gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400' },
        { label: 'Menunggu Verifikasi', value: stats.pendingVerify, icon: AlertTriangle, gradient: 'from-yellow-500/20 to-orange-500/20', iconColor: 'text-yellow-400', pulse: stats.pendingVerify > 0 },
        { label: 'Selesai', value: stats.completedOrders, icon: CheckCircle, gradient: 'from-primary/20 to-purple-500/20', iconColor: 'text-primary-light' },
        { label: 'Custom Request', value: stats.pendingRequests, icon: Inbox, gradient: 'from-pink-500/20 to-rose-500/20', iconColor: 'text-pink-400', pulse: stats.pendingRequests > 0 },
        { label: 'Avg Rating', value: stats.avgRating > 0 ? `⭐ ${stats.avgRating}` : '-', icon: Star, gradient: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-400' },
    ]

    const quickActions = [
        { label: 'Kelola Katalog', icon: BookOpen, to: '/admin/layanan', gradient: 'from-violet-500 to-purple-600' },
        { label: 'Kelola Orders', icon: ClipboardList, to: '/admin/orders', gradient: 'from-blue-500 to-cyan-600' },
        { label: 'Verifikasi Bayar', icon: CreditCard, to: '/admin/orders', gradient: 'from-yellow-500 to-orange-500', badge: stats.pendingVerify },
        { label: 'Custom Requests', icon: Inbox, to: '/admin/requests', gradient: 'from-pink-500 to-rose-600' },
        { label: 'Keuangan', icon: DollarSign, to: '/admin/keuangan', gradient: 'from-green-500 to-emerald-600' },
        { label: 'Pengaturan', icon: Settings, to: '/admin/settings', gradient: 'from-slate-500 to-slate-600' },
    ]

    const STATUS_COLORS = {
        'Menunggu Diproses': 'text-yellow-400 bg-yellow-500/10',
        'Sedang Dikerjakan': 'text-blue-400 bg-blue-500/10',
        'Selesai': 'text-green-400 bg-green-500/10',
        'Batal': 'text-red-400 bg-red-500/10',
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <LayoutDashboard className="w-7 h-7 text-primary-light" />
                    Dashboard
                </h1>
                <p className="text-sm text-slate-400 mt-1">Selamat datang kembali, Admin!</p>
            </div>

            {/* Stat Cards — 2-col on mobile, 3-col on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {statCards.map((card, i) => (
                    <div key={i} className="glass rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5 transition-all duration-200">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                                <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.iconColor}`} />
                            </div>
                            {card.pulse && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 badge-pulse" />}
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-white">{card.value}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5 mb-3">
                    <Zap className="w-4 h-4 text-primary-light" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.to)}
                            className="relative glass rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 hover:bg-white/10 active:scale-95 transition-all duration-200 group"
                        >
                            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                                <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium text-slate-300 text-center leading-tight">{action.label}</span>
                            {action.badge > 0 && (
                                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 badge-pulse">
                                    {action.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Orders */}
            <div className="glass rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary-light" />
                        Order Terbaru
                    </h2>
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="text-xs sm:text-sm text-primary-light hover:text-primary flex items-center gap-1 transition-colors"
                    >
                        Lihat Semua <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
                    </div>
                ) : recentOrders.length === 0 ? (
                    <div className="text-center py-8">
                        <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Belum ada order</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => navigate(`/admin/orders`)}
                                title={`Order #${order.id.slice(0,8)}`}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{order.layanan?.judul_tugas}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-slate-500 truncate">{order.profiles?.full_name}</p>
                                        <span className="text-slate-600">•</span>
                                        <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0">
                                    <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium ${STATUS_COLORS[order.status_pekerjaan]}`}>
                                        {order.status_pekerjaan}
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold text-white">{formatRupiah(order.harga_final)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
