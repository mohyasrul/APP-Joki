import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Tag, Plus, Edit3, ToggleLeft, ToggleRight, Save, X, Loader2, Trash2, Percent, DollarSign } from 'lucide-react'

export default function AdminPromo() {
    const [promos, setPromos] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ kode: '', deskripsi: '', tipe: 'persen', nilai: '', kuota: '', aktif: true })
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const toast = useToast()

    useEffect(() => { fetchPromos() }, [])

    const fetchPromos = async () => {
        const { data } = await supabase.from('promos').select('*').order('created_at', { ascending: false })
        setPromos(data || [])
        setLoading(false)
    }

    const openModal = (item = null) => {
        if (item) {
            setEditing(item)
            setForm({ kode: item.kode, deskripsi: item.deskripsi || '', tipe: item.tipe, nilai: item.nilai, kuota: item.kuota || '', aktif: item.aktif })
        } else {
            setEditing(null)
            setForm({ kode: '', deskripsi: '', tipe: 'persen', nilai: '', kuota: '', aktif: true })
        }
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const payload = {
            kode: form.kode.toUpperCase(),
            deskripsi: form.deskripsi,
            tipe: form.tipe,
            nilai: parseInt(form.nilai),
            kuota: form.kuota ? parseInt(form.kuota) : null,
            aktif: form.aktif,
        }
        try {
            if (editing) {
                const { error } = await supabase.from('promos').update(payload).eq('id', editing.id)
                if (error) throw error
                toast.success('Promo berhasil diperbarui')
            } else {
                const { error } = await supabase.from('promos').insert(payload)
                if (error) throw error
                toast.success('Promo baru berhasil dibuat')
            }
            setShowModal(false)
            fetchPromos()
        } catch (err) { toast.error('Gagal menyimpan: ' + err.message) }
        finally { setSaving(false) }
    }

    const toggleAktif = async (item) => {
        await supabase.from('promos').update({ aktif: !item.aktif }).eq('id', item.id)
        toast.info(item.aktif ? 'Promo dinonaktifkan' : 'Promo diaktifkan')
        fetchPromos()
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const { error } = await supabase.from('promos').delete().eq('id', deleteTarget.id)
        if (error) toast.error('Gagal menghapus promo')
        else { toast.success('Promo berhasil dihapus'); fetchPromos() }
        setDeleteTarget(null)
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Tag className="w-7 h-7 text-primary-light" /> Kelola Promo
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Buat dan atur kode promo untuk klien</p>
                </div>
                <button onClick={() => openModal()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Buat Promo
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="glass rounded-2xl p-5 h-20 animate-pulse" />)}</div>
            ) : promos.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Tag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Belum ada promo</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {promos.map(item => (
                        <div key={item.id} className="glass rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.03]">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 font-mono font-bold text-primary-light text-sm">{item.kode}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.aktif ? 'text-green-400 bg-green-500/10' : 'text-slate-500 bg-white/5'}`}>
                                        {item.aktif ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400">{item.deskripsi || '-'}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm font-semibold gradient-text">
                                        {item.tipe === 'persen' ? `${item.nilai}%` : `Rp ${item.nilai.toLocaleString('id-ID')}`}
                                    </span>
                                    {item.kuota && (
                                        <span className="text-xs text-slate-500">
                                            Terpakai {item.terpakai}/{item.kuota}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => toggleAktif(item)} className={`p-2 rounded-lg transition-all ${item.aktif ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:bg-white/5'}`}>
                                    {item.aktif ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => openModal(item)} className="p-2 rounded-lg text-slate-400 hover:text-primary-light hover:bg-primary/10 transition-all">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setDeleteTarget(item)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg glass rounded-2xl p-6 slide-up glow">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Promo' : 'Buat Promo Baru'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Kode Promo</label>
                                <input type="text" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} className={inputClass + ' uppercase font-mono'}
                                    placeholder="DISKON20" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Deskripsi</label>
                                <input type="text" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className={inputClass}
                                    placeholder="Diskon 20% untuk semua layanan" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipe Diskon</label>
                                    <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className={inputClass + ' cursor-pointer'}>
                                        <option value="persen" className="bg-slate-800">Persen (%)</option>
                                        <option value="nominal" className="bg-slate-800">Nominal (Rp)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nilai</label>
                                    <input type="number" value={form.nilai} onChange={(e) => setForm({ ...form, nilai: e.target.value })} className={inputClass}
                                        placeholder={form.tipe === 'persen' ? '20' : '10000'} required min="0" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Kuota (kosongkan = unlimited)</label>
                                <input type="number" value={form.kuota} onChange={(e) => setForm({ ...form, kuota: e.target.value })} className={inputClass}
                                    placeholder="100" min="0" />
                            </div>
                            <button type="submit" disabled={saving}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {editing ? 'Simpan' : 'Buat Promo'}</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm glass rounded-2xl p-6 slide-up text-center">
                        <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">Hapus Promo?</h3>
                        <p className="text-sm text-slate-400 mb-6">Kode: <span className="font-mono text-primary-light">{deleteTarget.kode}</span></p>
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
