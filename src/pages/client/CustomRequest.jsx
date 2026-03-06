import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import { PaperPlaneTilt, ArrowLeft, FileText, Calendar, SpinnerGap, CheckCircle, Sparkle, CurrencyDollar, Paperclip, X } from '@phosphor-icons/react'

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

    const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    if (success) {
        return (
            <div className="max-w-md mx-auto fade-in">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                    <CheckCircle weight="fill" className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Request Terkirim!</h2>
                    <p className="text-sm text-slate-500 mb-6">Admin akan meninjau request kamu. Kamu akan mendapat order khusus jika diterima.</p>
                    <div className="flex gap-3">
                        <button onClick={() => { setSuccess(false); setForm({ judul: '', deskripsi: '', deadline: '', budget_min: '', budget_max: '' }); setAttachments([]) }}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Request Lagi</button>
                        <button onClick={() => navigate('/pesanan-saya')}
                            className="flex-1 py-2.5 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all">Lihat Status</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fade-in">
            <button onClick={() => navigate('/katalog')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-5 py-2 touch-target">
                <ArrowLeft weight="bold" className="w-5 h-5" /> Kembali ke Katalog
            </button>

            <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
                {/* LEFT: Form card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                    {/* Response time badge — mobile only */}
                    <div className="md:hidden flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700">Biasanya direspons dalam 1×24 jam</p>
                    </div>
                    <div className="mb-6">
                        <h2 className="text-lg font-bold">Request Joki Custom</h2>
                        <p className="text-sm text-slate-500">Minta joki tugas di luar katalog</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Judul Tugas</label>
                            <div className="relative">
                                <FileText weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })}
                                    className={inputClass + ' pl-11'}
                                    placeholder="Contoh: Skripsi Bab 3 tentang AI" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Deskripsi / Detail</label>
                            <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={4}
                                className={inputClass + ' resize-none'}
                                placeholder="Jelaskan detail tugas, requirementsnya, jumlah halaman, dll..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Deadline (opsional)</label>
                            <div className="relative">
                                <Calendar weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className={inputClass + ' pl-11'} />
                            </div>
                        </div>

                        {/* Budget Range */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Budget (opsional)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="relative">
                                    <CurrencyDollar weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                                        className={inputClass + ' pl-9'}
                                        placeholder="Min (Rp)" min="0" />
                                </div>
                                <div className="relative">
                                    <CurrencyDollar weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                                        className={inputClass + ' pl-9'}
                                        placeholder="Max (Rp)" min="0" />
                                </div>
                            </div>
                        </div>

                        {/* File Attachments */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                <span className="flex items-center gap-1.5"><Paperclip weight="bold" className="w-4 h-4" /> Lampiran (opsional, max {MAX_FILES} file, 5MB)</span>
                            </label>
                            {attachments.length < MAX_FILES && (
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 hover:border-brand-300 cursor-pointer transition-all group mb-2">
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.zip,.rar" />
                                    <Paperclip weight="bold" className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                    <span className="text-sm text-slate-500 group-hover:text-slate-600">Klik untuk pilih file</span>
                                </label>
                            )}
                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    {attachments.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-brand-50 border border-brand-100">
                                            <span className="text-sm text-brand-600 truncate flex-1">{f.name}</span>
                                            <span className="text-xs text-slate-400 mx-2">{(f.size / 1024).toFixed(0)} KB</span>
                                            <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                                className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors">
                                                <X weight="bold" className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                            {loading ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><PaperPlaneTilt weight="fill" className="w-5 h-5" /> Kirim Request</>}
                        </button>
                    </form>
                </div>

                {/* Cara Kerja — mobile only (inline below form) */}
                <div className="md:hidden mt-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Sparkle weight="fill" className="w-4 h-4 text-brand-500" /> Cara Kerja
                    </h3>
                    <div className="space-y-2.5">
                        {[
                            { step: '1', title: 'Kirim Request', desc: 'Isi form dengan detail tugas.' },
                            { step: '2', title: 'Review Admin', desc: 'Admin meninjau & tentukan harga.' },
                            { step: '3', title: 'Terima Order', desc: 'Order khusus dibuat untukmu.' },
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 text-[10px] font-bold shrink-0">{step}</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Info panel (desktop only) */}
                <div className="hidden md:flex flex-col gap-4 sticky top-8">
                    {/* How it works */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkle weight="fill" className="w-4 h-4 text-brand-500" /> Cara Kerja
                        </h3>
                        <div className="space-y-4">
                            {[
                                { step: '1', title: 'Kirim Request', desc: 'Isi form dengan detail tugas dan budget kamu.' },
                                { step: '2', title: 'Review Admin', desc: 'Admin meninjau request dan menentukan harga.' },
                                { step: '3', title: 'Terima Order', desc: 'Jika diterima, order khusus dibuat untukmu.' },
                            ].map(({ step, title, desc }) => (
                                <div key={step} className="flex gap-3">
                                    <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">{step}</div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info note */}
                    <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
                        <p className="text-xs text-violet-600 leading-relaxed">
                            💡 Tugas yang kamu request akan ditinjau admin. Jika diterima, admin akan menentukan harga dan membuat order khusus untukmu.
                        </p>
                    </div>

                    {/* Response time badge */}
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700">Biasanya direspons dalam 1×24 jam</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
