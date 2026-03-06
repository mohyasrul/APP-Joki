import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { X } from '@phosphor-icons/react'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

/**
 * Accessible Modal component with focus trap, Escape key, and portal rendering.
 * On mobile (< 768px): renders as a bottom-sheet with drag handle.
 * On desktop (≥ 768px): renders as a centered dialog.
 */
export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md', showClose = true, scrollable = false }) {
  const overlayRef = useRef(null)
  const modalRef = useRef(null)
  const previousFocus = useRef(null)
  const isMobile = useIsMobile()

  useBodyScrollLock(open)

  // Focus trap + restore focus on close
  useEffect(() => {
    if (!open) return

    // Save previously focused element
    previousFocus.current = document.activeElement

    // Focus the modal container
    const timer = setTimeout(() => {
      modalRef.current?.focus()
    }, 50)

    return () => {
      clearTimeout(timer)
      // Restore focus when modal closes
      previousFocus.current?.focus?.()
    }
  }, [open])

  // Escape key handler
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }

      // Focus trap: Tab and Shift+Tab
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  if (!open) return null

  const titleId = `modal-title-${title?.replace(/\s+/g, '-').toLowerCase() || 'dialog'}`

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm ${isMobile
          ? 'flex items-end'
          : 'flex items-center justify-center p-4'
        }`}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          isMobile
            ? `w-full bg-white rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-xl slide-up-sheet outline-none max-h-[90vh] overflow-y-auto`
            : `w-full ${maxWidth} bg-white rounded-2xl p-6 shadow-xl slide-up outline-none ${scrollable ? 'max-h-[90vh] overflow-y-auto' : ''}`
        }
      >
        {/* Drag handle — mobile only */}
        {isMobile && (
          <div className="flex justify-center mb-3 -mt-1">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
        )}

        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h2 id={titleId} className="text-lg font-bold text-slate-800">
                {title}
              </h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-2.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                aria-label="Tutup"
              >
                <X weight="bold" className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        {children}
      </div>
    </div>,
    document.body
  )
}

