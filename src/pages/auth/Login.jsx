import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { SignIn, Envelope, Lock, Sparkle, WarningCircle, Eye, EyeSlash } from '@phosphor-icons/react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const { signIn } = useAuth()
    const navigate = useNavigate()

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

    const inputClass = "w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 md:py-0 bg-slate-50">
            <div className="w-full max-w-md slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
                        <Sparkle weight="fill" className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Jokskuy</h1>
                    <p className="text-slate-500 mt-1 text-sm">Masuk ke akun kamu</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
                                <WarningCircle weight="bold" className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                            <div className="relative">
                                <Envelope weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={inputClass + ' pr-11'}
                                    placeholder="••••••••"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link to="/forgot-password"
                                className="text-xs text-brand-600 hover:text-brand-700 transition-colors">
                                Lupa Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <SignIn weight="bold" className="w-5 h-5" />
                                    Masuk
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Belum punya akun?{' '}
                        <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                            Daftar disini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
