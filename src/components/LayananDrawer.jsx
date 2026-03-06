import { useEffect } from 'react'
import { X, Tag, Clock, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { formatRupiah } from '../lib/utils'
import { getKategoriIcon } from '../lib/constants'

export default function LayananDrawer({ layanan, onClose, onOrder }) {
    useEffect(() => {
        if (!layanan) return
        document.body.style.overflow = 'hidden'
        const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.body.style.overflow = ''
            document.removeEventListener('keydown', handleEscape)
        }
    }, [layanan, onClose])

    if (!layanan) return null

    const { Icon, bg, color } = getKategoriIcon(layanan.kategori)

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col overflow-hidden animate-slide-in-right">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-semibold">
                        <Tag weight="bold" className="w-3 h-3" /> {layanan.kategori || 'Lainnya'}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                        aria-label="Tutup"
                    >
                        <X weight="bold" className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-5`}>
                        <Icon weight="fill" className={`w-7 h-7 ${color}`} />
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 leading-tight">{layanan.judul_tugas}</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {layanan.deskripsi || 'Tidak ada deskripsi tersedia untuk layanan ini.'}
                    </p>

                    <hr className="border-slate-100 mb-6" />

                    {/* Price + Duration cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100">
                            <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider mb-1">Harga Estimasi</p>
                            <p className="text-lg font-bold text-brand-600">{formatRupiah(layanan.harga_estimasi)}</p>
                        </div>
                        {layanan.estimasi_hari && (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Estimasi</p>
                                <p className="text-lg font-bold text-slate-700 flex items-center gap-1">
                                    <Clock weight="bold" className="w-4 h-4 text-slate-400" />
                                    {layanan.estimasi_hari} hari
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Benefits */}
                    <div className="bg-slate-50 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">Yang kamu dapatkan:</h3>
                        <ul className="space-y-2.5">
                            {[
                                'Pengerjaan profesional dan teliti',
                                'Komunikasi langsung via chat dengan joki',
                                'Revisi jika diperlukan',
                                'File hasil pengerjaan tepat waktu',
                            ].map(item => (
                                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                                    <CheckCircle weight="fill" className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Sticky Footer CTA */}
                <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100 shrink-0 bg-white">
                    <button
                        onClick={() => onOrder(layanan)}
                        className="w-full py-3.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        Pesan Layanan Ini <ArrowRight weight="bold" className="w-4 h-4" />
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-2.5">Harga dapat berubah sesuai kesepakatan</p>
                </div>
            </div>
        </>
    )
}
