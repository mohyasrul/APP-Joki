import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserPlus, Envelope, Lock, User, Phone, Sparkle, WarningCircle, CheckCircle, ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react'

export default function Register() {
    const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (form.password !== form.confirmPassword) {
            setError('Password tidak cocok')
            return
        }
        if (form.password.length < 6) {
            setError('Password minimal 6 karakter')
            return
        }
        if (form.phone && !/^(08|\+62)[0-9]{8,13}$/.test(form.phone)) {
            setError('Format nomor HP tidak valid (contoh: 081234567890)')
            return
        }
        setLoading(true)
        try {
            await signUp(form.email, form.password, form.fullName, form.phone)
            setEmailSent(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
                <div className="w-full max-w-md slide-up text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                        <CheckCircle weight="fill" className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-3">Cek Email Kamu!</h1>
                    <p className="text-slate-500 mb-2">Kami sudah mengirim link verifikasi ke:</p>
                    <p className="text-brand-600 font-medium mb-6">{form.email}</p>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 text-left">
                        <p className="text-sm text-slate-600 mb-3">Langkah selanjutnya:</p>
                        <ol className="text-sm text-slate-500 space-y-2 list-decimal list-inside">
                            <li>Buka inbox email kamu</li>
                            <li>Klik link verifikasi dari Jokskuy</li>
                            <li>Setelah terverifikasi, login dengan akun baru</li>
                        </ol>
                        <p className="text-xs text-slate-400 mt-3">Tidak menemukan email? Cek folder spam.</p>
                    </div>
                    <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all group shadow-sm">
                        Ke Halaman Login
                        <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 md:py-8 bg-slate-50">
            <div className="w-full max-w-md slide-up">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
                        <Sparkle weight="fill" className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Buat Akun</h1>
                    <p className="text-slate-500 mt-1 text-sm">Daftar untuk mulai pesan joki</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
                                <WarningCircle weight="bold" className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
                            <div className="relative">
                                <User weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                                    className={inputClass} placeholder="Masukkan Nama Anda" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email (Perlu Verifikasi)</label>
                            <div className="relative">
                                <Envelope weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="email" name="email" value={form.email} onChange={handleChange}
                                    className={inputClass} placeholder="Masukkan Email Anda" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">No. HP (opsional)</label>
                            <div className="relative">
                                <Phone weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                                    className={inputClass} placeholder="Masukkan No. HP Anda" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                                    className={inputClass + ' pr-11'} placeholder="Min. 6 karakter" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Konfirmasi Password</label>
                            <div className="relative">
                                <Lock weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                                    className={inputClass + ' pr-11'} placeholder="Ulangi password" required />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showConfirm ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus weight="bold" className="w-5 h-5" />
                                    Daftar
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Sudah punya akun?{' '}
                        <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                            Masuk disini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
