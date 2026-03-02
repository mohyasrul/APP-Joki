import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, ArrowRight, BookOpen, CreditCard, BarChart3, Shield } from 'lucide-react'

export default function LandingPage() {
    const { user, isAdmin } = useAuth()

    const features = [
        { icon: BookOpen, title: 'Katalog Mingguan', desc: 'Daftar tugas kuliah yang bisa dijoki, diupdate setiap minggu.' },
        { icon: CreditCard, title: 'Pembayaran Mudah', desc: 'Transfer manual via QRIS atau bank, langsung upload buktinya.' },
        { icon: BarChart3, title: 'Tracking Real-time', desc: 'Pantau status jokian kamu kapan saja, dari mana saja.' },
        { icon: Shield, title: 'Aman & Terpercaya', desc: 'Sistem login terpisah antara admin dan klien.' },
    ]

    return (
        <div className="min-h-screen">
            {/* Hero */}
            <div className="relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0">
                    <div className="hidden md:block absolute top-20 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
                    <div className="hidden md:block absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-32 text-center">
                    <div className="slide-up">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-primary-light mb-8">
                            <Sparkles className="w-4 h-4" />
                            Platform Joki Tugas #1
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
                            <span className="gradient-text">Joki Tugas</span>
                            <br />
                            <span className="text-white">Tanpa Ribet</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                            Pesan jasa joki tugas kuliah dengan mudah. Pilih tugas, bayar, dan tunggu hasilnya.
                            Semua bisa dipantau secara real-time.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {user ? (
                                <Link
                                    to={isAdmin ? '/admin' : '/katalog'}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold text-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 flex items-center gap-2 group"
                                >
                                    Masuk Dashboard
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold text-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 flex items-center gap-2 group"
                                    >
                                        Mulai Sekarang
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-8 py-4 rounded-2xl glass glass-hover text-white font-semibold text-lg transition-all duration-300"
                                    >
                                        Sudah punya akun
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className="glass glass-hover rounded-2xl p-6 transition-all duration-300 md:hover:-translate-y-1"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6 text-primary-light" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-slate-400">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
