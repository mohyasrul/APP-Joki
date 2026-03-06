import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    Storefront, ShoppingCart, Sparkle, GraduationCap,
    User, SignOut, MagnifyingGlass, GearSix, CaretDown
} from '@phosphor-icons/react'
import NotificationBell from './NotificationBell'
import Modal from './Modal'
import { useBadge } from '../contexts/BadgeContext'

/**
 * AdminHeader — rendered inside the main content area for admin.
 * Shows a search bar on the left, bell + avatar + profile dropdown on the right.
 */
export function AdminHeader({ onOpenSearch }) {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowProfileMenu(false)
            }
        }
        if (showProfileMenu) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showProfileMenu])

    const handleLogout = async () => {
        setShowLogoutConfirm(false)
        setShowProfileMenu(false)
        await signOut()
        navigate('/login')
    }

    return (
        <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 shrink-0">
            {/* Search trigger — full bar on desktop, icon-only on mobile */}
            <button
                onClick={onOpenSearch}
                className="hidden md:flex relative w-80 items-center gap-2.5 bg-white rounded-full py-2.5 pl-10 pr-4 text-sm shadow-sm border border-slate-100 hover:border-slate-200 transition-colors text-left cursor-pointer"
            >
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                <span className="text-slate-400 flex-1">Search...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-400 border border-slate-200">Ctrl K</kbd>
            </button>
            <button
                onClick={onOpenSearch}
                className="md:hidden p-2 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition-colors"
                aria-label="Cari"
            >
                <MagnifyingGlass className="w-5 h-5 text-slate-500" />
            </button>

            {/* Right actions */}
            <div className="flex items-center gap-2 md:gap-4">
                <NotificationBell />
                {/* Profile dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2 cursor-pointer rounded-full hover:bg-slate-50 transition-colors pr-1"
                    >
                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                    <User weight="bold" className="w-4 h-4 text-slate-400" />
                                </div>
                            )}
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                            {/* User info */}
                            <div className="px-4 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User weight="bold" className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{profile?.full_name || 'Admin'}</p>
                                        <p className="text-xs text-slate-400 truncate">{profile?.email || ''}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Menu items */}
                            <div className="py-1">
                                <button
                                    onClick={() => { setShowProfileMenu(false); navigate('/admin/layanan') }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <Storefront weight="bold" className="w-4 h-4 text-slate-400" />
                                    Kelola Layanan
                                </button>
                                <button
                                    onClick={() => { setShowProfileMenu(false); navigate('/admin/settings') }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <GearSix weight="bold" className="w-4 h-4 text-slate-400" />
                                    Pengaturan
                                </button>
                                <button
                                    onClick={() => { setShowProfileMenu(false); setShowLogoutConfirm(true) }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <SignOut weight="bold" className="w-4 h-4" />
                                    Keluar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout confirmation */}
            <Modal open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Keluar dari Akun?">
                <p className="text-sm text-slate-500 mb-6">Kamu yakin ingin logout dari Jokskuy?</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                    <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Keluar</button>
                </div>
            </Modal>
        </header>
    )
}

/**
 * ClientNavbar — top navigation bar for client users.
 */
