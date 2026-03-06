import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckSquare, Package, CurrencyDollar, Tray, ShoppingBag, X } from '@phosphor-icons/react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { timeAgo } from '../lib/utils'

const TYPE_ICONS = {
  new_order: ShoppingBag,
  order_status: Package,
  payment_update: CurrencyDollar,
  custom_request: Tray,
}

const TYPE_COLORS = {
  new_order: 'text-blue-600 bg-blue-50',
  order_status: 'text-purple-600 bg-purple-50',
  payment_update: 'text-emerald-600 bg-emerald-50',
  custom_request: 'text-amber-600 bg-amber-50',
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
        className="relative p-2 rounded-full bg-white shadow-sm text-slate-600 hover:text-brand-600 transition-colors"
        title="Notifikasi"
      >
        <Bell weight={open ? 'fill' : 'regular'} className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notifikasi</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1"
                >
                  <CheckSquare weight="bold" className="w-3.5 h-3.5" /> Baca semua
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Bell
                const colorClass = TYPE_COLORS[notif.type] || 'text-slate-400 bg-slate-50'
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-b-0 ${!notif.is_read ? 'bg-brand-50/50' : ''
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon weight="fill" className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${!notif.is_read ? 'text-slate-800' : 'text-slate-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2" />
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
