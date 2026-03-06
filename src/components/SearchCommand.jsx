import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
    MagnifyingGlass, ClipboardText, BookOpen, Tray,
    SquaresFour, CurrencyDollar, GearSix, ArrowRight, SpinnerGap, X
} from '@phosphor-icons/react'

const ADMIN_PAGES = [
    { label: 'Dashboard', desc: 'Ringkasan data', path: '/admin', icon: SquaresFour },
    { label: 'Pesanan Tugas', desc: 'Kelola pesanan', path: '/admin/orders', icon: ClipboardText },
    { label: 'Layanan Joki', desc: 'Kelola layanan', path: '/admin/layanan', icon: BookOpen },
    { label: 'Custom Requests', desc: 'Kelola request', path: '/admin/requests', icon: Tray },
    { label: 'Keuangan', desc: 'Laporan pemasukan', path: '/admin/keuangan', icon: CurrencyDollar },
    { label: 'Pengaturan', desc: 'Konfigurasi app', path: '/admin/settings', icon: GearSix },
]

export default function SearchCommand({ open, onClose }) {
    const navigate = useNavigate()
    const inputRef = useRef(null)
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState({ pages: [], orders: [], layanan: [], requests: [] })
    const [activeIndex, setActiveIndex] = useState(0)

    // Focus input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50)
            setQuery('')
            setResults({ pages: [], orders: [], layanan: [], requests: [] })
            setActiveIndex(0)
        }
    }, [open])

    // Ctrl+K shortcut
    useEffect(() => {
        const handleKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                if (open) onClose()
                else {
                    // Parent controls open state; we just need to trigger via the search button
                    // This keyboard shortcut is handled by checking if open and toggling
                }
            }
            if (e.key === 'Escape' && open) onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open, onClose])

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults({ pages: ADMIN_PAGES, orders: [], layanan: [], requests: [] })
            setActiveIndex(0)
            return
        }

        const q = query.trim().toLowerCase()

        // Filter static pages immediately
        const filteredPages = ADMIN_PAGES.filter(
            p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
        )

        setResults(prev => ({ ...prev, pages: filteredPages }))

        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const [ordersRes, layananRes, requestsRes] = await Promise.all([
                    supabase
                        .from('orders')
                        .select('id, harga_final, status_pekerjaan, layanan(judul_tugas), profiles(full_name)')
                        .or(`id.ilike.%${q}%,layanan.judul_tugas.ilike.%${q}%,profiles.full_name.ilike.%${q}%`)
                        .order('created_at', { ascending: false })
                        .limit(5),
                    supabase
                        .from('layanan')
                        .select('id, judul_tugas, kategori, harga_estimasi')
                        .ilike('judul_tugas', `%${q}%`)
                        .limit(5),
                    supabase
                        .from('custom_requests')
                        .select('id, judul, status, profiles(full_name)')
                        .ilike('judul', `%${q}%`)
                        .order('created_at', { ascending: false })
                        .limit(5),
                ])

                setResults(prev => ({
                    ...prev,
                    orders: ordersRes.data || [],
                    layanan: layananRes.data || [],
                    requests: requestsRes.data || [],
                }))
            } catch (err) {
                console.error('Search error:', err)
            } finally {
                setLoading(false)
            }
            setActiveIndex(0)
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    // Flatten all results for keyboard nav
    const allItems = useCallback(() => {
        const items = []
        if (results.pages.length) results.pages.forEach(p => items.push({ type: 'page', data: p }))
        if (results.orders.length) results.orders.forEach(o => items.push({ type: 'order', data: o }))
        if (results.layanan.length) results.layanan.forEach(l => items.push({ type: 'layanan', data: l }))
        if (results.requests.length) results.requests.forEach(r => items.push({ type: 'request', data: r }))
        return items
    }, [results])

    const handleSelect = (item) => {
        onClose()
        if (item.type === 'page') navigate(item.data.path)
        else if (item.type === 'order') navigate(`/admin/orders`)
        else if (item.type === 'layanan') navigate('/admin/layanan')
        else if (item.type === 'request') navigate('/admin/requests')
    }

    const handleKeyDown = (e) => {
        const items = allItems()
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, items.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (items[activeIndex]) handleSelect(items[activeIndex])
        }
    }

    if (!open) return null

    const items = allItems()
    let itemIdx = -1

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <MagnifyingGlass className="w-5 h-5 text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Cari pesanan, layanan, halaman..."
                        className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                    {loading && <SpinnerGap className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                        <X weight="bold" className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto py-2">
                    {/* Pages */}
                    {results.pages.length > 0 && (
                        <div>
                            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Halaman</p>
                            {results.pages.map(page => {
                                itemIdx++
                                const idx = itemIdx
                                return (
                                    <button
                                        key={page.path}
                                        onClick={() => handleSelect({ type: 'page', data: page })}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === activeIndex ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <page.icon weight="bold" className={`w-4 h-4 shrink-0 ${idx === activeIndex ? 'text-brand-600' : 'text-slate-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{page.label}</p>
                                            <p className="text-xs text-slate-400 truncate">{page.desc}</p>
                                        </div>
                                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${idx === activeIndex ? 'text-brand-500' : 'text-slate-300'}`} />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Orders */}
                    {results.orders.length > 0 && (
                        <div>
                            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Pesanan</p>
                            {results.orders.map(order => {
                                itemIdx++
                                const idx = itemIdx
                                return (
                                    <button
                                        key={order.id}
                                        onClick={() => handleSelect({ type: 'order', data: order })}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === activeIndex ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <ClipboardText weight="bold" className={`w-4 h-4 shrink-0 ${idx === activeIndex ? 'text-brand-600' : 'text-slate-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">
                                                {order.layanan?.judul_tugas || order.id.slice(0, 8)}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {order.profiles?.full_name || '-'} · {order.status_pekerjaan}
                                            </p>
                                        </div>
                                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${idx === activeIndex ? 'text-brand-500' : 'text-slate-300'}`} />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Layanan */}
                    {results.layanan.length > 0 && (
                        <div>
                            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Layanan</p>
                            {results.layanan.map(item => {
                                itemIdx++
                                const idx = itemIdx
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect({ type: 'layanan', data: item })}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === activeIndex ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <BookOpen weight="bold" className={`w-4 h-4 shrink-0 ${idx === activeIndex ? 'text-brand-600' : 'text-slate-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{item.judul_tugas}</p>
                                            <p className="text-xs text-slate-400 truncate">{item.kategori || '-'}</p>
                                        </div>
                                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${idx === activeIndex ? 'text-brand-500' : 'text-slate-300'}`} />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Custom Requests */}
                    {results.requests.length > 0 && (
                        <div>
                            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Custom Requests</p>
                            {results.requests.map(req => {
                                itemIdx++
                                const idx = itemIdx
                                return (
                                    <button
                                        key={req.id}
                                        onClick={() => handleSelect({ type: 'request', data: req })}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === activeIndex ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <Tray weight="bold" className={`w-4 h-4 shrink-0 ${idx === activeIndex ? 'text-brand-600' : 'text-slate-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{req.judul}</p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {req.profiles?.full_name || '-'} · {req.status}
                                            </p>
                                        </div>
                                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${idx === activeIndex ? 'text-brand-500' : 'text-slate-300'}`} />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Empty state */}
                    {query.trim() && !loading && items.length === 0 && (
                        <div className="py-8 text-center">
                            <MagnifyingGlass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Tidak ada hasil untuk "{query}"</p>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">↑↓</kbd> navigasi</span>
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">↵</kbd> pilih</span>
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">esc</kbd> tutup</span>
                </div>
            </div>
        </div>
    )
}
