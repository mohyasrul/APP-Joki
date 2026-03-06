import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import { Storefront, MagnifyingGlass, BookOpen, ArrowRight, Tag, Funnel, WarningCircle, ArrowsClockwise, Clock, X, Megaphone } from '@phosphor-icons/react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'
import StatusBadge from '../../components/StatusBadge'
import LayananDrawer from '../../components/LayananDrawer'

export default function Katalog() {
    const [layanan, setLayanan] = useState([])
    const [search, setSearch] = useState('')
    const [kategori, setKategori] = useState('Semua')
    const [kategoriList, setKategoriList] = useState([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [sort, setSort] = useState('terbaru')
    const [announcement, setAnnouncement] = useState(null)
    const [bannerDismissed, setBannerDismissed] = useState(() => sessionStorage.getItem('banner_dismissed') === '1')
    const [selectedLayanan, setSelectedLayanan] = useState(null)
    const navigate = useNavigate()

    useEffect(() => { fetchLayanan(); fetchKategori(); fetchAnnouncement() }, [])

    const fetchAnnouncement = async () => {
        try {
            const { data } = await supabase.from('settings').select('data').eq('id', 'app_config').single()
            if (data?.data?.announcement) setAnnouncement(data.data.announcement)
        } catch { }
    }

    const fetchLayanan = async () => {
        try {
            setFetchError(null)
            const { data, error } = await supabase.from('layanan').select('*').eq('tersedia', true).order('created_at', { ascending: false })
            if (error) throw error
            setLayanan(data || [])
        } catch (err) {
            console.error('Failed to fetch layanan:', err)
            setFetchError('Gagal memuat katalog. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase.from('kategori').select('nama').order('urutan', { ascending: true })
            if (error) throw error
            setKategoriList(['Semua', ...(data || []).map(k => k.nama)])
        } catch (err) {
            console.error('Failed to fetch kategori:', err)
        }
    }

    const filtered = layanan.filter(l => {
        const matchSearch = l.judul_tugas.toLowerCase().includes(search.toLowerCase()) || (l.deskripsi && l.deskripsi.toLowerCase().includes(search.toLowerCase()))
        const matchKategori = kategori === 'Semua' || (l.kategori || 'Lainnya') === kategori
        return matchSearch && matchKategori
    })

    const sorted = [...filtered].sort((a, b) => {
        if (sort === 'harga_asc') return (a.harga_estimasi || 0) - (b.harga_estimasi || 0)
        if (sort === 'harga_desc') return (b.harga_estimasi || 0) - (a.harga_estimasi || 0)
        return new Date(b.created_at) - new Date(a.created_at)
    })
    const paginatedLayanan = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const dismissBanner = () => { sessionStorage.setItem('banner_dismissed', '1'); setBannerDismissed(true) }

    useEffect(() => { setCurrentPage(1) }, [search, kategori, sort])

    return (
        <div className="fade-in">
            {/* Announcement Banner */}
            {announcement && !bannerDismissed && (
                <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-brand-50 border border-brand-100">
                    <Megaphone weight="fill" className="w-5 h-5 text-brand-500 shrink-0" />
                    <p className="flex-1 text-sm text-slate-700">{announcement}</p>
                    <button onClick={dismissBanner} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
                        <X weight="bold" className="w-4 h-4" />
                    </button>
                </div>
            )}
            <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold">Katalog Layanan</h2>
                <div className="flex gap-1 shrink-0">
                    {[{ value: 'terbaru', label: 'Terbaru' }, { value: 'harga_asc', label: 'Harga ↑' }, { value: 'harga_desc', label: 'Harga ↓' }].map(opt => (
                        <button key={opt.value} onClick={() => setSort(opt.value)}
                            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${sort === opt.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="relative mb-4">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2 hide-scrollbar">
                {kategoriList.map(k => (
                    <button key={k} onClick={() => setKategori(k)}
                        aria-pressed={kategori === k}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${kategori === k ? 'bg-slate-900 text-white border border-slate-900' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}>
                        {k === 'Semua' && <Funnel weight="bold" className="w-3.5 h-3.5" />}
                        {k}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse">
                            <div className="h-6 bg-slate-100 rounded-lg w-3/4 mb-3" />
                            <div className="h-4 bg-slate-50 rounded w-full mb-2" />
                            <div className="h-4 bg-slate-50 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : fetchError ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                    <WarningCircle weight="bold" className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-500 mb-2">{fetchError}</h3>
                    <button onClick={() => { setLoading(true); fetchLayanan(); fetchKategori() }}
                        className="mt-2 px-5 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-medium text-sm hover:bg-brand-100 transition-all inline-flex items-center gap-2">
                        <ArrowsClockwise weight="bold" className="w-4 h-4" /> Coba Lagi
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-500">Tidak ada layanan ditemukan</h3>
                    <p className="text-slate-400 text-sm mt-1">Coba ubah filter atau kata pencarian.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedLayanan.map((item, idx) => (
                        <div key={item.id}
                            onClick={() => setSelectedLayanan(item)}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group cursor-pointer"
                            style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                                    <BookOpen weight="fill" className="w-5 h-5 text-brand-500" />
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-medium">
                                        <Tag weight="bold" className="w-3 h-3" /> {item.kategori || 'Lainnya'}
                                    </span>
                                    <StatusBadge status="Tersedia" />
                                </div>
                            </div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2">{item.judul_tugas}</h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{item.deskripsi || 'Tidak ada deskripsi'}</p>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                <div>
                                    <span className="text-base md:text-xl font-bold text-brand-600">{formatRupiah(item.harga_estimasi)}</span>
                                    {item.estimasi_hari && (
                                        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                            <Clock weight="bold" className="w-3 h-3" /> {item.estimasi_hari} hari pengerjaan
                                        </p>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shrink-0">
                                    <ArrowRight weight="bold" className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length > ITEMS_PER_PAGE && (
                <Pagination currentPage={currentPage} totalItems={filtered.length} onPageChange={setCurrentPage} />
            )}

            <LayananDrawer
                layanan={selectedLayanan}
                onClose={() => setSelectedLayanan(null)}
                onOrder={(item) => {
                    setSelectedLayanan(null)
                    navigate('/order/baru', { state: { layanan: item } })
                }}
            />
        </div>
    )
}
