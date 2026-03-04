import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBadge } from '../contexts/BadgeContext'
import {
  LayoutDashboard, BookOpen, ClipboardList, DollarSign,
  Inbox, Settings, Sparkles, User, LogOut
} from 'lucide-react'
import { useState } from 'react'
import Modal from './Modal'

const navGroups = [
  {
    label: 'Menu Utama',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { to: '/admin/layanan', icon: BookOpen, label: 'Kelola Layanan' },
      { to: '/admin/orders', icon: ClipboardList, label: 'Orders', badgeKey: 'orders' },
      { to: '/admin/requests', icon: Inbox, label: 'Custom Requests', badgeKey: 'requests' },
    ],
  },
  {
    label: 'Keuangan & Laporan',
    items: [
      { to: '/admin/keuangan', icon: DollarSign, label: 'Keuangan' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
    ],
  },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
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
      <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-[calc(100vh-4rem)] sticky top-16 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 overflow-y-auto overflow-x-hidden">
        {/* Logo / Brand strip */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Jokskuy</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const badge = getBadge(item.badgeKey)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.exact}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden ${
                            isActive
                              ? 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/25'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Shine sweep on hover (inactive only) */}
                            {!isActive && (
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                              />
                            )}
                            <item.icon className="w-4 h-4 shrink-0 relative z-10" />
                            <span className="flex-1 relative z-10">{item.label}</span>
                            {badge > 0 && (
                              <span className={`relative z-10 min-w-5 h-5 px-1.5 rounded-md text-[10px] font-bold flex items-center justify-center leading-none ${
                                isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                              }`}>
                                {fmt(badge)}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User card footer */}
        <div className="border-t border-white/5 px-3 py-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate leading-none">{profile?.full_name || 'Admin'}</p>
              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary-light text-[9px] font-semibold uppercase tracking-wide">
                {profile?.role || 'admin'}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout confirmation modal */}
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
    </>
  )
}
