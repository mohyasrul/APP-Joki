import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import Modal from '../../components/Modal'
import { User, Save, Camera, Loader2, Mail, Phone, Lock, Eye, EyeOff, Bell, Trash2, AlertTriangle } from 'lucide-react'

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
    // #38 notification preferences
    const [prefs, setPrefs] = useState({ notif_order_status: true, notif_payment: true, notif_custom_request: true })
    const [savingPrefs, setSavingPrefs] = useState(false)
    // #39 account deletion
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (profile) {
            setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
            setAvatarUrl(profile.avatar_url || null)
            if (profile.preferences) {
                setPrefs(prev => ({ ...prev, ...profile.preferences }))
            }
        }
    }, [profile])

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

    const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

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
        <div className="max-w-md mx-auto fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="w-7 h-7 text-primary-light" /> Profil Saya
                </h1>
                <p className="text-sm text-slate-400 mt-1">Edit info profil kamu</p>
            </div>

            <div className="glass rounded-2xl p-6 glow">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                    <label className="relative cursor-pointer group">
                        <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" disabled={uploadingAvatar} />
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border-2 border-white/10 group-hover:border-primary/50 transition-all">
                            {uploadingAvatar ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-slate-500" />
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Camera className="w-4 h-4 text-white" />
                        </div>
                    </label>
                    <p className="text-xs text-slate-500 mt-2">Klik untuk ubah foto</p>
                </div>

                {/* Email (readonly) */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input type="email" value={user?.email || ''} disabled
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed" />
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Lengkap</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                placeholder="Nama lengkap kamu" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">No. HP</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                placeholder="081234567890" />
                        </div>
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Simpan Profil</>}
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="glass rounded-2xl p-6 glow mt-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-primary-light" /> Ubah Password
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Password Baru</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type={showNewPw ? 'text' : 'password'} value={pw.newPw} onChange={(e) => setPw({ ...pw, newPw: e.target.value })}
                                className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                placeholder="Min. 6 karakter" required minLength={6} />
                            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                                {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Konfirmasi Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type={showConfirmPw ? 'text' : 'password'} value={pw.confirmPw} onChange={(e) => setPw({ ...pw, confirmPw: e.target.value })}
                                className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                placeholder="Ulangi password baru" required minLength={6} />
                            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                                {showConfirmPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={savingPw}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {savingPw ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-5 h-5" /> Ubah Password</>}
                    </button>
                </form>
            </div>

            {/* Notification Preferences */}
            <div className="glass rounded-2xl p-6 glow mt-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-primary-light" /> Preferensi Notifikasi
                </h2>
                <div className="space-y-3">
                    {[
                        { key: 'notif_order_status', label: 'Update status pesanan' },
                        { key: 'notif_payment', label: 'Update pembayaran' },
                        { key: 'notif_custom_request', label: 'Update custom request' },
                    ].map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between cursor-pointer">
                            <span className="text-sm text-slate-300">{label}</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={prefs[key]}
                                    onChange={e => setPrefs(prev => ({ ...prev, [key]: e.target.checked }))} />
                                <div onClick={() => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                                        prefs[key] ? 'bg-primary' : 'bg-white/10'
                                    }`}>
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                        prefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                                    }`} />
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
                <button onClick={handleSavePrefs} disabled={savingPrefs}
                    className="w-full mt-5 py-2.5 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Simpan Preferensi</>}
                </button>
            </div>

            {/* Danger Zone */}
            <div className="glass rounded-2xl p-6 border border-red-500/20 mt-6">
                <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" /> Zona Bahaya
                </h2>
                <p className="text-sm text-slate-400 mb-4">Menghapus akun bersifat permanen. Semua data pesanan, riwayat, dan profil akan dihapus.</p>
                <button onClick={() => setShowDeleteModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-medium text-sm hover:bg-red-500/20 transition-all flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Hapus Akun Saya
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Hapus Akun?</h3>
                    <p className="text-sm text-slate-400">Tindakan ini tidak dapat dibatalkan. Semua data kamu akan dihapus permanen.</p>
                </div>
                <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-1.5">Ketik <span className="font-bold text-red-400">HAPUS</span> untuk konfirmasi</label>
                    <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                        placeholder="HAPUS" />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                        className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all text-sm">Batal</button>
                    <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'HAPUS' || deleting}
                        className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-1.5">
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Hapus Permanen</>}
                    </button>
                </div>
            </Modal>
        </div>
    )
}
