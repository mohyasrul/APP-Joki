import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import { Inbox, CheckCircle, XCircle, X, Loader2, Clock, DollarSign, Calendar, FileText, User, Search, Paperclip } from 'lucide-react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

const STATUS_COLORS = {
    pending: 'text-yellow-400 bg-yellow-500/10',
    accepted: 'text-green-400 bg-green-500/10',
    rejected: 'text-red-400 bg-red-500/10',
}
const STATUS_LABEL = { pending: 'Menunggu', accepted: 'Diterima', rejected: 'Ditolak' }

export default function AdminRequests() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [processModal, setProcessModal] = useState(null)
    const [rejectTarget, setRejectTarget] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)

    const [harga, setHarga] = useState('')
    const [catatan, setCatatan] = useState('')
    const [processing, setProcessing] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('Semua')
    const [viewFilesModal, setViewFilesModal] = useState(null)
    const toast = useToast()

    useEffect(() => {
        fetchRequests()

        // Realtime subscription for new requests
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
        setProcessing(true)
        try {
            // Create order for this client
            const { data: order, error: orderErr } = await supabase.from('orders').insert({
                layanan_id: null,
                client_id: processModal.client_id,
                detail_tambahan: `[Custom Request] ${processModal.judul}\n${processModal.deskripsi || ''}${catatan ? '\n\nCatatan admin: ' + catatan : ''}`,
                harga_final: parseInt(harga),
                status_pembayaran: 'Belum Bayar',
                status_pekerjaan: 'Menunggu Diproses',
                tenggat_waktu: processModal.deadline || null,
            }).select().single()
            if (orderErr) throw orderErr

            // Update request status
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Inbox className="w-7 h-7 text-primary-light" /> Custom Requests
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {pendingCount > 0 ? `${pendingCount} request menunggu` : 'Semua request sudah diproses'}
                    </p>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                        placeholder="Cari judul / klien..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all text-sm" />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['Semua', 'Menunggu', 'Diterima', 'Ditolak'].map(tab => (
                    <button key={tab} onClick={() => { setStatusFilter(tab); setCurrentPage(1) }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            statusFilter === tab ? 'bg-primary/20 text-primary-light border border-primary/30' : 'glass text-slate-400 hover:text-white'
                        }`}>
                        {tab}
                        {tab === 'Menunggu' && pendingCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-xs flex items-center justify-center font-bold badge-pulse">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="glass rounded-2xl p-5 h-24 animate-pulse" />)}</div>
            ) : filteredRequests.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">{search ? 'Tidak ditemukan' : 'Belum ada request'}</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedRequests.map(req => (
                        <div key={req.id} className={`glass rounded-2xl p-5 transition-all hover:bg-white/[0.03] ${req.status === 'pending' ? 'border border-yellow-500/20' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-base font-semibold text-white truncate">{req.judul}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                                            {STATUS_LABEL[req.status]}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" /> {req.profiles?.full_name} • {new Date(req.created_at).toLocaleDateString('id-ID')}
                                        {req.deadline && <span> • 📅 {new Date(req.deadline).toLocaleDateString('id-ID')}</span>}
                                    </p>
                                    {req.deskripsi && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.deskripsi}</p>}
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        {(req.budget_min || req.budget_max) && (
                                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                                                <DollarSign className="w-3 h-3" />
                                                Budget: {req.budget_min ? formatRupiah(req.budget_min) : '?'} — {req.budget_max ? formatRupiah(req.budget_max) : '?'}
                                            </span>
                                        )}
                                        {req.lampiran_files?.length > 0 && (
                                            <button onClick={() => setViewFilesModal(req)} className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                                <Paperclip className="w-3 h-3" /> {req.lampiran_files.length} lampiran
                                            </button>
                                        )}
                                    </div>
                                    {req.harga_final && <p className="text-sm font-semibold gradient-text mt-1">{formatRupiah(req.harga_final)}</p>}
                                </div>

                                {req.status === 'pending' && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => { setProcessModal(req); setHarga(''); setCatatan('') }}
                                            className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-all flex items-center gap-1.5">
                                            <CheckCircle className="w-4 h-4" /> Terima
                                        </button>
                                        <button onClick={() => setRejectTarget(req)}
                                            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all flex items-center gap-1.5">
                                            <XCircle className="w-4 h-4" /> Tolak
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredRequests.length > ITEMS_PER_PAGE && (
                <Pagination currentPage={currentPage} totalItems={filteredRequests.length} onPageChange={setCurrentPage} />
            )}

            {/* Accept Modal — Set Price */}
            <Modal open={!!processModal} onClose={() => setProcessModal(null)} title="Terima Request">
                {processModal && (
                    <>
                        {/* Request detail */}
                        <div className="p-4 rounded-xl bg-white/5 mb-4">
                            <p className="text-sm font-semibold text-white mb-1">{processModal.judul}</p>
                            <p className="text-xs text-slate-400">{processModal.profiles?.full_name}</p>
                            {processModal.deskripsi && <p className="text-xs text-slate-500 mt-2">{processModal.deskripsi}</p>}
                            {processModal.deadline && <p className="text-xs text-slate-500 mt-1">📅 Deadline: {new Date(processModal.deadline).toLocaleDateString('id-ID')}</p>}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Harga (Rp) *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                        placeholder="50000" required min="0" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Catatan untuk Klien (opsional)</label>
                                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none"
                                    placeholder="Contoh: Estimasi selesai 3 hari" />
                            </div>
                            <button onClick={handleAccept} disabled={processing}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Terima & Buat Order</>}
                            </button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Reject Confirmation Modal */}
            <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Tolak Request?</h3>
                    <p className="text-sm text-slate-400 mb-6">Request dari <span className="text-white font-medium">{rejectTarget?.profiles?.full_name || 'klien'}</span> akan ditolak.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Batal</button>
                        <button onClick={() => handleReject(rejectTarget)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all">Ya, Tolak</button>
                    </div>
                </div>
            </Modal>

            {/* View Lampiran Modal */}
            <Modal open={!!viewFilesModal} onClose={() => setViewFilesModal(null)} title="Lampiran Request" maxWidth="max-w-md" scrollable>
                {viewFilesModal && (
                    <>
                        <p className="text-sm text-slate-400 mb-3">{viewFilesModal.judul}</p>
                        {viewFilesModal.lampiran_files?.length > 0 ? (
                            <div className="space-y-2">
                                {viewFilesModal.lampiran_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">📎</span>
                                            <p className="text-sm text-white truncate group-hover:text-primary-light transition-colors">{f.name}</p>
                                        </div>
                                        <span className="text-xs text-slate-500 shrink-0 ml-2">{f.size ? Math.round(f.size / 1024) + ' KB' : ''}</span>
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
