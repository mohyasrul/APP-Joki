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
    ArrowLeft, UploadSimple, Receipt, WarningCircle,
    Image as ImageIcon, SpinnerGap, Prohibit, DownloadSimple, Star, ArrowCounterClockwise, Tag, FileText, FilePdf, FileZip, FileVideo, Question, X, Paperclip, Copy
} from '@phosphor-icons/react'
import imageCompression from 'browser-image-compression'

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

    const [pendingFile, setPendingFile] = useState(null)
    const [pendingPreview, setPendingPreview] = useState(null)
    const [showUploadConfirm, setShowUploadConfirm] = useState(false)
    const [showPaymentGuide, setShowPaymentGuide] = useState(false)

    useEffect(() => {
        fetchOrder(); fetchPaymentInfo()

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

    const handleSelectBukti = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) { toast.error('Hanya file gambar (JPG, PNG, WebP)'); return }

        let fileToUpload = file;
        if (file.size > 1024 * 1024) {
            const toastId = toast.info('Mengkompresi gambar...', { autoClose: false })
            try {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
                fileToUpload = await imageCompression(file, options)
                toast.dismiss(toastId)
            } catch (error) {
                console.error('Compression error:', error)
                toast.dismiss(toastId)
            }
        }

        if (fileToUpload.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
        setPendingFile(fileToUpload)
        setPendingPreview(URL.createObjectURL(fileToUpload))
        setShowUploadConfirm(true)
        e.target.value = ''
    }

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

    if (loading) return <div className="flex items-center justify-center py-20"><SpinnerGap className="w-8 h-8 animate-spin text-brand-500" /></div>
    if (!order) return <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center"><WarningCircle weight="bold" className="w-12 h-12 text-amber-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-600">Order tidak ditemukan</h3></div>

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
        if (diff < 0) return { label: 'Tenggat lewat!', color: 'text-red-600 bg-red-50' }
        const days = Math.floor(diff / 86400000)
        const hours = Math.floor((diff % 86400000) / 3600000)
        if (days === 0) return { label: `${hours}j lagi`, color: 'text-amber-600 bg-amber-50' }
        if (days <= 2) return { label: `${days}h ${hours}j lagi`, color: 'text-amber-600 bg-amber-50' }
        return { label: `${days} hari lagi`, color: 'text-emerald-600 bg-emerald-50' }
    }

    const countdown = getCountdown(order.tenggat_waktu)

    const getFilePhosphor = (name) => {
        if (!name) return <FileText weight="duotone" className="w-5 h-5 text-slate-500" />
        const ext = name.split('.').pop().toLowerCase()
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return <ImageIcon weight="duotone" className="w-5 h-5 text-blue-500" />
        if (ext === 'pdf') return <FilePdf weight="duotone" className="w-5 h-5 text-red-500" />
        if (['zip', 'rar', '7z'].includes(ext)) return <FileZip weight="duotone" className="w-5 h-5 text-purple-500" />
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return <FileVideo weight="duotone" className="w-5 h-5 text-pink-500" />
        return <FileText weight="duotone" className="w-5 h-5 text-amber-500" />
    }

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
        <div className="fade-in">
            <button onClick={() => navigate('/pesanan-saya')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-5 py-2 touch-target">
                <ArrowLeft weight="bold" className="w-5 h-5" /> Kembali ke Pesanan
            </button>

            <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
                {/* LEFT COLUMN */}
                <div className="space-y-6">

                    {/* Order Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{order.layanan?.judul_tugas || 'Custom Order'}</h2>
                                <button onClick={copyOrderId} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 transition-colors mt-1 group">
                                    <span className="font-mono">#{order.id.slice(0, 8)}</span>
                                    <Copy weight="bold" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>
                            <StatusBadge status={order.status_pekerjaan} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-slate-50">
                                <p className="text-xs text-slate-400 mb-1">Harga</p>
                                <p className="text-lg font-bold text-brand-600">{formatRupiah(order.harga_final)}</p>
                                {order.diskon > 0 && <div className="flex items-center gap-1 mt-1"><Tag weight="bold" className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500">Hemat {formatRupiah(order.diskon)}</span></div>}
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50">
                                <p className="text-xs text-slate-400 mb-1">Deadline</p>
                                <p className="text-lg font-semibold text-slate-700">{order.tenggat_waktu ? new Date(order.tenggat_waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                                {countdown && !['Selesai', 'Batal'].includes(order.status_pekerjaan) && (
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${countdown.color}`}>{countdown.label}</span>
                                )}
                            </div>
                        </div>

                        {order.detail_tambahan && <div className="p-3 rounded-xl bg-slate-50 mb-4"><p className="text-xs text-slate-400 mb-1">Catatan</p><p className="text-sm text-slate-600">{order.detail_tambahan}</p></div>}
                        {(order.jumlah_revisi > 0) && <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 mb-4"><span className="text-sm text-slate-500">Revisi</span><span className="text-sm text-slate-700">{order.jumlah_revisi || 0} / {order.max_revisi || 2} kali</span></div>}
                        {order.rating && (
                            <div className="p-3 rounded-xl bg-slate-50 mb-4">
                                <div className="flex items-center gap-1 mb-1">{[1, 2, 3, 4, 5].map(s => <Star key={s} weight="fill" className={`w-4 h-4 ${s <= order.rating ? 'text-amber-400' : 'text-slate-200'}`} />)}<span className="text-xs text-slate-400 ml-1">{order.rating}/5</span></div>
                                {order.review && <p className="text-sm text-slate-600">{order.review}</p>}
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                            <span className="text-sm text-slate-500">Status Pembayaran</span>
                            <StatusBadge status={order.status_pembayaran} />
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            {canCancel && <button onClick={() => setShowCancelConfirm(true)} className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2"><Prohibit weight="bold" className="w-4 h-4" /> Batalkan Pesanan</button>}
                            {canRate && <button onClick={() => setShowRating(true)} className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 text-sm font-medium hover:bg-amber-100 transition-all flex items-center justify-center gap-2"><Star weight="bold" className="w-4 h-4" /> Beri Rating & Review</button>}
                            {canRevisi && <button onClick={() => setShowRevisiConfirm(true)} className="w-full py-2.5 rounded-xl border border-blue-200 text-blue-500 text-sm font-medium hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><ArrowCounterClockwise weight="bold" className="w-4 h-4" /> Request Revisi ({revisiLeft} tersisa)</button>}
                        </div>
                    </div>

                    {/* Mobile-only: action items */}
                    <div className="lg:hidden space-y-6">

                        {/* Hasil Tugas */}
                        {hasHasil && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2"><DownloadSimple weight="bold" className="w-5 h-5 text-emerald-500" /> Hasil Tugas</span>
                                    {hasilFiles.length > 1 && (
                                        <button onClick={downloadAll} className="text-sm px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                                            <DownloadSimple weight="bold" className="w-4 h-4" /> Download Semua
                                        </button>
                                    )}
                                </h3>
                                {hasilFiles.length > 0 ? (
                                    <div className="space-y-2 mb-4">
                                        {hasilFiles.map((f, i) => (
                                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">{getFilePhosphor(f.name)}</div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-slate-700 truncate group-hover:text-emerald-600 transition-colors">{f.name}</p>
                                                        <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
                                                    </div>
                                                </div>
                                                <DownloadSimple weight="bold" className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                ) : order.hasil_url && (
                                    <a href={order.hasil_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all mb-4">
                                        <DownloadSimple weight="bold" className="w-4 h-4" /> Download File
                                    </a>
                                )}
                                {order.catatan_hasil && (
                                    <div className="p-4 rounded-xl bg-slate-50">
                                        <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><FileText weight="bold" className="w-3 h-3" /> Catatan dari Admin:</p>
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.catatan_hasil}</p>
                                    </div>
                                )}
                                {canRevisi && <p className="text-xs text-slate-400 mt-3 text-center">Cek hasilnya, kamu masih bisa request revisi {revisiLeft}x lagi</p>}
                            </div>
                        )}

                        {/* Payment */}
                        {order.status_pembayaran === 'Belum Bayar' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                        <Receipt weight="bold" className="w-5 h-5 text-brand-500" /> Pembayaran
                                    </h3>
                                    <button onClick={() => setShowPaymentGuide(true)} className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-all" title="Cara bayar">
                                        <Question weight="bold" className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 mb-4">
                                    <p className="text-sm text-slate-600 mb-2">Transfer ke:</p>
                                    <div className="space-y-2 text-sm">
                                        {paymentInfo ? (<>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-slate-500">{paymentInfo.bank_name}</span>
                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                    <span className="text-slate-800 font-mono font-medium">{paymentInfo.bank_account}</span>
                                                    <span className="text-slate-400 text-xs">a/n {paymentInfo.bank_holder}</span>
                                                    <button onClick={() => navigator.clipboard.writeText(paymentInfo.bank_account).then(() => toast.success('Nomor rekening disalin!'))} className="p-1 rounded-md hover:bg-white transition-colors text-slate-400 hover:text-slate-600 shrink-0" title="Salin nomor rekening">
                                                        <Copy weight="bold" className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {paymentInfo.ewallet_name && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-slate-500">{paymentInfo.ewallet_name}</span>
                                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                                        <span className="text-slate-800 font-mono font-medium">{paymentInfo.ewallet_number}</span>
                                                        <button onClick={() => navigator.clipboard.writeText(paymentInfo.ewallet_number).then(() => toast.success('Nomor e-wallet disalin!'))} className="p-1 rounded-md hover:bg-white transition-colors text-slate-400 hover:text-slate-600 shrink-0" title="Salin nomor e-wallet">
                                                            <Copy weight="bold" className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {paymentInfo.notes && <p className="text-xs text-slate-400 mt-3">* {paymentInfo.notes}</p>}
                                        </>) : <p className="text-slate-400">Info pembayaran belum diatur</p>}
                                    </div>
                                </div>
                                <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-300 cursor-pointer transition-all group">
                                    <input type="file" accept="image/*" onChange={handleSelectBukti} className="hidden" />
                                    <UploadSimple weight="bold" className="w-10 h-10 text-slate-400 group-hover:text-brand-500 transition-colors mb-2" />
                                    <span className="text-sm text-slate-500 group-hover:text-slate-600">Upload bukti transfer</span>
                                    <span className="text-xs text-slate-400 mt-1">JPG, PNG, WebP (max 5MB)</span>
                                </label>
                            </div>
                        )}

                        {order.bukti_transfer_url && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><ImageIcon weight="bold" className="w-5 h-5 text-brand-500" /> Bukti Transfer</h3>
                                <img src={order.bukti_transfer_url} alt="Bukti" loading="lazy" className="rounded-xl w-full max-h-96 object-contain bg-slate-50" />
                            </div>
                        )}

                        {order.order_files?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Paperclip weight="bold" className="w-5 h-5 text-brand-500" /> Lampiran Order
                                </h3>
                                <div className="space-y-2">
                                    {order.order_files.map((f, i) => (
                                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">{getFilePhosphor(f.name)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-700 truncate">{f.name}</p>
                                                {f.size && <p className="text-xs text-slate-400">{formatSize(f.size)}</p>}
                                            </div>
                                            <DownloadSimple weight="bold" className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                    {/* END Mobile-only */}

                    <OrderTimeline orderId={id} />
                    <OrderChat orderId={id} />
                </div>
                {/* END LEFT COLUMN */}

                {/* RIGHT COLUMN - Desktop only */}
                <div className="hidden lg:block space-y-6 sticky top-8">

                    {hasHasil && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2"><DownloadSimple weight="bold" className="w-5 h-5 text-emerald-500" /> Hasil Tugas</span>
                                {hasilFiles.length > 1 && (
                                    <button onClick={downloadAll} className="text-sm px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                                        <DownloadSimple weight="bold" className="w-4 h-4" /> Download Semua
                                    </button>
                                )}
                            </h3>
                            {hasilFiles.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                    {hasilFiles.map((f, i) => (
                                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">{getFilePhosphor(f.name)}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-slate-700 truncate group-hover:text-emerald-600 transition-colors">{f.name}</p>
                                                    <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
                                                </div>
                                            </div>
                                            <DownloadSimple weight="bold" className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            ) : order.hasil_url && (
                                <a href={order.hasil_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all mb-4">
                                    <DownloadSimple weight="bold" className="w-4 h-4" /> Download File
                                </a>
                            )}
                            {order.catatan_hasil && (
                                <div className="p-4 rounded-xl bg-slate-50">
                                    <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><FileText weight="bold" className="w-3 h-3" /> Catatan dari Admin:</p>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.catatan_hasil}</p>
                                </div>
                            )}
                            {canRevisi && <p className="text-xs text-slate-400 mt-3 text-center">Cek hasilnya, kamu masih bisa request revisi {revisiLeft}x lagi</p>}
                        </div>
                    )}

                    {order.status_pembayaran === 'Belum Bayar' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <Receipt weight="bold" className="w-5 h-5 text-brand-500" /> Pembayaran
                                </h3>
                                <button onClick={() => setShowPaymentGuide(true)} className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-all" title="Cara bayar">
                                    <Question weight="bold" className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 mb-4">
                                <p className="text-sm text-slate-600 mb-2">Transfer ke:</p>
                                <div className="space-y-2 text-sm">
                                    {paymentInfo ? (<>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500">{paymentInfo.bank_name}</span>
                                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                                <span className="text-slate-800 font-mono font-medium">{paymentInfo.bank_account}</span>
                                                <span className="text-slate-400 text-xs">a/n {paymentInfo.bank_holder}</span>
                                                <button onClick={() => navigator.clipboard.writeText(paymentInfo.bank_account).then(() => toast.success('Nomor rekening disalin!'))} className="p-1 rounded-md hover:bg-white transition-colors text-slate-400 hover:text-slate-600 shrink-0" title="Salin nomor rekening">
                                                    <Copy weight="bold" className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        {paymentInfo.ewallet_name && (
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-slate-500">{paymentInfo.ewallet_name}</span>
                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                    <span className="text-slate-800 font-mono font-medium">{paymentInfo.ewallet_number}</span>
                                                    <button onClick={() => navigator.clipboard.writeText(paymentInfo.ewallet_number).then(() => toast.success('Nomor e-wallet disalin!'))} className="p-1 rounded-md hover:bg-white transition-colors text-slate-400 hover:text-slate-600 shrink-0" title="Salin nomor e-wallet">
                                                        <Copy weight="bold" className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {paymentInfo.notes && <p className="text-xs text-slate-400 mt-3">* {paymentInfo.notes}</p>}
                                    </>) : <p className="text-slate-400">Info pembayaran belum diatur</p>}
                                </div>
                            </div>
                            <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-300 cursor-pointer transition-all group">
                                <input type="file" accept="image/*" onChange={handleSelectBukti} className="hidden" />
                                <UploadSimple weight="bold" className="w-10 h-10 text-slate-400 group-hover:text-brand-500 transition-colors mb-2" />
                                <span className="text-sm text-slate-500 group-hover:text-slate-600">Upload bukti transfer</span>
                                <span className="text-xs text-slate-400 mt-1">JPG, PNG, WebP (max 5MB)</span>
                            </label>
                        </div>
                    )}

                    {order.bukti_transfer_url && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><ImageIcon weight="bold" className="w-5 h-5 text-brand-500" /> Bukti Transfer</h3>
                            <img src={order.bukti_transfer_url} alt="Bukti" loading="lazy" className="rounded-xl w-full max-h-96 object-contain bg-slate-50" />
                        </div>
                    )}

                    {order.order_files?.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Paperclip weight="bold" className="w-5 h-5 text-brand-500" /> Lampiran Order
                            </h3>
                            <div className="space-y-2">
                                {order.order_files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">{getFilePhosphor(f.name)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 truncate">{f.name}</p>
                                            {f.size && <p className="text-xs text-slate-400">{formatSize(f.size)}</p>}
                                        </div>
                                        <DownloadSimple weight="bold" className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
                {/* END RIGHT COLUMN */}
            </div>
            {/* END GRID */}

            {/* ===== MODALS ===== */}

            {/* Upload Confirm Modal */}
            <Modal open={showUploadConfirm} onClose={handleCancelUpload} title="Konfirmasi Upload">
                <p className="text-sm text-slate-500 mb-4">Pastikan bukti transfer sudah benar sebelum mengirim.</p>
                {pendingPreview && (
                    <img src={pendingPreview} alt="Preview" className="w-full max-h-72 object-contain rounded-xl bg-slate-50 mb-4" />
                )}
                <p className="text-xs text-slate-400 mb-4 text-center">
                    📎 {pendingFile?.name} • {pendingFile && formatSize(pendingFile.size)}
                </p>
                <div className="flex gap-3">
                    <button onClick={handleCancelUpload}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">
                        Ganti File
                    </button>
                    <button onClick={handleConfirmUpload} disabled={uploading}
                        className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {uploading ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><UploadSimple weight="bold" className="w-5 h-5" /> Kirim Bukti</>}
                    </button>
                </div>
            </Modal>

            {/* Payment Guide Modal */}
            <Modal open={showPaymentGuide} onClose={() => setShowPaymentGuide(false)} title="Cara Pembayaran">
                <div className="space-y-4">
                    {[
                        { num: '1', title: 'Transfer sesuai nominal', desc: <>Transfer tepat <span className="text-brand-600 font-semibold">{formatRupiah(order.harga_final)}</span> ke rekening yang tertera.</>, bg: 'bg-brand-50 text-brand-600' },
                        { num: '2', title: 'Screenshot bukti transfer', desc: 'Ambil screenshot dari aplikasi banking / e-wallet yang menunjukkan bukti berhasil transfer.', bg: 'bg-brand-50 text-brand-600' },
                        { num: '3', title: 'Upload bukti di bawah', desc: 'Klik area upload, pilih foto bukti, periksa preview, lalu kirim.', bg: 'bg-brand-50 text-brand-600' },
                        { num: '4', title: 'Tunggu verifikasi admin', desc: 'Admin akan memverifikasi pembayaran. Setelah dikonfirmasi, tugas akan mulai dikerjakan.', bg: 'bg-emerald-50 text-emerald-600' },
                    ].map((step, i) => (
                        <div key={i} className="flex gap-3">
                            <div className={`w-7 h-7 rounded-full ${step.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <span className="text-xs font-bold">{step.num}</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-800">{step.title}</p>
                                <p className="text-xs text-slate-500">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setShowPaymentGuide(false)}
                    className="w-full mt-5 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-all">
                    Mengerti 👍
                </button>
            </Modal>

            {/* Cancel Confirm */}
            <Modal open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <Prohibit weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Batalkan Pesanan?</h3>
                    <p className="text-sm text-slate-500 mb-6">Tidak bisa dibatalkan.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Tidak</button>
                        <button onClick={handleCancelOrder} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Ya, Batalkan</button>
                    </div>
                </div>
            </Modal>

            {/* Rating */}
            <Modal open={showRating} onClose={() => setShowRating(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Beri Rating</h3>
                <div className="flex justify-center gap-2 mb-4">{[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setRatingValue(s)} onMouseEnter={() => setRatingHover(s)} onMouseLeave={() => setRatingHover(0)}><Star weight="fill" className={`w-8 h-8 transition-colors ${s <= (ratingHover || ratingValue) ? 'text-amber-400' : 'text-slate-200'}`} /></button>)}</div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all resize-none mb-4" placeholder="Tulis review (opsional)..." />
                <div className="flex gap-3">
                    <button onClick={() => setShowRating(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                    <button onClick={handleSubmitRating} disabled={submittingRating} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {submittingRating ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><Star weight="fill" className="w-5 h-5" /> Kirim</>}
                    </button>
                </div>
            </Modal>

            {/* Revisi */}
            <Modal open={showRevisiConfirm} onClose={() => setShowRevisiConfirm(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <ArrowCounterClockwise weight="bold" className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Request Revisi?</h3>
                    <p className="text-sm text-slate-500 mb-1">Tersisa: {revisiLeft}x</p>
                    <p className="text-xs text-slate-400 mb-6">Status kembali ke "Sedang Dikerjakan"</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowRevisiConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                        <button onClick={handleRequestRevisi} className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-all">Ya, Revisi</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
