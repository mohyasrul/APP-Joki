import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { formatRupiah } from '../../lib/utils'
import {
    GearSix, FloppyDisk, SpinnerGap, CreditCard, Tag, Plus, Trash, DotsSixVertical,
    CaretRight, ArrowLeft, PencilSimple, ToggleLeft, ToggleRight, Percent, SlidersHorizontal, Megaphone
} from '@phosphor-icons/react'
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
    const [promoForm, setPromoForm] = useState({ kode: '', deskripsi: '', tipe: 'persen', nilai: '', kuota: '', aktif: true, expired_at: '', max_potongan: '' })
    const [savingPromo, setSavingPromo] = useState(false)
    const [deletePromoTarget, setDeletePromoTarget] = useState(null)
    const [promoPage, setPromoPage] = useState(1)

    // ========== App Config ==========
    const [appConfig, setAppConfig] = useState({ default_max_revisi: 2, announcement: '' })
    const [savingConfig, setSavingConfig] = useState(false)

    useEffect(() => { fetchSettings(); fetchKategori(); fetchAppConfig() }, [])

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

    // ========== App Config Handlers ==========
    const fetchAppConfig = async () => {
        const { data } = await supabase.from('settings').select('*').eq('id', 'app_config').single()
        if (data?.data) setAppConfig({ default_max_revisi: data.data.default_max_revisi ?? 2, announcement: data.data.announcement || '' })
    }

    const handleSaveAppConfig = async (e) => {
        e.preventDefault()
        setSavingConfig(true)
        const newData = { default_max_revisi: parseInt(appConfig.default_max_revisi) || 2, announcement: appConfig.announcement.trim() || null }
        const { error } = await supabase.from('settings').upsert({ id: 'app_config', data: newData, updated_at: new Date().toISOString() })
        if (error) toast.error('Gagal menyimpan: ' + error.message)
        else toast.success('Pengaturan umum tersimpan!')
        setSavingConfig(false)
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
            setPromoForm({ kode: item.kode, deskripsi: item.deskripsi || '', tipe: item.tipe, nilai: item.nilai, kuota: item.kuota || '', aktif: item.aktif, expired_at: item.expired_at ? item.expired_at.slice(0, 16) : '', max_potongan: item.max_potongan || '' })
        } else {
            setEditingPromo(null)
            setPromoForm({ kode: '', deskripsi: '', tipe: 'persen', nilai: '', kuota: '', aktif: true, expired_at: '', max_potongan: '' })
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
            expired_at: promoForm.expired_at || null,
            max_potongan: promoForm.max_potongan ? parseInt(promoForm.max_potongan) : null,
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

    const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    if (loading) return <div className="flex items-center justify-center py-20"><SpinnerGap className="w-8 h-8 animate-spin text-brand-500" /></div>

    // ========== Menu Items ==========
    const menuItems = [
        { key: 'general', icon: SlidersHorizontal, label: 'Pengaturan Umum', desc: 'Max revisi default & pengumuman', bg: 'bg-indigo-500' },
        { key: 'payment', icon: CreditCard, label: 'Info Pembayaran', desc: 'Atur rekening bank dan e-wallet', bg: 'bg-emerald-500' },
        { key: 'kategori', icon: Tag, label: 'Kategori Layanan', desc: 'Atur kategori yang muncul di katalog', bg: 'bg-blue-500' },
        { key: 'promo', icon: Percent, label: 'Kelola Promo', desc: 'Buat dan atur kode promo', bg: 'bg-purple-500' },
    ]

    // ========== Section: General ==========
    const renderGeneral = () => (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
            <form onSubmit={handleSaveAppConfig} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Max Revisi Default</label>
                    <p className="text-xs text-slate-400 mb-2">Jumlah revisi standar untuk setiap order baru</p>
                    <input type="number" value={appConfig.default_max_revisi}
                        onChange={(e) => setAppConfig({ ...appConfig, default_max_revisi: e.target.value })}
                        className={inputClass} min="0" max="10" placeholder="2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1.5"><Megaphone weight="fill" className="w-4 h-4 text-brand-500" /> Pengumuman / Banner</span>
                    </label>
                    <p className="text-xs text-slate-400 mb-2">Teks pengumuman yang muncul di Katalog. Kosongkan untuk menonaktifkan.</p>
                    <textarea value={appConfig.announcement}
                        onChange={(e) => setAppConfig({ ...appConfig, announcement: e.target.value })}
                        rows={3}
                        className={inputClass + ' resize-none'}
                        placeholder="Contoh: 🎉 Promo akhir tahun! Diskon 20% untuk semua layanan..." />
                </div>
                <button type="submit" disabled={savingConfig}
                    className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingConfig ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><FloppyDisk weight="bold" className="w-5 h-5" /> Simpan Pengaturan</>}
                </button>
            </form>
        </div>
    )

    // ========== Section: Payment ==========
    const renderPayment = () => (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Bank</label>
                        <input type="text" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={inputClass} placeholder="BCA" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">No. Rekening</label>
                        <input type="text" value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} className={inputClass} placeholder="1234567890" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Atas Nama</label>
                    <input type="text" value={form.bank_holder} onChange={(e) => setForm({ ...form, bank_holder: e.target.value })} className={inputClass} placeholder="Nama Anda" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">E-Wallet</label>
                        <input type="text" value={form.ewallet_name} onChange={(e) => setForm({ ...form, ewallet_name: e.target.value })} className={inputClass} placeholder="DANA / OVO" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">No. E-Wallet</label>
                        <input type="text" value={form.ewallet_number} onChange={(e) => setForm({ ...form, ewallet_number: e.target.value })} className={inputClass} placeholder="081234567890" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Catatan Tambahan</label>
                    <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} placeholder="Atau scan QRIS" />
                </div>
                <button type="submit" disabled={saving}
                    className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><FloppyDisk weight="bold" className="w-5 h-5" /> Simpan Pembayaran</>}
                </button>
            </form>
        </div>
    )

    // ========== Section: Kategori ==========
    const renderKategori = () => (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
            <p className="text-sm text-slate-500 mb-4">Atur kategori yang muncul di katalog dan form layanan</p>
            <div className="flex gap-2 mb-4">
                <input type="text" value={newKategori} onChange={(e) => setNewKategori(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKategori()}
                    className={inputClass} placeholder="Nama kategori baru..." />
                <button onClick={handleAddKategori} disabled={addingKategori || !newKategori.trim()}
                    className="px-5 py-3 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                    {addingKategori ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <><Plus weight="bold" className="w-4 h-4" /> Tambah</>}
                </button>
            </div>
            {kategoriList.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada kategori. Tambahkan di atas.</p>
            ) : (
                <div className="space-y-2">
                    {kategoriList.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 group">
                            <DotsSixVertical weight="bold" className="w-4 h-4 text-slate-300 shrink-0" />
                            <input type="text" defaultValue={item.nama}
                                onBlur={(e) => handleUpdateKategori(item, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur() } }}
                                className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none focus:text-brand-600" />
                            <button onClick={() => handleDeleteKategori(item)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all sm:opacity-0 sm:group-hover:opacity-100">
                                <Trash weight="bold" className="w-4 h-4" />
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
                    className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-all flex items-center gap-2 shadow-sm">
                    <Plus weight="bold" className="w-4 h-4" /> Buat Promo
                </button>
            </div>

            {promoLoading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 h-20 animate-pulse" />)}</div>
            ) : promos.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                    <Percent className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-500">Belum ada promo</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedPromos.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center justify-between gap-4 transition-all hover:shadow-md">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-3 py-1 rounded-lg bg-brand-50 font-mono font-bold text-brand-600 text-sm">{item.kode}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.aktif ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                        {item.aktif ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">{item.deskripsi || '-'}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm font-semibold text-brand-600">
                                        {item.tipe === 'persen' ? `${item.nilai}%` : formatRupiah(item.nilai)}
                                    </span>
                                    {item.kuota && (
                                        <span className="text-xs text-slate-400">
                                            Terpakai {item.terpakai}/{item.kuota}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => togglePromoAktif(item)} className={`p-2 rounded-lg transition-all ${item.aktif ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    {item.aktif ? <ToggleRight weight="fill" className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => openPromoModal(item)} className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                                    <PencilSimple weight="bold" className="w-5 h-5" />
                                </button>
                                <button onClick={() => setDeletePromoTarget(item)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <Trash weight="bold" className="w-5 h-5" />
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
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Kode Promo</label>
                        <input type="text" value={promoForm.kode} onChange={(e) => setPromoForm({ ...promoForm, kode: e.target.value.toUpperCase() })} className={inputClass + ' uppercase font-mono'}
                            placeholder="DISKON20" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Deskripsi</label>
                        <input type="text" value={promoForm.deskripsi} onChange={(e) => setPromoForm({ ...promoForm, deskripsi: e.target.value })} className={inputClass}
                            placeholder="Diskon 20% untuk semua layanan" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipe Diskon</label>
                            <select value={promoForm.tipe} onChange={(e) => setPromoForm({ ...promoForm, tipe: e.target.value })} className={inputClass + ' cursor-pointer'}>
                                <option value="persen">Persen (%)</option>
                                <option value="nominal">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Nilai</label>
                            <input type="number" value={promoForm.nilai} onChange={(e) => setPromoForm({ ...promoForm, nilai: e.target.value })} className={inputClass}
                                placeholder={promoForm.tipe === 'persen' ? '20' : '10000'} required min="0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Kuota (kosongkan = unlimited)</label>
                        <input type="number" value={promoForm.kuota} onChange={(e) => setPromoForm({ ...promoForm, kuota: e.target.value })} className={inputClass}
                            placeholder="100" min="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Berlaku Sampai (opsional)</label>
                        <input type="datetime-local" value={promoForm.expired_at} onChange={(e) => setPromoForm({ ...promoForm, expired_at: e.target.value })} className={inputClass + ' cursor-pointer'} />
                    </div>
                    {promoForm.tipe === 'persen' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Max Potongan / Rp (opsional)</label>
                            <input type="number" value={promoForm.max_potongan} onChange={(e) => setPromoForm({ ...promoForm, max_potongan: e.target.value })} className={inputClass}
                                placeholder="50000" min="0" />
                        </div>
                    )}
                    <button type="submit" disabled={savingPromo}
                        className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {savingPromo ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><FloppyDisk weight="bold" className="w-5 h-5" /> {editingPromo ? 'Simpan' : 'Buat Promo'}</>}
                    </button>
                </form>
            </Modal>

            {/* Delete Promo Modal */}
            <Modal open={!!deletePromoTarget} onClose={() => setDeletePromoTarget(null)} title="Hapus Promo?" maxWidth="max-w-sm">
                <div className="text-center">
                    <Trash weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-6">Kode: <span className="font-mono text-brand-600">{deletePromoTarget?.kode}</span></p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeletePromoTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                        <button onClick={handleDeletePromo} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Hapus</button>
                    </div>
                </div>
            </Modal>
        </>
    )

    // ========== Active Section Title ==========
    const activeSectionTitle = menuItems.find(m => m.key === activeSection)?.label || ''

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'general': return renderGeneral()
            case 'payment': return renderPayment()
            case 'kategori': return renderKategori()
            case 'promo': return renderPromo()
            default: return (
                <div className="hidden md:flex items-center justify-center py-20 text-slate-400 text-sm">
                    Pilih menu di samping untuk mulai mengatur
                </div>
            )
        }
    }

    return (
        <div className="fade-in">
            {/* Desktop split-pane */}
            <div className="hidden md:flex gap-6">
                {/* Left nav panel */}
                <div className="w-72 shrink-0">
                    <div className="sticky top-6">
                        <h1 className="text-lg font-bold mb-5">Pengaturan</h1>
                        <nav className="space-y-1.5">
                            {menuItems.map((item) => (
                                <button key={item.key}
                                    onClick={() => {
                                        setActiveSection(item.key)
                                        if (item.key === 'promo') fetchPromos()
                                    }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all group ${activeSection === item.key ? 'bg-brand-50 border-l-[3px] border-brand-500' : 'hover:bg-slate-50 border-l-[3px] border-transparent'}`}
                                >
                                    <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                                        <item.icon weight="fill" className="w-4.5 h-4.5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${activeSection === item.key ? 'text-brand-700' : 'text-slate-700'}`}>{item.label}</p>
                                        <p className="text-xs text-slate-400 truncate">{item.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Right content panel */}
                <div className="flex-1 min-w-0">
                    {activeSection && (
                        <h2 className="text-lg font-bold mb-5">{activeSectionTitle}</h2>
                    )}
                    {renderSectionContent()}
                </div>
            </div>

            {/* Mobile: card menu + section (existing behavior) */}
            <div className="md:hidden">
                <div className="mb-6">
                    {activeSection ? (
                        <div>
                            <button onClick={() => setActiveSection(null)}
                                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-3">
                                <ArrowLeft weight="bold" className="w-4 h-4" /> Kembali ke Pengaturan
                            </button>
                            <h1 className="text-lg font-bold">{activeSectionTitle}</h1>
                        </div>
                    ) : (
                        <h1 className="text-lg font-bold">Pengaturan</h1>
                    )}
                </div>

                {/* Mobile menu list */}
                {!activeSection && (
                    <div className="space-y-3">
                        {menuItems.map((item) => (
                            <button key={item.key}
                                onClick={() => {
                                    setActiveSection(item.key)
                                    if (item.key === 'promo') fetchPromos()
                                }}
                                className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 transition-all hover:shadow-md group text-left"
                            >
                                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center shadow-sm shrink-0`}>
                                    <item.icon weight="fill" className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-slate-800">{item.label}</h3>
                                    <p className="text-sm text-slate-500">{item.desc}</p>
                                </div>
                                <CaretRight weight="bold" className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors shrink-0" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Mobile section content */}
                {activeSection && renderSectionContent()}
            </div>
        </div>
    )
}
