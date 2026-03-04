import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBadge } from '../contexts/BadgeContext'
import {
  LayoutDashboard, ShoppingBag, ClipboardList, DollarSign,
  ShoppingCart, Sparkles, User, Inbox, BookOpen
} from 'lucide-react'

const clientTabs = [
  { to: '/katalog', icon: ShoppingBag, label: 'Katalog' },
  { to: '/pesanan-saya', icon: ShoppingCart, label: 'Pesanan' },
  { to: '/request-custom', icon: Sparkles, label: 'Request' },
  { to: '/profil', icon: User, label: 'Profil' },
]

const adminTabs = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/layanan', icon: BookOpen, label: 'Katalog' },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/keuangan', icon: DollarSign, label: 'Keuangan' },
  { to: '/admin/requests', icon: Inbox, label: 'Requests' },
]

export default function BottomNav() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const tabs = isAdmin ? adminTabs : clientTabs
  const { ordersActionCount, requestsCount, unreadChatCount, fmt } = useBadge()

  const getBadgeCount = (to) => {
    if (to === '/admin/orders') return ordersActionCount
    if (to === '/admin/requests') return requestsCount
    if (to === '/pesanan-saya') return unreadChatCount
    return 0
  }

  return (
    <nav
      className="floating-nav md:hidden fixed left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl shadow-black/40"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Navigasi utama"
    >
      <div className="flex items-end justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname === tab.to || location.pathname.startsWith(tab.to + '/')
          const badge = getBadgeCount(tab.to)

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/admin'}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-end flex-1 pb-2.5 gap-1 transition-all duration-200"
            >
              {/* Icon container — active "pops up" above the island */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`relative flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'w-12 h-12 -mt-7 rounded-full bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/40 border-[4px] border-[#0f0a2e]'
                      : 'w-9 h-9 rounded-xl'
                  }`}
                >
                  <tab.icon
                    className={`transition-all duration-200 ${
                      isActive ? 'w-5 h-5 text-white' : 'w-5 h-5 text-slate-500'
                    }`}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none z-10">
                      {fmt(badge)}
                    </span>
                  )}
                </div>
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-semibold transition-colors duration-200 leading-none ${
                  isActive ? 'text-primary-light' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

