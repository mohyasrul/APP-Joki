import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import { CurrencyDollar, TrendUp, Calendar, DownloadSimple, SpinnerGap, WarningCircle, CaretDown, CaretUp } from '@phosphor-icons/react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

const BULAN_LABEL = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2]

export default function Keuangan() {
    const [summary, setSummary] = useState(null)
    const [orders, setOrders] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedYear, setSelectedYear] = useState(THIS_YEAR)
    const [unpaidOrders, setUnpaidOrders] = useState([])
    const [showUnpaid, setShowUnpaid] = useState(false)
    const toast = useToast()

    const fetchSummary = useCallback(async (year = selectedYear) => {
        const { data, error } = await supabase.rpc('get_keuangan_summary', { p_year: year })
        if (error) throw error
        setSummary(data)
    }, [selectedYear])

    const fetchUnpaid = useCallback(async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, layanan(judul_tugas), profiles(full_name)')
            .in('status_pembayaran', ['Belum Bayar', 'Menunggu Verifikasi'])
            .not('status_pekerjaan', 'eq', 'Batal')
            .order('created_at', { ascending: false })
        setUnpaidOrders(data || [])
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
                await Promise.all([fetchSummary(selectedYear), fetchTransactions(1), fetchUnpaid()])
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

    useEffect(() => {
        if (!loading) fetchSummary(selectedYear).catch(() => toast.error('Gagal memuat ringkasan'))
    }, [selectedYear])

    const { total = 0, week_total: weekTotal = 0, month_total: monthTotal = 0, growth = 0, monthly = [] } = summary || {}
    const months = (monthly || []).map(m => ({ label: BULAN_LABEL[m.bulan], value: m.value }))
    const maxChart = Math.max(...months.map(m => m.value), 1)
    const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + (o.harga_final || 0), 0)

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

    if (loading) return <div className="flex items-center justify-center py-20"><SpinnerGap className="w-8 h-8 animate-spin text-brand-500" /></div>

    const statCards = [
        { label: `Total ${selectedYear}`, value: total, icon: CurrencyDollar, bg: 'bg-brand-50', iconColor: 'text-brand-600', trend: growth !== 0 ? `${growth >= 0 ? '+' : ''}${growth}% vs lalu` : null, trendUp: growth >= 0 },
        { label: 'Bulan Ini', value: monthTotal, icon: Calendar, bg: 'bg-blue-50', iconColor: 'text-blue-600', trend: null },
        { label: 'Minggu Ini', value: weekTotal, icon: TrendUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', trend: null },
        { label: 'Growth vs Bulan Lalu', value: null, growth, icon: TrendUp, bg: growth >= 0 ? 'bg-emerald-50' : 'bg-red-50', iconColor: growth >= 0 ? 'text-emerald-600' : 'text-red-600', trend: null },
    ]

    return (
        <div className="fade-in">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex gap-2">
                    {YEAR_OPTIONS.map(y => (
                        <button key={y} onClick={() => setSelectedYear(y)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedYear === y ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                            {y}
                        </button>
                    ))}
                </div>
                <button onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-colors shadow-sm border border-brand-100">
                    <DownloadSimple className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-slate-500 font-medium text-sm">{card.label}</h3>
                            <div className={`w-8 h-8 rounded-full ${card.bg} flex items-center justify-center`}>
                                <card.icon weight="fill" className={`w-4 h-4 ${card.iconColor}`} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            {card.value !== null && card.value !== undefined ? (
                                <span className="text-lg md:text-3xl font-bold">{formatRupiah(card.value)}</span>
                            ) : (
                                <span className={`text-lg md:text-3xl font-bold ${card.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{card.growth >= 0 ? '+' : ''}{card.growth}%</span>
                            )}
                            {card.trend && (
                                <div className="text-right flex flex-col items-end">
                                    <span className={`text-xs font-semibold ${card.trendUp ? 'text-emerald-500' : 'text-red-500'}`}>{card.trend}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Belum Dibayar Section */}
            {unpaidOrders.length > 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-amber-200 p-4 md:p-5 mb-6">
                    <button onClick={() => setShowUnpaid(!showUnpaid)}
                        className="w-full flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                            <WarningCircle weight="fill" className="w-5 h-5 text-amber-500" />
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Belum Dibayar / Menunggu Verifikasi</p>
                                <p className="text-xs text-slate-500">{unpaidOrders.length} order • Total {formatRupiah(unpaidTotal)}</p>
                            </div>
                        </div>
                        {showUnpaid ? <CaretUp weight="bold" className="w-5 h-5 text-slate-400" /> : <CaretDown weight="bold" className="w-5 h-5 text-slate-400" />}
                    </button>
                    {showUnpaid && (
                        <div className="mt-4 space-y-2">
                            {unpaidOrders.map(o => (
                                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">{o.layanan?.judul_tugas || 'Custom Request'}</p>
                                        <p className="text-xs text-slate-400">{o.profiles?.full_name} • {new Date(o.created_at).toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-brand-600">{formatRupiah(o.harga_final)}</span>
                                        <p className={`text-xs mt-0.5 ${o.status_pembayaran === 'Menunggu Verifikasi' ? 'text-amber-500' : 'text-red-500'}`}>{o.status_pembayaran}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Chart */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 mb-6 md:mb-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Pendapatan Per Bulan — {selectedYear}</h3>
                <div className="flex items-end gap-1.5 md:gap-3 h-36 md:h-40">
                    {months.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-xs text-slate-400">{m.value > 0 ? formatRupiah(m.value) : ''}</span>
                            <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500"
                                style={{ height: `${Math.max((m.value / maxChart) * 100, 4)}%`, minHeight: m.value > 0 ? '8px' : '4px' }} />
                            <span className="text-xs text-slate-400">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                <h3 className="text-lg font-bold mb-6">Riwayat Transaksi ({totalCount})</h3>
                {orders.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Belum ada transaksi selesai</p>
                ) : (
                    <>
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-400 text-xs font-medium border-b border-slate-100">
                                        <th className="pb-3 px-2 font-normal">Layanan</th>
                                        <th className="pb-3 px-2 font-normal">Klien</th>
                                        <th className="pb-3 px-2 font-normal">Tanggal</th>
                                        <th className="pb-3 px-2 font-normal">Promo</th>
                                        <th className="pb-3 px-2 font-normal text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {orders.map(o => (
                                        <tr key={o.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                            <td className="py-4 px-2 font-medium">{o.layanan?.judul_tugas || '-'}</td>
                                            <td className="py-4 px-2 text-slate-600">{o.profiles?.full_name || '-'}</td>
                                            <td className="py-4 px-2 text-slate-500 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                                            <td className="py-4 px-2">{o.kode_promo ? <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-medium">{o.kode_promo}</span> : '-'}</td>
                                            <td className="py-4 px-2 text-right">
                                                <span className="font-medium text-brand-600">{formatRupiah(o.harga_final)}</span>
                                                {o.diskon > 0 && <span className="block text-xs text-emerald-500">-{formatRupiah(o.diskon)}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card view */}
                        <div className="md:hidden space-y-3">
                            {orders.map(o => (
                                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-700 truncate">{o.layanan?.judul_tugas || '-'}</p>
                                        <p className="text-xs text-slate-400">{o.profiles?.full_name || '-'} • {new Date(o.created_at).toLocaleDateString('id-ID')}</p>
                                        {o.kode_promo && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{o.kode_promo}</span>}
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className="text-sm font-bold text-brand-600">{formatRupiah(o.harga_final)}</p>
                                        {o.diskon > 0 && <p className="text-xs text-emerald-500">-{formatRupiah(o.diskon)}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                <Pagination currentPage={currentPage} totalItems={totalCount} onPageChange={setCurrentPage} />
            </div>
        </div>
    )
}
