import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import {
    Settings, Save, Loader2, CreditCard, Tag, Plus, Trash2, GripVertical,
    ChevronRight, ArrowLeft, Edit3, ToggleLeft, ToggleRight, Percent
} from 'lucide-react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

export default function AdminSettings() {
    const [activeSection, setActiveSection] = useState(null)
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    // ========== Payment Info ==========
    const [form, setForm] = useState({ bank_name: '', bank_account: '', bank_holder: '', ewallet_name: '', ewallet_number: '', notes: '' })
    const [saving, setSaving] = useState(false)

    // ========== Kategori ==========
    const [kategoriList, setKategoriList] = useState([])
    const [newKategori, setNewKategori] = useState('')
    const [addingKategori, setAddingKategori] = useState(false)

    // ========== Promo ==========
    const [promos, setPromos] = useState([])
    const [promoLoading, setPromoLoading] = useState(true)
    const [showPromoModal, setShowPromoModal] = useState(false)
    const [editingPromo, setEditingPromo] = useState(null)
    const [promoForm, setPromoForm] = useState({ kode: '', deskripsi: '', tipe: 'persen', nilai: '', kuota: '', aktif: true })
    const [savingPromo, setSavingPromo] = useState(false)
    const [deletePromoTarget, setDeletePromoTarget] = useState(null)
    const [promoPage, setPromoPage] = useState(1)

    useEffect(() => { fetchSettings(); fetchKategori() }, [])

    // ========== Payment Handlers ==========
    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*').eq('id', 'payment_info').single()
        if (data?.data) setForm(data.data)
        setLoading(false)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const { error } = await supabase.from('settings').update({ data: form, updated_at: new Date().toISOString() }).eq('id', 'payment_info')
        if (error) toast.error('Gagal menyimpan: ' + error.message)
        else toast.success('Info pembayaran berhasil diperbarui!')
        setSaving(false)
    }

    // ========== Kategori Handlers ==========
    const fetchKategori = async () => {
        const { data } = await supabase.from('kategori').select('*').order('urutan', { ascending: true })
        setKategoriList(data || [])
    }

    const handleAddKategori = async () => {
        if (!newKategori.trim()) return
        setAddingKategori(true)
        const maxUrutan = kategoriList.length > 0 ? Math.max(...kategoriList.map(k => k.urutan)) + 1 : 1
        const { error } = await supabase.from('kategori').insert({ nama: newKategori.trim(), urutan: maxUrutan })
        if (error) toast.error(error.message.includes('duplicate') ? 'Kategori sudah ada' : 'Gagal menambah: ' + error.message)
        else { toast.success(`Kategori "${newKategori.trim()}" ditambahkan`); setNewKategori(''); fetchKategori() }
        setAddingKategori(false)
    }

    const handleDeleteKategori = async (item) => {
        const { error } = await supabase.from('kategori').delete().eq('id', item.id)
        if (error) toast.error('Gagal menghapus')
        else { toast.success(`"${item.nama}" dihapus`); fetchKategori() }
    }

    const handleUpdateKategori = async (item, newName) => {
        if (!newName.trim() || newName === item.nama) return
        const { error } = await supabase.from('kategori').update({ nama: newName.trim() }).eq('id', item.id)
        if (error) toast.error('Gagal memperbarui')
        else fetchKategori()
    }

    // ========== Promo Handlers ==========
    const fetchPromos = async () => {
        setPromoLoading(true)
        const { data } = await supabase.from('promos').select('*').order('created_at', { ascending: false })
        setPromos(data || [])
        setPromoLoading(false)
    }

    const openPromoModal = (item = null) => {
        if (item) {
            setEditingPromo(item)
            setPromoForm({ kode: item.kode, deskripsi: item.deskripsi || '', tipe: item.tipe, nilai: item.nilai, kuota: item.kuota || '', aktif: item.aktif })
        } else {
            setEditingPromo(null)
            setPromoForm({ kode: '', deskripsi: '', tipe: 'persen', nilai: '', kuota: '', aktif: true })
        }
        setShowPromoModal(true)
    }

    const handleSavePromo = async (e) => {
        e.preventDefault()
        setSavingPromo(true)
        const payload = {
            kode: promoForm.kode.toUpperCase(),
            deskripsi: promoForm.deskripsi,
            tipe: promoForm.tipe,
            nilai: parseInt(promoForm.nilai),
            kuota: promoForm.kuota ? parseInt(promoForm.kuota) : null,
            aktif: promoForm.aktif,
        }
        try {
            if (editingPromo) {
                const { error } = await supabase.from('promos').update(payload).eq('id', editingPromo.id)
                if (error) throw error
                toast.success('Promo berhasil diperbarui')
            } else {
                const { error } = await supabase.from('promos').insert(payload)
                if (error) throw error
                toast.success('Promo baru berhasil dibuat')
            }
            setShowPromoModal(false)
            fetchPromos()
        } catch (err) { toast.error('Gagal menyimpan: ' + err.message) }
        finally { setSavingPromo(false) }
    }

    const togglePromoAktif = async (item) => {
        await supabase.from('promos').update({ aktif: !item.aktif }).eq('id', item.id)
        toast.info(item.aktif ? 'Promo dinonaktifkan' : 'Promo diaktifkan')
        fetchPromos()
    }

    const handleDeletePromo = async () => {
        if (!deletePromoTarget) return
        const { error } = await supabase.from('promos').delete().eq('id', deletePromoTarget.id)
        if (error) toast.error('Gagal menghapus promo')
        else { toast.success('Promo berhasil dihapus'); fetchPromos() }
        setDeletePromoTarget(null)
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

    // ========== Menu Items ==========
    const menuItems = [
        { key: 'payment', icon: CreditCard, label: 'Info Pembayaran', desc: 'Atur rekening bank dan e-wallet', gradient: 'from-green-500 to-emerald-500' },
        { key: 'kategori', icon: Tag, label: 'Kategori Layanan', desc: 'Atur kategori yang muncul di katalog', gradient: 'from-blue-500 to-cyan-500' },
        { key: 'promo', icon: Percent, label: 'Kelola Promo', desc: 'Buat dan atur kode promo', gradient: 'from-purple-500 to-pink-500' },
    ]

    // ========== Section: Payment ==========
    const renderPayment = () => (
        <div className="glass rounded-2xl p-6 glow">
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Bank</label>
                        <input type="text" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={inputClass} placeholder="BCA" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">No. Rekening</label>
                        <input type="text" value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} className={inputClass} placeholder="1234567890" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Atas Nama</label>
                    <input type="text" value={form.bank_holder} onChange={(e) => setForm({ ...form, bank_holder: e.target.value })} className={inputClass} placeholder="Nama Anda" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">E-Wallet</label>
                        <input type="text" value={form.ewallet_name} onChange={(e) => setForm({ ...form, ewallet_name: e.target.value })} className={inputClass} placeholder="DANA / OVO" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">No. E-Wallet</label>
                        <input type="text" value={form.ewallet_number} onChange={(e) => setForm({ ...form, ewallet_number: e.target.value })} className={inputClass} placeholder="081234567890" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Catatan Tambahan</label>
                    <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} placeholder="Atau scan QRIS" />
                </div>
                <button type="submit" disabled={saving}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Simpan Pembayaran</>}
                </button>
            </form>
        </div>
    )

    // ========== Section: Kategori ==========
    const renderKategori = () => (
        <div className="glass rounded-2xl p-6 glow">
            <p className="text-sm text-slate-400 mb-4">Atur kategori yang muncul di katalog dan form layanan</p>
            <div className="flex gap-2 mb-4">
                <input type="text" value={newKategori} onChange={(e) => setNewKategori(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKategori()}
                    className={inputClass} placeholder="Nama kategori baru..." />
                <button onClick={handleAddKategori} disabled={addingKategori || !newKategori.trim()}
                    className="px-5 py-3 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                    {addingKategori ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Tambah</>}
                </button>
            </div>
            {kategoriList.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada kategori. Tambahkan di atas.</p>
            ) : (
                <div className="space-y-2">
                    {kategoriList.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 group">
                            <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                            <input type="text" defaultValue={item.nama}
                                onBlur={(e) => handleUpdateKategori(item, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur() } }}
                                className="flex-1 bg-transparent text-sm text-white focus:outline-none focus:text-primary-light" />
                            <button onClick={() => handleDeleteKategori(item)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    // ========== Section: Promo ==========
    const paginatedPromos = promos.slice((promoPage - 1) * ITEMS_PER_PAGE, promoPage * ITEMS_PER_PAGE)

    const renderPromo = () => (
        <>
            <div className="flex justify-end mb-4">
                <button onClick={() => openPromoModal()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Buat Promo
                </button>
            </div>

            {promoLoading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="glass rounded-2xl p-5 h-20 animate-pulse" />)}</div>
            ) : promos.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Percent className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Belum ada promo</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedPromos.map(item => (
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
                                        {item.tipe === 'persen' ? `${item.nilai}%` : formatRupiah(item.nilai)}
                                    </span>
                                    {item.kuota && (
                                        <span className="text-xs text-slate-500">
                                            Terpakai {item.terpakai}/{item.kuota}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => togglePromoAktif(item)} className={`p-2 rounded-lg transition-all ${item.aktif ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:bg-white/5'}`}>
                                    {item.aktif ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => openPromoModal(item)} className="p-2 rounded-lg text-slate-400 hover:text-primary-light hover:bg-primary/10 transition-all">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setDeletePromoTarget(item)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {promos.length > ITEMS_PER_PAGE && (
                <Pagination currentPage={promoPage} totalItems={promos.length} onPageChange={setPromoPage} />
            )}

            {/* Promo Modal */}
            <Modal open={showPromoModal} onClose={() => setShowPromoModal(false)} title={editingPromo ? 'Edit Promo' : 'Buat Promo Baru'}>
                <form onSubmit={handleSavePromo} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Kode Promo</label>
                        <input type="text" value={promoForm.kode} onChange={(e) => setPromoForm({ ...promoForm, kode: e.target.value.toUpperCase() })} className={inputClass + ' uppercase font-mono'}
                            placeholder="DISKON20" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Deskripsi</label>
                        <input type="text" value={promoForm.deskripsi} onChange={(e) => setPromoForm({ ...promoForm, deskripsi: e.target.value })} className={inputClass}
                            placeholder="Diskon 20% untuk semua layanan" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipe Diskon</label>
                            <select value={promoForm.tipe} onChange={(e) => setPromoForm({ ...promoForm, tipe: e.target.value })} className={inputClass + ' cursor-pointer'}>
                                <option value="persen" className="bg-slate-800">Persen (%)</option>
                                <option value="nominal" className="bg-slate-800">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nilai</label>
                            <input type="number" value={promoForm.nilai} onChange={(e) => setPromoForm({ ...promoForm, nilai: e.target.value })} className={inputClass}
                                placeholder={promoForm.tipe === 'persen' ? '20' : '10000'} required min="0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Kuota (kosongkan = unlimited)</label>
                        <input type="number" value={promoForm.kuota} onChange={(e) => setPromoForm({ ...promoForm, kuota: e.target.value })} className={inputClass}
                            placeholder="100" min="0" />
                    </div>
                    <button type="submit" disabled={savingPromo}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {savingPromo ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {editingPromo ? 'Simpan' : 'Buat Promo'}</>}
                    </button>
                </form>
            </Modal>

            {/* Delete Promo Modal */}
            <Modal open={!!deletePromoTarget} onClose={() => setDeletePromoTarget(null)} title="Hapus Promo?" maxWidth="max-w-sm">
                <div className="text-center">
                    <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 mb-6">Kode: <span className="font-mono text-primary-light">{deletePromoTarget?.kode}</span></p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeletePromoTarget(null)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Batal</button>
                        <button onClick={handleDeletePromo} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all">Hapus</button>
                    </div>
                </div>
            </Modal>
        </>
    )

    // ========== Active Section Title ==========
    const activeSectionTitle = menuItems.find(m => m.key === activeSection)?.label || ''

    return (
        <div className="max-w-2xl mx-auto fade-in">
            <div className="mb-6">
                {activeSection ? (
                    <div>
                        <button onClick={() => setActiveSection(null)}
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-light transition-colors mb-3">
                            <ArrowLeft className="w-4 h-4" /> Kembali ke Pengaturan
                        </button>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Settings className="w-7 h-7 text-primary-light" /> {activeSectionTitle}
                        </h1>
                    </div>
                ) : (
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Settings className="w-7 h-7 text-primary-light" /> Pengaturan
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">Atur pembayaran, kategori, dan promo</p>
                    </div>
                )}
            </div>

            {/* Menu List */}
            {!activeSection && (
                <div className="space-y-3">
                    {menuItems.map((item) => (
                        <button key={item.key}
                            onClick={() => {
                                setActiveSection(item.key)
                                if (item.key === 'promo') fetchPromos()
                            }}
                            className="w-full glass rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-white/[0.03] group text-left"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                                <item.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-white">{item.label}</h3>
                                <p className="text-sm text-slate-400">{item.desc}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-primary-light transition-colors shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* Section Content */}
            {activeSection === 'payment' && renderPayment()}
            {activeSection === 'kategori' && renderKategori()}
            {activeSection === 'promo' && renderPromo()}
        </div>
    )
}
