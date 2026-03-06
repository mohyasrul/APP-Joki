import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { User, FloppyDisk, Camera, SpinnerGap, Envelope, Phone, Lock, Eye, EyeSlash, Bell, Trash, Warning, ChartBar, ShoppingCart, CheckCircle, Wallet, Calendar, CaretDown, CaretUp } from '@phosphor-icons/react'
import { formatRupiah } from '../../lib/utils'

export default function Profile() {
    const { user, profile, setProfile, signOut } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()
    const [form, setForm] = useState({ full_name: '', phone: '' })
    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState(null)
    const [pw, setPw] = useState({ newPw: '', confirmPw: '' })
    const [showNewPw, setShowNewPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)
    const [savingPw, setSavingPw] = useState(false)
    const [prefs, setPrefs] = useState({ notif_order_status: true, notif_payment: true, notif_custom_request: true })
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [clientStats, setClientStats] = useState(null)
    const [loadingStats, setLoadingStats] = useState(true)
    const [activeSection, setActiveSection] = useState('profile')

    useEffect(() => {
        if (profile) {
            setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
            setAvatarUrl(profile.avatar_url || null)
            if (profile.preferences) {
                setPrefs(prev => ({ ...prev, ...profile.preferences }))
            }
        }
    }, [profile])

    useEffect(() => {
        if (!user) return
        const fetchStats = async () => {
            setLoadingStats(true)
            try {
                const { data } = await supabase.rpc('get_client_stats', { p_user_id: user.id })
                setClientStats(data)
            } catch (err) { console.error(err) }
            finally { setLoadingStats(false) }
        }
        fetchStats()
    }, [user])

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.full_name.trim()) { toast.error('Nama tidak boleh kosong'); return }
        setSaving(true)
        const { error } = await supabase.from('profiles').update({
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
        }).eq('id', user.id)
        if (error) toast.error('Gagal menyimpan: ' + error.message)
        else {
            toast.success('Profil berhasil diperbarui!')
            if (setProfile) setProfile(prev => ({ ...prev, full_name: form.full_name.trim(), phone: form.phone.trim() }))
        }
        setSaving(false)
    }

    const handleUploadAvatar = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Hanya gambar JPG/PNG/WebP'); return }
        if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return }
        setUploadingAvatar(true)
        try {
            const ext = file.name.split('.').pop()
            const fileName = `avatars/${user.id}_${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage.from('bukti-transfer').upload(fileName, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('bukti-transfer').getPublicUrl(fileName)
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
            setAvatarUrl(publicUrl)
            if (setProfile) setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
            toast.success('Foto profil diperbarui!')
        } catch (err) { toast.error('Gagal upload: ' + err.message) }
        finally { setUploadingAvatar(false) }
    }

    const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (pw.newPw.length < 6) { toast.error('Password minimal 6 karakter'); return }
        if (pw.newPw !== pw.confirmPw) { toast.error('Konfirmasi password tidak cocok'); return }
        setSavingPw(true)
        const { error } = await supabase.auth.updateUser({ password: pw.newPw })
        if (error) toast.error('Gagal ubah password: ' + error.message)
        else {
            toast.success('Password berhasil diubah!')
            setPw({ newPw: '', confirmPw: '' })
        }
        setSavingPw(false)
    }

    const handleSavePrefs = async () => {
        setSavingPrefs(true)
        const { error } = await supabase.from('profiles').update({ preferences: prefs }).eq('id', user.id)
        if (error) toast.error('Gagal menyimpan preferensi: ' + error.message)
        else {
            toast.success('Preferensi notifikasi tersimpan!')
            if (setProfile) setProfile(prev => ({ ...prev, preferences: prefs }))
        }
        setSavingPrefs(false)
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'HAPUS') return
        setDeleting(true)
        const { error } = await supabase.rpc('delete_own_account')
        if (error) {
            toast.error('Gagal menghapus akun: ' + error.message)
            setDeleting(false)
        } else {
            await signOut()
            navigate('/login')
        }
    }

    return (
        <div className="fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
                <p className="text-sm text-slate-500 mt-1">Kelola informasi akun dan preferensi kamu</p>
            </div>

            <div className="grid md:grid-cols-[280px_1fr] gap-6 md:gap-8 items-start">

                {/* LEFT: Avatar + Stats (sticky) */}
                <div className="flex flex-col gap-5 md:sticky md:top-8">
                    {/* Avatar card — horizontal on mobile, centered on desktop */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0">
                        <label className="relative cursor-pointer group mb-3">
                            <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" disabled={uploadingAvatar} />
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden border-2 border-slate-100 group-hover:border-brand-300 transition-all shrink-0">
                                {uploadingAvatar ? (
                                    <SpinnerGap className="w-8 h-8 animate-spin text-brand-500" />
                                ) : avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User weight="bold" className="w-10 h-10 text-slate-300" />
                                )}
                            </div>
                            <div className="absolute -bottom-0 -right-0 md:bottom-0 md:right-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Camera weight="fill" className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                            </div>
                        </label>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email || ''}</p>
                            <p className="text-xs text-slate-400 mt-1 hidden md:block">Klik foto untuk ubah</p>
                        </div>
                    </div>

                    {/* Stats card — horizontal scroll on mobile, 2-col grid on desktop */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 md:p-5">
                        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3 md:mb-4">
                            <ChartBar weight="fill" className="w-4 h-4 text-brand-500" /> Statistik Akun
                        </h2>
                        {loadingStats ? (
                            <div className="flex justify-center py-4"><SpinnerGap className="w-6 h-6 animate-spin text-brand-500" /></div>
                        ) : clientStats ? (
                            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                                <div className="p-2.5 md:p-3 rounded-xl border border-slate-100 flex items-center gap-2 md:gap-2.5 min-w-[140px] shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Calendar weight="bold" className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Bergabung</p>
                                        <p className="text-xs font-bold text-slate-700 truncate">{clientStats.bergabung_sejak ? new Date(clientStats.bergabung_sejak).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                                    </div>
                                </div>
                                <div className="p-2.5 md:p-3 rounded-xl border border-slate-100 flex items-center gap-2 md:gap-2.5 min-w-[110px] shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                        <ShoppingCart weight="bold" className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Pesanan</p>
                                        <p className="text-xl font-bold text-slate-700">{clientStats.total_orders ?? 0}</p>
                                    </div>
                                </div>
                                <div className="p-2.5 md:p-3 rounded-xl border border-slate-100 flex items-center gap-2 md:gap-2.5 min-w-[110px] shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <CheckCircle weight="bold" className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Selesai</p>
                                        <p className="text-xl font-bold text-emerald-600">{clientStats.selesai ?? 0}</p>
                                    </div>
                                </div>
                                <div className="p-2.5 md:p-3 rounded-xl border border-slate-100 flex items-center gap-2 md:gap-2.5 min-w-[140px] shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                                        <Wallet weight="bold" className="w-4 h-4 text-brand-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Pengeluaran</p>
                                        <p className="text-xs font-bold text-brand-600 truncate">{formatRupiah(clientStats.pengeluaran_total ?? 0)}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-2">Belum ada data statistik.</p>
                        )}
                    </div>
                </div>

                {/* RIGHT: Form sections */}
                <div className="space-y-6">
                    {/* Profile Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button onClick={() => setActiveSection(activeSection === 'profile' ? null : 'profile')} className="w-full flex items-center justify-between p-4 md:p-6 bg-white hover:bg-slate-50 transition-colors text-left focus:outline-none">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <User weight="fill" className="w-5 h-5 text-brand-500" /> Informasi Profil
                            </h2>
                            {activeSection === 'profile' ? <CaretUp weight="bold" className="text-slate-400" /> : <CaretDown weight="bold" className="text-slate-400" />}
                        </button>
                        {activeSection === 'profile' && (
                            <div className="p-4 md:p-6 pt-0 md:pt-0 border-t border-slate-50 mt-2 fade-in">

                                {/* Email (readonly) */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                                    <div className="relative">
                                        <Envelope weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="email" value={user?.email || ''} disabled
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed" />
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
                                        <div className="relative">
                                            <User weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                                className={inputClass + ' pl-11'}
                                                placeholder="Nama lengkap kamu" required />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">No. HP</label>
                                        <div className="relative">
                                            <Phone weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                                className={inputClass + ' pl-11'}
                                                placeholder="081234567890" />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={saving}
                                        className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                                        {saving ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><FloppyDisk weight="bold" className="w-5 h-5" /> Simpan Profil</>}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Change Password */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')} className="w-full flex items-center justify-between p-4 md:p-6 bg-white hover:bg-slate-50 transition-colors text-left focus:outline-none">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Lock weight="fill" className="w-5 h-5 text-brand-500" /> Ubah Password
                            </h2>
                            {activeSection === 'password' ? <CaretUp weight="bold" className="text-slate-400" /> : <CaretDown weight="bold" className="text-slate-400" />}
                        </button>
                        {activeSection === 'password' && (
                            <div className="p-4 md:p-6 pt-0 md:pt-0 border-t border-slate-50 mt-2 fade-in">
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Password Baru</label>
                                        <div className="relative">
                                            <Lock weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type={showNewPw ? 'text' : 'password'} value={pw.newPw} onChange={(e) => setPw({ ...pw, newPw: e.target.value })}
                                                className={inputClass + ' pl-11 pr-11'}
                                                placeholder="Min. 6 karakter" required minLength={6} />
                                            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                                                {showNewPw ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Konfirmasi Password</label>
                                        <div className="relative">
                                            <Lock weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type={showConfirmPw ? 'text' : 'password'} value={pw.confirmPw} onChange={(e) => setPw({ ...pw, confirmPw: e.target.value })}
                                                className={inputClass + ' pl-11 pr-11'}
                                                placeholder="Ulangi password baru" required minLength={6} />
                                            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                                                {showConfirmPw ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={savingPw}
                                        className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                                        {savingPw ? <SpinnerGap className="w-5 h-5 animate-spin" /> : <><Lock weight="bold" className="w-5 h-5" /> Ubah Password</>}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Notification Preferences */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')} className="w-full flex items-center justify-between p-4 md:p-6 bg-white hover:bg-slate-50 transition-colors text-left focus:outline-none">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Bell weight="fill" className="w-5 h-5 text-brand-500" /> Preferensi Notifikasi
                            </h2>
                            {activeSection === 'notifications' ? <CaretUp weight="bold" className="text-slate-400" /> : <CaretDown weight="bold" className="text-slate-400" />}
                        </button>
                        {activeSection === 'notifications' && (
                            <div className="p-4 md:p-6 pt-0 md:pt-0 border-t border-slate-50 mt-2 fade-in">
                                <div className="space-y-3">
                                    {[
                                        { key: 'notif_order_status', label: 'Update status pesanan' },
                                        { key: 'notif_payment', label: 'Update pembayaran' },
                                        { key: 'notif_custom_request', label: 'Update custom request' },
                                    ].map(({ key, label }) => (
                                        <label key={key} className="flex items-center justify-between cursor-pointer">
                                            <span className="text-sm text-slate-600">{label}</span>
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only" checked={prefs[key]}
                                                    onChange={e => setPrefs(prev => ({ ...prev, [key]: e.target.checked }))} />
                                                <div onClick={() => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                                                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${prefs[key] ? 'bg-brand-500' : 'bg-slate-200'}`}>
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <button onClick={handleSavePrefs} disabled={savingPrefs}
                                    className="w-full mt-5 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {savingPrefs ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <><FloppyDisk weight="bold" className="w-4 h-4" /> Simpan Preferensi</>}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
                        <button onClick={() => setActiveSection(activeSection === 'danger' ? null : 'danger')} className="w-full flex items-center justify-between p-4 md:p-6 bg-white hover:bg-red-50 transition-colors text-left focus:outline-none">
                            <h2 className="text-base font-semibold text-red-500 flex items-center gap-2">
                                <Warning weight="fill" className="w-5 h-5" /> Zona Bahaya
                            </h2>
                            {activeSection === 'danger' ? <CaretUp weight="bold" className="text-red-400" /> : <CaretDown weight="bold" className="text-red-400" />}
                        </button>
                        {activeSection === 'danger' && (
                            <div className="p-4 md:p-6 pt-0 md:pt-0 border-t border-red-100 mt-2 fade-in">
                                <p className="text-sm text-slate-500 mb-4">Menghapus akun bersifat permanen. Semua data pesanan, riwayat, dan profil akan dihapus.</p>
                                <button onClick={() => setShowDeleteModal(true)}
                                    className="px-5 py-2.5 rounded-xl bg-red-50 text-red-500 border border-red-200 font-medium text-sm hover:bg-red-100 transition-all flex items-center gap-2">
                                    <Trash weight="bold" className="w-4 h-4" /> Hapus Akun Saya
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                        <Trash weight="bold" className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Hapus Akun?</h3>
                    <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan. Semua data kamu akan dihapus permanen.</p>
                </div>
                <div className="mb-4">
                    <label className="block text-sm text-slate-500 mb-1.5">Ketik <span className="font-bold text-red-500">HAPUS</span> untuk konfirmasi</label>
                    <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-400 transition-all text-sm"
                        placeholder="HAPUS" />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all text-sm">Batal</button>
                    <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'HAPUS' || deleting}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-1.5">
                        {deleting ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <><Trash weight="bold" className="w-4 h-4" /> Hapus Permanen</>}
                    </button>
                </div>
            </Modal>
        </div >
    )
}
