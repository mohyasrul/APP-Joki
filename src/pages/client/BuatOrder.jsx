import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import { ShoppingCart, ArrowLeft, Calendar, FileText, WarningCircle, CheckCircle, Eye, Tag, X, Paperclip, UploadSimple, Clock } from '@phosphor-icons/react'
import { getKategoriIcon } from '../../lib/constants'

export default function BuatOrder() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = useAuth()
    const toast = useToast()
    const layanan = location.state?.layanan

    const [detail, setDetail] = useState('')
    const [deadline, setDeadline] = useState('')
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [attachments, setAttachments] = useState([])

    // Promo
    const [promoCode, setPromoCode] = useState('')
    const [promoData, setPromoData] = useState(null)
    const [promoLoading, setPromoLoading] = useState(false)
    const [promoError, setPromoError] = useState('')

    if (!layanan) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center fade-in">
                <WarningCircle weight="bold" className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">Layanan tidak ditemukan</h3>
                <button onClick={() => navigate('/katalog')} className="text-brand-600 hover:underline text-sm">← Kembali ke katalog</button>
            </div>
        )
    }

    const applyPromo = async () => {
        if (!promoCode.trim()) return
        setPromoLoading(true)
        setPromoError('')
        setPromoData(null)

        const { data, error } = await supabase
            .from('promos')
            .select('*')
            .eq('kode', promoCode.trim().toUpperCase())
            .eq('aktif', true)
            .single()

        if (error || !data) {
            setPromoError('Kode promo tidak valid atau sudah kadaluarsa')
        } else if (data.kuota !== null && data.terpakai >= data.kuota) {
            setPromoError('Kuota promo sudah habis')
        } else if (data.expired_at && new Date(data.expired_at) < new Date()) {
            setPromoError('Kode promo sudah kadaluarsa')
        } else {
            setPromoData(data)
            toast.success(`Promo "${data.kode}" berhasil diterapkan!`)
        }
        setPromoLoading(false)
    }

    const removePromo = () => {
        setPromoData(null)
        setPromoCode('')
        setPromoError('')
    }

    const calculateDiscount = () => {
        if (!promoData) return 0
        if (promoData.tipe === 'persen') {
            let disc = Math.round(layanan.harga_estimasi * promoData.nilai / 100)
            if (promoData.max_potongan) disc = Math.min(disc, promoData.max_potongan)
            return disc
        }
        return promoData.nilai
    }

    const diskon = calculateDiscount()
    const hargaFinal = Math.max(0, layanan.harga_estimasi - diskon)

    const handleReview = (e) => {
        e.preventDefault()
        setShowConfirm(true)
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            let claimedPromo = promoData
            if (promoData) {
                const { data: claimed, error: promoErr } = await supabase.rpc('claim_promo', { p_kode: promoData.kode })
                if (promoErr) {
                    toast.error('Promo gagal diklaim: ' + promoErr.message)
                    setLoading(false)
                    return
                }
                const row = claimed?.[0]
                if (row) {
                    claimedPromo = {
                        id: row.out_id,
                        kode: row.out_kode,
                        tipe: row.out_tipe,
                        nilai: row.out_nilai,
                        kuota: row.out_kuota,
                        terpakai: row.out_terpakai,
                        aktif: row.out_aktif,
                        max_potongan: row.out_max_potongan || null,
                    }
                }
            }

            const { data, error: insertErr } = await supabase.from('orders').insert({
                layanan_id: layanan.id,
                client_id: user.id,
                detail_tambahan: detail,
                harga_final: hargaFinal,
                status_pembayaran: 'Belum Bayar',
                status_pekerjaan: 'Menunggu Diproses',
                tenggat_waktu: deadline || null,
                kode_promo: claimedPromo?.kode || null,
                diskon: diskon,
            }).select().single()

            if (insertErr) throw insertErr

            if (attachments.length > 0) {
                const uploadedFiles = []
                for (const file of attachments) {
                    const ext = file.name.split('.').pop()
                    const fileName = `order-attachments/${user.id}/${Date.now()}_${file.name}`
                    const { error: upErr } = await supabase.storage.from('bukti-transfer').upload(fileName, file)
                    if (upErr) { console.warn('Skip file:', file.name, upErr.message); continue }
                    const { data: { publicUrl } } = supabase.storage.from('bukti-transfer').getPublicUrl(fileName)
                    uploadedFiles.push({ name: file.name, url: publicUrl, size: file.size, type: file.type })
                }
                if (uploadedFiles.length > 0) {
                    await supabase.from('orders').update({ order_files: uploadedFiles }).eq('id', data.id)
                }
            }

            toast.success('Pesanan berhasil dibuat!')
            navigate(`/order/${data.id}`)
        } catch (err) {
            toast.error('Gagal membuat pesanan: ' + err.message)
            setShowConfirm(false)
        } finally { setLoading(false) }
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    return (
        <div className="fade-in">
            <button onClick={() => navigate('/katalog')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-5 py-2 touch-target">
                <ArrowLeft weight="bold" className="w-5 h-5" /> Kembali ke Katalog
            </button>

            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">

                {/* LEFT: Form card */}
                <div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 mb-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold">Buat Pesanan</h2>
                            <p className="text-sm text-slate-500">Isi detail pesanan kamu</p>
                        </div>

                        {/* Layanan Info — hidden on desktop (shown in sidebar) */}
                        <div className="lg:hidden p-4 rounded-xl bg-brand-50 border border-brand-100 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                <CheckCircle weight="fill" className="w-5 h-5 text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-0.5">Layanan Dipilih</p>
                                <p className="text-base font-bold text-slate-900 truncate">{layanan.judul_tugas}</p>
                                {layanan.kategori && <p className="text-xs text-slate-500">{layanan.kategori}</p>}
                            </div>
                            <span className="text-lg font-bold text-brand-600 shrink-0">{formatRupiah(layanan.harga_estimasi)}</span>
                        </div>

                        <form onSubmit={handleReview} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Detail / Catatan Tambahan</label>
                                <div className="relative">
                                    <FileText weight="bold" className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4}
                                        className={inputClass + ' pl-11 resize-none'}
                                        placeholder="Contoh: Makalah minimal 10 halaman..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Deadline Pengumpulan</label>
                                <div className="relative">
                                    <Calendar weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                                        min={(() => {
                                            const d = new Date()
                                            if (layanan?.estimasi_hari) d.setDate(d.getDate() + layanan.estimasi_hari)
                                            return d.toISOString().split('T')[0]
                                        })()}
                                        className={inputClass + ' pl-11'} required />
                                </div>
                            </div>

                            {/* Promo Code */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Kode Promo (opsional)</label>
                                {promoData ? (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                        <div className="flex items-center gap-2">
                                            <Tag weight="bold" className="w-4 h-4 text-emerald-600" />
                                            <span className="text-sm font-medium text-emerald-600">{promoData.kode}</span>
                                            <span className="text-xs text-emerald-500">
                                                -{promoData.tipe === 'persen' ? `${promoData.nilai}%` : formatRupiah(promoData.nilai)}
                                            </span>
                                        </div>
                                        <button type="button" onClick={removePromo} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                                            <X weight="bold" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            className={inputClass + ' uppercase'}
                                            placeholder="Masukkan kode promo" />
                                        <button type="button" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                                            className="px-5 py-3 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-all disabled:opacity-50">
                                            {promoLoading ? '...' : 'Pakai'}
                                        </button>
                                    </div>
                                )}
                                {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
                            </div>

                            {/* Price Summary — mobile/tablet only; desktop shows in sidebar */}
                            {diskon > 0 && (
                                <div className="lg:hidden p-4 rounded-xl bg-slate-50 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Harga Awal</span>
                                        <span className="text-slate-600">{formatRupiah(layanan.harga_estimasi)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-600">Diskon</span>
                                        <span className="text-emerald-600">-{formatRupiah(diskon)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                                        <span className="text-slate-800">Total</span>
                                        <span className="text-brand-600">{formatRupiah(hargaFinal)}</span>
                                    </div>
                                </div>
                            )}

                            {/* File Attachments */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Lampiran Pendukung (opsional)</label>
                                <label className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-300 cursor-pointer transition-all group">
                                    <input type="file" multiple onChange={async (e) => {
                                        const files = Array.from(e.target.files)
                                        const processedFiles = []
                                        const toastId = toast.info('Memproses file...', { autoClose: false })

                                        for (let f of files) {
                                            let fileToUpload = f
                                            if (f.type.startsWith('image/') && f.size > 1024 * 1024) {
                                                try {
                                                    const { default: imageCompression } = await import('browser-image-compression')
                                                    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
                                                    fileToUpload = await imageCompression(f, options)
                                                } catch (err) {
                                                    console.error('Compression error:', err)
                                                }
                                            }
                                            if (fileToUpload.size <= 10 * 1024 * 1024) {
                                                processedFiles.push(fileToUpload)
                                            } else {
                                                toast.error(`${f.name} terlalu besar (max 10MB)`)
                                            }
                                        }
                                        toast.dismiss(toastId)
                                        setAttachments(prev => [...prev, ...processedFiles].slice(0, 5))
                                    }} className="hidden" />
                                    <Paperclip weight="bold" className="w-6 h-6 text-slate-400 group-hover:text-brand-500 transition-colors mb-1.5" />
                                    <span className="text-sm text-slate-500 group-hover:text-slate-600 text-center">Klik untuk pilih file</span>
                                    <span className="text-xs text-slate-400 mt-0.5">Max 5 file · 10MB per file · semua format</span>
                                </label>
                                {attachments.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                        {attachments.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
                                                <Paperclip weight="bold" className="w-4 h-4 text-slate-400 shrink-0" />
                                                <span className="text-xs text-slate-600 flex-1 truncate">{f.name}</span>
                                                <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)}KB</span>
                                                <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                                    className="text-slate-400 hover:text-red-500 transition-colors">
                                                    <X weight="bold" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button type="submit"
                                className="w-full py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm">
                                <Eye weight="bold" className="w-5 h-5" /> Review Pesanan
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT: Desktop service summary sidebar */}
                <div className="hidden lg:flex flex-col gap-5 sticky top-8">
                    {/* Service card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Ringkasan Layanan</p>
                        <div className="flex items-start gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-xl ${getKategoriIcon(layanan.kategori).bg} flex items-center justify-center shrink-0`}>
                                {(() => { const { Icon, color } = getKategoriIcon(layanan.kategori); return <Icon weight="fill" className={`w-6 h-6 ${color}`} /> })()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-[11px] font-medium mb-1.5">
                                    <Tag weight="bold" className="w-3 h-3" /> {layanan.kategori || 'Lainnya'}
                                </span>
                                <h3 className="text-base font-bold text-slate-800 leading-snug">{layanan.judul_tugas}</h3>
                            </div>
                        </div>
                        {layanan.deskripsi && (
                            <p className="text-sm text-slate-500 mb-4 line-clamp-4">{layanan.deskripsi}</p>
                        )}
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Harga (estimasi)</span>
                                <span className="text-base font-bold text-brand-600">{formatRupiah(layanan.harga_estimasi)}</span>
                            </div>
                            {layanan.estimasi_hari && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Estimasi</span>
                                    <span className="text-sm text-slate-700 flex items-center gap-1">
                                        <Clock weight="bold" className="w-3.5 h-3.5 text-slate-400" />
                                        {layanan.estimasi_hari} hari
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Price breakdown when promo active */}
                    {diskon > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Rincian Harga</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Harga Awal</span>
                                    <span className="text-slate-600">{formatRupiah(layanan.harga_estimasi)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-600">Diskon</span>
                                    <span className="text-emerald-600">-{formatRupiah(diskon)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2">
                                    <span className="text-slate-800">Total</span>
                                    <span className="text-brand-600">{formatRupiah(hargaFinal)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-violet-50 rounded-2xl p-4">
                        <p className="text-xs text-violet-600 text-center">Harga dapat berubah sesuai kesepakatan antara kamu dan admin.</p>
                    </div>
                </div>
            </div>

            {/* Confirm Modal */}
            <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Konfirmasi Pesanan">
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                        <span className="text-sm text-slate-500">Layanan</span>
                        <span className="text-sm font-medium text-slate-800">{layanan.judul_tugas}</span>
                    </div>
                    {diskon > 0 && (
                        <>
                            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                                <span className="text-sm text-slate-500">Harga Awal</span>
                                <span className="text-sm text-slate-400 line-through">{formatRupiah(layanan.harga_estimasi)}</span>
                            </div>
                            <div className="flex justify-between p-3 rounded-xl bg-emerald-50">
                                <span className="text-sm text-emerald-600">Promo ({promoData?.kode})</span>
                                <span className="text-sm text-emerald-600">-{formatRupiah(diskon)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                        <span className="text-sm text-slate-500">Total Bayar</span>
                        <span className="text-sm font-bold text-brand-600">{formatRupiah(hargaFinal)}</span>
                    </div>
                    {deadline && (
                        <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                            <span className="text-sm text-slate-500">Deadline</span>
                            <span className="text-sm text-slate-800">{new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                    )}
                    {detail && (
                        <div className="p-3 rounded-xl bg-slate-50">
                            <p className="text-sm text-slate-500 mb-1">Catatan</p>
                            <p className="text-sm text-slate-700">{detail}</p>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Kembali</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle weight="bold" className="w-5 h-5" /> Konfirmasi</>}
                    </button>
                </div>
            </Modal>
        </div>
    )
}
