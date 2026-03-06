import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'

const ITEMS_PER_PAGE = 10
const PAGE_SIZE_OPTIONS = [8, 10, 15, 20]

export default function Pagination({ currentPage, totalItems, onPageChange, itemsPerPage = ITEMS_PER_PAGE, onItemsPerPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalPages <= 1) return null

  const handlePageChange = (page) => {
    onPageChange(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Build page numbers to display (max 5 visible)
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1
  if (end > totalPages) {
    end = totalPages
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) pages.push(i)

  const from = (currentPage - 1) * itemsPerPage + 1
  const to = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mt-6 pt-6 gap-4 border-t border-slate-100">
      {/* Left: info */}
      <span className="hidden md:block text-xs text-slate-500">
        Menampilkan {from} hingga {to} dari {totalItems} hasil
      </span>

      {/* Center: page buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Halaman sebelumnya"
        >
          <CaretLeft weight="bold" className="w-4 h-4" />
        </button>

        {start > 1 && (
          <>
            <button onClick={() => handlePageChange(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm">
              1
            </button>
            {start > 2 && <span className="text-slate-400">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${page === currentPage
              ? 'bg-brand-50 text-brand-600 font-medium'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-slate-400">...</span>}
            <button onClick={() => handlePageChange(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm">
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Halaman berikutnya"
        >
          <CaretRight weight="bold" className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Page indicator (Bottom) */}
      <span className="md:hidden text-xs text-slate-500 text-center">
        Menampilkan {from}-{to} dari {totalItems}
      </span>

      {/* Right: per-page selector */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100">
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
            className="bg-transparent text-xs text-slate-600 font-medium focus:outline-none cursor-pointer appearance-none pr-1"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <CaretDown className="w-3 h-3 text-slate-400" />
        </div>
        per halaman
      </div>
    </div>
  )
}

export { ITEMS_PER_PAGE }
