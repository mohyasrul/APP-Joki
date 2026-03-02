import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { LogIn, Mail, Lock, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Modal from '../../components/Modal'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotSent, setForgotSent] = useState(false)
    const [forgotError, setForgotError] = useState('')
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const handleForgotPassword = async (e) => {
        e.preventDefault()
        setForgotError('')
        setForgotLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                redirectTo: `${window.location.origin}/`
            })
            if (error) throw error
            setForgotSent(true)
        } catch (err) {
            setForgotError(err.message)
        } finally {
            setForgotLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await signIn(email, password)
            navigate('/')
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? 'Email atau password salah'
                : err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">Jokskuy</h1>
                    <p className="text-slate-400 mt-2">Masuk ke akun kamu</p>
                </div>

                {/* Form */}
                <div className="glass rounded-2xl p-8 glow">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="button" onClick={() => { setForgotEmail(email); setShowForgot(true); setForgotSent(false); setForgotError(''); }}
                                className="text-xs text-primary-light hover:text-primary transition-colors">
                                Lupa Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Masuk
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400 mt-6">
                        Belum punya akun?{' '}
                        <Link to="/register" className="text-primary-light hover:text-primary font-medium transition-colors">
                            Daftar disini
                        </Link>
                    </p>
                </div>

                {/* Forgot Password Modal */}
                <Modal open={showForgot} onClose={() => setShowForgot(false)} title={forgotSent ? null : 'Lupa Password'} maxWidth="max-w-sm">
                    {forgotSent ? (
                        <div className="text-center py-2">
                            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-white mb-2">Email Terkirim!</h3>
                            <p className="text-sm text-slate-400 mb-4">Cek inbox <span className="text-primary-light font-medium">{forgotEmail}</span> untuk link reset password.</p>
                            <button onClick={() => setShowForgot(false)}
                                className="w-full py-2.5 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all">
                                Kembali ke Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <p className="text-sm text-slate-400">Masukkan email akunmu, kami akan kirim link untuk reset password.</p>
                            {forgotError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />{forgotError}
                                </div>
                            )}
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                                    placeholder="email@example.com" required autoFocus />
                            </div>
                            <button type="submit" disabled={forgotLoading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {forgotLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Kirim Link Reset'}
                            </button>
                        </form>
                    )}
                </Modal>
            </div>
        </div>
    )
}
