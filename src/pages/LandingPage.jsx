import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/utils'
import {
    Sparkle, ArrowRight, BookOpen, CreditCard, ChartBar, ShieldCheck,
    Star, CaretDown, Users, UserPlus, ShoppingCart, UploadSimple, FileArrowDown,
    ArrowsClockwise, Tag, Lightning, CheckCircle
} from '@phosphor-icons/react'

const FALLBACK_REVIEWS = [
    { rating: 5, review: 'Pengerjaan cepat dan hasilnya rapi banget. Recommended!', client_name: 'A***' },
    { rating: 5, review: 'Tugas selesai sebelum deadline. Admin juga fast response.', client_name: 'R***' },
    { rating: 4, review: 'Harga terjangkau, kualitas oke. Pasti order lagi.', client_name: 'D***' },
]

const FAQ_ITEMS = [
    { q: 'Apa itu Jokskuy?', a: 'Jokskuy adalah platform jasa pengerjaan tugas kuliah. Kamu tinggal pilih layanan, bayar, dan tunggu hasilnya — semua bisa dipantau secara real-time.' },
    { q: 'Bagaimana cara memesan?', a: 'Daftar akun → Pilih layanan di Katalog → Isi detail tugas & deadline → Bayar via transfer → Upload bukti → Tunggu dikerjakan. Semudah itu!' },
    { q: 'Berapa lama pengerjaan?', a: 'Tergantung jenis tugas dan kompleksitas. Rata-rata 1–3 hari kerja. Kamu bisa setting deadline sendiri saat order.' },
    { q: 'Apakah bisa revisi?', a: 'Tentu! Setiap pesanan mendapat jatah revisi gratis. Jika hasil belum sesuai, kamu bisa request revisi langsung dari halaman order.' },
    { q: 'Bagaimana sistem pembayaran?', a: 'Pembayaran via transfer bank atau e-wallet (QRIS). Setelah transfer, upload bukti bayar dan admin akan verifikasi dalam hitungan menit.' },
    { q: 'Apakah data saya aman?', a: 'Sangat aman. Sistem kami menggunakan enkripsi dan role-based access. Data tugas dan identitasmu hanya bisa diakses oleh kamu dan admin.' },
]

function StarRating({ rating }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} weight="fill" className={`w-4 h-4 ${s <= rating ? 'text-amber-400' : 'text-slate-200'}`} />
            ))}
        </div>
    )
}

function AnimatedCounter({ value, suffix = '' }) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (!value) return
        const target = typeof value === 'number' ? value : parseFloat(value)
        if (isNaN(target)) return
        let start = 0
        const duration = 1500
        const step = Math.max(1, Math.ceil(target / (duration / 16)))
        const timer = setInterval(() => {
            start += step
            if (start >= target) { setCount(target); clearInterval(timer) }
            else setCount(start)
        }, 16)
        return () => clearInterval(timer)
    }, [value])
    return <>{Number.isInteger(count) ? count : count.toFixed(1)}{suffix}</>
}

