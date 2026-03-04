import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../lib/utils'
import { ShoppingBag, Search, BookOpen, ArrowRight, Tag, Filter, AlertCircle, RefreshCw } from 'lucide-react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

export default function Katalog() {
    const [layanan, setLayanan] = useState([])
    const [search, setSearch] = useState('')
    const [kategori, setKategori] = useState('Semua')
    const [kategoriList, setKategoriList] = useState([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const navigate = useNavigate()

    useEffect(() => { fetchLayanan(); fetchKategori() }, [])

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
    const paginatedLayanan = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    // Reset page when filter/search changes
    useEffect(() => { setCurrentPage(1) }, [search, kategori])

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShoppingBag className="w-7 h-7 text-primary-light" /> Katalog Layanan
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Pilih tugas yang ingin kamu jokikan minggu ini</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all text-sm" />
                </div>
            </div>

            {/* Dynamic Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {kategoriList.map(k => (
                    <button key={k} onClick={() => setKategori(k)}
                        aria-pressed={kategori === k}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${kategori === k ? 'bg-primary/20 text-primary-light border border-primary/30' : 'glass text-slate-400 hover:text-white'
                            }`}>
                        {k === 'Semua' && <Filter className="w-3.5 h-3.5" />}
                        {k}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                            <div className="h-6 bg-white/10 rounded-lg w-3/4 mb-3" />
                            <div className="h-4 bg-white/5 rounded w-full mb-2" />
                            <div className="h-4 bg-white/5 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : fetchError ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">{fetchError}</h3>
                    <button onClick={() => { setLoading(true); fetchLayanan(); fetchKategori() }}
                        className="mt-2 px-5 py-2.5 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Coba Lagi
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Tidak ada layanan ditemukan</h3>
                    <p className="text-slate-500 text-sm mt-1">Coba ubah filter atau kata pencarian.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedLayanan.map((item, idx) => (
                        <div key={item.id} className="glass glass-hover rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-5 h-5 text-primary-light" />
                                </div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                                    <Tag className="w-3 h-3" /> {item.kategori || 'Lainnya'}
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{item.judul_tugas}</h3>
                            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{item.deskripsi || 'Tidak ada deskripsi'}</p>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                <span className="text-xl font-bold gradient-text">{formatRupiah(item.harga_estimasi)}</span>
                                <button onClick={() => navigate('/order/baru', { state: { layanan: item } })}
                                    className="px-4 py-2 rounded-xl bg-primary/20 text-primary-light text-sm font-medium hover:bg-primary/30 transition-all flex items-center gap-1.5 group-hover:bg-primary group-hover:text-white">
                                    Pesan <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length > ITEMS_PER_PAGE && (
                <Pagination currentPage={currentPage} totalItems={filtered.length} onPageChange={setCurrentPage} />
            )}
        </div>
    )
}
