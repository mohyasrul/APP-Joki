import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import { BookOpen, Plus, PencilSimple, ToggleLeft, ToggleRight, FloppyDisk, SpinnerGap, Trash, Copy, Clock } from '@phosphor-icons/react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

export default function KelolaLayanan() {
    const [layanan, setLayanan] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ judul_tugas: '', deskripsi: '', harga_estimasi: '', estimasi_hari: '', kategori: 'Lainnya', tersedia: true })
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [kategoriOptions, setKategoriOptions] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
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

    const openModal = (item = null) => {
        if (item) {
            setEditing(item)
            setForm({ judul_tugas: item.judul_tugas, deskripsi: item.deskripsi || '', harga_estimasi: item.harga_estimasi, estimasi_hari: item.estimasi_hari || '', kategori: item.kategori || 'Lainnya', tersedia: item.tersedia })
        } else {
            setEditing(null)
            setForm({ judul_tugas: '', deskripsi: '', harga_estimasi: '', estimasi_hari: '', kategori: kategoriOptions[0] || 'Lainnya', tersedia: true })
        }
        setShowModal(true)
    }

    const handleDuplicate = (item) => {
        setEditing(null)
        setForm({
            judul_tugas: item.judul_tugas + ' (Salinan)',
            deskripsi: item.deskripsi || '',
            harga_estimasi: item.harga_estimasi,
            estimasi_hari: item.estimasi_hari || '',
            kategori: item.kategori || 'Lainnya',
            tersedia: false,
        })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const payload = { judul_tugas: form.judul_tugas, deskripsi: form.deskripsi, harga_estimasi: parseInt(form.harga_estimasi), estimasi_hari: form.estimasi_hari ? parseInt(form.estimasi_hari) : null, kategori: form.kategori, tersedia: form.tersedia }
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

    const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    return (
        <div className="fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h2 className="text-lg font-bold">Kelola Katalog Layanan</h2>
                    <button onClick={() => openModal()}
                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0">
                        <Plus weight="bold" className="w-4 h-4" /> Tambah Layanan
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-50 animate-pulse" />)}</div>
                ) : layanan.length === 0 ? (
                    <div className="py-12 text-center">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-500">Belum ada layanan</h3>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-400 text-xs font-medium border-b border-slate-100">
                                        <th className="pb-3 px-2 font-normal">Layanan</th>
                                        <th className="pb-3 px-2 font-normal">Kategori</th>
                                        <th className="pb-3 px-2 font-normal">Harga</th>
                                        <th className="pb-3 px-2 font-normal">Estimasi</th>
                                        <th className="pb-3 px-2 font-normal">Status</th>
                                        <th className="pb-3 px-2 font-normal">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {layanan.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(item => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                            <td className="py-4 px-2">
                                                <div className="min-w-0">
                                                    <span className="font-medium block truncate max-w-[220px]">{item.judul_tugas}</span>
                                                    {item.deskripsi && <span className="text-xs text-slate-400 block truncate max-w-[220px]">{item.deskripsi}</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-2"><span className="px-2 py-0.5 rounded-md text-xs font-medium text-violet-600 bg-violet-50">{item.kategori || 'Lainnya'}</span></td>
                                            <td className="py-4 px-2 font-medium text-brand-600 whitespace-nowrap">{formatRupiah(item.harga_estimasi)}</td>
                                            <td className="py-4 px-2 text-slate-500 whitespace-nowrap">{item.estimasi_hari ? `${item.estimasi_hari} hari` : '-'}</td>
                                            <td className="py-4 px-2">
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${item.tersedia ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                                    {item.tersedia ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-0.5">
                                                    <button onClick={() => toggleTersedia(item)} title={item.tersedia ? 'Nonaktifkan' : 'Aktifkan'} className={`p-1.5 rounded-lg transition-all ${item.tersedia ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                                                        {item.tersedia ? <ToggleRight weight="fill" className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => handleDuplicate(item)} title="Duplikat" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"><Copy weight="bold" className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => openModal(item)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"><PencilSimple weight="bold" className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setDeleteTarget(item)} title="Hapus" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash weight="bold" className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card view */}
                        <div className="md:hidden space-y-3">
                            {layanan.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(item => (
                                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                                    {/* Row 1: Title + category */}
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-slate-800 truncate flex-1">{item.judul_tugas}</p>
                                        <span className="px-2 py-0.5 rounded-md text-xs font-medium text-violet-600 bg-violet-50 shrink-0">{item.kategori || 'Lainnya'}</span>
                                    </div>
                                    {/* Row 2: Price + duration */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-brand-600">{formatRupiah(item.harga_estimasi)}</span>
                                        {item.estimasi_hari && <span className="text-xs text-slate-400">{item.estimasi_hari} hari</span>}
                                    </div>
                                    {/* Row 3: Status + actions */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${item.tersedia ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                            {item.tersedia ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => toggleTersedia(item)} title={item.tersedia ? 'Nonaktifkan' : 'Aktifkan'} className={`p-2 rounded-lg transition-all touch-target ${item.tersedia ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                                                {item.tersedia ? <ToggleRight weight="fill" className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                            </button>
                                            <button onClick={() => openModal(item)} title="Edit" className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all touch-target"><PencilSimple weight="bold" className="w-5 h-5" /></button>
                                            <button onClick={() => setDeleteTarget(item)} title="Hapus" className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all touch-target"><Trash weight="bold" className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <Pagination currentPage={currentPage} totalItems={layanan.length} onPageChange={setCurrentPage} />
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Layanan' : 'Tambah Layanan Baru'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Judul Tugas</label>
                        <input type="text" value={form.judul_tugas} onChange={(e) => setForm({ ...form, judul_tugas: e.target.value })} className={inputClass} placeholder="Contoh: Makalah Sejarah" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Kategori</label>
                        <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className={inputClass + ' cursor-pointer'}>
                            {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Deskripsi</label>
                        <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3} className={inputClass + ' resize-none'} placeholder="Deskripsi singkat..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Harga (Rp)</label>
                            <input type="number" value={form.harga_estimasi} onChange={(e) => setForm({ ...form, harga_estimasi: e.target.value })} className={inputClass} placeholder="50000" required min="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Estimasi (hari)</label>
                            <input type="number" value={form.estimasi_hari} onChange={(e) => setForm({ ...form, estimasi_hari: e.target.value })} className={inputClass} placeholder="3" min="1" />
                        </div>
                    </div>
                    <button type="submit" disabled={saving}
                        className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><FloppyDisk weight="bold" className="w-5 h-5" /> {editing ? 'Simpan' : 'Tambah'}</>}
                    </button>
                </form>
            </Modal>

            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Layanan?" maxWidth="max-w-sm">
                <div className="text-center">
                    <Trash weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-6">"{deleteTarget?.judul_tugas}"</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                        <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Hapus</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
