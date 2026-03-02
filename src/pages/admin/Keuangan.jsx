import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import { DollarSign, TrendingUp, Calendar, Download, Loader2 } from 'lucide-react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

const BULAN_LABEL = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function Keuangan() {
    const [summary, setSummary] = useState(null)
    const [orders, setOrders] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const toast = useToast()

    const fetchSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('get_keuangan_summary')
        if (error) throw error
        setSummary(data)
    }, [])

    const fetchTransactions = useCallback(async (page = 1) => {
        const from = (page - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1
        const { data, error, count } = await supabase
            .from('orders')
            .select('*, layanan(judul_tugas), profiles(full_name)', { count: 'exact' })
            .eq('status_pembayaran', 'Lunas')
            .order('created_at', { ascending: false })
            .range(from, to)
        if (error) throw error
        setOrders(data || [])
        setTotalCount(count || 0)
    }, [])

    useEffect(() => {
        (async () => {
            try {
                await Promise.all([fetchSummary(), fetchTransactions(1)])
            } catch (err) {
                console.error('Failed to fetch keuangan:', err)
                toast.error('Gagal memuat data keuangan')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    useEffect(() => {
        if (!loading) fetchTransactions(currentPage).catch(() => toast.error('Gagal memuat transaksi'))
    }, [currentPage])

    const { total = 0, week_total: weekTotal = 0, month_total: monthTotal = 0, growth = 0, monthly = [] } = summary || {}
    const months = (monthly || []).map(m => ({ label: BULAN_LABEL[m.bulan], value: m.value }))
    const maxChart = Math.max(...months.map(m => m.value), 1)

    // CSV Export — fetches all on demand
    const exportCSV = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, layanan(judul_tugas), profiles(full_name)')
                .eq('status_pembayaran', 'Lunas')
                .order('created_at', { ascending: false })
            if (error) throw error
            if (!data?.length) { toast.error('Tidak ada data untuk diexport'); return }
            const header = 'Tanggal,Klien,Layanan,Harga,Diskon,Kode Promo\n'
            const rows = data.map(o =>
                `${new Date(o.created_at).toLocaleDateString('id-ID')},${o.profiles?.full_name || '-'},${o.layanan?.judul_tugas || '-'},${o.harga_final},${o.diskon || 0},${o.kode_promo || '-'}`
            ).join('\n')
            const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `laporan_keuangan_${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Laporan berhasil diexport!')
        } catch (err) {
            toast.error('Gagal export: ' + err.message)
        }
    }

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-7 h-7 text-primary-light" /> Laporan Keuangan
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Ringkasan pemasukan dari joki tugas</p>
                </div>
                <button onClick={exportCSV}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Pemasukan', value: total, icon: DollarSign, gradient: 'from-primary to-purple-500' },
                    { label: 'Bulan Ini', value: monthTotal, icon: Calendar, gradient: 'from-blue-500 to-cyan-500' },
                    { label: 'Minggu Ini', value: weekTotal, icon: TrendingUp, gradient: 'from-green-500 to-emerald-500' },
                    { label: 'Growth vs Bulan Lalu', value: null, icon: TrendingUp, gradient: growth >= 0 ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500' },
                ].map((card, i) => (
                    <div key={i} className="glass rounded-2xl p-5 glow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                                <card.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm text-slate-400">{card.label}</span>
                        </div>
                        {card.value !== null ? (
                            <p className="text-2xl font-bold gradient-text">{formatRupiah(card.value)}</p>
                        ) : (
                            <p className={`text-2xl font-bold ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>{growth >= 0 ? '+' : ''}{growth}%</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="glass rounded-2xl p-6 mb-8 glow">
                <h3 className="text-lg font-semibold text-white mb-6">Pendapatan 6 Bulan Terakhir</h3>
                <div className="flex items-end gap-3 h-40">
                    {months.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-xs text-slate-400">{m.value > 0 ? formatRupiah(m.value) : ''}</span>
                            <div className="w-full rounded-t-lg bg-gradient-to-t from-primary to-purple-500 transition-all duration-500"
                                style={{ height: `${Math.max((m.value / maxChart) * 100, 4)}%`, minHeight: m.value > 0 ? '8px' : '4px' }} />
                            <span className="text-xs text-slate-500">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transactions */}
            <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Riwayat Transaksi ({totalCount})</h3>
                {orders.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Belum ada transaksi selesai</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map(o => (
                            <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div>
                                    <p className="text-sm font-medium text-white">{o.layanan?.judul_tugas}</p>
                                    <p className="text-xs text-slate-500">
                                        {o.profiles?.full_name} • {new Date(o.created_at).toLocaleDateString('id-ID')}
                                        {o.kode_promo && <span className="text-green-400"> • 🏷️ {o.kode_promo}</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold gradient-text">{formatRupiah(o.harga_final)}</span>
                                    {o.diskon > 0 && <p className="text-xs text-green-400">-{formatRupiah(o.diskon)}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {totalCount > ITEMS_PER_PAGE && (
                    <Pagination currentPage={currentPage} totalItems={totalCount} onPageChange={setCurrentPage} />
                )}
            </div>
        </div>
    )
}
