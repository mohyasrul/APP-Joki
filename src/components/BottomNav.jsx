import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBadge } from '../contexts/BadgeContext'
import {
  SquaresFour, Storefront, ClipboardText, CurrencyDollar,
  ShoppingCart, Sparkle, User, Tray
} from '@phosphor-icons/react'

const clientTabs = [
  { to: '/katalog', icon: Storefront, label: 'Katalog' },
  { to: '/pesanan-saya', icon: ShoppingCart, label: 'Pesanan' },
  { to: '/request-custom', icon: Sparkle, label: 'Request' },
  { to: '/profil', icon: User, label: 'Profil' },
]

const adminTabs = [
  { to: '/admin', icon: SquaresFour, label: 'Dashboard' },
  { to: '/admin/orders', icon: ClipboardText, label: 'Orders' },
  { to: '/admin/keuangan', icon: CurrencyDollar, label: 'Keuangan' },
  { to: '/admin/requests', icon: Tray, label: 'Requests' },
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
      className="floating-nav md:hidden fixed left-3 right-3 z-50 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-lg shadow-black/8"
      style={{
        bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Navigasi utama"
    >
      <div className="flex items-center justify-around h-[60px] px-1">
        {tabs.map((tab) => {
          const isActive = tab.to === '/' || tab.to === '/admin'
            ? location.pathname === tab.to
            : location.pathname === tab.to || location.pathname.startsWith(tab.to + '/')
          const badge = getBadgeCount(tab.to)

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/admin'}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-200 active:scale-90"
            >
              {/* Icon */}
              <div className="relative">
                <tab.icon
                  weight={isActive ? 'fill' : 'regular'}
                  className={`w-[22px] h-[22px] transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-slate-400'
                    }`}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {fmt(badge)}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] transition-colors duration-200 leading-tight ${isActive ? 'text-brand-600 font-bold' : 'text-slate-400 font-medium'
                  }`}
              >
                {tab.label}
              </span>

              {/* Active dot indicator */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-brand-500 mt-0.5" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

