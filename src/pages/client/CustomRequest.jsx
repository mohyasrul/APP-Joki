import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import { Send, ArrowLeft, FileText, Calendar, Loader2, CheckCircle, Sparkles, DollarSign, Paperclip, X } from 'lucide-react'

export default function CustomRequest() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()
    const [form, setForm] = useState({ judul: '', deskripsi: '', deadline: '', budget_min: '', budget_max: '' })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [attachments, setAttachments] = useState([])
    const MAX_FILES = 3
    const MAX_SIZE = 5 * 1024 * 1024

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.judul.trim()) { toast.error('Judul tidak boleh kosong'); return }
        setLoading(true)
        try {
            // Upload attachments first
            const uploadedFiles = []
            for (const file of attachments) {
                const path = `order-attachments/requests/${user.id}/${Date.now()}_${file.name}`
                const { error: upErr } = await supabase.storage.from('bukti-transfer').upload(path, file)
                if (upErr) { toast.error(`Gagal upload ${file.name}`); continue }
                const { data: { publicUrl } } = supabase.storage.from('bukti-transfer').getPublicUrl(path)
                uploadedFiles.push({ name: file.name, url: publicUrl, size: file.size, type: file.type })
            }

            const { error } = await supabase.from('custom_requests').insert({
                client_id: user.id,
                judul: form.judul.trim(),
                deskripsi: form.deskripsi.trim() || null,
                deadline: form.deadline || null,
                budget_min: form.budget_min ? parseInt(form.budget_min) : null,
                budget_max: form.budget_max ? parseInt(form.budget_max) : null,
                lampiran_files: uploadedFiles.length > 0 ? uploadedFiles : [],
            })
            if (error) throw error
            setSuccess(true)
            toast.success('Request berhasil dikirim!')
        } catch (err) { toast.error('Gagal mengirim: ' + err.message) }
        finally { setLoading(false) }
    }

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        const remaining = MAX_FILES - attachments.length
        const valid = files.filter(f => {
            if (f.size > MAX_SIZE) { toast.error(`${f.name} terlalu besar (max 5MB)`); return false }
            return true
        }).slice(0, remaining)
        if (files.length > remaining) toast.error(`Maksimal ${MAX_FILES} file`)
        setAttachments(prev => [...prev, ...valid])
        e.target.value = ''
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

    if (success) {
        return (
            <div className="max-w-md mx-auto fade-in">
                <div className="glass rounded-2xl p-8 text-center glow">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Request Terkirim!</h2>
                    <p className="text-sm text-slate-400 mb-6">Admin akan meninjau request kamu. Kamu akan mendapat order khusus jika diterima.</p>
                    <div className="flex gap-3">
                        <button onClick={() => { setSuccess(false); setForm({ judul: '', deskripsi: '', deadline: '', budget_min: '', budget_max: '' }); setAttachments([]) }}
                            className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Request Lagi</button>
                        <button onClick={() => navigate('/pesanan-saya')}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold transition-all">Lihat Status</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto fade-in">
            <button onClick={() => navigate('/katalog')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
            </button>

            <div className="glass rounded-2xl p-6 glow">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary-light" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Request Joki Custom</h2>
                        <p className="text-sm text-slate-400">Minta joki tugas di luar katalog</p>
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
                    <p className="text-xs text-indigo-300">💡 Tugas yang kamu request akan ditinjau admin. Jika diterima, admin akan menentukan harga dan membuat order khusus untukmu.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Judul Tugas</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                placeholder="Contoh: Skripsi Bab 3 tentang AI" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Deskripsi / Detail</label>
                        <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={4}
                            className={inputClass + ' resize-none'}
                            placeholder="Jelaskan detail tugas, requirementsnya, jumlah halaman, dll..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Deadline (opsional)</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
                        </div>
                    </div>

                    {/* Budget Range */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Budget (opsional)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
                                    placeholder="Min (Rp)" min="0" />
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all"
                                    placeholder="Max (Rp)" min="0" />
                            </div>
                        </div>
                    </div>

                    {/* File Attachments */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            <span className="flex items-center gap-1.5"><Paperclip className="w-4 h-4" /> Lampiran (opsional, max {MAX_FILES} file, 5MB)</span>
                        </label>
                        {attachments.length < MAX_FILES && (
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 hover:border-primary/30 cursor-pointer transition-all group mb-2">
                                <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.zip,.rar" />
                                <Paperclip className="w-5 h-5 text-slate-500 group-hover:text-primary-light transition-colors" />
                                <span className="text-sm text-slate-400 group-hover:text-slate-300">Klik untuk pilih file</span>
                            </label>
                        )}
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                {attachments.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                                        <span className="text-sm text-primary-light truncate flex-1">{f.name}</span>
                                        <span className="text-xs text-slate-500 mx-2">{(f.size / 1024).toFixed(0)} KB</span>
                                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                            className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Kirim Request</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
