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
