import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import { ShoppingCart, ArrowLeft, Calendar, FileText, AlertCircle, CheckCircle, Eye, Tag, X, Paperclip, Upload } from 'lucide-react'

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
    const [attachments, setAttachments] = useState([])  // #35 file attachments

    // Promo
    const [promoCode, setPromoCode] = useState('')
    const [promoData, setPromoData] = useState(null)
    const [promoLoading, setPromoLoading] = useState(false)
    const [promoError, setPromoError] = useState('')

    if (!layanan) {
        return (
            <div className="glass rounded-2xl p-12 text-center fade-in">
                <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Layanan tidak ditemukan</h3>
                <button onClick={() => navigate('/katalog')} className="text-primary-light hover:underline text-sm">← Kembali ke katalog</button>
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
            // Claim promo atomically first (prevents race condition)
            let claimedPromo = promoData
            if (promoData) {
                const { data: claimed, error: promoErr } = await supabase.rpc('claim_promo', { p_kode: promoData.kode })
                if (promoErr) {
                    toast.error('Promo gagal diklaim: ' + promoErr.message)
                    setLoading(false)
                    return
                }
                // Map out_ prefixed columns back to normal names
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

            // #35 — Upload file attachments if any
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

    return (
        <div className="max-w-2xl mx-auto fade-in">
            <button onClick={() => navigate('/katalog')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
            </button>

            <div className="glass rounded-2xl p-6 mb-6 glow">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-primary-light" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Buat Pesanan</h2>
                        <p className="text-sm text-slate-400">Isi detail pesanan kamu</p>
                    </div>
                </div>

                {/* Layanan Info */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Layanan dipilih</p>
                            <p className="text-lg font-semibold text-white">{layanan.judul_tugas}</p>
                        </div>
                        <span className="text-xl font-bold gradient-text">{formatRupiah(layanan.harga_estimasi)}</span>
                    </div>
                </div>

                <form onSubmit={handleReview} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Detail / Catatan Tambahan</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                                placeholder="Contoh: Makalah minimal 10 halaman..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Deadline Pengumpulan</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
                        </div>
                    </div>

                    {/* Promo Code */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Kode Promo (opsional)</label>
                        {promoData ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-green-400" />
                                    <span className="text-sm font-medium text-green-400">{promoData.kode}</span>
                                    <span className="text-xs text-green-400/60">
                                        -{promoData.tipe === 'persen' ? `${promoData.nilai}%` : formatRupiah(promoData.nilai)}
                                    </span>
                                </div>
                                <button type="button" onClick={removePromo} className="text-green-400/60 hover:text-green-400 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all uppercase"
                                    placeholder="Masukkan kode promo" />
                                <button type="button" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                                    className="px-5 py-3 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all disabled:opacity-50">
                                    {promoLoading ? '...' : 'Pakai'}
                                </button>
                            </div>
                        )}
                        {promoError && <p className="text-xs text-red-400 mt-1.5">{promoError}</p>}
                    </div>

                    {/* Price Summary */}
                    {diskon > 0 && (
                        <div className="p-4 rounded-xl bg-white/5 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Harga Awal</span>
                                <span className="text-slate-300">{formatRupiah(layanan.harga_estimasi)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-green-400">Diskon</span>
                                <span className="text-green-400">-{formatRupiah(diskon)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2">
                                <span className="text-white">Total</span>
                                <span className="gradient-text">{formatRupiah(hargaFinal)}</span>
                            </div>
                        </div>
                    )}

                    {/* File Attachments */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Lampiran Pendukung (opsional)</label>
                        <label className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 cursor-pointer transition-all group">
                            <input type="file" multiple onChange={e => {
                                const files = Array.from(e.target.files)
                                const valid = files.filter(f => f.size <= 10 * 1024 * 1024)
                                if (valid.length < files.length) toast.error('Beberapa file diabaikan (max 10MB per file)')
                                setAttachments(prev => [...prev, ...valid].slice(0, 5))
                            }} className="hidden" />
                            <Paperclip className="w-6 h-6 text-slate-500 group-hover:text-primary-light transition-colors mb-1.5" />
                            <span className="text-sm text-slate-400 group-hover:text-slate-300 text-center">Klik untuk pilih file</span>
                            <span className="text-xs text-slate-600 mt-0.5">Max 5 file · 10MB per file · semua format</span>
                        </label>
                        {attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {attachments.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                                        <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span className="text-xs text-slate-300 flex-1 truncate">{f.name}</span>
                                        <span className="text-xs text-slate-500">{(f.size / 1024).toFixed(0)}KB</span>
                                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                            className="text-slate-500 hover:text-red-400 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit"
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2">
                        <Eye className="w-5 h-5" /> Review Pesanan
                    </button>
                </form>
            </div>

            {/* Confirm Modal */}
            <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Konfirmasi Pesanan">
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between p-3 rounded-xl bg-white/5">
                        <span className="text-sm text-slate-400">Layanan</span>
                        <span className="text-sm font-medium text-white">{layanan.judul_tugas}</span>
                    </div>
                    {diskon > 0 && (
                        <>
                            <div className="flex justify-between p-3 rounded-xl bg-white/5">
                                <span className="text-sm text-slate-400">Harga Awal</span>
                                <span className="text-sm text-slate-300 line-through">{formatRupiah(layanan.harga_estimasi)}</span>
                            </div>
                            <div className="flex justify-between p-3 rounded-xl bg-green-500/5">
                                <span className="text-sm text-green-400">Promo ({promoData?.kode})</span>
                                <span className="text-sm text-green-400">-{formatRupiah(diskon)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between p-3 rounded-xl bg-white/5">
                        <span className="text-sm text-slate-400">Total Bayar</span>
                        <span className="text-sm font-bold gradient-text">{formatRupiah(hargaFinal)}</span>
                    </div>
                    {deadline && (
                        <div className="flex justify-between p-3 rounded-xl bg-white/5">
                            <span className="text-sm text-slate-400">Deadline</span>
                            <span className="text-sm text-white">{new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                    )}
                    {detail && (
                        <div className="p-3 rounded-xl bg-white/5">
                            <p className="text-sm text-slate-400 mb-1">Catatan</p>
                            <p className="text-sm text-white">{detail}</p>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Kembali</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Konfirmasi</>}
                    </button>
                </div>
            </Modal>
        </div>
    )
}
