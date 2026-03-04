import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import OrderChat from '../../components/OrderChat'
import { formatRupiah } from '../../lib/utils'
import { getFileIcon, formatSize } from '../../lib/constants'
import StatusBadge from '../../components/StatusBadge'
import {
    ClipboardList, Search, CheckCircle, XCircle, X, Image as ImageIcon,
    Loader2, AlertTriangle, Upload, Star, FileText, Download, ExternalLink, Eye, FileDown, MessageCircle,
    StickyNote, Paperclip, Filter, Clock
} from 'lucide-react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

const STATUS_PEKERJAAN = ['Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai', 'Batal']

export default function AdminOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('Semua')
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [totalOrderCount, setTotalOrderCount] = useState(0)
    const [pendingVerifyCount, setPendingVerifyCount] = useState(0)
    const [showBukti, setShowBukti] = useState(null)
    const toast = useToast()
    const searchTimer = useRef(null)

    // Upload hasil modal
    const [uploadModal, setUploadModal] = useState(null)
    const [uploadFiles, setUploadFiles] = useState([])
    const [uploadNote, setUploadNote] = useState('')
    const [uploading, setUploading] = useState(false)

    // View hasil modal
    const [viewHasil, setViewHasil] = useState(null)

    // Chat modal (#33)
    const [chatOrder, setChatOrder] = useState(null)

    // Date range filter
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showDateFilter, setShowDateFilter] = useState(false)

    // Catatan internal modal
    const [catatanModal, setCatatanModal] = useState(null)
    const [catatanText, setCatatanText] = useState('')
    const [savingCatatan, setSavingCatatan] = useState(false)

    // View order_files modal
    const [viewOrderFiles, setViewOrderFiles] = useState(null)

    const fetchOrders = useCallback(async (page = currentPage, statusFilter = filter, searchTerm = search) => {
        try {
            setLoading(true)

            // Get total order count + pending verify count (lightweight)
            const [{ count: allCount }, { count: pvCount }] = await Promise.all([
                supabase.from('orders').select('id', { count: 'exact', head: true }),
                supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status_pembayaran', 'Menunggu Verifikasi'),
            ])
            setTotalOrderCount(allCount || 0)
            setPendingVerifyCount(pvCount || 0)

            if (searchTerm.trim()) {
                // Server-side search via RPC (ILIKE across joined tables)
                const { data, error } = await supabase.rpc('search_orders', {
                    p_term: searchTerm.trim(),
                    p_status: statusFilter,
                    p_limit: ITEMS_PER_PAGE,
                    p_offset: (page - 1) * ITEMS_PER_PAGE
                })
                if (error) throw error
                setOrders(data?.data || [])
                setTotalCount(data?.count || 0)
            } else {
                // Regular PostgREST query with server-side pagination
                let query = supabase
                    .from('orders')
                    .select('*, layanan(judul_tugas), profiles(full_name, phone)', { count: 'exact' })
                    .order('created_at', { ascending: false })

                if (statusFilter === 'Menunggu Verifikasi') {
                    query = query.eq('status_pembayaran', 'Menunggu Verifikasi')
                } else if (statusFilter !== 'Semua') {
                    query = query.eq('status_pekerjaan', statusFilter)
                }

                if (dateFrom) query = query.gte('created_at', dateFrom)
                if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

                const from = (page - 1) * ITEMS_PER_PAGE
                const to = from + ITEMS_PER_PAGE - 1
                query = query.range(from, to)

                const { data, error, count } = await query
                if (error) throw error
                setOrders(data || [])
                setTotalCount(count || 0)
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err)
            toast.error('Gagal memuat data order')
        } finally {
            setLoading(false)
        }
    }, [currentPage, filter, search])

    useEffect(() => {
        fetchOrders()
        const channel = supabase
            .channel('orders-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { toast.info('🔔 Order baru masuk!'); fetchOrders() })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updated = payload.new
                if (updated.status_pembayaran === 'Menunggu Verifikasi') {
                    toast.info('💳 Ada bukti pembayaran baru!')
                }
                fetchOrders()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    // Refetch when filter or page changes
    useEffect(() => { fetchOrders(currentPage, filter, search) }, [filter, currentPage, dateFrom, dateTo])

    // Debounced search
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            setCurrentPage(1)
            fetchOrders(1, filter, search)
        }, 350)
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    }, [search])

    const handleVerifikasi = async (orderId, accept) => {
        const { error } = await supabase.from('orders').update({ status_pembayaran: accept ? 'Lunas' : 'Belum Bayar', ...(accept ? {} : { bukti_transfer_url: null }) }).eq('id', orderId)
        if (error) { toast.error('Gagal verifikasi: ' + error.message); return }
        toast.success(accept ? 'Pembayaran diterima ✅' : 'Pembayaran ditolak')
        fetchOrders(); setShowBukti(null)
    }

    const handleUpdateStatus = async (orderId, newStatus) => {
        const { error } = await supabase.from('orders').update({ status_pekerjaan: newStatus }).eq('id', orderId)
        if (error) { toast.error('Gagal update status: ' + error.message); return }
        toast.success(`Status diubah ke "${newStatus}"`)
        fetchOrders()
    }

    // Open upload modal
    const openUploadModal = (order) => {
        setUploadModal(order)
        setUploadFiles([])
        setUploadNote(order.catatan_hasil || '')
    }

    // Handle multi-file upload
    const handleUploadHasil = async () => {
        setUploading(true)
        try {
            const existingFiles = uploadModal.hasil_files || []
            const newFiles = []

            for (const file of uploadFiles) {
                if (file.size > 50 * 1024 * 1024) { toast.error(`${file.name} terlalu besar (max 50MB)`); continue }
                const ext = file.name.split('.').pop()
                const fileName = `hasil/${uploadModal.id}/${Date.now()}_${file.name}`
                const { error: upErr } = await supabase.storage.from('bukti-transfer').upload(fileName, file)
                if (upErr) { toast.error(`Gagal upload ${file.name}`); continue }
                const { data: { publicUrl } } = supabase.storage.from('bukti-transfer').getPublicUrl(fileName)
                newFiles.push({ name: file.name, url: publicUrl, size: file.size, type: file.type, uploaded_at: new Date().toISOString() })
            }

            const allFiles = [...existingFiles, ...newFiles]
            await supabase.from('orders').update({
                hasil_files: allFiles,
                hasil_url: allFiles.length > 0 ? allFiles[0].url : null,
                catatan_hasil: uploadNote || null,
            }).eq('id', uploadModal.id)

            toast.success(`${newFiles.length} file berhasil diupload!`)
            fetchOrders()
            setUploadModal(null)
        } catch (err) { toast.error('Gagal upload: ' + err.message) }
        finally { setUploading(false) }
    }

    // Save note only
    const handleSaveNote = async () => {
        await supabase.from('orders').update({ catatan_hasil: uploadNote || null }).eq('id', uploadModal.id)
        toast.success('Catatan tersimpan')
        fetchOrders()
        setUploadModal(null)
    }

    const isDeadlineSoon = (d) => { if (!d) return false; const diff = new Date(d) - new Date(); return diff > 0 && diff < 86400000 * 3 }
    const isUrgent = (d) => { if (!d) return false; const diff = new Date(d) - new Date(); return diff > 0 && diff < 86400000 }
    const isOverdue = (d) => d && new Date(d) < new Date()

    const getDaysLeft = (d) => {
        if (!d) return null
        const diff = new Date(d) - new Date()
        if (diff < 0) return 'Terlambat'
        const days = Math.floor(diff / 86400000)
        const hours = Math.floor((diff % 86400000) / 3600000)
        if (days === 0) return `${hours}j lagi`
        return `${days}h lagi`
    }

    const saveCatatanInternal = async () => {
        if (!catatanModal) return
        setSavingCatatan(true)
        try {
            await supabase.from('orders').update({ catatan_internal: catatanText || null }).eq('id', catatanModal.id)
            toast.success('Catatan internal tersimpan')
            fetchOrders()
            setCatatanModal(null)
        } catch (err) { toast.error('Gagal menyimpan: ' + err.message) }
        finally { setSavingCatatan(false) }
    }

    const filters = ['Semua', 'Menunggu Verifikasi', 'Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai']

    const exportCSV = async () => {
        try {
            let query = supabase
                .from('orders')
                .select('*, layanan(judul_tugas), profiles(full_name)')
                .order('created_at', { ascending: false })

            if (filter === 'Menunggu Verifikasi') {
                query = query.eq('status_pembayaran', 'Menunggu Verifikasi')
            } else if (filter !== 'Semua') {
                query = query.eq('status_pekerjaan', filter)
            }

            const { data, error } = await query
            if (error) throw error

            const header = 'Tanggal,Klien,Layanan,Status Pekerjaan,Status Pembayaran,Harga Final,Diskon,Kode Promo,Deadline\n'
            const rows = (data || []).map(o =>
                [
                    new Date(o.created_at).toLocaleDateString('id-ID'),
                    o.profiles?.full_name || '-',
                    o.layanan?.judul_tugas || '-',
                    o.status_pekerjaan || '-',
                    o.status_pembayaran || '-',
                    o.harga_final || 0,
                    o.diskon || 0,
                    o.kode_promo || '-',
                    o.tenggat_waktu ? new Date(o.tenggat_waktu).toLocaleDateString('id-ID') : '-',
                ].join(',')
            ).join('\n')

            const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `orders_${filter.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('CSV berhasil diexport!')
        } catch (err) {
            toast.error('Gagal export CSV: ' + err.message)
        }
    }

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-primary-light" /> Manajemen Order
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{totalOrderCount} total order</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari klien / tugas..."
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all text-sm" />
                    </div>
                    <button onClick={exportCSV} title="Export CSV"
                        className="p-2.5 rounded-xl glass text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
                        <FileDown className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowDateFilter(!showDateFilter)} title="Filter Tanggal"
                        className={`p-2.5 rounded-xl transition-all shrink-0 ${showDateFilter ? 'bg-primary/20 text-primary-light' : 'glass text-slate-400 hover:text-white hover:bg-white/10'}`}>
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Date range filter */}
            {showDateFilter && (
                <div className="glass rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-400">Dari:</span>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50" />
                    <span className="text-sm text-slate-400">Sampai:</span>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50" />
                    {(dateFrom || dateTo) && (
                        <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                            Reset
                        </button>
                    )}
                </div>
            )}

            {/* Filters — segmented control */}
            <div className="mb-6 overflow-x-auto pb-1">
                <div className="segmented-tab-container inline-flex">
                    {filters.map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`segmented-tab-item flex items-center gap-1.5 ${filter === f ? 'active' : ''}`}>
                            {f === 'Menunggu Verifikasi' && <AlertTriangle className="w-3 h-3" />}
                            {f}
                            {f === 'Menunggu Verifikasi' && pendingVerifyCount > 0 && (
                                <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-yellow-500 text-black text-[10px] flex items-center justify-center font-bold badge-pulse leading-none">
                                    {pendingVerifyCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl p-5 h-20 animate-pulse" />)}</div>
            ) : orders.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Tidak ada order</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => {
                        const hasHasil = (order.hasil_files?.length > 0) || order.hasil_url || order.catatan_hasil
                        return (
                            <div key={order.id} className={`glass card-table p-5 transition-all hover:bg-white/[0.03] ${isOverdue(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'border border-red-500/30' :
                                isDeadlineSoon(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'border border-yellow-500/30' : ''
                                }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="text-base font-semibold text-white truncate">{order.layanan?.judul_tugas}</h3>
                                            {order.rating && <span className="flex items-center gap-0.5 text-xs text-yellow-400"><Star className="w-3 h-3 fill-yellow-400" />{order.rating}</span>}
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            👤 {order.profiles?.full_name} • {new Date(order.created_at).toLocaleDateString('id-ID')}
                                            {order.tenggat_waktu && (
                                                <span className={isOverdue(order.tenggat_waktu) ? ' text-red-400' : isDeadlineSoon(order.tenggat_waktu) ? ' text-yellow-400' : ''}>
                                                    {' '}• 📅 {new Date(order.tenggat_waktu).toLocaleDateString('id-ID')}
                                                    {isOverdue(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) && ' ⚠️ TERLAMBAT'}
                                                    {isDeadlineSoon(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) && ' ⚠️ H-1'}
                                                </span>
                                            )}
                                        </p>
                                        {order.detail_tambahan && <p className="text-xs text-slate-500 mt-1 truncate">📝 {order.detail_tambahan}</p>}
                                        {order.jumlah_revisi > 0 && <p className="text-xs text-blue-400 mt-0.5">🔄 Revisi ke-{order.jumlah_revisi}</p>}
                                        {hasHasil && <p className="text-xs text-green-400 mt-0.5">✅ Hasil: {order.hasil_files?.length || 1} file</p>}
                                        {order.review && <p className="text-xs text-yellow-400/70 mt-0.5 truncate">💬 "{order.review}"</p>}
                                        <div className="flex items-center gap-3 mt-1">
                                            {order.order_files?.length > 0 && (
                                                <button onClick={() => setViewOrderFiles(order)} className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                                    <Paperclip className="w-3 h-3" /> {order.order_files.length} lampiran klien
                                                </button>
                                            )}
                                            {order.catatan_internal && (
                                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                                    <StickyNote className="w-3 h-3" /> Ada catatan internal
                                                </span>
                                            )}
                                            {order.tenggat_waktu && !['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                                <span className={`flex items-center gap-1 text-xs font-medium ${
                                                    isOverdue(order.tenggat_waktu) ? 'text-red-400' :
                                                    isUrgent(order.tenggat_waktu) ? 'text-orange-400' :
                                                    isDeadlineSoon(order.tenggat_waktu) ? 'text-yellow-400' : 'text-slate-500'
                                                }`}>
                                                    <Clock className="w-3 h-3" /> {getDaysLeft(order.tenggat_waktu)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <StatusBadge status={order.status_pekerjaan} />
                                        <StatusBadge status={order.status_pembayaran} />
                                        <span className="text-sm font-bold gradient-text">{formatRupiah(order.harga_final)}</span>

                                        {order.bukti_transfer_url && (
                                            <button onClick={() => setShowBukti(order)} className="p-2 rounded-lg text-slate-400 hover:text-primary-light hover:bg-primary/10 transition-all" title="Lihat Bukti Bayar">
                                                <ImageIcon className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* View Hasil */}
                                        {hasHasil && (
                                            <button onClick={() => setViewHasil(order)} className="p-2 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-all" title="Lihat Hasil">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Upload Hasil */}
                                        {order.status_pekerjaan !== 'Batal' && (
                                            <button onClick={() => openUploadModal(order)} className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Upload Hasil Tugas">
                                                <Upload className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Chat (#33) */}
                                        <button onClick={() => setChatOrder(order)} className="p-2 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all" title="Diskusi dengan Klien">
                                            <MessageCircle className="w-4 h-4" />
                                        </button>

                                        {/* Catatan Internal */}
                                        <button onClick={() => { setCatatanModal(order); setCatatanText(order.catatan_internal || '') }}
                                            className={`p-2 rounded-lg transition-all ${order.catatan_internal ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                                            title="Catatan Internal">
                                            <StickyNote className="w-4 h-4" />
                                        </button>

                                        {!['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                            <select value={order.status_pekerjaan} onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 cursor-pointer">
                                                {STATUS_PEKERJAAN.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {totalCount > ITEMS_PER_PAGE && (
                <Pagination currentPage={currentPage} totalItems={totalCount} onPageChange={setCurrentPage} />
            )}

            {/* Bukti Transfer Modal */}
            <Modal open={!!showBukti} onClose={() => setShowBukti(null)} title="Bukti Transfer" maxWidth="max-w-lg">
                {showBukti && (
                    <>
                        <p className="text-sm text-slate-400 mb-1">{showBukti.profiles?.full_name} — {showBukti.layanan?.judul_tugas}</p>
                        <p className="text-lg font-bold gradient-text mb-4">{formatRupiah(showBukti.harga_final)}</p>
                        <img src={showBukti.bukti_transfer_url} alt="Bukti" className="w-full max-h-80 object-contain rounded-xl bg-black/20 mb-4" />
                        {showBukti.status_pembayaran === 'Menunggu Verifikasi' && (
                            <div className="flex gap-3">
                                <button onClick={() => handleVerifikasi(showBukti.id, true)} className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-medium hover:bg-green-500/30 transition-all flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Terima
                                </button>
                                <button onClick={() => handleVerifikasi(showBukti.id, false)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all flex items-center justify-center gap-2">
                                    <XCircle className="w-4 h-4" /> Tolak
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* Upload Hasil Modal */}
            <Modal open={!!uploadModal} onClose={() => setUploadModal(null)} title="Upload Hasil Tugas" maxWidth="max-w-lg" scrollable>
                {uploadModal && (
                    <>
                        <p className="text-sm text-slate-400 mb-4">{uploadModal.layanan?.judul_tugas} — {uploadModal.profiles?.full_name}</p>

                        {/* Existing files */}
                        {uploadModal.hasil_files?.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2">File yang sudah diupload:</p>
                                <div className="space-y-2">
                                    {uploadModal.hasil_files.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                                            <span className="text-sm text-slate-300 truncate flex-1">{getFileIcon(f.name)} {f.name}</span>
                                            <span className="text-xs text-slate-500 shrink-0 ml-2">{formatSize(f.size)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File picker */}
                        <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 cursor-pointer transition-all group mb-4">
                            <input type="file" multiple className="hidden" onChange={(e) => setUploadFiles(Array.from(e.target.files))} />
                            <Upload className="w-8 h-8 text-slate-500 group-hover:text-primary-light transition-colors mb-2" />
                            <span className="text-sm text-slate-400 group-hover:text-slate-300">Klik untuk pilih file</span>
                            <span className="text-xs text-slate-600 mt-1">Gambar, Dokumen, ZIP (max 50MB per file)</span>
                        </label>

                        {/* Selected files preview */}
                        {uploadFiles.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {uploadFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                                        <span className="text-sm text-primary-light truncate flex-1">{getFileIcon(f.name)} {f.name}</span>
                                        <span className="text-xs text-slate-500 shrink-0 ml-2">{formatSize(f.size)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Catatan */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Catatan / Link (opsional)</label>
                            <textarea value={uploadNote} onChange={(e) => setUploadNote(e.target.value)} rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none"
                                placeholder="Contoh: Link Google Drive, catatan penting, atau instruksi..." />
                        </div>

                        <div className="flex gap-3">
                            {uploadFiles.length > 0 ? (
                                <button onClick={handleUploadHasil} disabled={uploading}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /> Upload {uploadFiles.length} File</>}
                                </button>
                            ) : (
                                <button onClick={handleSaveNote}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                    <FileText className="w-5 h-5" /> Simpan Catatan
                                </button>
                            )}
                        </div>
                    </>
                )}
            </Modal>

            {/* View Hasil Modal */}
            <Modal open={!!viewHasil} onClose={() => setViewHasil(null)} title="Hasil Tugas" maxWidth="max-w-lg" scrollable>
                {viewHasil && (
                    <>
                        <p className="text-sm text-slate-400 mb-4">{viewHasil.layanan?.judul_tugas} — {viewHasil.profiles?.full_name}</p>

                        {/* Files */}
                        {viewHasil.hasil_files?.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {viewHasil.hasil_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">{getFileIcon(f.name)}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-white truncate group-hover:text-primary-light transition-colors">{f.name}</p>
                                                <p className="text-xs text-slate-500">{formatSize(f.size)}</p>
                                            </div>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-500 group-hover:text-primary-light shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : viewHasil.hasil_url && (
                            <a href={viewHasil.hasil_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all mb-4">
                                <Download className="w-4 h-4" /> Download File
                            </a>
                        )}

                        {/* Catatan */}
                        {viewHasil.catatan_hasil && (
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-xs text-slate-500 mb-1">Catatan dari Admin:</p>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">{viewHasil.catatan_hasil}</p>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* Chat Modal (#33) */}
            <Modal open={!!chatOrder} onClose={() => setChatOrder(null)} title={chatOrder ? `Diskusi — ${chatOrder.layanan?.judul_tugas}` : ''} maxWidth="max-w-lg" scrollable>
                {chatOrder && <OrderChat orderId={chatOrder.id} />}
            </Modal>

            {/* Catatan Internal Modal */}
            <Modal open={!!catatanModal} onClose={() => setCatatanModal(null)} title="Catatan Internal" maxWidth="max-w-md">
                {catatanModal && (
                    <>
                        <p className="text-sm text-slate-400 mb-3">{catatanModal.layanan?.judul_tugas} — {catatanModal.profiles?.full_name}</p>
                        <textarea value={catatanText} onChange={(e) => setCatatanText(e.target.value)} rows={5}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none mb-4"
                            placeholder="Tulis catatan internal di sini (hanya admin yang bisa melihat)..." />
                        <button onClick={saveCatatanInternal} disabled={savingCatatan}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {savingCatatan ? <Loader2 className="w-5 h-5 animate-spin" /> : <><StickyNote className="w-5 h-5" /> Simpan Catatan</>}
                        </button>
                    </>
                )}
            </Modal>

            {/* View Order Files (Client Attachments) Modal */}
            <Modal open={!!viewOrderFiles} onClose={() => setViewOrderFiles(null)} title="Lampiran dari Klien" maxWidth="max-w-md" scrollable>
                {viewOrderFiles && (
                    <>
                        <p className="text-sm text-slate-400 mb-3">{viewOrderFiles.layanan?.judul_tugas} — {viewOrderFiles.profiles?.full_name}</p>
                        {viewOrderFiles.order_files?.length > 0 ? (
                            <div className="space-y-2">
                                {viewOrderFiles.order_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">{getFileIcon(f.name)}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-white truncate group-hover:text-primary-light transition-colors">{f.name}</p>
                                                {f.size && <p className="text-xs text-slate-500">{formatSize(f.size)}</p>}
                                            </div>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-500 group-hover:text-primary-light shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">Tidak ada lampiran</p>
                        )}
                    </>
                )}
            </Modal>
        </div>
    )
}
