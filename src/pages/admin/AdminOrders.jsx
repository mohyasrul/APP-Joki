import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import {
    ClipboardList, Search, CheckCircle, XCircle, X, Image as ImageIcon,
    Loader2, AlertTriangle, Upload, Star, FileText, Download, ExternalLink, Eye
} from 'lucide-react'

const STATUS_PEKERJAAN = ['Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai', 'Batal']
const STATUS_COLORS = {
    'Menunggu Diproses': 'text-yellow-400 bg-yellow-500/10',
    'Sedang Dikerjakan': 'text-blue-400 bg-blue-500/10',
    'Selesai': 'text-green-400 bg-green-500/10',
    'Batal': 'text-red-400 bg-red-500/10',
}
const BAYAR_COLORS = {
    'Belum Bayar': 'text-red-400 bg-red-500/10',
    'Menunggu Verifikasi': 'text-yellow-400 bg-yellow-500/10',
    'Lunas': 'text-green-400 bg-green-500/10',
}

const FILE_ICONS = {
    image: '🖼️', pdf: '📄', doc: '📝', zip: '📦', default: '📎'
}
const getFileIcon = (name) => {
    if (!name) return FILE_ICONS.default
    const ext = name.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return FILE_ICONS.image
    if (ext === 'pdf') return FILE_ICONS.pdf
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return FILE_ICONS.doc
    if (['zip', 'rar', '7z'].includes(ext)) return FILE_ICONS.zip
    return FILE_ICONS.default
}

export default function AdminOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('Semua')
    const [search, setSearch] = useState('')
    const [showBukti, setShowBukti] = useState(null)
    const toast = useToast()

    // Upload hasil modal
    const [uploadModal, setUploadModal] = useState(null)
    const [uploadFiles, setUploadFiles] = useState([])
    const [uploadNote, setUploadNote] = useState('')
    const [uploading, setUploading] = useState(false)

    // View hasil modal
    const [viewHasil, setViewHasil] = useState(null)

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

    const fetchOrders = async () => {
        const { data } = await supabase.from('orders').select('*, layanan(judul_tugas), profiles(full_name, phone)').order('created_at', { ascending: false })
        setOrders(data || [])
        setLoading(false)
    }

    const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    const handleVerifikasi = async (orderId, accept) => {
        await supabase.from('orders').update({ status_pembayaran: accept ? 'Lunas' : 'Belum Bayar', ...(accept ? {} : { bukti_transfer_url: null }) }).eq('id', orderId)
        toast.success(accept ? 'Pembayaran diterima ✅' : 'Pembayaran ditolak')
        fetchOrders(); setShowBukti(null)
    }

    const handleUpdateStatus = async (orderId, newStatus) => {
        await supabase.from('orders').update({ status_pekerjaan: newStatus }).eq('id', orderId)
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

    const isDeadlineSoon = (d) => { if (!d) return false; const diff = new Date(d) - new Date(); return diff > 0 && diff < 86400000 }
    const isOverdue = (d) => d && new Date(d) < new Date()

    const filters = ['Semua', 'Menunggu Verifikasi', 'Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai']
    const filtered = orders.filter(o => {
        if (filter === 'Menunggu Verifikasi') return o.status_pembayaran === 'Menunggu Verifikasi'
        if (filter !== 'Semua') return o.status_pekerjaan === filter
        return true
    }).filter(o =>
        (o.layanan?.judul_tugas || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase())
    )

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(1) + ' MB'
    }

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-primary-light" /> Manajemen Order
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{orders.length} total order</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari klien / tugas..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all text-sm" />
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {filters.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${filter === f ? 'bg-primary/20 text-primary-light border border-primary/30' : 'glass text-slate-400 hover:text-white'}`}>
                        {f === 'Menunggu Verifikasi' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {f}
                        {f === 'Menunggu Verifikasi' && orders.filter(o => o.status_pembayaran === 'Menunggu Verifikasi').length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-xs flex items-center justify-center font-bold badge-pulse">
                                {orders.filter(o => o.status_pembayaran === 'Menunggu Verifikasi').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl p-5 h-20 animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Tidak ada order</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(order => {
                        const hasHasil = (order.hasil_files?.length > 0) || order.hasil_url || order.catatan_hasil
                        return (
                            <div key={order.id} className={`glass rounded-2xl p-5 transition-all hover:bg-white/[0.03] ${isOverdue(order.tenggat_waktu) && !['Selesai', 'Batal'].includes(order.status_pekerjaan) ? 'border border-red-500/30' :
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
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[order.status_pekerjaan]}`}>{order.status_pekerjaan}</span>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${BAYAR_COLORS[order.status_pembayaran]}`}>{order.status_pembayaran}</span>
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

            {/* Bukti Transfer Modal */}
            {showBukti && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg glass rounded-2xl p-6 slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Bukti Transfer</h2>
                            <button onClick={() => setShowBukti(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                        </div>
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
                    </div>
                </div>
            )}

            {/* Upload Hasil Modal */}
            {uploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg glass rounded-2xl p-6 slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Upload Hasil Tugas</h2>
                            <button onClick={() => setUploadModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                        </div>
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
                    </div>
                </div>
            )}

            {/* View Hasil Modal */}
            {viewHasil && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg glass rounded-2xl p-6 slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Hasil Tugas</h2>
                            <button onClick={() => setViewHasil(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                        </div>
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
                    </div>
                </div>
            )}
        </div>
    )
}
