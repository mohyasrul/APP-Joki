import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard, ShoppingBag, ClipboardList, DollarSign,
    BookOpen, ShoppingCart, LogOut, Sparkles, Settings, User, Inbox, Sun, Moon
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import Modal from './Modal'
import { useTheme } from '../hooks/useTheme'
import { useBadge } from '../contexts/BadgeContext'

export default function Navbar() {
    const { profile, signOut, isAdmin } = useAuth()
    const navigate = useNavigate()
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const { theme, toggleTheme } = useTheme()
    const { ordersActionCount, requestsCount, unreadChatCount, fmt } = useBadge()

    const getBadgeCount = (to) => {
        if (to === '/admin/orders') return ordersActionCount
        if (to === '/admin/requests') return requestsCount
        if (to === '/pesanan-saya') return unreadChatCount
        return 0
    }

    const handleLogout = async () => {
        setShowLogoutConfirm(false)
        await signOut()
        navigate('/login')
    }

    const adminLinks = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/layanan', icon: BookOpen, label: 'Katalog' },
        { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
        { to: '/admin/keuangan', icon: DollarSign, label: 'Keuangan' },
        { to: '/admin/requests', icon: Inbox, label: 'Requests' },
        { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
    ]

    const clientLinks = [
        { to: '/katalog', icon: ShoppingBag, label: 'Katalog' },
        { to: '/pesanan-saya', icon: ShoppingCart, label: 'Pesanan Saya' },
        { to: '/request-custom', icon: Sparkles, label: 'Request Joki' },
        { to: '/profil', icon: User, label: 'Profil' },
    ]

    const links = isAdmin ? adminLinks : clientLinks

    const linkClass = ({ isActive }) =>
        `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
            ? 'bg-primary/20 text-primary-light shadow-lg shadow-primary/10'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`

    return (
        <nav className="glass border-b border-white/5 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg gradient-text">Jokskuy</span>
                    </div>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {links.map(link => {
                            const badge = getBadgeCount(link.to)
                            return (
                                <NavLink key={link.to} to={link.to} end className={linkClass}>
                                    <link.icon className="w-4 h-4" />
                                    {link.label}
                                    {badge > 0 && (
                                        <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                            {fmt(badge)}
                                        </span>
                                    )}
                                </NavLink>
                            )
                        })}
                    </div>

                    {/* Desktop User Info */}
                    <div className="hidden md:flex items-center gap-3">
                        <NotificationBell />
                        <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <NavLink to={isAdmin ? '/admin' : '/profil'} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border border-white/10 hover:border-primary/50 transition-all">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4 text-slate-400" />
                            )}
                        </NavLink>
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-200">{profile?.full_name}</p>
                            <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
                        </div>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile: Notification + Avatar + Logout only (nav handled by BottomNav) */}
                    <div className="flex md:hidden items-center gap-2">
                        <NotificationBell />
                        <button onClick={toggleTheme} title="Toggle tema"
                            className="p-2 rounded-lg text-slate-400 hover:text-white transition-all">
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <NavLink to={isAdmin ? '/admin' : '/profil'} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border border-white/10">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4 text-slate-400" />
                            )}
                        </NavLink>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <Modal open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <LogOut className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Keluar dari Akun?</h3>
                    <p className="text-sm text-slate-400 mb-6">Kamu yakin ingin logout dari Jokskuy?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl glass text-slate-300 font-medium hover:bg-white/10 transition-all">Batal</button>
                        <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all">Keluar</button>
                    </div>
                </div>
            </Modal>
        </nav>
    )
}
