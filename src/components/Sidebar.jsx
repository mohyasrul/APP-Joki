import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBadge } from '../contexts/BadgeContext'
import {
  SquaresFour, BookOpen, ClipboardText, CurrencyDollar,
  Tray, GearSix, GraduationCap, SignOut, Storefront
} from '@phosphor-icons/react'
import { useState } from 'react'
import Modal from './Modal'

const navItems = [
  { to: '/admin', icon: SquaresFour, label: 'Dashboard', exact: true },
  { to: '/admin/orders', icon: ClipboardText, label: 'Pesanan Tugas', badgeKey: 'orders' },
  { to: '/admin/layanan', icon: BookOpen, label: 'Layanan Joki' },
  { to: '/katalog', icon: Storefront, label: 'Katalog' },
  { to: '/admin/requests', icon: Tray, label: 'Custom Requests', badgeKey: 'requests' },
  { to: '/admin/keuangan', icon: CurrencyDollar, label: 'Laporan Pemasukan' },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { ordersActionCount, requestsCount, fmt } = useBadge()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const getBadge = (badgeKey) => {
    if (badgeKey === 'orders') return ordersActionCount
    if (badgeKey === 'requests') return requestsCount
    return 0
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-100 py-6 px-4 overflow-y-auto overflow-x-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg">
            <GraduationCap weight="fill" className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Jokskuy</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const badge = getBadge(item.badgeKey)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-500 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      weight={isActive ? 'fill' : 'regular'}
                      className="w-5 h-5 shrink-0"
                    />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-md text-[10px] font-bold flex items-center justify-center leading-none bg-red-500 text-white">
                        {fmt(badge)}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Pro Banner */}
        <div className="mt-8 mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-brand-600 p-5 text-white shadow-md">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 border border-white/20 rounded-full opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-16 h-16 border border-white/20 rounded-full opacity-50 pointer-events-none" />
          <h4 className="font-semibold mb-1 relative z-10 text-sm">Joki Elite —</h4>
          <p className="text-xs text-white/90 mb-4 relative z-10">Tingkatkan visibilitas layananmu!</p>
          <button className="w-full bg-white text-brand-600 hover:bg-brand-50 font-medium py-2 rounded-xl text-sm transition-colors relative z-10 shadow-sm">
            Upgrade Akun
          </button>
        </div>

        {/* Settings & Logout */}
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-50'}`
          }
        >
          {({ isActive }) => (
            <>
              <GearSix weight={isActive ? 'fill' : 'regular'} className="w-5 h-5" />
              <span>Pengaturan</span>
            </>
          )}
        </NavLink>
      </aside>

      {/* Logout confirmation modal */}
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
    </>
  )
}
