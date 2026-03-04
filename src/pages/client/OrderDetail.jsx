import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import OrderChat from '../../components/OrderChat'
import OrderTimeline from '../../components/OrderTimeline'
import StatusBadge from '../../components/StatusBadge'
import { formatRupiah } from '../../lib/utils'
import { getFileIcon, formatSize } from '../../lib/constants'
import {
    ArrowLeft, Upload, FileCheck, AlertCircle,
    ImageIcon, Loader2, Ban, Download, Star, RotateCcw, Tag, FileText, HelpCircle, X, Paperclip, Copy
} from 'lucide-react'

export default function OrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const toast = useToast()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [paymentInfo, setPaymentInfo] = useState(null)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [showRating, setShowRating] = useState(false)
    const [ratingValue, setRatingValue] = useState(0)
    const [ratingHover, setRatingHover] = useState(0)
    const [reviewText, setReviewText] = useState('')
    const [submittingRating, setSubmittingRating] = useState(false)
    const [showRevisiConfirm, setShowRevisiConfirm] = useState(false)

    // Upload confirm state
    const [pendingFile, setPendingFile] = useState(null)
    const [pendingPreview, setPendingPreview] = useState(null)
    const [showUploadConfirm, setShowUploadConfirm] = useState(false)

    // Payment instruction popup
    const [showPaymentGuide, setShowPaymentGuide] = useState(false)

    useEffect(() => {
        fetchOrder(); fetchPaymentInfo()

        // Realtime subscription for this specific order
        const channel = supabase
            .channel(`order-detail-${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${id}`,
            }, (payload) => {
                const oldData = payload.old
                const newData = payload.new
                setOrder(prev => ({ ...prev, ...newData }))

                // Only toast when the specific field actually changed
                if (oldData.status_pekerjaan && newData.status_pekerjaan && oldData.status_pekerjaan !== newData.status_pekerjaan) {
                    toast.info(`📦 Status berubah: ${newData.status_pekerjaan}`)
                }
                if (oldData.status_pembayaran && newData.status_pembayaran && oldData.status_pembayaran !== newData.status_pembayaran) {
                    toast.info(`💰 Status pembayaran: ${newData.status_pembayaran}`)
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [id])

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase.from('orders').select('*, layanan(*)').eq('id', id).single()
            if (error) throw error
            setOrder(data)
        } catch (err) {
            console.error('Failed to fetch order:', err)
            setOrder(null)
        } finally {
            setLoading(false)
        }
    }
    const fetchPaymentInfo = async () => {
        try {
            const { data } = await supabase.from('settings').select('data').eq('id', 'payment_info').single()
            if (data?.data) setPaymentInfo(data.data)
        } catch (err) {
            console.error('Failed to fetch payment info:', err)
        }
    }

    // Step 1: Select file → show preview
    const handleSelectBukti = (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) { toast.error('Hanya file gambar (JPG, PNG, WebP)'); return }
        if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
        setPendingFile(file)
        setPendingPreview(URL.createObjectURL(file))
        setShowUploadConfirm(true)
        e.target.value = ''
    }

    // Step 2: Confirm → upload
    const handleConfirmUpload = async () => {
        if (!pendingFile) return
        setUploading(true)
        try {
            const fileName = `${user.id}/${id}_${Date.now()}.${pendingFile.name.split('.').pop()}`
            const { error } = await supabase.storage.from('bukti-transfer').upload(fileName, pendingFile)
            if (error) throw error
            const { data: { publicUrl } } = supabase.storage.from('bukti-transfer').getPublicUrl(fileName)
            await supabase.from('orders').update({ bukti_transfer_url: publicUrl, status_pembayaran: 'Menunggu Verifikasi' }).eq('id', id)
            toast.success('Bukti transfer berhasil diupload!')
            await fetchOrder()
        } catch (err) { toast.error('Gagal: ' + err.message) }
        finally {
            setUploading(false)
            setShowUploadConfirm(false)
            setPendingFile(null)
            if (pendingPreview) URL.revokeObjectURL(pendingPreview)
            setPendingPreview(null)
        }
    }

    const handleCancelUpload = () => {
        setShowUploadConfirm(false)
        setPendingFile(null)
        if (pendingPreview) URL.revokeObjectURL(pendingPreview)
        setPendingPreview(null)
    }

    const handleCancelOrder = async () => {
        const { error } = await supabase.from('orders').update({ status_pekerjaan: 'Batal' }).eq('id', id)
        if (error) toast.error('Gagal'); else { toast.success('Order dibatalkan'); await fetchOrder() }
        setShowCancelConfirm(false)
    }

    const handleSubmitRating = async () => {
        if (!ratingValue) { toast.error('Pilih rating minimal 1 bintang'); return }
        setSubmittingRating(true)
        const { error } = await supabase.from('orders').update({ rating: ratingValue, review: reviewText }).eq('id', id)
        if (error) { toast.error('Gagal mengirim review: ' + error.message); setSubmittingRating(false); return }
        toast.success('Terima kasih atas review kamu! ⭐'); await fetchOrder()
        setSubmittingRating(false); setShowRating(false)
    }

    const handleRequestRevisi = async () => {
        const { error } = await supabase.from('orders').update({ status_pekerjaan: 'Sedang Dikerjakan', jumlah_revisi: (order.jumlah_revisi || 0) + 1 }).eq('id', id)
        if (error) { toast.error('Gagal request revisi: ' + error.message); return }
        toast.success('Request revisi dikirim'); await fetchOrder()
        setShowRevisiConfirm(false)
    }

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    if (!order) return <div className="glass rounded-2xl p-12 text-center"><AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" /><h3 className="text-lg font-medium text-white">Order tidak ditemukan</h3></div>

    const canCancel = order.status_pekerjaan === 'Menunggu Diproses'
    const canRate = order.status_pekerjaan === 'Selesai' && !order.rating
    const canRevisi = order.status_pekerjaan === 'Selesai' && (order.jumlah_revisi || 0) < (order.max_revisi || 2) && !order.rating
    const revisiLeft = (order.max_revisi || 2) - (order.jumlah_revisi || 0)
    const hasilFiles = order.hasil_files || []
    const hasHasil = hasilFiles.length > 0 || order.hasil_url || order.catatan_hasil

    const copyOrderId = () => {
        navigator.clipboard.writeText(order.id).then(() => toast.success('Order ID disalin!')).catch(() => toast.error('Gagal menyalin'))
    }

    const getCountdown = (d) => {
        if (!d) return null
        const diff = new Date(d) - new Date()
        if (diff < 0) return { label: 'Tenggat lewat!', color: 'text-red-400 bg-red-500/10' }
        const days = Math.floor(diff / 86400000)
        const hours = Math.floor((diff % 86400000) / 3600000)
        if (days === 0) return { label: `${hours}j lagi`, color: 'text-orange-400 bg-orange-500/10' }
        if (days <= 2) return { label: `${days}h ${hours}j lagi`, color: 'text-yellow-400 bg-yellow-500/10' }
        return { label: `${days} hari lagi`, color: 'text-green-400 bg-green-500/10' }
    }

    const countdown = getCountdown(order.tenggat_waktu)

    const downloadAll = () => {
        hasilFiles.forEach((f, i) => {
            setTimeout(() => {
                const a = document.createElement('a')
                a.href = f.url
                a.download = f.name
                a.target = '_blank'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
            }, i * 300)
        })
    }

    return (
        <div className="max-w-2xl mx-auto fade-in">
            <button onClick={() => navigate('/pesanan-saya')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Kembali
            </button>

            {/* Order Info */}
            <div className="glass rounded-2xl p-6 glow mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{order.layanan?.judul_tugas || 'Custom Order'}</h2>
                        <button onClick={copyOrderId} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-light transition-colors mt-1 group">
                            <span className="font-mono">#{order.id.slice(0, 8)}</span>
                            <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                    <StatusBadge status={order.status_pekerjaan} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-white/5">
                        <p className="text-xs text-slate-500 mb-1">Harga</p>
                        <p className="text-lg font-bold gradient-text">{formatRupiah(order.harga_final)}</p>
                        {order.diskon > 0 && <div className="flex items-center gap-1 mt-1"><Tag className="w-3 h-3 text-green-400" /><span className="text-xs text-green-400">Hemat {formatRupiah(order.diskon)}</span></div>}
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                        <p className="text-xs text-slate-500 mb-1">Deadline</p>
                        <p className="text-lg font-semibold text-white">{order.tenggat_waktu ? new Date(order.tenggat_waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                        {countdown && !['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${countdown.color}`}>{countdown.label}</span>
                        )}
                    </div>
                </div>

                {order.detail_tambahan && <div className="p-3 rounded-xl bg-white/5 mb-4"><p className="text-xs text-slate-500 mb-1">Catatan</p><p className="text-sm text-slate-300">{order.detail_tambahan}</p></div>}
                {(order.jumlah_revisi > 0) && <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 mb-4"><span className="text-sm text-slate-400">Revisi</span><span className="text-sm text-white">{order.jumlah_revisi || 0} / {order.max_revisi || 2} kali</span></div>}
                {order.rating && (
                    <div className="p-3 rounded-xl bg-white/5 mb-4">
                        <div className="flex items-center gap-1 mb-1">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= order.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />)}<span className="text-xs text-slate-400 ml-1">{order.rating}/5</span></div>
                        {order.review && <p className="text-sm text-slate-300">{order.review}</p>}
                    </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm text-slate-400">Status Pembayaran</span>
                    <StatusBadge status={order.status_pembayaran} />
                </div>

                <div className="flex flex-col gap-2 mt-4">
                    {canCancel && <button onClick={() => setShowCancelConfirm(true)} className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"><Ban className="w-4 h-4" /> Batalkan Pesanan</button>}
                    {canRate && <button onClick={() => setShowRating(true)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 text-sm font-medium hover:from-yellow-500/30 hover:to-orange-500/30 transition-all flex items-center justify-center gap-2"><Star className="w-4 h-4" /> Beri Rating & Review</button>}
                    {canRevisi && <button onClick={() => setShowRevisiConfirm(true)} className="w-full py-2.5 rounded-xl border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Request Revisi ({revisiLeft} tersisa)</button>}
                </div>
            </div>

            {/* Hasil Tugas */}
            {hasHasil && (
                <div className="glass rounded-2xl p-6 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2"><Download className="w-5 h-5 text-green-400" /> Hasil Tugas</span>
                        {hasilFiles.length > 1 && (
                            <button onClick={downloadAll}
                                className="text-sm px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all flex items-center gap-1.5">
                                <Download className="w-4 h-4" /> Download Semua
                            </button>
                        )}
                    </h3>
                    {hasilFiles.length > 0 ? (
                        <div className="space-y-2 mb-4">
                            {hasilFiles.map((f, i) => (
                                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-lg">{getFileIcon(f.name)}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate group-hover:text-green-400 transition-colors">{f.name}</p>
                                            <p className="text-xs text-slate-500">{formatSize(f.size)}</p>
                                        </div>
                                    </div>
                                    <Download className="w-4 h-4 text-slate-500 group-hover:text-green-400 shrink-0" />
                                </a>
                            ))}
                        </div>
                    ) : order.hasil_url && (
                        <a href={order.hasil_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all mb-4">
                            <Download className="w-4 h-4" /> Download File
                        </a>
                    )}
                    {order.catatan_hasil && (
                        <div className="p-4 rounded-xl bg-white/5">
                            <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" /> Catatan dari Admin:</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{order.catatan_hasil}</p>
                        </div>
                    )}
                    {canRevisi && <p className="text-xs text-slate-500 mt-3 text-center">Cek hasilnya, kamu masih bisa request revisi {revisiLeft}x lagi</p>}
                </div>
            )}

            {/* Payment / Upload Bukti */}
            {order.status_pembayaran === 'Belum Bayar' && (
                <div className="glass rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-primary-light" /> Pembayaran
                        </h3>
                        <button onClick={() => setShowPaymentGuide(true)}
                            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary-light hover:bg-primary/20 transition-all"
                            title="Cara bayar">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 mb-4">
                        <p className="text-sm text-slate-300 mb-2">Transfer ke:</p>
                        <div className="space-y-2 text-sm">
                            {paymentInfo ? (<>
                                <div className="flex justify-between"><span className="text-slate-400">{paymentInfo.bank_name}</span><span className="text-white font-mono font-medium">{paymentInfo.bank_account} (a/n {paymentInfo.bank_holder})</span></div>
                                {paymentInfo.ewallet_name && <div className="flex justify-between"><span className="text-slate-400">{paymentInfo.ewallet_name}</span><span className="text-white font-mono font-medium">{paymentInfo.ewallet_number}</span></div>}
                                {paymentInfo.notes && <p className="text-xs text-slate-500 mt-3">* {paymentInfo.notes}</p>}
                            </>) : <p className="text-slate-500">Info pembayaran belum diatur</p>}
                        </div>
                    </div>
                    <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 cursor-pointer transition-all group">
                        <input type="file" accept="image/*" onChange={handleSelectBukti} className="hidden" />
                        <Upload className="w-10 h-10 text-slate-500 group-hover:text-primary-light transition-colors mb-2" />
                        <span className="text-sm text-slate-400 group-hover:text-slate-300">Upload bukti transfer</span>
                        <span className="text-xs text-slate-600 mt-1">JPG, PNG, WebP (max 5MB)</span>
                    </label>
                </div>
            )}

            {order.bukti_transfer_url && (
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary-light" /> Bukti Transfer</h3>
                    <img src={order.bukti_transfer_url} alt="Bukti" loading="lazy" className="rounded-xl w-full max-h-96 object-contain bg-black/20" />
                </div>
            )}

            {/* #35 — Lampiran Order */}
            {order.order_files?.length > 0 && (
                <div className="glass rounded-2xl p-6 mt-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-primary-light" /> Lampiran Order
                    </h3>
                    <div className="space-y-2">
                        {order.order_files.map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                <span className="text-xl">{getFileIcon(f.name)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{f.name}</p>
                                    {f.size && <p className="text-xs text-slate-500">{formatSize(f.size)}</p>}
                                </div>
                                <Download className="w-4 h-4 text-slate-500 group-hover:text-primary-light transition-colors shrink-0" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* #34 — Order Timeline */}
            <OrderTimeline orderId={id} />

            {/* #33 — Chat */}
            <OrderChat orderId={id} />

            {/* ===== MODALS ===== */}

            {/* Upload Confirm Modal */}
            <Modal open={showUploadConfirm} onClose={handleCancelUpload} title="Konfirmasi Upload">
                <p className="text-sm text-slate-400 mb-4">Pastikan bukti transfer sudah benar sebelum mengirim.</p>
                {pendingPreview && (
                    <img src={pendingPreview} alt="Preview" className="w-full max-h-72 object-contain rounded-xl bg-black/20 mb-4" />
                )}
                <p className="text-xs text-slate-500 mb-4 text-center">
                    📎 {pendingFile?.name} • {pendingFile && formatSize(pendingFile.size)}
                </p>
                <div className="flex gap-3">
                    <button onClick={handleCancelUpload}
                        className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">
                        Ganti File
                    </button>
                    <button onClick={handleConfirmUpload} disabled={uploading}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /> Kirim Bukti</>}
                    </button>
                </div>
            </Modal>

            {/* Payment Guide Modal */}
            <Modal open={showPaymentGuide} onClose={() => setShowPaymentGuide(false)} title="Cara Pembayaran">
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary-light">1</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Transfer sesuai nominal</p>
                            <p className="text-xs text-slate-400">Transfer tepat <span className="text-primary-light font-semibold">{formatRupiah(order.harga_final)}</span> ke rekening yang tertera.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary-light">2</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Screenshot bukti transfer</p>
                            <p className="text-xs text-slate-400">Ambil screenshot dari aplikasi banking / e-wallet yang menunjukkan bukti berhasil transfer.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary-light">3</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Upload bukti di bawah</p>
                            <p className="text-xs text-slate-400">Klik area upload, pilih foto bukti, periksa preview, lalu kirim.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-green-400">4</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Tunggu verifikasi admin</p>
                            <p className="text-xs text-slate-400">Admin akan memverifikasi pembayaran. Setelah dikonfirmasi, tugas akan mulai dikerjakan.</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowPaymentGuide(false)}
                    className="w-full mt-5 py-2.5 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all">
                    Mengerti 👍
                </button>
            </Modal>

            {/* Cancel Confirm */}
            <Modal open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <Ban className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Batalkan Pesanan?</h3>
                    <p className="text-sm text-slate-400 mb-6">Tidak bisa dibatalkan.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Tidak</button>
                        <button onClick={handleCancelOrder} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all">Ya, Batalkan</button>
                    </div>
                </div>
            </Modal>

            {/* Rating */}
            <Modal open={showRating} onClose={() => setShowRating(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <h3 className="text-lg font-bold text-white mb-4 text-center">Beri Rating</h3>
                <div className="flex justify-center gap-2 mb-4">{[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setRatingValue(s)} onMouseEnter={() => setRatingHover(s)} onMouseLeave={() => setRatingHover(0)}><Star className={`w-8 h-8 transition-colors ${s <= (ratingHover || ratingValue) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} /></button>)}</div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none mb-4" placeholder="Tulis review (opsional)..." />
                <div className="flex gap-3">
                    <button onClick={() => setShowRating(false)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Batal</button>
                    <button onClick={handleSubmitRating} disabled={submittingRating} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {submittingRating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Star className="w-5 h-5" /> Kirim</>}
                    </button>
                </div>
            </Modal>

            {/* Revisi */}
            <Modal open={showRevisiConfirm} onClose={() => setShowRevisiConfirm(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <RotateCcw className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Request Revisi?</h3>
                    <p className="text-sm text-slate-400 mb-1">Tersisa: {revisiLeft}x</p>
                    <p className="text-xs text-slate-500 mb-6">Status kembali ke "Sedang Dikerjakan"</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowRevisiConfirm(false)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Batal</button>
                        <button onClick={handleRequestRevisi} className="flex-1 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 font-medium hover:bg-blue-500/30 transition-all">Ya, Revisi</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