export default function Navbar() {
    const { profile, signOut, isAdmin, user } = useAuth()
    const navigate = useNavigate()
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const profileRef = useRef(null)
    const { unreadChatCount, fmt } = useBadge()

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfileMenu(false)
            }
        }
        if (showProfileMenu) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showProfileMenu])

    const getBadgeCount = (to) => {
        if (to === '/pesanan-saya') return unreadChatCount
        return 0
    }

    const handleLogout = async () => {
        setShowLogoutConfirm(false)
        await signOut()
        navigate('/login')
    }

    const clientLinks = [
        { to: '/katalog', icon: Storefront, label: 'Katalog' },
        { to: '/pesanan-saya', icon: ShoppingCart, label: 'Pesanan Saya' },
        { to: '/request-custom', icon: Sparkle, label: 'Request Joki' },
        { to: '/profil', icon: User, label: 'Profil' },
    ]

    return (
        <header className="bg-white relative flex flex-wrap lg:flex-nowrap items-center justify-between px-3 sm:px-4 md:px-8 py-2.5 md:py-4 border-b border-slate-100 sticky top-0 z-40 min-h-[56px] md:min-h-[64px] lg:min-h-[80px]">

            {/* Logo (Left) */}
            <div className="flex items-center gap-3 z-10 shrink-0">
                <NavLink to={isAdmin ? '/admin' : '/katalog'} className="flex items-center gap-2 md:gap-3">
                    <div className="text-slate-900">
                        <GraduationCap weight="fill" className="w-7 h-7 md:w-8 md:h-8" />
                    </div>
                    <h1 className="font-bold text-lg md:text-xl tracking-tight text-slate-900">Jokskuy <span className="text-brand-600">Client</span></h1>
                </NavLink>
            </div>

            {/* Center Navigation (lg+, absolutely centered; renders as 3rd row on mobile) */}
            {!isAdmin && (
                <nav className="hidden lg:flex lg:w-auto lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 items-center justify-center gap-1">
                    {clientLinks.map(link => {
                        const badge = getBadgeCount(link.to)
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end
                                className={({ isActive }) =>
                                    isActive
                                        ? 'bg-brand-100 text-slate-900 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap'
                                        : 'text-slate-500 font-medium hover:text-slate-900 transition-colors whitespace-nowrap px-4 py-2.5'
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && <link.icon weight="bold" className="w-[18px] h-[18px]" />}
                                        {link.label}
                                        {badge > 0 && (
                                            <span className="bg-red-500 text-white text-[11px] font-bold w-[22px] h-[22px] flex items-center justify-center rounded-full">{fmt(badge)}</span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 z-10 order-2 lg:order-none shrink-0">
                <NotificationBell />
                <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setShowProfileMenu(v => !v)}
                        className="flex items-center gap-3 rounded-full hover:bg-slate-50 transition-colors pr-1"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User weight="bold" className="w-5 h-5 text-slate-400" />
                                </div>
                            )}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-[13px] font-bold text-slate-900 leading-none mb-1">{profile?.full_name || 'Pengguna'}</p>
                            <p className="text-[11px] font-semibold text-slate-500 leading-none">Mahasiswa</p>
                        </div>
                    </button>
                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                            {/* User info header */}
                            <div className="px-4 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User weight="bold" className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{profile?.full_name || 'Pengguna'}</p>
                                        <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Menu items */}
                            <div className="py-1">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => { setShowProfileMenu(false); navigate('/admin/layanan') }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <Storefront weight="bold" className="w-4 h-4 text-slate-400" />
                                            Kelola Layanan
                                        </button>
                                        <button
                                            onClick={() => { setShowProfileMenu(false); navigate('/admin/settings') }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <GearSix weight="bold" className="w-4 h-4 text-slate-400" />
                                            Pengaturan
                                        </button>
                                        <div className="my-1 border-t border-slate-100" />
                                    </>
                                )}
                                <button
                                    onClick={() => { setShowProfileMenu(false); navigate('/profil') }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <User weight="bold" className="w-4 h-4 text-slate-400" />
                                    Profil Saya
                                </button>
                                <button
                                    onClick={() => { setShowProfileMenu(false); setShowLogoutConfirm(true) }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <SignOut weight="bold" className="w-4 h-4" />
                                    Keluar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <Modal open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title={null} showClose={false} maxWidth="max-w-sm">
                <div className="text-center">
                    <SignOut weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Keluar dari Akun?</h3>
                    <p className="text-sm text-slate-500 mb-6">Kamu yakin ingin logout dari Jokskuy?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all">Batal</button>
                        <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">Keluar</button>
                    </div>
                </div>
            </Modal>
        </header>
    )
}
