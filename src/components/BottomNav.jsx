import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, ShoppingBag, ClipboardList, DollarSign,
  ShoppingCart, Sparkles, User, Inbox, Settings
} from 'lucide-react'

const clientTabs = [
  { to: '/katalog', icon: ShoppingBag, label: 'Katalog' },
  { to: '/pesanan-saya', icon: ShoppingCart, label: 'Pesanan' },
  { to: '/request-custom', icon: Sparkles, label: 'Request' },
  { to: '/profil', icon: User, label: 'Profil' },
]

const adminTabs = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/keuangan', icon: DollarSign, label: 'Keuangan' },
  { to: '/admin/requests', icon: Inbox, label: 'Requests' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const tabs = isAdmin ? adminTabs : clientTabs

  // Don't render on pages that shouldn't have bottom nav (e.g. order detail with its own actions)
  // We keep it simple — always show on all authenticated pages

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 border-t border-white/10 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname === tab.to || location.pathname.startsWith(tab.to + '/')

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/admin'}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors duration-200"
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-primary/20 text-primary-light'
                : 'text-slate-500'
                }`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary-light' : 'text-slate-500'
                }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 rounded-full bg-primary-light" 
                  style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
                />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
