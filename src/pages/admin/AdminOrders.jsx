import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import OrderChat from '../../components/OrderChat'
import { formatRupiah } from '../../lib/utils'
import { getFileIcon, formatSize } from '../../lib/constants'
import StatusBadge from '../../components/StatusBadge'
import {
    ClipboardText, MagnifyingGlass, CheckCircle, XCircle, X, Image as ImageIcon,
    SpinnerGap, Warning, UploadSimple, Star, FileText, DownloadSimple, Eye,
    ChatCircle, Note, Paperclip, Funnel, Clock, ArrowsDownUp, SortDescending
} from '@phosphor-icons/react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

import { useAuth } from '../../contexts/AuthContext'

const STATUS_PEKERJAAN = ['Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai', 'Batal']

export default function AdminOrders() {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [unreadChats, setUnreadChats] = useState(new Set())
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
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE)

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

            const [{ count: allCount }, { count: pvCount }] = await Promise.all([
                supabase.from('orders').select('id', { count: 'exact', head: true }),
                supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status_pembayaran', 'Menunggu Verifikasi'),
            ])
            setTotalOrderCount(allCount || 0)
            setPendingVerifyCount(pvCount || 0)

            if (user) {
                const { data: notifData } = await supabase
                    .from('notifications')
                    .select('data')
                    .eq('user_id', user.id)
                    .eq('type', 'chat_message')
                    .eq('is_read', false)
                if (notifData) {
                    setUnreadChats(new Set(notifData.map(n => n.data?.order_id).filter(Boolean)))
                }
            }

            if (searchTerm.trim()) {
                const { data, error } = await supabase.rpc('search_orders', {
                    p_term: searchTerm.trim(),
                    p_status: statusFilter,
                    p_limit: itemsPerPage,
                    p_offset: (page - 1) * itemsPerPage
                })
                if (error) throw error
                setOrders(data?.data || [])
                setTotalCount(data?.count || 0)
            } else {
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

                const from = (page - 1) * itemsPerPage
                const to = from + itemsPerPage - 1
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
    }, [currentPage, filter, search, itemsPerPage])

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

    useEffect(() => { fetchOrders(currentPage, filter, search) }, [filter, currentPage, dateFrom, dateTo, itemsPerPage])

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            setCurrentPage(1)
            fetchOrders(1, filter, search)
        }, 350)
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    }, [search])

    const handleVerifikasi = async (orderId, accept) => {
        const updateData = accept
            ? { status_pembayaran: 'Lunas', status_pekerjaan: 'Sedang Dikerjakan' }
            : { status_pembayaran: 'Belum Bayar', bukti_transfer_url: null }

        const { error } = await supabase.from('orders').update(updateData).eq('id', orderId)
        if (error) { toast.error('Gagal verifikasi: ' + error.message); return }
        toast.success(accept ? 'Pembayaran diterima & Order mulai dikerjakan ✅' : 'Pembayaran ditolak')
        fetchOrders(); setShowBukti(null)
    }

    const handleUpdateStatus = async (orderId, newStatus) => {
        const { error } = await supabase.from('orders').update({ status_pekerjaan: newStatus }).eq('id', orderId)
        if (error) { toast.error('Gagal update status: ' + error.message); return }
        toast.success(`Status diubah ke "${newStatus}"`)
        fetchOrders()
    }

    const openUploadModal = (order) => {
        setUploadModal(order)
        setUploadFiles([])
        setUploadNote(order.catatan_hasil || '')
    }

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

    const handleSaveNote = async () => {
        await supabase.from('orders').update({ catatan_hasil: uploadNote || null }).eq('id', uploadModal.id)
        toast.success('Catatan tersimpan')
        fetchOrders()
        setUploadModal(null)
    }

    const isDeadlineSoon = (d) => { if (!d) return false; const diff = new Date(d) - new Date(); return diff > 0 && diff < 86400000 * 3 }
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h2 className="text-lg font-bold">Daftar Pesanan Tugas</h2>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => setShowDateFilter(!showDateFilter)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${showDateFilter ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Funnel weight="bold" className="w-4 h-4" /> Filter
                        </button>
                        <button onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-colors shadow-sm border border-brand-100">
                            <DownloadSimple className="w-4 h-4" /> Unduh CSV
                        </button>
                    </div>
                </div>

                {/* Date range filter */}
                {showDateFilter && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
                        <span className="text-sm text-slate-500">Dari:</span>
                        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-brand-300" />
                        <span className="text-sm text-slate-500">Sampai:</span>
                        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-brand-300" />
                        {(dateFrom || dateTo) && (
                            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-red-500 hover:text-red-600 transition-colors font-medium">
                                Reset
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs & Filters */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {filters.map(f => (
                            <button key={f} onClick={() => { setFilter(f); setCurrentPage(1) }}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${filter === f ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {f === 'Menunggu Verifikasi' && <Warning weight="bold" className="w-3 h-3 inline mr-1" />}
                                {f}
                                {f === 'Menunggu Verifikasi' && pendingVerifyCount > 0 && (
                                    <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] inline-flex items-center justify-center font-bold leading-none">
                                        {pendingVerifyCount}
                                    </span>
                                )}
                                {f === 'Semua' && <span className="ml-1 text-slate-400">({totalCount})</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari ID atau judul..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand-100 outline-none" />
                        </div>
                        <button className="p-2 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100">
                            <SortDescending className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Orders Table */}
                {loading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-50 animate-pulse" />)}</div>
                ) : orders.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClipboardText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-500">Tidak ada order</h3>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-400 text-xs font-medium border-b border-slate-100">
                                        <th className="pb-3 px-2 font-normal">ID Tugas <ArrowsDownUp className="w-3 h-3 ml-1 inline-block" /></th>
                                        <th className="pb-3 px-2 font-normal">Layanan / Jenis <ArrowsDownUp className="w-3 h-3 ml-1 inline-block" /></th>
                                        <th className="pb-3 px-2 font-normal">Klien</th>
                                        <th className="pb-3 px-2 font-normal">Deadline <ArrowsDownUp className="w-3 h-3 ml-1 inline-block" /></th>
                                        <th className="pb-3 px-2 font-normal">Harga (Rp) <ArrowsDownUp className="w-3 h-3 ml-1 inline-block" /></th>
                                        <th className="pb-3 px-2 font-normal">Pembayaran</th>
                                        <th className="pb-3 px-2 font-normal">Status</th>
                                        <th className="pb-3 px-2 font-normal">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {orders.map(order => {
                                        const hasHasil = (order.hasil_files?.length > 0) || order.hasil_url || order.catatan_hasil
                                        const deadlineClass = isOverdue(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'text-red-500 font-medium' :
                                            isDeadlineSoon(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'text-amber-500' : 'text-slate-500'
                                        const paymentClass = order.status_pembayaran === 'Lunas' ? 'text-emerald-500' :
                                            order.status_pembayaran === 'Menunggu Verifikasi' ? 'text-amber-500' :
                                                order.status_pembayaran === 'Belum Bayar' ? 'text-red-400' : 'text-slate-500'
                                        return (
                                            <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                                <td className="py-4 px-2 font-medium text-slate-700 whitespace-nowrap">#{order.id.substring(0, 6).toUpperCase()}</td>
                                                <td className="py-4 px-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base shrink-0">📋</div>
                                                        <div className="min-w-0">
                                                            <span className="font-medium block truncate max-w-[200px]">{order.layanan?.judul_tugas || '-'}</span>
                                                            {order.detail_tambahan && <span className="text-xs text-slate-400 block truncate max-w-[200px]">{order.detail_tambahan}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-slate-600 whitespace-nowrap">
                                                    <div>{order.profiles?.full_name || '-'}</div>
                                                    {order.rating && (
                                                        <div className="flex flex-col mt-1">
                                                            <div className="flex items-center gap-1">
                                                                <Star weight="fill" className="w-3 h-3 text-amber-500" />
                                                                <span className="text-xs text-slate-500 font-medium">{order.rating}/5</span>
                                                            </div>
                                                            {order.review && (
                                                                <span className="text-[10px] text-slate-400 max-w-[120px] truncate block" title={order.review}>
                                                                    "{order.review}"
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-2 whitespace-nowrap">
                                                    <span className={deadlineClass}>
                                                        {order.tenggat_waktu ? new Date(order.tenggat_waktu).toLocaleDateString('id-ID') : '-'}
                                                    </span>
                                                    {order.tenggat_waktu && !['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                                        <span className={`block text-[10px] ${deadlineClass}`}>{getDaysLeft(order.tenggat_waktu)}</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-2 font-medium whitespace-nowrap">{formatRupiah(order.harga_final)}</td>
                                                <td className="py-4 px-2 whitespace-nowrap"><span className={`font-medium ${paymentClass}`}>{order.status_pembayaran}</span></td>
                                                <td className="py-4 px-2"><StatusBadge status={order.status_pekerjaan} /></td>
                                                <td className="py-4 px-2">
                                                    <div className="flex items-center gap-0.5">
                                                        {order.bukti_transfer_url && (
                                                            <button onClick={() => setShowBukti(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all" title="Bukti Bayar">
                                                                <ImageIcon weight="bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {hasHasil && (
                                                            <button onClick={() => setViewHasil(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Lihat Hasil">
                                                                <Eye weight="bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {order.status_pekerjaan !== 'Batal' && order.status_pembayaran === 'Lunas' && (
                                                            <button onClick={() => openUploadModal(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Upload Hasil">
                                                                <UploadSimple weight="bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button onClick={() => setChatOrder(order)} className="relative p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all" title="Chat">
                                                            <ChatCircle weight="bold" className="w-3.5 h-3.5" />
                                                            {unreadChats.has(order.id) && (
                                                                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
                                                            )}
                                                        </button>
                                                        <button onClick={() => { setCatatanModal(order); setCatatanText(order.catatan_internal || '') }}
                                                            className={`p-1.5 rounded-lg transition-all ${order.catatan_internal ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                                            title="Catatan Internal">
                                                            <Note weight={order.catatan_internal ? 'fill' : 'bold'} className="w-3.5 h-3.5" />
                                                        </button>
                                                        {order.order_files?.length > 0 && (
                                                            <button onClick={() => setViewOrderFiles(order)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Lampiran Klien">
                                                                <Paperclip weight="bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {!['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                                            <select value={order.status_pekerjaan} onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                                className="ml-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-brand-300 cursor-pointer">
                                                                {STATUS_PEKERJAAN.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card view */}
                        <div className="md:hidden space-y-3">
                            {orders.map(order => {
                                const deadlineClass = isOverdue(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'text-red-500 font-medium' :
                                    isDeadlineSoon(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'text-amber-500' : 'text-slate-500'
                                const paymentClass = order.status_pembayaran === 'Lunas' ? 'text-emerald-500' :
                                    order.status_pembayaran === 'Menunggu Verifikasi' ? 'text-amber-500' :
                                        order.status_pembayaran === 'Belum Bayar' ? 'text-red-400' : 'text-slate-500'
                                return (
                                    <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                                        {/* Row 1: Service + status */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 truncate">{order.layanan?.judul_tugas || '-'}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">#{order.id.substring(0, 6).toUpperCase()}</p>
                                            </div>
                                            <StatusBadge status={order.status_pekerjaan} />
                                        </div>
                                        {/* Row 2: Client */}
                                        <div>
                                            <p className="text-sm text-slate-500">{order.profiles?.full_name || '-'}</p>
                                            {order.rating && (
                                                <div className="flex flex-col mt-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <Star weight="fill" className="w-3 h-3 text-amber-500" />
                                                        <span className="text-xs text-slate-500 font-medium">{order.rating}/5</span>
                                                    </div>
                                                    {order.review && (
                                                        <span className="text-xs text-slate-400 line-clamp-2 mt-0.5" title={order.review}>
                                                            "{order.review}"
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* Row 3: Price + payment */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-brand-600">{formatRupiah(order.harga_final)}</span>
                                            <span className={`text-xs font-medium ${paymentClass}`}>{order.status_pembayaran}</span>
                                        </div>
                                        {/* Row 4: Deadline */}
                                        {order.tenggat_waktu && (
                                            <p className={`text-xs ${deadlineClass}`}>
                                                Deadline: {new Date(order.tenggat_waktu).toLocaleDateString('id-ID')}
                                                {!['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                                    <span className="ml-1">({getDaysLeft(order.tenggat_waktu)})</span>
                                                )}
                                            </p>
                                        )}
                                        {/* Row 5: Action select */}
                                        {!['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                            <select value={order.status_pekerjaan} onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-brand-300 cursor-pointer">
                                                {STATUS_PEKERJAAN.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        )}
                                        {/* Row 6: Icon actions */}
                                        <div className="flex items-center gap-1 pt-1 border-t border-slate-50">
                                            {order.bukti_transfer_url && (
                                                <button onClick={() => setShowBukti(order)} className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all" title="Bukti Bayar">
                                                    <ImageIcon weight="bold" className="w-4 h-4" />
                                                </button>
                                            )}
                                            {((order.hasil_files?.length > 0) || order.hasil_url || order.catatan_hasil) && (
                                                <button onClick={() => setViewHasil(order)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Lihat Hasil">
                                                    <Eye weight="bold" className="w-4 h-4" />
                                                </button>
                                            )}
                                            {order.status_pekerjaan !== 'Batal' && (
                                                <button onClick={() => openUploadModal(order)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Upload Hasil">
                                                    <UploadSimple weight="bold" className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => setChatOrder(order)} className="relative p-2 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all" title="Chat">
                                                <ChatCircle weight="bold" className="w-4 h-4" />
                                                {unreadChats.has(order.id) && (
                                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                                )}
                                            </button>
                                            <button onClick={() => { setCatatanModal(order); setCatatanText(order.catatan_internal || '') }}
                                                className={`p-2 rounded-lg transition-all ${order.catatan_internal ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                                title="Catatan Internal">
                                                <Note weight={order.catatan_internal ? 'fill' : 'bold'} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                <Pagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1) }} />
            </div>

            {/* Bukti Transfer Modal */}
            <Modal open={!!showBukti} onClose={() => setShowBukti(null)} title="Bukti Transfer" maxWidth="max-w-lg">
                {showBukti && (
                    <>
                        <p className="text-sm text-slate-500 mb-1">{showBukti.profiles?.full_name} — {showBukti.layanan?.judul_tugas}</p>
                        <p className="text-lg font-bold text-brand-600 mb-4">{formatRupiah(showBukti.harga_final)}</p>
                        <img src={showBukti.bukti_transfer_url} alt="Bukti" className="w-full max-h-80 object-contain rounded-xl bg-slate-50 mb-4" />
                        {showBukti.status_pembayaran === 'Menunggu Verifikasi' && (
                            <div className="flex gap-3">
                                <button onClick={() => handleVerifikasi(showBukti.id, true)} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                    <CheckCircle weight="bold" className="w-4 h-4" /> Terima
                                </button>
                                <button onClick={() => handleVerifikasi(showBukti.id, false)} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                                    <XCircle weight="bold" className="w-4 h-4" /> Tolak
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
                        <p className="text-sm text-slate-500 mb-4">{uploadModal.layanan?.judul_tugas} — {uploadModal.profiles?.full_name}</p>

                        {uploadModal.hasil_files?.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-400 mb-2">File yang sudah diupload:</p>
                                <div className="space-y-2">
                                    {uploadModal.hasil_files.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                                            <span className="text-sm text-slate-600 truncate flex-1">{getFileIcon(f.name)} {f.name}</span>
                                            <span className="text-xs text-slate-400 shrink-0 ml-2">{formatSize(f.size)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-300 cursor-pointer transition-all group mb-4">
                            <input type="file" multiple className="hidden" onChange={(e) => setUploadFiles(Array.from(e.target.files))} />
                            <UploadSimple className="w-8 h-8 text-slate-400 group-hover:text-brand-500 transition-colors mb-2" />
                            <span className="text-sm text-slate-500 group-hover:text-slate-700">Klik untuk pilih file</span>
                            <span className="text-xs text-slate-400 mt-1">Gambar, Dokumen, ZIP (max 50MB per file)</span>
                        </label>

                        {uploadFiles.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {uploadFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-brand-50 border border-brand-100">
                                        <span className="text-sm text-brand-600 truncate flex-1">{getFileIcon(f.name)} {f.name}</span>
                                        <span className="text-xs text-slate-400 shrink-0 ml-2">{formatSize(f.size)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Catatan / Link (opsional)</label>
                            <textarea value={uploadNote} onChange={(e) => setUploadNote(e.target.value)} rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
                                placeholder="Contoh: Link Google Drive, catatan penting, atau instruksi..." />
                        </div>

                        <div className="flex gap-3">
                            {uploadFiles.length > 0 ? (
                                <button onClick={handleUploadHasil} disabled={uploading}
                                    className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {uploading ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><UploadSimple weight="bold" className="w-5 h-5" /> Upload {uploadFiles.length} File</>}
                                </button>
                            ) : (
                                <button onClick={handleSaveNote}
                                    className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all flex items-center justify-center gap-2">
                                    <FileText weight="bold" className="w-5 h-5" /> Simpan Catatan
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
                        <p className="text-sm text-slate-500 mb-4">{viewHasil.layanan?.judul_tugas} — {viewHasil.profiles?.full_name}</p>

                        {viewHasil.hasil_files?.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {viewHasil.hasil_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">{getFileIcon(f.name)}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-slate-700 truncate group-hover:text-brand-600 transition-colors">{f.name}</p>
                                                <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
                                            </div>
                                        </div>
                                        <DownloadSimple weight="bold" className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : viewHasil.hasil_url && (
                            <a href={viewHasil.hasil_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all mb-4 font-medium">
                                <DownloadSimple weight="bold" className="w-4 h-4" /> Download File
                            </a>
                        )}

                        {viewHasil.catatan_hasil && (
                            <div className="p-4 rounded-xl bg-slate-50">
                                <p className="text-xs text-slate-400 mb-1">Catatan dari Admin:</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewHasil.catatan_hasil}</p>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* Chat Modal */}
            <Modal open={!!chatOrder} onClose={() => setChatOrder(null)} title={chatOrder ? `Diskusi — ${chatOrder.layanan?.judul_tugas}` : ''} maxWidth="max-w-lg" scrollable>
                {chatOrder && <OrderChat orderId={chatOrder.id} />}
            </Modal>

            {/* Catatan Internal Modal */}
            <Modal open={!!catatanModal} onClose={() => setCatatanModal(null)} title="Catatan Internal" maxWidth="max-w-md">
                {catatanModal && (
                    <>
                        <p className="text-sm text-slate-500 mb-3">{catatanModal.layanan?.judul_tugas} — {catatanModal.profiles?.full_name}</p>
                        <textarea value={catatanText} onChange={(e) => setCatatanText(e.target.value)} rows={5}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all resize-none mb-4"
                            placeholder="Tulis catatan internal di sini (hanya admin yang bisa melihat)..." />
                        <button onClick={saveCatatanInternal} disabled={savingCatatan}
                            className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {savingCatatan ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><Note weight="fill" className="w-5 h-5" /> Simpan Catatan</>}
                        </button>
                    </>
                )}
            </Modal>

            {/* View Order Files Modal */}
            <Modal open={!!viewOrderFiles} onClose={() => setViewOrderFiles(null)} title="Lampiran dari Klien" maxWidth="max-w-md" scrollable>
                {viewOrderFiles && (
                    <>
                        <p className="text-sm text-slate-500 mb-3">{viewOrderFiles.layanan?.judul_tugas} — {viewOrderFiles.profiles?.full_name}</p>
                        {viewOrderFiles.order_files?.length > 0 ? (
                            <div className="space-y-2">
                                {viewOrderFiles.order_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">{getFileIcon(f.name)}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-slate-700 truncate group-hover:text-brand-600 transition-colors">{f.name}</p>
                                                {f.size && <p className="text-xs text-slate-400">{formatSize(f.size)}</p>}
                                            </div>
                                        </div>
                                        <DownloadSimple weight="bold" className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">Tidak ada lampiran</p>
                        )}
                    </>
                )}
            </Modal>
        </div>
    )
}
