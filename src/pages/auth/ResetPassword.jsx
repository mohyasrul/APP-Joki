import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { LockKey, SpinnerGap, CheckCircle } from '@phosphor-icons/react'

export default function ResetPassword() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [sessionError, setSessionError] = useState(null)
    const { updatePassword } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()

    useEffect(() => {
        // Cek apakah ada hash (Implicit) atau query (PKCE) di URL yang berkaitan dengan recovery
        const hasRecoveryParams = window.location.hash.includes('type=recovery') || window.location.search.includes('code=')

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                setSessionError(error.message)
            } else if (!session && !hasRecoveryParams) {
                // Beri sedikit delay untuk memastikan Supabase client selesai memproses auth
                setTimeout(() => {
                    navigate('/login')
                }, 1500)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                localStorage.setItem('awaiting_password_reset', 'true')
                setSessionError(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (password.length < 6) {
            toast.error('Kata sandi harus minimal 6 karakter')
            return
        }
        setLoading(true)
        try {
            await updatePassword(password)
            localStorage.removeItem('awaiting_password_reset') // Clear lock upon success
            setSuccess(true)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const { signOut } = useAuth()
    const handleCancel = async () => {
        setLoading(true)
        await signOut() // This clears the session and the localStorage lock
        navigate('/login')
    }

    if (sessionError) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
                    <div className="bg-white py-8 px-6 shadow-xl shadow-brand-500/5 rounded-3xl border border-slate-100 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LockKey weight="fill" className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Link Tidak Valid</h3>
                        <p className="text-sm text-slate-600 mb-6">{sessionError}</p>
                        <Link to="/forgot-password" className="inline-block py-2.5 px-6 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">
                            Minta Link Baru
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-[-10%] w-96 h-96 bg-brand-500/10 rounded-full blur-3xl mix-blend-multiply" />
            <div className="absolute bottom-0 right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl mix-blend-multiply" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Jokskuy</h1>
                    <p className="mt-2 text-sm text-slate-600 font-medium">Buat Kata Sandi Baru</p>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl shadow-brand-500/5 rounded-3xl border border-slate-100 sm:px-10">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle weight="fill" className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Berhasil!</h3>
                            <p className="text-sm text-slate-600 mb-6">Kata sandi Anda telah berhasil diperbarui. Silakan login menggunakan kata sandi yang baru.</p>
                            <Link to="/login" className="inline-block w-full py-3 rounded-2xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors">
                                Lanjut Login
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 pl-1">Kata Sandi Baru <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <LockKey className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm font-medium"
                                        placeholder="Min. 6 karakter"
                                        minLength="6"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || password.length < 6}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
                            >
                                {loading ? <SpinnerGap className="w-5 h-5 animate-spin" /> : 'Simpan Kata Sandi'}
                            </button>

                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-3"
                            >
                                Batalkan & Keluar
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
