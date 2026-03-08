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
import LandingNavbar from '../components/LandingNavbar'
import ScrollReveal from '../components/ScrollReveal'

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
        <div className="min-h-screen bg-slate-50 selection:bg-brand-500/30">
            <LandingNavbar />

            {/* ======== HERO ======== */}
            <div id="home" className="relative overflow-hidden bg-white">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl opacity-60 animate-aurora" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl opacity-60 animate-aurora delay-700" />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-20 text-center">
                    <ScrollReveal>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-sm font-semibold text-brand-600 mb-8 shadow-sm">
                            <Sparkle weight="fill" className="w-4 h-4" />
                            Platform Joki Tugas #1
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
                            <span className="text-gradient">Joki Tugas</span>
                            <br />
                            <span className="text-slate-800">Tanpa Ribet</span>
                        </h1>

                        <p className="text-base sm:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                            Pesan jasa joki tugas kuliah dengan mudah. Pilih tugas, bayar, dan tunggu hasilnya.
                            Semua bisa dipantau secara real-time.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                            {user ? (
                                <Link
                                    to={isAdmin ? '/admin' : '/katalog'}
                                    className="px-8 py-4 rounded-2xl bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group w-full sm:w-auto justify-center"
                                >
                                    Masuk Dashboard
                                    <ArrowRight weight="bold" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="px-8 py-4 rounded-2xl bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group w-full sm:w-auto justify-center"
                                    >
                                        Mulai Sekarang
                                        <ArrowRight weight="bold" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 shadow-sm w-full sm:w-auto justify-center"
                                    >
                                        Masuk
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Live Stats */}
                        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-slate-100 shadow-xl shadow-slate-200/50 max-w-4xl mx-auto relative overflow-hidden">
                            <div className="text-center relative z-10 w-32">
                                <p className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                                    <AnimatedCounter value={stats?.totalCompleted || 0} />+
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">Tugas Selesai</p>
                            </div>
                            <div className="w-px h-16 bg-gradient-to-b from-transparent via-slate-200 to-transparent hidden sm:block relative z-10" />
                            <div className="text-center relative z-10 w-32">
                                <p className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                                    <AnimatedCounter value={stats?.totalClients || 0} />+
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">Klien Aktif</p>
                            </div>
                            <div className="w-px h-16 bg-gradient-to-b from-transparent via-slate-200 to-transparent hidden sm:block relative z-10" />
                            <div className="text-center relative z-10 w-32">
                                <p className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-1">
                                    <Star weight="fill" className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 drop-shadow-sm" />
                                    <AnimatedCounter value={stats?.avgRating || 0} />
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">Rating Rata-rata</p>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </div>

            {/* ======== CARA KERJA ======== */}
            <div id="cara-kerja" className="bg-slate-50 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-28 rounded-[2rem] sm:rounded-[4rem] my-8 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl" />

                <ScrollReveal>
                    <div className="text-center mb-10 sm:mb-16 relative z-10">
                        <div className="inline-flex items-center justify-center mb-3 sm:mb-4 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold tracking-widest uppercase text-slate-600 shadow-sm">Alur Pesanan</div>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-800 mb-3 sm:mb-4 tracking-tight">Cara Kerjanya</h2>
                        <p className="text-slate-500 text-sm sm:text-lg max-w-xl mx-auto font-medium">Cuma 4 langkah mudah dari daftar sampai terima hasil tugas.</p>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    <div className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-brand-100 via-sky-100 to-brand-100 shadow-sm opacity-50" />

                    {howItWorks.map((item, i) => (
                        <ScrollReveal key={i} delay={(i + 1) * 100} className="relative flex flex-col items-center text-center group">
                            <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-100 flex items-center justify-center mb-4 sm:mb-6 shadow-xl shadow-slate-200/50 group-hover:border-brand-500 group-hover:-translate-y-2 group-hover:shadow-brand-500/30 transition-all duration-300">
                                <item.icon weight="duotone" className="w-8 h-8 sm:w-10 sm:h-10 text-brand-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
                                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-500 text-sm font-extrabold text-white flex items-center justify-center shadow-lg border-2 border-slate-50">
                                    {item.step}
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 sm:mb-2">{item.title}</h3>
                            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-[200px] sm:max-w-none">{item.desc}</p>
                        </ScrollReveal>
                    ))}
                </div>
            </div>

            {/* ======== PREVIEW KATALOG ======== */}
            {layananPreview.length > 0 && (
                <div id="katalog" className="bg-white py-16 sm:py-28 border-t border-slate-100">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <ScrollReveal>
                            <div className="text-center mb-10 sm:mb-16">
                                <div className="inline-flex items-center justify-center mb-3 sm:mb-4 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-xs font-bold tracking-widest uppercase text-brand-600">Terpopuler</div>
                                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-800 mb-3 sm:mb-4 tracking-tight">Layanan Kami</h2>
                                <p className="text-slate-500 text-sm sm:text-lg max-w-xl mx-auto font-medium">Pilih kategori tugas yang kamu butuhkan</p>
                            </div>
                        </ScrollReveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                            {layananPreview.map((l, i) => (
                                <ScrollReveal key={i} delay={(i % 3) * 100}>
                                    <div className="bg-white rounded-3xl p-5 sm:p-8 flex flex-col h-full hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 border-2 border-slate-100 hover:border-brand-200 group cursor-pointer relative overflow-hidden sm:hover:-translate-y-2">
                                        <div className="flex items-start justify-between mb-6 sm:mb-8 z-10 relative">
                                            <span className="inline-flex items-center gap-1.5 font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                                {l.kategori || 'Lainnya'}
                                            </span>
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-500 transition-all duration-300 shadow-sm group-hover:shadow-brand-500/30">
                                                <ArrowRight weight="bold" className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-white -rotate-45 group-hover:rotate-0 transition-all duration-300" />
                                            </div>
                                        </div>
                                        <h3 className="text-base sm:text-xl font-extrabold text-slate-800 mb-3 sm:mb-4 line-clamp-2 flex-1 group-hover:text-brand-600 transition-colors leading-tight relative z-10">{l.judul_tugas}</h3>
                                        <div className="pt-4 sm:pt-5 border-t border-slate-100 flex items-center justify-between relative z-10">
                                            <span className="text-xs sm:text-sm font-semibold text-slate-500">Mulai dari</span>
                                            <p className="text-lg sm:text-2xl font-black text-brand-600 drop-shadow-sm">
                                                {formatRupiah(l.harga_estimasi)}
                                            </p>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>
                        <ScrollReveal delay={300} className="text-center mt-10 sm:mt-16">
                            <Link
                                to={user ? '/katalog' : '/register'}
                                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm sm:text-base hover:bg-slate-50 hover:border-slate-300 hover:text-brand-600 sm:hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                            >
                                Lihat Semua Katalog
                                <ArrowRight weight="bold" className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </ScrollReveal>
                    </div>
                </div>
            )}

            {/* ======== FITUR ======== */}
            <div id="fitur" className="bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-28">
                    <ScrollReveal>
                        <div className="text-center mb-10 sm:mb-16">
                            <div className="inline-flex items-center justify-center mb-3 sm:mb-4 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold tracking-widest uppercase text-slate-600">Kelebihan Kami</div>
                            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-800 mb-3 sm:mb-4 tracking-tight">Kenapa Pilih Jokskuy?</h2>
                            <p className="text-slate-500 text-sm sm:text-lg max-w-xl mx-auto font-medium">Fitur unggulan untuk memastikan kepuasan dan keamananmu.</p>
                        </div>
                    </ScrollReveal>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                        {features.map((feature, i) => (
                            <ScrollReveal key={i} delay={(i % 3) * 100}>
                                <div className="bg-white rounded-3xl p-5 sm:p-8 sm:transition-all sm:duration-300 sm:hover:-translate-y-2 hover:shadow-xl hover:shadow-brand-500/10 border border-slate-100 group h-full">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-brand-500 transition-colors duration-300">
                                        <feature.icon weight="duotone" className="w-6 h-6 sm:w-8 sm:h-8 text-brand-600 group-hover:text-white transition-colors duration-300" />
                                    </div>
                                    <h3 className="text-base sm:text-xl font-bold text-slate-800 mb-2 sm:mb-3">{feature.title}</h3>
                                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======== TESTIMONI ======== */}
            <div id="testimoni" className="bg-slate-50 py-20 sm:py-28 border-y border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <ScrollReveal>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Apa Kata Mereka</h2>
                            <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto font-medium">Testimoni asli dari mahasiswa yang sudah memesan tugas di sini.</p>
                        </div>
                    </ScrollReveal>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {reviews.slice(0, 3).map((rev, i) => (
                            <ScrollReveal key={i} delay={i * 100}>
                                <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full relative">
                                    <div className="absolute top-6 right-6 opacity-10">
                                        <Star weight="fill" className="w-16 h-16 text-slate-800" />
                                    </div>
                                    <StarRating rating={rev.rating} />
                                    <p className="text-base text-slate-700 mt-6 mb-8 flex-1 leading-relaxed font-medium relative z-10 italic">"{rev.review}"</p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shadow-inner">
                                            <span className="text-sm font-black text-brand-600">{rev.client_name?.charAt(0)}</span>
                                        </div>
                                        <span className="text-base text-slate-800 font-bold">{rev.client_name}</span>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======== FAQ ======== */}
            <div id="faq" className="bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
                    <ScrollReveal>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Pertanyaan Umum</h2>
                            <p className="text-slate-500 text-base sm:text-lg font-medium">Semua yang perlu kamu tahu tentang Jokskuy</p>
                        </div>
                    </ScrollReveal>
                    <div className="space-y-4">
                        {FAQ_ITEMS.map((faq, i) => (
                            <ScrollReveal key={i} delay={50 * (i % 3)}>
                                <div className={`group rounded-2xl border transition-all duration-300 ${openFaq === i ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300'}`}>
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
                                    >
                                        <span className={`text-base sm:text-lg font-bold pr-4 transition-colors ${openFaq === i ? 'text-brand-700' : 'text-slate-800'}`}>{faq.q}</span>
                                        <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${openFaq === i ? 'bg-brand-200 text-brand-700 rotate-180' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                            <CaretDown weight="bold" className="w-5 h-5" />
                                        </div>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-48 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                                        <p className="px-5 sm:px-6 text-base text-slate-600 leading-relaxed font-medium">{faq.a}</p>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======== CTA FINAL ======== */}
            {!user && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-20">
                    <ScrollReveal>
                        <div className="relative rounded-[2rem] overflow-hidden p-10 sm:p-16 text-center shadow-2xl shadow-brand-500/30">
                            {/* Animated Background Gradients inside CTA */}
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-500 to-sky-500" />
                            <div className="absolute inset-0 pointer-events-none opacity-30">
                                <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
                                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-300 rounded-full blur-3xl mix-blend-overlay" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 border border-white/30 shadow-inner">
                                    <Lightning weight="fill" className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight drop-shadow-sm">Siap Untuk Mulai?</h2>
                                <p className="text-brand-50 text-base sm:text-lg mb-10 max-w-xl mx-auto font-medium">
                                    Daftar sekarang dan selesaikan tugas kuliahmu tanpa ribet. Gratis, cepat, dan 100% aman.
                                </p>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-white text-brand-600 font-extrabold text-lg hover:bg-brand-50 hover:-translate-y-1 transition-all duration-300 group shadow-xl"
                                >
                                    Daftar Gratis Sekarang
                                    <ArrowRight weight="bold" className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </ScrollReveal>
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
