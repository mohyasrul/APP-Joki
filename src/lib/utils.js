/**
 * Format number to Indonesian Rupiah currency string.
 * @param {number} n - Amount to format
 * @returns {string} Formatted currency string, e.g. "Rp150.000"
 */
export const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

/**
 * Returns a human-readable relative time string in Indonesian.
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g. "Baru saja", "5 menit lalu", "2 jam lalu"
 */
export const timeAgo = (dateStr) => {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'Baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
