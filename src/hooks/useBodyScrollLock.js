import { useEffect } from 'react'

/**
 * Locks body scroll when `isLocked` is true.
 * Useful for modals, drawers, and fullscreen overlays.
 * Restores original overflow on cleanup.
 *
 * @param {boolean} isLocked - Whether to lock body scroll
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isLocked])
}
