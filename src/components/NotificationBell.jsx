import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Package, DollarSign, Inbox, ShoppingBag, X } from 'lucide-react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { timeAgo } from '../lib/utils'

const TYPE_ICONS = {
  new_order: ShoppingBag,
  order_status: Package,
  payment_update: DollarSign,
  custom_request: Inbox,
}

const TYPE_COLORS = {
  new_order: 'text-blue-400 bg-blue-500/15',
  order_status: 'text-purple-400 bg-purple-500/15',
  payment_update: 'text-green-400 bg-green-500/15',
  custom_request: 'text-yellow-400 bg-yellow-500/15',
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Lock body scroll when dropdown is open (mobile)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const handleNotifClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id)

    const data = notif.data || {}
    let target = '/'

    if (isAdmin) {
      // Admin routing
      switch (notif.type) {
        case 'new_order':
          target = '/admin/orders'
          break
        case 'custom_request':
          target = '/admin/requests'
          break
        case 'order_status':
        case 'payment_update':
          target = '/admin/orders'
          break
        default:
          target = '/admin'
      }
    } else {
      // Client routing
      switch (notif.type) {
        case 'order_status':
        case 'payment_update':
          target = data.order_id ? `/order/${data.order_id}` : '/pesanan-saya'
          break
        case 'custom_request':
          target = data.order_id ? `/order/${data.order_id}` : '/pesanan-saya'
          break
        default:
          target = '/pesanan-saya'
      }
    }

    navigate(target)
    setOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        title="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center badge-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 glass rounded-2xl border border-white/10 shadow-2xl z-50 slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Notifikasi</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-light hover:text-primary transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Baca semua
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Bell
                const colorClass = TYPE_COLORS[notif.type] || 'text-slate-400 bg-white/5'
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-all border-b border-white/5 last:border-b-0 ${
                      !notif.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
