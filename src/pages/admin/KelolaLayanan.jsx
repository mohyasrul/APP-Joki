import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { BookOpen, Plus, Edit3, ToggleLeft, ToggleRight, Save, X, Loader2, Trash2 } from 'lucide-react'

export default function KelolaLayanan() {
    const [layanan, setLayanan] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ judul_tugas: '', deskripsi: '', harga_estimasi: '', kategori: 'Lainnya', tersedia: true })
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [kategoriOptions, setKategoriOptions] = useState([])
    const toast = useToast()

    useEffect(() => { fetchLayanan(); fetchKategori() }, [])

    const fetchLayanan = async () => {
        const { data } = await supabase.from('layanan').select('*').order('created_at', { ascending: false })
        setLayanan(data || [])
        setLoading(false)
    }

    const fetchKategori = async () => {
        const { data } = await supabase.from('kategori').select('nama').order('urutan', { ascending: true })
        setKategoriOptions((data || []).map(k => k.nama))
    }

    const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    const openModal = (item = null) => {
        if (item) {
            setEditing(item)
            setForm({ judul_tugas: item.judul_tugas, deskripsi: item.deskripsi || '', harga_estimasi: item.harga_estimasi, kategori: item.kategori || 'Lainnya', tersedia: item.tersedia })
        } else {
            setEditing(null)
            setForm({ judul_tugas: '', deskripsi: '', harga_estimasi: '', kategori: kategoriOptions[0] || 'Lainnya', tersedia: true })
        }
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const payload = { judul_tugas: form.judul_tugas, deskripsi: form.deskripsi, harga_estimasi: parseInt(form.harga_estimasi), kategori: form.kategori, tersedia: form.tersedia }
        try {
            if (editing) {
                const { error } = await supabase.from('layanan').update(payload).eq('id', editing.id)
                if (error) throw error
                toast.success('Layanan berhasil diperbarui')
            } else {
                const { error } = await supabase.from('layanan').insert(payload)
                if (error) throw error
                toast.success('Layanan baru berhasil ditambahkan')
            }
            setShowModal(false); fetchLayanan()
        } catch (err) { toast.error('Gagal menyimpan: ' + err.message) }
        finally { setSaving(false) }
    }

    const toggleTersedia = async (item) => {
        await supabase.from('layanan').update({ tersedia: !item.tersedia }).eq('id', item.id)
        toast.info(item.tersedia ? 'Layanan dinonaktifkan' : 'Layanan diaktifkan'); fetchLayanan()
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const { error } = await supabase.from('layanan').delete().eq('id', deleteTarget.id)
        if (error) toast.error('Gagal menghapus. Pastikan tidak ada order terhubung.')
        else { toast.success('Layanan berhasil dihapus'); fetchLayanan() }
        setDeleteTarget(null)
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-7 h-7 text-primary-light" /> Kelola Katalog
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Tambah, edit, atau hapus layanan joki</p>
                </div>
                <button onClick={() => openModal()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Layanan
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl p-5 h-24 animate-pulse" />)}</div>
            ) : layanan.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Belum ada layanan</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {layanan.map(item => (
                        <div key={item.id} className="glass rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.03]">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-semibold text-white truncate">{item.judul_tugas}</h3>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-indigo-400 bg-indigo-500/10">{item.kategori || 'Lainnya'}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.tersedia ? 'text-green-400 bg-green-500/10' : 'text-slate-500 bg-white/5'}`}>
                                        {item.tersedia ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 truncate">{item.deskripsi || '-'}</p>
                                <p className="text-sm font-semibold gradient-text mt-1">{formatRupiah(item.harga_estimasi)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => toggleTersedia(item)} className={`p-2 rounded-lg transition-all ${item.tersedia ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:bg-white/5'}`}>
                                    {item.tersedia ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => openModal(item)} className="p-2 rounded-lg text-slate-400 hover:text-primary-light hover:bg-primary/10 transition-all"><Edit3 className="w-5 h-5" /></button>
                                <button onClick={() => setDeleteTarget(item)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg glass rounded-2xl p-6 slide-up glow">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Judul Tugas</label>
                                <input type="text" value={form.judul_tugas} onChange={(e) => setForm({ ...form, judul_tugas: e.target.value })} className={inputClass} placeholder="Contoh: Makalah Sejarah" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Kategori</label>
                                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className={inputClass + ' cursor-pointer'}>
                                    {kategoriOptions.map(k => <option key={k} value={k} className="bg-slate-800">{k}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Deskripsi</label>
                                <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3} className={inputClass + ' resize-none'} placeholder="Deskripsi singkat..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Harga (Rp)</label>
                                <input type="number" value={form.harga_estimasi} onChange={(e) => setForm({ ...form, harga_estimasi: e.target.value })} className={inputClass} placeholder="50000" required min="0" />
                            </div>
                            <button type="submit" disabled={saving}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {editing ? 'Simpan' : 'Tambah'}</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm glass rounded-2xl p-6 slide-up text-center">
                        <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">Hapus Layanan?</h3>
                        <p className="text-sm text-slate-400 mb-6">"{deleteTarget.judul_tugas}"</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all">Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