export default function LandingPage() {
    const { user, isAdmin } = useAuth()
    const [stats, setStats] = useState(null)
    const [openFaq, setOpenFaq] = useState(null)

    useEffect(() => {
        supabase.rpc('get_landing_stats').then(({ data }) => {
            if (data) setStats(data)
        }).catch(() => { })
    }, [])

    const features = [
        { icon: BookOpen, title: 'Katalog Mingguan', desc: 'Daftar tugas kuliah yang bisa dijoki, update setiap minggu sesuai kebutuhan.' },
        { icon: CreditCard, title: 'Pembayaran Mudah', desc: 'Transfer via bank atau QRIS, upload bukti, dan admin verifikasi dalam hitungan menit.' },
        { icon: ChartBar, title: 'Tracking Real-time', desc: 'Pantau progres pengerjaan tugas kapan saja, dari mana saja lewat dashboard.' },
        { icon: ShieldCheck, title: 'Aman & Terpercaya', desc: 'Sistem terenkripsi dengan role-based access. Data kamu terlindungi.' },
        { icon: ArrowsClockwise, title: 'Revisi Gratis', desc: 'Setiap pesanan mendapat jatah revisi gratis jika hasil belum sesuai.' },
        { icon: Tag, title: 'Promo & Diskon', desc: 'Gunakan kode promo untuk potongan harga. Cek promo terbaru di katalog!' },
    ]

    const howItWorks = [
        { step: 1, icon: UserPlus, title: 'Daftar Akun', desc: 'Buat akun gratis dalam 30 detik' },
        { step: 2, icon: ShoppingCart, title: 'Pilih Layanan', desc: 'Browse katalog & pilih tugas' },
        { step: 3, icon: UploadSimple, title: 'Bayar & Upload', desc: 'Transfer lalu upload bukti bayar' },
        { step: 4, icon: FileArrowDown, title: 'Terima Hasil', desc: 'Duduk santai, hasil dikirim tepat waktu' },
    ]

    const reviews = stats?.recentReviews?.length > 0 ? stats.recentReviews : FALLBACK_REVIEWS
    const layananPreview = stats?.featuredLayanan || []

    return (
        <div className="min-h-screen bg-white">
            {/* ======== HERO ======== */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl opacity-60" />
                    <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl opacity-60" />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 text-center">
                    <div className="slide-up">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-sm text-brand-600 mb-8">
                            <Sparkle weight="fill" className="w-4 h-4" />
                            Platform Joki Tugas #1
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
                            <span className="text-brand-500">Joki Tugas</span>
                            <br />
                            <span className="text-slate-800">Tanpa Ribet</span>
                        </h1>

                        <p className="text-base sm:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto mb-10">
                            Pesan jasa joki tugas kuliah dengan mudah. Pilih tugas, bayar, dan tunggu hasilnya.
                            Semua bisa dipantau secara real-time.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            {user ? (
                                <Link
                                    to={isAdmin ? '/admin' : '/katalog'}
                                    className="px-8 py-4 rounded-2xl bg-brand-500 text-white font-semibold text-lg hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20 transition-all duration-300 flex items-center gap-2 group"
                                >
                                    Masuk Dashboard
                                    <ArrowRight weight="bold" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="px-8 py-4 rounded-2xl bg-brand-500 text-white font-semibold text-lg hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20 transition-all duration-300 flex items-center gap-2 group"
                                    >
                                        Mulai Sekarang
                                        <ArrowRight weight="bold" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-lg hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                    >
                                        Sudah punya akun
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Live Stats */}
                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                            <div className="text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-slate-800">
                                    <AnimatedCounter value={stats?.totalCompleted || 0} />+
                                </p>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">Tugas Selesai</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                            <div className="text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-slate-800">
                                    <AnimatedCounter value={stats?.totalClients || 0} />+
                                </p>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">Klien Terdaftar</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                            <div className="text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center justify-center gap-1">
                                    <Star weight="fill" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                                    <AnimatedCounter value={stats?.avgRating || 0} />
                                </p>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">Rating Rata-rata</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======== CARA KERJA ======== */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Cara Kerjanya</h2>
                    <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Cuma 4 langkah mudah dari daftar sampai terima hasil</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
                    <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-brand-200 via-violet-200 to-rose-200" />

                    {howItWorks.map((item, i) => (
                        <div key={i} className="relative flex flex-col items-center text-center">
                            <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-500 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
                                <item.icon weight="bold" className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-xs font-bold text-brand-500 flex items-center justify-center shadow-md border border-slate-100">
                                    {item.step}
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-1">{item.title}</h3>
                            <p className="text-xs sm:text-sm text-slate-500">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ======== PREVIEW KATALOG ======== */}
            {layananPreview.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Layanan Tersedia</h2>
                        <p className="text-slate-500 text-sm sm:text-base">Pilih layanan sesuai kebutuhan tugasmu</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {layananPreview.map((l, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                                <span className="inline-block self-start text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 mb-3">
                                    {l.kategori || 'Lainnya'}
                                </span>
                                <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-2 line-clamp-2 flex-1">{l.judul_tugas}</h3>
                                <p className="text-sm sm:text-base font-bold text-brand-600">
                                    {formatRupiah(l.harga_estimasi)}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <Link
                            to={user ? '/katalog' : '/register'}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-brand-600 font-medium text-sm hover:bg-slate-50 transition-all group shadow-sm"
                        >
                            Lihat Semua Katalog
                            <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            )}

            {/* ======== FITUR ======== */}
            <div className="bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Kenapa Pilih Jokskuy?</h2>
                        <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Fitur lengkap yang bikin pengalaman joki tugas jadi mudah dan aman</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 transition-all duration-300 md:hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-3 sm:mb-4">
                                    <feature.icon weight="fill" className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" />
                                </div>
                                <h3 className="text-sm sm:text-lg font-semibold text-slate-800 mb-1 sm:mb-2">{feature.title}</h3>
                                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======== TESTIMONI ======== */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Apa Kata Mereka</h2>
                    <p className="text-slate-500 text-sm sm:text-base">Review asli dari klien yang sudah menggunakan Jokskuy</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reviews.slice(0, 3).map((rev, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 flex flex-col">
                            <StarRating rating={rev.rating} />
                            <p className="text-sm text-slate-600 mt-3 mb-4 flex-1 leading-relaxed">"{rev.review}"</p>
                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
                                    <span className="text-xs font-bold text-brand-600">{rev.client_name?.charAt(0)}</span>
                                </div>
                                <span className="text-sm text-slate-500 font-medium">{rev.client_name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ======== FAQ ======== */}
            <div className="bg-slate-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Pertanyaan Umum</h2>
                        <p className="text-slate-500 text-sm sm:text-base">Temukan jawaban untuk pertanyaan yang sering ditanyakan</p>
                    </div>
                    <div className="space-y-3">
                        {FAQ_ITEMS.map((faq, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-sm sm:text-base font-medium text-slate-800 pr-4">{faq.q}</span>
                                    <CaretDown weight="bold" className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======== CTA FINAL ======== */}
            {!user && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
                    <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center bg-brand-500">
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
                            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-300 rounded-full blur-3xl" />
                        </div>
                        <div className="relative z-10">
                            <Lightning weight="fill" className="w-10 h-10 sm:w-12 sm:h-12 text-white mx-auto mb-4" />
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Siap Untuk Mulai?</h2>
                            <p className="text-brand-100 text-sm sm:text-base mb-8 max-w-md mx-auto">
                                Daftar sekarang dan selesaikan tugas kuliahmu tanpa ribet. Gratis, cepat, dan aman.
                            </p>
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-brand-600 font-semibold text-lg hover:bg-slate-50 transition-all duration-300 group shadow-lg"
                            >
                                Daftar Gratis
                                <ArrowRight weight="bold" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-slate-100 py-8 mt-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
                            <Sparkle weight="fill" className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-800">Jokskuy</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                        <Link to="/login" className="hover:text-slate-700 transition-colors">Login</Link>
                        <Link to="/register" className="hover:text-slate-700 transition-colors">Daftar</Link>
                    </div>
                    <p className="text-xs text-slate-400">© 2026 Jokskuy. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
