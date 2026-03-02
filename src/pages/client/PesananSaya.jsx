import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import { formatRupiah } from '../../lib/utils'
import { STATUS_COLORS, BAYAR_COLORS } from '../../lib/constants'
import { ShoppingCart, CheckCircle, XCircle, Eye, Package, Clock, Inbox, Star, AlertCircle, RefreshCw } from 'lucide-react'
import Pagination, { ITEMS_PER_PAGE } from '../../components/Pagination'

const REQ_STATUS = {
    pending: { label: 'Menunggu', color: 'text-yellow-400 bg-yellow-500/10', icon: Clock },
    accepted: { label: 'Diterima', color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
    rejected: { label: 'Ditolak', color: 'text-red-400 bg-red-500/10', icon: XCircle },
}

export default function PesananSaya() {
    const [orders, setOrders] = useState([])
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(null)
    const [filter, setFilter] = useState('Semua')
    const [currentPage, setCurrentPage] = useState(1)
    const [reqPage, setReqPage] = useState(1)
    const { user } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    useEffect(() => {
        fetchOrders(); fetchRequests()

        // Realtime subscription for order updates
        const channel = supabase
            .channel('client-orders-realtime')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `client_id=eq.${user.id}`,
            }, (payload) => {
                const oldData = payload.old
                const newData = payload.new

                // Only toast when status actually changed
                if (oldData.status_pekerjaan && newData.status_pekerjaan && oldData.status_pekerjaan !== newData.status_pekerjaan) {
                    toast.info(`\uD83D\uDCE6 Status pesanan berubah: ${newData.status_pekerjaan}`)
                } else if (oldData.status_pembayaran && newData.status_pembayaran && oldData.status_pembayaran !== newData.status_pembayaran) {
                    toast.info(`\uD83D\uDCB0 Pembayaran: ${newData.status_pembayaran}`)
                }
                fetchOrders()
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'custom_requests',
                filter: `client_id=eq.${user.id}`,
            }, () => {
                toast.info('💬 Ada update untuk request kamu!')
                fetchRequests()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchOrders = async () => {
        try {
            setFetchError(null)
            const { data, error } = await supabase.from('orders').select('*, layanan(judul_tugas)').eq('client_id', user.id).order('created_at', { ascending: false })
            if (error) throw error
            setOrders(data || [])
        } catch (err) {
            console.error('Failed to fetch orders:', err)
            setFetchError('Gagal memuat pesanan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase.from('custom_requests').select('*').eq('client_id', user.id).order('created_at', { ascending: false })
            if (error) throw error
            setRequests(data || [])
        } catch (err) {
            console.error('Failed to fetch requests:', err)
        }
    }

    const filters = ['Semua', 'Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai']
    const filtered = filter === 'Semua' ? orders : orders.filter(o => o.status_pekerjaan === filter)
    const paginatedOrders = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    const paginatedRequests = requests.slice((reqPage - 1) * ITEMS_PER_PAGE, reqPage * ITEMS_PER_PAGE)

    // Reset page when filter changes
    useEffect(() => { setCurrentPage(1) }, [filter])

    return (
        <div className="fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShoppingCart className="w-7 h-7 text-primary-light" /> Pesanan Saya
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{orders.length} pesanan</p>
                </div>
            </div>

            {/* Custom Requests Status */}
            {requests.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-1.5">
                        <Inbox className="w-4 h-4" /> Custom Request ({requests.length})
                    </h2>
                    <div className="space-y-2">
                        {paginatedRequests.map(req => {
                            const s = REQ_STATUS[req.status]
                            const ReqIcon = s.icon
                            return (
                                <div key={req.id} className={`glass rounded-xl p-4 ${req.status === 'accepted' && req.order_id ? 'cursor-pointer hover:bg-white/[0.03]' : ''}`}
                                    onClick={() => req.status === 'accepted' && req.order_id && navigate(`/order/${req.order_id}`)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-medium text-white truncate">{req.judul}</p>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                                                    <ReqIcon className="w-3 h-3" /> {s.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('id-ID')}</p>
                                            {req.harga_final && <p className="text-xs font-semibold gradient-text mt-0.5">{formatRupiah(req.harga_final)}</p>}
                                            {req.catatan_admin && <p className="text-xs text-slate-500 mt-0.5">💬 {req.catatan_admin}</p>}
                                        </div>
                                        {req.status === 'accepted' && req.order_id && <Eye className="w-4 h-4 text-slate-600 shrink-0" />}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {requests.length > ITEMS_PER_PAGE && (
                        <Pagination currentPage={reqPage} totalItems={requests.length} onPageChange={setReqPage} />
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {filters.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-primary/20 text-primary-light border border-primary/30' : 'glass text-slate-400 hover:text-white'}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Orders */}
            {loading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl p-5 animate-pulse"><div className="h-5 bg-white/10 rounded w-1/3 mb-3" /><div className="h-4 bg-white/5 rounded w-1/2" /></div>)}</div>
            ) : fetchError ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">{fetchError}</h3>
                    <button onClick={() => { setLoading(true); fetchOrders(); fetchRequests() }}
                        className="mt-2 px-5 py-2.5 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-all inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Coba Lagi
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Belum ada pesanan</h3>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedOrders.map(order => (
                        <div key={order.id} onClick={() => navigate(`/order/${order.id}`)}
                            className="glass glass-hover rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-semibold text-white truncate">{order.layanan?.judul_tugas || 'Custom Order'}</h3>
                                        {order.rating && <span className="flex items-center gap-0.5 text-xs text-yellow-400"><Star className="w-3 h-3 fill-yellow-400" />{order.rating}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <Eye className="w-5 h-5 text-slate-600 group-hover:text-primary-light transition-colors shrink-0 ml-4" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[order.status_pekerjaan]}`}>{order.status_pekerjaan}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${BAYAR_COLORS[order.status_pembayaran]}`}>{order.status_pembayaran}</span>
                                <span className="ml-auto text-sm font-bold gradient-text">{formatRupiah(order.harga_final)}</span>
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
