import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Settings, Save, Loader2, CreditCard, Tag, Plus, X, Trash2, GripVertical } from 'lucide-react'

export default function AdminSettings() {
    const [form, setForm] = useState({ bank_name: '', bank_account: '', bank_holder: '', ewallet_name: '', ewallet_number: '', notes: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    // Kategori
    const [kategoriList, setKategoriList] = useState([])
    const [newKategori, setNewKategori] = useState('')
    const [addingKategori, setAddingKategori] = useState(false)

    useEffect(() => { fetchSettings(); fetchKategori() }, [])

    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*').eq('id', 'payment_info').single()
        if (data?.data) setForm(data.data)
        setLoading(false)
    }

    const fetchKategori = async () => {
        const { data } = await supabase.from('kategori').select('*').order('urutan', { ascending: true })
        setKategoriList(data || [])
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const { error } = await supabase.from('settings').update({ data: form, updated_at: new Date().toISOString() }).eq('id', 'payment_info')
        if (error) toast.error('Gagal menyimpan: ' + error.message)
        else toast.success('Info pembayaran berhasil diperbarui!')
        setSaving(false)
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

    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

    return (
        <div className="max-w-2xl mx-auto fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-7 h-7 text-primary-light" /> Pengaturan
                </h1>
                <p className="text-sm text-slate-400 mt-1">Atur info pembayaran dan kategori layanan</p>
            </div>

            {/* Payment Info */}
            <div className="glass rounded-2xl p-6 glow">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary-light" /> Info Pembayaran
                </h2>
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

            {/* Kategori Management */}
            <div className="glass rounded-2xl p-6 glow">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary-light" /> Kategori Layanan
                </h2>
                <p className="text-sm text-slate-400 mb-4">Atur kategori yang muncul di katalog dan form layanan</p>

                {/* Add */}
                <div className="flex gap-2 mb-4">
                    <input type="text" value={newKategori} onChange={(e) => setNewKategori(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddKategori()}
                        className={inputClass} placeholder="Nama kategori baru..." />
                    <button onClick={handleAddKategori} disabled={addingKategori || !newKategori.trim()}
                        className="px-5 py-3 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                        {addingKategori ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Tambah</>}
                    </button>
                </div>

                {/* List */}
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
        </div>
    )
}
