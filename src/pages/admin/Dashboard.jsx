import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import StatusBadge from '../../components/StatusBadge'
import {
    Files, FilePlus, Checks, FileX,
    TrendUp, TrendDown, ArrowRight, Package,
    CaretDown, DownloadSimple, SpinnerGap, CurrencyDollar, Users
} from '@phosphor-icons/react'
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const PERIOD_OPTIONS = [
    { label: '7 Hari Terakhir', value: 7 },
    { label: '30 Hari Terakhir', value: 30 },
]

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalIncome: 0, activeOrders: 0, pendingVerify: 0, completedOrders: 0, pendingRequests: 0, avgRating: 0 })
    const [recentOrders, setRecentOrders] = useState([])
    const [chartData, setChartData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [chartLoading, setChartLoading] = useState(true)
    const [period, setPeriod] = useState(7)
    const [showPeriodMenu, setShowPeriodMenu] = useState(false)
    const navigate = useNavigate()

    useEffect(() => { fetchDashboard() }, [])
    useEffect(() => { fetchChartData() }, [period])

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

    const fetchChartData = async () => {
        setChartLoading(true)
        try {
            const { data, error } = await supabase.rpc('get_dashboard_chart_data', { p_days: period })
            if (error) throw error
            setChartData(data)
        } catch (err) {
            console.error('Chart data fetch error:', err)
            // Fallback: set empty chart data
            setChartData(null)
        }
        setChartLoading(false)
    }

    const exportCSV = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, layanan(judul_tugas), profiles(full_name)')
                .order('created_at', { ascending: false })
            if (error) throw error
            if (!data?.length) return
            const header = 'ID,Tanggal,Klien,Layanan,Status,Pembayaran,Harga\n'
            const rows = data.map(o =>
                `${o.id.slice(0, 8)},${new Date(o.created_at).toLocaleDateString('id-ID')},${o.profiles?.full_name || '-'},${o.layanan?.judul_tugas || '-'},${o.status_pekerjaan},${o.status_pembayaran},${o.harga_final}`
            ).join('\n')
            const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `laporan_dashboard_${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Export error:', err)
        }
    }

    const totalOrders = stats.activeOrders + stats.completedOrders + stats.pendingVerify

    // Calculate real trends from chart data
    const calcTrend = (current, prev) => {
        if (!prev || prev === 0) return current > 0 ? 100 : 0
        return Math.round(((current - prev) / prev) * 100 * 10) / 10
    }

    const currentIncome = chartData?.current_income || 0
    const prevIncome = chartData?.prev_income || 0
    const currentOrders = chartData?.current_orders || 0
    const prevOrders = chartData?.prev_orders || 0
    const incomeTrend = calcTrend(currentIncome, prevIncome)
    const ordersTrend = calcTrend(currentOrders, prevOrders)

    // Format chart dates
    const formatDay = (dateStr) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    const dailyOrders = (chartData?.daily_orders || []).map(d => ({ ...d, label: formatDay(d.day) }))
    const dailyRevenue = (chartData?.daily_revenue || []).map(d => ({ ...d, label: formatDay(d.day) }))
    const topClients = chartData?.top_clients || []
    const statusBreakdown = chartData?.status_breakdown || []
    const paidTotal = chartData?.paid_total || 0
    const unpaidTotal = chartData?.unpaid_total || 0
    const paidCount = chartData?.paid_count || 0
    const unpaidCount = chartData?.unpaid_count || 0
    const paymentTotal = paidTotal + unpaidTotal
    const paidPct = paymentTotal > 0 ? Math.round((paidTotal / paymentTotal) * 100) : 0

    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || ''

    const statCards = [
        { label: 'Total Pendapatan', value: formatRupiah(stats.totalIncome), icon: CurrencyDollar, trend: incomeTrend, trendUp: incomeTrend >= 0 },
        { label: 'Total Tugas', value: totalOrders.toLocaleString('id-ID'), icon: Files, trend: ordersTrend, trendUp: ordersTrend >= 0 },
        { label: 'Tugas Selesai', value: stats.completedOrders.toLocaleString('id-ID'), icon: Checks, trend: null, trendUp: true },
        { label: 'Tugas Aktif', value: stats.activeOrders.toLocaleString('id-ID'), icon: FilePlus, trend: null, trendUp: true },
    ]

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-100 text-xs">
                <p className="text-slate-500 mb-1">{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} className="font-semibold text-slate-800">
                        {entry.name === 'revenue' ? formatRupiah(entry.value) : entry.value}
                    </p>
                ))}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <SpinnerGap className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        )
    }

    return (
        <div className="fade-in">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-lg font-bold text-slate-800">Dashboard</h1>
                    <p className="text-sm text-slate-400">Ringkasan data & statistik</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Period selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                            className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm text-sm font-medium cursor-pointer hover:bg-slate-50 border border-slate-100"
                        >
                            {periodLabel} <CaretDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {showPeriodMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 min-w-[160px]">
                                {PERIOD_OPTIONS.map(opt => (
                                    <button key={opt.value}
                                        onClick={() => { setPeriod(opt.value); setShowPeriodMenu(false) }}
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${period === opt.value ? 'bg-brand-50 text-brand-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-colors shadow-sm border border-brand-100">
                        <DownloadSimple className="w-4 h-4" /> Unduh Laporan
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-slate-500 font-medium text-sm">{card.label}</h3>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                                <card.icon className="w-[18px] h-[18px]" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-lg md:text-2xl font-bold">{card.value}</span>
                            {card.trend !== null && (
                                <div className="text-right flex flex-col items-end">
                                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${card.trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {card.trendUp
                                            ? <TrendUp weight="bold" className="w-3 h-3" />
                                            : <TrendDown weight="bold" className="w-3 h-3" />
                                        }
                                        {card.trendUp ? '+' : ''}{card.trend}%
                                    </span>
                                    <span className="text-slate-400 text-[10px]">{periodLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                {/* Line Chart - Total Transaksi */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-slate-500">Total Transaksi</h3>
                        <span className="text-xs text-slate-400">{periodLabel}</span>
                    </div>
                    <p className="text-2xl font-bold mb-4">{currentOrders.toLocaleString('id-ID')}</p>
                    {chartLoading ? (
                        <div className="h-36 md:h-48 bg-slate-50 rounded-xl animate-pulse" />
                    ) : (
                        <div className="h-36 md:h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyOrders} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradOrder" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} fill="url(#gradOrder)" name="count" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Bar Chart - Pertumbuhan Pendapatan */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-slate-500">Pertumbuhan Pendapatan</h3>
                        <span className="text-xs text-slate-400">{periodLabel}</span>
                    </div>
                    <p className="text-2xl font-bold mb-4">{formatRupiah(currentIncome)}</p>
                    {chartLoading ? (
                        <div className="h-36 md:h-48 bg-slate-50 rounded-xl animate-pulse" />
                    ) : (
                        <div className="h-36 md:h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="revenue" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Widgets Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
                {/* Payment Summary */}
                <div className="col-span-2 lg:col-span-1 bg-white p-4 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500 mb-4">Ringkasan Pembayaran</h3>
                    <p className="text-2xl font-bold mb-1">{formatRupiah(paidTotal)}</p>
                    <p className="text-xs text-slate-400 mb-4">Total pemasukan terbayar</p>
                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${paidPct}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Lunas ({paidCount})
                            <span className="font-medium text-slate-700 ml-1">{formatRupiah(paidTotal)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400" /> Belum ({unpaidCount})
                            <span className="font-medium text-slate-700 ml-1">{formatRupiah(unpaidTotal)}</span>
                        </span>
                    </div>
                </div>

                {/* Top Clients */}
                <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500 mb-4">Top Klien</h3>
                    {topClients.length === 0 ? (
                        <div className="text-center py-6">
                            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Belum ada data klien</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topClients.map((client, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                                        {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{client.full_name}</p>
                                        <p className="text-xs text-slate-400 truncate">{client.email}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 shrink-0">{formatRupiah(client.total_spend)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status Breakdown */}
                <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500 mb-4">Status Pesanan</h3>
                    {statusBreakdown.length === 0 ? (
                        <div className="text-center py-6">
                            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Belum ada data</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                                        <th className="pb-2 font-normal">Status</th>
                                        <th className="pb-2 font-normal text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {statusBreakdown.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-50 last:border-0">
                                            <td className="py-2.5"><StatusBadge status={item.status} /></td>
                                            <td className="py-2.5 text-right font-semibold text-slate-700">{item.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">Order Terbaru</h2>
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors font-medium"
                    >
                        Lihat Semua <ArrowRight weight="bold" className="w-4 h-4" />
                    </button>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="text-center py-8">
                        <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Belum ada order</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Desktop table */}
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="text-slate-400 text-xs font-medium border-b border-slate-100">
                                    <th className="pb-3 px-2 font-normal">ID Tugas</th>
                                    <th className="pb-3 px-2 font-normal">Layanan</th>
                                    <th className="pb-3 px-2 font-normal">Klien</th>
                                    <th className="pb-3 px-2 font-normal">Tanggal</th>
                                    <th className="pb-3 px-2 font-normal">Harga</th>
                                    <th className="pb-3 px-2 font-normal">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {recentOrders.map(order => (
                                    <tr key={order.id}
                                        onClick={() => navigate('/admin/orders')}
                                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    >
                                        <td className="py-4 px-2 font-medium text-slate-700">#{order.id.slice(0, 8)}</td>
                                        <td className="py-4 px-2 font-medium">{order.layanan?.judul_tugas}</td>
                                        <td className="py-4 px-2 text-slate-500">{order.profiles?.full_name}</td>
                                        <td className="py-4 px-2 text-slate-500">{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                        <td className="py-4 px-2 font-medium">{formatRupiah(order.harga_final)}</td>
                                        <td className="py-4 px-2"><StatusBadge status={order.status_pekerjaan} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Mobile card view */}
                        <div className="md:hidden space-y-3">
                            {recentOrders.map(order => (
                                <div key={order.id}
                                    onClick={() => navigate('/admin/orders')}
                                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-mono text-slate-400">#{order.id.slice(0, 8)}</span>
                                        <StatusBadge status={order.status_pekerjaan} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{order.layanan?.judul_tugas}</p>
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-xs text-slate-500">{order.profiles?.full_name}</span>
                                        <span className="text-sm font-bold text-brand-600">{formatRupiah(order.harga_final)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
