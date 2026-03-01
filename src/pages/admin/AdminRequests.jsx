import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Inbox, CheckCircle, XCircle, X, Loader2, Clock, DollarSign, Calendar, FileText, User } from 'lucide-react'

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
    const [harga, setHarga] = useState('')
    const [catatan, setCatatan] = useState('')
    const [processing, setProcessing] = useState(false)
    const toast = useToast()

    useEffect(() => { fetchRequests() }, [])

    const fetchRequests = async () => {
        const { data } = await supabase
            .from('custom_requests')
            .select('*, profiles(full_name, phone)')
            .order('created_at', { ascending: false })
        setRequests(data || [])
        setLoading(false)
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
        await supabase.from('custom_requests').update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
        }).eq('id', req.id)
        toast.success('Request ditolak')
        fetchRequests()
    }

    const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    const pendingCount = requests.filter(r => r.status === 'pending').length

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
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="glass rounded-2xl p-5 h-24 animate-pulse" />)}</div>
            ) : requests.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Belum ada request</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
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
                                    {req.harga_final && <p className="text-sm font-semibold gradient-text mt-1">{formatRupiah(req.harga_final)}</p>}
                                </div>

                                {req.status === 'pending' && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => { setProcessModal(req); setHarga(''); setCatatan('') }}
                                            className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-all flex items-center gap-1.5">
                                            <CheckCircle className="w-4 h-4" /> Terima
                                        </button>
                                        <button onClick={() => handleReject(req)}
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

            {/* Accept Modal — Set Price */}
            {processModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md glass rounded-2xl p-6 slide-up glow">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Terima Request</h2>
                            <button onClick={() => setProcessModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                        </div>

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
                    </div>
                </div>
            )}
        </div>
    )
}
