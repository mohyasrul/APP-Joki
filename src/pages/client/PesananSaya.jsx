import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import { formatRupiah } from '../../lib/utils'
import StatusBadge from '../../components/StatusBadge'
import { getKategoriIcon } from '../../lib/constants'
import { CheckCircle, XCircle, Eye, Package, Clock, Tray, WarningCircle, ArrowsClockwise, MagnifyingGlass, TrendUp, CaretDown, Wallet, SpinnerGap, ChatCircle, DownloadSimple, ArrowLeft, ArrowRight, ClockCountdown, Sparkle } from '@phosphor-icons/react'
import { ITEMS_PER_PAGE } from '../../components/Pagination'

const REQ_STATUS = {
    pending: { label: 'Menunggu', color: 'text-amber-600 bg-amber-50', icon: Clock },
    accepted: { label: 'Diterima', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
    rejected: { label: 'Ditolak', color: 'text-red-600 bg-red-50', icon: XCircle },
}

export default function PesananSaya() {
    const [orders, setOrders] = useState([])
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(null)
    const [filter, setFilter] = useState('Semua')
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('terbaru')
    const [currentPage, setCurrentPage] = useState(1)
    const [reqPage, setReqPage] = useState(1)
    const [activeTab, setActiveTab] = useState('pesanan')
    const { user } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    useEffect(() => {
        fetchOrders(); fetchRequests()

        const channel = supabase
            .channel('client-orders-realtime')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `client_id=eq.${user.id}`,
            }, (payload) => {
                const oldData = payload.old
                const newData = payload.new
                if (oldData.status_pekerjaan && newData.status_pekerjaan && oldData.status_pekerjaan !== newData.status_pekerjaan) {
                    toast.info(`Status pesanan berubah: ${newData.status_pekerjaan}`)
                } else if (oldData.status_pembayaran && newData.status_pembayaran && oldData.status_pembayaran !== newData.status_pembayaran) {
                    toast.info(`Pembayaran: ${newData.status_pembayaran}`)
                }
                fetchOrders()
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'custom_requests',
                filter: `client_id=eq.${user.id}`,
            }, () => {
                toast.info('Ada update untuk request kamu!')
                fetchRequests()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchOrders = async () => {
        try {
            setFetchError(null)
            const { data, error } = await supabase.from('orders').select('*, layanan(judul_tugas, kategori)').eq('client_id', user.id).order('created_at', { ascending: false })
            if (error) throw error
            setOrders(data || [])
        } catch (err) {
            console.error('Failed to fetch orders:', err)
            setFetchError('Gagal memuat pesanan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase.from('custom_requests').select('*').eq('client_id', user.id).order('created_at', { ascending: false })
            if (error) throw error
            setRequests(data || [])
        } catch (err) {
            console.error('Failed to fetch requests:', err)
        }
    }

    const filters = ['Semua', 'Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai', 'Belum Bayar']
    const sorted = [...orders].sort((a, b) => {
        if (sort === 'terbaru') return new Date(b.created_at) - new Date(a.created_at)
        if (sort === 'terlama') return new Date(a.created_at) - new Date(b.created_at)
        if (sort === 'harga_tinggi') return (b.harga_final || 0) - (a.harga_final || 0)
        if (sort === 'harga_rendah') return (a.harga_final || 0) - (b.harga_final || 0)
        return 0
    })
    const filtered = sorted.filter(o => {
        let matchFilter
        if (filter === 'Semua') matchFilter = true
        else if (filter === 'Belum Bayar') matchFilter = o.status_pembayaran === 'Belum Bayar' && o.status_pekerjaan !== 'Batal'
        else matchFilter = o.status_pekerjaan === filter
        const q = search.toLowerCase()
        const matchSearch = !q || (o.layanan?.judul_tugas || '').toLowerCase().includes(q) || (o.detail_tambahan || '').toLowerCase().includes(q)
        return matchFilter && matchSearch
    })
    const paginatedOrders = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    const paginatedRequests = requests.slice((reqPage - 1) * ITEMS_PER_PAGE, reqPage * ITEMS_PER_PAGE)

    useEffect(() => { setCurrentPage(1) }, [filter, search, sort])

    const statsData = {
        aktif: orders.filter(o => ['Menunggu Diproses', 'Sedang Dikerjakan'].includes(o.status_pekerjaan)).length,
        selesai: orders.filter(o => o.status_pekerjaan === 'Selesai').length,
        pengeluaran: orders.filter(o => o.status_pembayaran === 'Lunas').reduce((sum, o) => sum + (o.harga_final || 0), 0),
        belumBayar: orders.filter(o => o.status_pembayaran === 'Belum Bayar' && o.status_pekerjaan !== 'Batal').length,
    }

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-5 md:mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Pesanan Saya</h2>
                    <p className="text-sm font-medium text-slate-500">Pantau status pengerjaan tugas, jadwal deadline, dan riwayat pesanan kamu.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select value={sort} onChange={e => setSort(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer">
                            <option value="terbaru">Terbaru</option>
                            <option value="terlama">Terlama</option>
                            <option value="harga_tinggi">Harga ↑</option>
                            <option value="harga_rendah">Harga ↓</option>
                        </select>
                        <CaretDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <button onClick={() => { setFilter('Sedang Dikerjakan'); setActiveTab('pesanan') }}
                    className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">Tugas Aktif (Proses)</p>
                        <h3 className="text-xl md:text-3xl font-bold text-slate-900">{loading ? '—' : statsData.aktif}</h3>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
                        <SpinnerGap weight="bold" className="w-6 h-6" />
                    </div>
                </button>
                <button onClick={() => { setFilter('Belum Bayar'); setActiveTab('pesanan') }}
                    className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">Menunggu Pembayaran</p>
                        <h3 className="text-xl md:text-3xl font-bold text-slate-900">{loading ? '—' : statsData.belumBayar}</h3>
                        {!loading && statsData.belumBayar > 0 && (
                            <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">Segera Bayar</span>
                        )}
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                        <Wallet weight="bold" className="w-6 h-6" />
                    </div>
                </button>
                <button onClick={() => { setFilter('Selesai'); setActiveTab('pesanan') }}
                    className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">Tugas Selesai</p>
                        <h3 className="text-xl md:text-3xl font-bold text-slate-900">{loading ? '—' : statsData.selesai}</h3>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shrink-0">
                        <CheckCircle weight="bold" className="w-6 h-6" />
                    </div>
                </button>
                <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-slate-100 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">Total Pengeluaran</p>
                        <h3 className="text-lg md:text-3xl font-bold text-slate-900">{loading ? '—' : formatRupiah(statsData.pengeluaran)}</h3>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100 shrink-0">
                        <TrendUp weight="bold" className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 p-4 md:p-8 shadow-sm">
                {/* Header: Title + Tabs + Search */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900">
                            {activeTab === 'pesanan' ? 'Riwayat Pesanan' : 'Permintaan Custom'}
                        </h3>
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 md:p-1 w-full md:w-auto">
                            <button onClick={() => setActiveTab('pesanan')}
                                className={`flex-1 md:flex-initial px-3 py-2 md:py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'pesanan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                                Pesanan {orders.length > 0 && `(${orders.length})`}
                            </button>
                            <button onClick={() => setActiveTab('permintaan')}
                                className={`flex-1 md:flex-initial px-3 py-2 md:py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'permintaan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                                Custom Request {requests.length > 0 && `(${requests.length})`}
                            </button>
                        </div>
                    </div>
                    {activeTab === 'pesanan' && (
                        <div className="relative w-full md:w-72">
                            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Cari nama tugas..."
                                className="w-full bg-slate-50 border border-transparent rounded-full py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all" />
                        </div>
                    )}
                </div>

                {/* Filter Pills — pesanan only */}
                {activeTab === 'pesanan' && (
                    <div className="flex gap-2 mb-5 overflow-x-auto pb-1 hide-scrollbar">
                        {filters.map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                )}

                {/* === ORDERS TABLE === */}
                {activeTab === 'pesanan' && (
                    <>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-slate-50">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 rounded w-1/3" />
                                            <div className="h-3 bg-slate-50 rounded w-1/4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : fetchError ? (
                            <div className="text-center py-12">
                                <WarningCircle weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-4" />
                                <h3 className="text-base font-medium text-slate-500 mb-2">{fetchError}</h3>
                                <button onClick={() => { setLoading(true); fetchOrders(); fetchRequests() }}
                                    className="mt-2 px-5 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-all inline-flex items-center gap-2">
                                    <ArrowsClockwise weight="bold" className="w-4 h-4" /> Coba Lagi
                                </button>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-base font-medium text-slate-500">
                                    {search || filter !== 'Semua' ? 'Tidak ada pesanan yang cocok' : 'Belum ada pesanan'}
                                </h3>
                                {(search || filter !== 'Semua') && (
                                    <button onClick={() => { setSearch(''); setFilter('Semua') }} className="mt-2 text-sm text-brand-600 hover:underline">Reset filter</button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Desktop table */}
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                                        <thead>
                                            <tr className="text-slate-900 text-sm font-semibold border-b border-slate-100">
                                                <th className="pb-4 pl-2 pr-4 font-semibold w-28">ID Pesanan</th>
                                                <th className="pb-4 px-4 font-semibold">Detail Tugas</th>
                                                <th className="pb-4 px-4 font-semibold">
                                                    <span className="flex items-center gap-1.5 text-rose-600">
                                                        <ClockCountdown weight="fill" className="w-4 h-4" /> Deadline
                                                    </span>
                                                </th>
                                                <th className="pb-4 px-4 font-semibold">Tgl Pesan</th>
                                                <th className="pb-4 px-4 font-semibold">Pembayaran</th>
                                                <th className="pb-4 px-4 font-semibold">Total Biaya</th>
                                                <th className="pb-4 px-4 font-semibold">Status</th>
                                                <th className="pb-4 px-2 text-center font-semibold">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-medium text-slate-500">
                                            {paginatedOrders.map(order => {
                                                const { Icon: KategoriIcon, bg: kategoriBg, color: kategoriColor } = getKategoriIcon(order.layanan?.kategori)
                                                const isCompleted = order.status_pekerjaan === 'Selesai'
                                                const isInProgress = order.status_pekerjaan === 'Sedang Dikerjakan'
                                                const isUnpaid = order.status_pembayaran === 'Belum Bayar' && order.status_pekerjaan !== 'Batal'
                                                const deadline = order.tenggat_waktu
                                                    ? new Date(order.tenggat_waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : null
                                                return (
                                                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-5 pl-2 pr-4 text-slate-400 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                                        <td className="py-5 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full ${kategoriBg} flex items-center justify-center shrink-0`}>
                                                                    <KategoriIcon weight="fill" className={`w-5 h-5 ${kategoriColor}`} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-slate-900 font-bold text-[13px]">{order.layanan?.judul_tugas || 'Custom Order'}</p>
                                                                    <p className="text-xs text-slate-400">{order.layanan?.kategori || 'Request Khusus'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            {deadline ? (
                                                                isCompleted ? (
                                                                    <span className="text-slate-400 font-semibold line-through">{deadline}</span>
                                                                ) : (
                                                                    <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md text-xs font-bold border border-rose-100">{deadline}</span>
                                                                )
                                                            ) : <span className="text-slate-400">—</span>}
                                                        </td>
                                                        <td className="py-5 px-4 text-sm">
                                                            {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${order.status_pembayaran === 'Lunas' ? 'text-brand-600'
                                                                    : order.status_pembayaran === 'Belum Bayar' ? 'text-amber-500'
                                                                        : 'text-blue-500'
                                                                }`}>{order.status_pembayaran}</p>
                                                        </td>
                                                        <td className="py-5 px-4 text-slate-900 font-bold">{formatRupiah(order.harga_final)}</td>
                                                        <td className="py-5 px-4"><StatusBadge status={order.status_pekerjaan} /></td>
                                                        <td className="py-5 px-2 text-center">
                                                            {isInProgress ? (
                                                                <button onClick={() => navigate(`/order/${order.id}`)}
                                                                    className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 mx-auto">
                                                                    <ChatCircle weight="bold" className="w-3.5 h-3.5" /> Chat Joki
                                                                </button>
                                                            ) : isUnpaid ? (
                                                                <button onClick={() => navigate(`/order/${order.id}`)}
                                                                    className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5 mx-auto shadow-sm">
                                                                    Bayar Sekarang
                                                                </button>
                                                            ) : isCompleted ? (
                                                                <button onClick={() => navigate(`/order/${order.id}`)}
                                                                    className="text-brand-600 text-xs font-bold border border-brand-200 bg-brand-50/50 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors flex items-center gap-1.5 mx-auto">
                                                                    <DownloadSimple weight="bold" className="w-3.5 h-3.5" /> Unduh File
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => navigate(`/order/${order.id}`)}
                                                                    className="text-slate-500 hover:text-slate-900 text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                                                    Lihat Detail
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile card view */}
                                <div className="md:hidden space-y-3">
                                    {paginatedOrders.map(order => {
                                        const { Icon: KategoriIcon, bg: kategoriBg, color: kategoriColor } = getKategoriIcon(order.layanan?.kategori)
                                        const isCompleted = order.status_pekerjaan === 'Selesai'
                                        const isInProgress = order.status_pekerjaan === 'Sedang Dikerjakan'
                                        const isUnpaid = order.status_pembayaran === 'Belum Bayar' && order.status_pekerjaan !== 'Batal'
                                        const deadline = order.tenggat_waktu
                                            ? new Date(order.tenggat_waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : null
                                        return (
                                            <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-8 h-8 rounded-full ${kategoriBg} flex items-center justify-center shrink-0`}>
                                                            <KategoriIcon weight="fill" className={`w-4 h-4 ${kategoriColor}`} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 truncate">{order.layanan?.judul_tugas || 'Custom Order'}</p>
                                                            <p className="text-xs text-slate-400 font-mono">#{order.id.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={order.status_pekerjaan} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-brand-600">{formatRupiah(order.harga_final)}</span>
                                                    <span className={`text-xs font-bold uppercase tracking-wide ${order.status_pembayaran === 'Lunas' ? 'text-brand-600' : order.status_pembayaran === 'Belum Bayar' ? 'text-amber-500' : 'text-blue-500'}`}>{order.status_pembayaran}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-400">
                                                    <span>Dipesan: {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    {deadline && !isCompleted && (
                                                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-bold border border-rose-100">DL: {deadline}</span>
                                                    )}
                                                </div>
                                                <div className="pt-1 border-t border-slate-50">
                                                    {isInProgress ? (
                                                        <button onClick={() => navigate(`/order/${order.id}`)} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                                            <ChatCircle weight="bold" className="w-4 h-4" /> Chat Joki
                                                        </button>
                                                    ) : isUnpaid ? (
                                                        <button onClick={() => navigate(`/order/${order.id}`)} className="w-full bg-brand-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                            Bayar Sekarang
                                                        </button>
                                                    ) : isCompleted ? (
                                                        <button onClick={() => navigate(`/order/${order.id}`)} className="w-full bg-brand-50 text-brand-600 border border-brand-200 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-100 transition-colors flex items-center justify-center gap-2">
                                                            <DownloadSimple weight="bold" className="w-4 h-4" /> Unduh File
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => navigate(`/order/${order.id}`)} className="w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                                            Lihat Detail
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                        {/* Pagination */}
                        {filtered.length > ITEMS_PER_PAGE && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                    className="px-4 py-2 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-40">
                                    <ArrowLeft weight="bold" className="w-4 h-4" /> Sebelumnya
                                </button>
                                <p className="text-sm font-medium text-slate-500">Menampilkan halaman {currentPage} dari {Math.ceil(filtered.length / ITEMS_PER_PAGE)}</p>
                                <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                                    className="px-4 py-2 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-40">
                                    Selanjutnya <ArrowRight weight="bold" className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* === CUSTOM REQUESTS TAB === */}
                {activeTab === 'permintaan' && (
                    <>
                        {requests.length === 0 ? (
                            <div className="text-center py-12">
                                <Tray className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-base font-medium text-slate-500">Belum ada permintaan custom</h3>
                                <p className="text-sm text-slate-400 mt-1">Buat request untuk tugas di luar katalog.</p>
                                <button onClick={() => navigate('/request-custom')}
                                    className="mt-4 px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all inline-flex items-center gap-2">
                                    <Sparkle weight="bold" className="w-4 h-4" /> Buat Request
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Desktop table */}
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                                        <thead>
                                            <tr className="text-slate-900 text-sm font-semibold border-b border-slate-100">
                                                <th className="pb-4 pl-2 pr-4 font-semibold">Judul Request</th>
                                                <th className="pb-4 px-4 font-semibold">Tgl Request</th>
                                                <th className="pb-4 px-4 font-semibold">Anggaran</th>
                                                <th className="pb-4 px-4 font-semibold">Status</th>
                                                <th className="pb-4 px-4 font-semibold">Catatan Admin</th>
                                                <th className="pb-4 px-2 text-center font-semibold">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-medium text-slate-500">
                                            {paginatedRequests.map(req => {
                                                const s = REQ_STATUS[req.status]
                                                return (
                                                    <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-5 pl-2 pr-4">
                                                            <p className="text-slate-900 font-bold text-[13px]">{req.judul}</p>
                                                            {req.deskripsi && <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{req.deskripsi}</p>}
                                                        </td>
                                                        <td className="py-5 px-4 text-sm">
                                                            {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            {req.budget_min || req.budget_max ? (
                                                                <span className="text-slate-900 font-semibold text-xs">
                                                                    {req.budget_min ? formatRupiah(req.budget_min) : '?'} — {req.budget_max ? formatRupiah(req.budget_max) : '?'}
                                                                </span>
                                                            ) : <span className="text-slate-400 text-xs">Negosiasi</span>}
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>
                                                                <s.icon weight="bold" className="w-3.5 h-3.5" /> {s.label}
                                                            </span>
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            {req.catatan_admin
                                                                ? <p className="text-xs text-slate-600 max-w-[180px] truncate">{req.catatan_admin}</p>
                                                                : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="py-5 px-2 text-center">
                                                            {req.status === 'accepted' && req.order_id ? (
                                                                <button onClick={() => navigate(`/order/${req.order_id}`)}
                                                                    className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5 mx-auto">
                                                                    <Eye weight="bold" className="w-3.5 h-3.5" /> Lihat Order
                                                                </button>
                                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile card view */}
                                <div className="md:hidden space-y-3">
                                    {paginatedRequests.map(req => {
                                        const s = REQ_STATUS[req.status]
                                        return (
                                            <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{req.judul}</p>
                                                        {req.deskripsi && <p className="text-xs text-slate-400 mt-0.5 truncate">{req.deskripsi}</p>}
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${s.color}`}>
                                                        <s.icon weight="bold" className="w-3 h-3" /> {s.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-400">
                                                    <span>{new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <span className="font-medium text-slate-600 text-right">
                                                        {req.budget_min || req.budget_max ? `${req.budget_min ? formatRupiah(req.budget_min) : '?'} — ${req.budget_max ? formatRupiah(req.budget_max) : '?'}` : 'Negosiasi'}
                                                    </span>
                                                </div>
                                                {req.catatan_admin && (
                                                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 truncate">{req.catatan_admin}</p>
                                                )}
                                                {req.status === 'accepted' && req.order_id && (
                                                    <button onClick={() => navigate(`/order/${req.order_id}`)}
                                                        className="w-full bg-brand-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">
                                                        <Eye weight="bold" className="w-4 h-4" /> Lihat Order
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                        {requests.length > ITEMS_PER_PAGE && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button onClick={() => setReqPage(p => Math.max(1, p - 1))} disabled={reqPage === 1}
                                    className="px-4 py-2 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-40">
                                    <ArrowLeft weight="bold" className="w-4 h-4" /> Sebelumnya
                                </button>
                                <p className="text-sm font-medium text-slate-500">Menampilkan halaman {reqPage} dari {Math.ceil(requests.length / ITEMS_PER_PAGE)}</p>
                                <button onClick={() => setReqPage(p => Math.min(Math.ceil(requests.length / ITEMS_PER_PAGE), p + 1))} disabled={reqPage >= Math.ceil(requests.length / ITEMS_PER_PAGE)}
                                    className="px-4 py-2 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-40">
                                    Selanjutnya <ArrowRight weight="bold" className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
