import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import { Tray, CheckCircle, XCircle, X, SpinnerGap, Clock, CurrencyDollar, Calendar, FileText, User, MagnifyingGlass, Paperclip, DownloadSimple } from '@phosphor-icons/react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'
import StatusBadge from '../../components/StatusBadge'

const STATUS_LABEL = { pending: 'Menunggu', accepted: 'Diterima', rejected: 'Ditolak' }

export default function AdminRequests() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [processModal, setProcessModal] = useState(null)
    const [rejectTarget, setRejectTarget] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)

    const [harga, setHarga] = useState('')
    const [catatan, setCatatan] = useState('')
    const [deadline, setDeadline] = useState('')
    const [processing, setProcessing] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('Semua')
    const [viewFilesModal, setViewFilesModal] = useState(null)
    const toast = useToast()

    useEffect(() => {
        fetchRequests()

        const channel = supabase
            .channel('admin-requests-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'custom_requests',
            }, () => {
                toast.info('🔔 Request custom baru masuk!')
                fetchRequests()
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'custom_requests',
            }, () => {
                fetchRequests()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('custom_requests')
                .select('*, profiles(full_name, phone)')
                .order('created_at', { ascending: false })
            if (error) throw error
            setRequests(data || [])
        } catch (err) {
            console.error('Failed to fetch requests:', err)
            toast.error('Gagal memuat data request')
        } finally {
            setLoading(false)
        }
    }

    const handleAccept = async () => {
        if (!harga || parseInt(harga) <= 0) { toast.error('Masukkan harga yang valid'); return }
        if (!deadline) { toast.error('Tenggat waktu pengerjaan wajib diatur!'); return }
        setProcessing(true)
        try {
            const { data: order, error: orderErr } = await supabase.from('orders').insert({
                layanan_id: null,
                client_id: processModal.client_id,
                detail_tambahan: `[Custom Request] ${processModal.judul}\n${processModal.deskripsi || ''}${catatan ? '\n\nCatatan admin: ' + catatan : ''}`,
                harga_final: parseInt(harga),
                status_pembayaran: 'Belum Bayar',
                status_pekerjaan: 'Menunggu Diproses',
                tenggat_waktu: deadline,
            }).select().single()
            if (orderErr) throw orderErr

            await supabase.from('custom_requests').update({
                status: 'accepted',
                harga_final: parseInt(harga),
                catatan_admin: catatan || null,
                order_id: order.id,
                updated_at: new Date().toISOString(),
            }).eq('id', processModal.id)

            toast.success('Request diterima! Order khusus dibuat untuk klien.')
            fetchRequests()
            setProcessModal(null)
        } catch (err) { toast.error('Gagal: ' + err.message) }
        finally { setProcessing(false) }
    }

    const handleReject = async (req) => {
        const { error } = await supabase.from('custom_requests').update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
        }).eq('id', req.id)
        if (error) { toast.error('Gagal menolak: ' + error.message); return }
        toast.success('Request ditolak')
        fetchRequests()
        setRejectTarget(null)
    }

    const pendingCount = requests.filter(r => r.status === 'pending').length

    const statusMap = { 'Semua': null, 'Menunggu': 'pending', 'Diterima': 'accepted', 'Ditolak': 'rejected' }
    const filteredRequests = requests.filter(r => {
        const matchSearch = !search.trim() ||
            r.judul?.toLowerCase().includes(search.toLowerCase()) ||
            r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'Semua' || r.status === statusMap[statusFilter]
        return matchSearch && matchStatus
    })
    const paginatedRequests = filteredRequests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    return (
        <div className="fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h2 className="text-lg font-bold">Custom Requests</h2>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
                        {['Semua', 'Menunggu', 'Diterima', 'Ditolak'].map(tab => (
                            <button key={tab} onClick={() => { setStatusFilter(tab); setCurrentPage(1) }}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${statusFilter === tab ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {tab}
                                {tab === 'Menunggu' && pendingCount > 0 && (
                                    <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] inline-flex items-center justify-center font-bold leading-none">{pendingCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                            placeholder="Cari judul / klien..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand-100 outline-none" />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-slate-50 animate-pulse" />)}</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="py-12 text-center">
                        <Tray className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-500">{search ? 'Tidak ditemukan' : 'Belum ada request'}</h3>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-400 text-xs font-medium border-b border-slate-100">
                                        <th className="pb-3 px-2 font-normal">Judul</th>
                                        <th className="pb-3 px-2 font-normal">Klien</th>
                                        <th className="pb-3 px-2 font-normal">Tanggal</th>
                                        <th className="pb-3 px-2 font-normal">Budget</th>
                                        <th className="pb-3 px-2 font-normal">Status</th>
                                        <th className="pb-3 px-2 font-normal">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {paginatedRequests.map(req => (
                                        <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                            <td className="py-4 px-2">
                                                <div className="min-w-0">
                                                    <span className="font-medium block truncate max-w-[200px]">{req.judul}</span>
                                                    {req.deskripsi && <span className="text-xs text-slate-400 block truncate max-w-[200px]">{req.deskripsi}</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-slate-600 whitespace-nowrap">{req.profiles?.full_name || '-'}</td>
                                            <td className="py-4 px-2 text-slate-500 whitespace-nowrap">
                                                {new Date(req.created_at).toLocaleDateString('id-ID')}
                                                {req.deadline && <span className="block text-[10px] text-slate-400">DL: {new Date(req.deadline).toLocaleDateString('id-ID')}</span>}
                                            </td>
                                            <td className="py-4 px-2 whitespace-nowrap">
                                                {(req.budget_min || req.budget_max) ? (
                                                    <span className="text-emerald-600 text-xs font-medium">
                                                        {req.budget_min ? formatRupiah(req.budget_min) : '?'} — {req.budget_max ? formatRupiah(req.budget_max) : '?'}
                                                    </span>
                                                ) : '-'}
                                                {req.harga_final && <span className="block text-sm font-semibold text-brand-600">{formatRupiah(req.harga_final)}</span>}
                                            </td>
                                            <td className="py-4 px-2"><StatusBadge status={req.status} label={STATUS_LABEL[req.status]} /></td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-0.5">
                                                    {req.lampiran_files?.length > 0 && (
                                                        <button onClick={() => setViewFilesModal(req)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Lampiran">
                                                            <Paperclip weight="bold" className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => { setProcessModal(req); setHarga(''); setCatatan(''); setDeadline(req.deadline || '') }}
                                                                className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all" title="Terima">
                                                                <CheckCircle weight="bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setRejectTarget(req)}
                                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all" title="Tolak">
                                                                <XCircle weight="bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card view */}
                        <div className="md:hidden space-y-3">
                            {paginatedRequests.map(req => (
                                <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                                    {/* Row 1: Title + status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-slate-800 line-clamp-2 flex-1">{req.judul}</p>
                                        <StatusBadge status={req.status} label={STATUS_LABEL[req.status]} />
                                    </div>
                                    {/* Row 2: Client + date */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">{req.profiles?.full_name || '-'}</span>
                                        <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    {/* Row 3: Budget */}
                                    {(req.budget_min || req.budget_max) && (
                                        <p className="text-sm font-medium text-emerald-600">
                                            {req.budget_min ? formatRupiah(req.budget_min) : '?'} — {req.budget_max ? formatRupiah(req.budget_max) : '?'}
                                        </p>
                                    )}
                                    {req.harga_final && (
                                        <p className="text-sm font-bold text-brand-600">{formatRupiah(req.harga_final)}</p>
                                    )}
                                    {/* Row 4: Actions */}
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2 pt-1 border-t border-slate-50">
                                            <button onClick={() => { setProcessModal(req); setHarga(''); setCatatan(''); setDeadline(req.deadline || '') }}
                                                className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors">
                                                <CheckCircle weight="bold" className="w-4 h-4" /> Terima
                                            </button>
                                            <button onClick={() => setRejectTarget(req)}
                                                className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors">
                                                <XCircle weight="bold" className="w-4 h-4" /> Tolak
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <Pagination currentPage={currentPage} totalItems={filteredRequests.length} onPageChange={setCurrentPage} />
            </div>

            {/* Accept Modal — Set Price */}
            <Modal open={!!processModal} onClose={() => setProcessModal(null)} title="Terima Request">
                {processModal && (
                    <>
                        <div className="p-4 rounded-xl bg-slate-50 mb-4">
                            <p className="text-sm font-semibold text-slate-800 mb-1">{processModal.judul}</p>
                            <p className="text-xs text-slate-500">{processModal.profiles?.full_name}</p>
                            {processModal.deskripsi && <p className="text-xs text-slate-400 mt-2">{processModal.deskripsi}</p>}
                            {processModal.deadline && <p className="text-xs text-slate-400 mt-1">📅 Request awal klien: {new Date(processModal.deadline).toLocaleDateString('id-ID')}</p>}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Estimasi Selesai (Tenggat Waktu) *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                                        required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Harga (Rp) *</label>
                                <div className="relative">
                                    <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                                        placeholder="50000" required min="0" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Catatan untuk Klien (opsional)</label>
                                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
                                    placeholder="Contoh: Estimasi selesai 3 hari" />
                            </div>
                            <button onClick={handleAccept} disabled={processing}
                                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {processing ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><CheckCircle weight="bold" className="w-5 h-5" /> Terima & Buat Order</>}
                            </button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Reject Confirmation Modal */}
            <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <XCircle weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Tolak Request?</h3>
                    <p className="text-sm text-slate-500 mb-6">Request dari <span className="text-slate-800 font-medium">{rejectTarget?.profiles?.full_name || 'klien'}</span> akan ditolak.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                        <button onClick={() => handleReject(rejectTarget)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Ya, Tolak</button>
                    </div>
                </div>
            </Modal>

            {/* View Lampiran Modal */}
            <Modal open={!!viewFilesModal} onClose={() => setViewFilesModal(null)} title="Lampiran Request" maxWidth="max-w-md" scrollable>
                {viewFilesModal && (
                    <>
                        <p className="text-sm text-slate-500 mb-3">{viewFilesModal.judul}</p>
                        {viewFilesModal.lampiran_files?.length > 0 ? (
                            <div className="space-y-2">
                                {viewFilesModal.lampiran_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">📎</span>
                                            <p className="text-sm text-slate-700 truncate group-hover:text-brand-600 transition-colors">{f.name}</p>
                                        </div>
                                        <span className="text-xs text-slate-400 shrink-0 ml-2">{f.size ? Math.round(f.size / 1024) + ' KB' : ''}</span>
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
