import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import { EnvelopeSimple, SpinnerGap, ArrowLeft } from '@phosphor-icons/react'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [submittedEmail, setSubmittedEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [cooldown, setCooldown] = useState(0) // Timer in seconds
    const { resetPassword, checkEmailExists } = useAuth()
    const toast = useToast()

    // Handle timer countdown
    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(timer)
    }, [cooldown])

    const handleSubmit = async (e) => {
        e.preventDefault()
        const targetEmail = sent ? submittedEmail : email;
        if (!targetEmail || cooldown > 0) return
        setLoading(true)
        try {
            // Validate email existence securely before initiating reset
            // We only need to validate it strictly on the first send since the Db doesn't change
            if (!sent) {
                const isExist = await checkEmailExists(targetEmail)
                if (!isExist) {
                    toast.error('Tidak ada akun Jokskuy yang terdaftar dengan email ini.')
                    setLoading(false)
                    return
                }
            }

            await resetPassword(targetEmail)
            if (!sent) {
                setSubmittedEmail(targetEmail)
                setSent(true)
            }
            setCooldown(60) // Start 60-second cooldown
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-[-10%] w-96 h-96 bg-brand-500/10 rounded-full blur-3xl mix-blend-multiply" />
            <div className="absolute bottom-0 right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl mix-blend-multiply" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Jokskuy</h1>
                    <p className="mt-2 text-sm text-slate-600 font-medium">Reset Kata Sandi</p>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl shadow-brand-500/5 rounded-3xl border border-slate-100 sm:px-10">
                    {sent ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <EnvelopeSimple weight="fill" className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Cek Email Anda</h3>
                            <p className="text-sm text-slate-600 mb-6">
                                Kami telah mengirimkan link untuk mereset kata sandi ke <span className="font-semibold text-slate-800">{submittedEmail}</span>. Link ini aktif selama 24 jam.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || cooldown > 0}
                                    className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <SpinnerGap className="w-5 h-5 animate-spin" />
                                    ) : cooldown > 0 ? (
                                        `Kirim Ulang (${cooldown}s)`
                                    ) : (
                                        'Kirim Ulang Email'
                                    )}
                                </button>

                                <Link to="/login" className="inline-block text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors mt-2">
                                    Kembali ke Halaman Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <p className="text-sm text-slate-600 mb-4">
                                Masukkan email yang terdaftar. Kami akan mengirimkan instruksi untuk mengatur ulang kata sandi Anda.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 pl-1">Email <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <EnvelopeSimple className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm font-medium"
                                        placeholder="nama@email.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
                            >
                                {loading ? <SpinnerGap className="w-5 h-5 animate-spin" /> : 'Kirim Link Reset'}
                            </button>

                            <div className="mt-6 text-center">
                                <Link to="/login" className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                                    <ArrowLeft weight="bold" className="w-4 h-4" /> Kembali Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
