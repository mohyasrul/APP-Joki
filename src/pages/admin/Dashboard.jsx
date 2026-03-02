import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import {
    LayoutDashboard, DollarSign, Clock, AlertTriangle,
    TrendingUp, ArrowRight, CheckCircle, Package
} from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalIncome: 0, activeOrders: 0, pendingVerify: 0, completedOrders: 0 })
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
                })
                // Map RPC response to match component expectations
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
    ]

    const STATUS_COLORS = {
        'Menunggu Diproses': 'text-yellow-400 bg-yellow-500/10',
        'Sedang Dikerjakan': 'text-blue-400 bg-blue-500/10',
        'Selesai': 'text-green-400 bg-green-500/10',
        'Batal': 'text-red-400 bg-red-500/10',
    }

    return (
        <div className="fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <LayoutDashboard className="w-7 h-7 text-primary-light" />
                    Dashboard
                </h1>
                <p className="text-sm text-slate-400 mt-1">Selamat datang kembali, Admin!</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card, i) => (
                    <div key={i} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                            </div>
                            {card.pulse && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 badge-pulse" />}
                        </div>
                        <p className="text-2xl font-bold text-white">{card.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Orders */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary-light" />
                        Order Terbaru
                    </h2>
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="text-sm text-primary-light hover:text-primary flex items-center gap-1 transition-colors"
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
                                onClick={() => navigate('/admin/orders')}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{order.layanan?.judul_tugas}</p>
                                    <p className="text-xs text-slate-500">{order.profiles?.full_name} • {new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[order.status_pekerjaan]}`}>
                                        {order.status_pekerjaan}
                                    </span>
                                    <span className="text-sm font-semibold text-white">{formatRupiah(order.harga_final)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
