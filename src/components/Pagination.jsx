import { ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 10

/**
 * Reusable pagination component.
 * @param {{ currentPage: number, totalItems: number, onPageChange: (page: number) => void, itemsPerPage?: number }} props
 */
export default function Pagination({ currentPage, totalItems, onPageChange, itemsPerPage = ITEMS_PER_PAGE }) {
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

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      {/* Prev */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* First page + ellipsis */}
      {start > 1 && (
        <>
          <button
            onClick={() => handlePageChange(1)}
            className="w-9 h-9 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            1
          </button>
          {start > 2 && <span className="text-slate-600 text-sm px-1">…</span>}
        </>
      )}

      {/* Page numbers */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
            page === currentPage
              ? 'bg-primary/20 text-primary-light border border-primary/30'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {page}
        </button>
      ))}

      {/* Last page + ellipsis */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-slate-600 text-sm px-1">…</span>}
          <button
            onClick={() => handlePageChange(totalPages)}
            className="w-9 h-9 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export { ITEMS_PER_PAGE }
