import { Code, DeviceMobile, ChartBar, PencilSimple, Monitor, Calculator, PaintBrush, VideoCamera, BookOpen } from '@phosphor-icons/react'

// Shared constants used across multiple components

export const STATUS_COLORS = {
    'Menunggu Diproses': 'text-yellow-400 bg-yellow-500/10',
    'Sedang Dikerjakan': 'text-blue-400 bg-blue-500/10',
    'Selesai': 'text-green-400 bg-green-500/10',
    'Batal': 'text-red-400 bg-red-500/10',
}

export const BAYAR_COLORS = {
    'Belum Bayar': 'text-red-400 bg-red-500/10',
    'Menunggu Verifikasi': 'text-yellow-400 bg-yellow-500/10',
    'Lunas': 'text-green-400 bg-green-500/10',
}

const FILE_ICONS = {
    image: '🖼️', pdf: '📄', doc: '📝', zip: '📦', default: '📎'
}

export const getFileIcon = (name) => {
    if (!name) return FILE_ICONS.default
    const ext = name.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return FILE_ICONS.image
    if (ext === 'pdf') return FILE_ICONS.pdf
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return FILE_ICONS.doc
    if (['zip', 'rar', '7z'].includes(ext)) return FILE_ICONS.zip
    return FILE_ICONS.default
}

export const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
}

export const KATEGORI_EMOJI = {
    'Programming': '💻',
    'Web Development': '💻',
    'Mobile Dev': '📱',
    'Analisis Data': '📊',
    'Statistik': '📊',
    'Penulisan': '📝',
    'Makalah': '📝',
    'Skripsi': '📝',
    'Presentasi': '🖥️',
    'Matematika': '📐',
    'Fisika': '⚗️',
    'Desain': '🎨',
    'Video': '🎬',
    'Lainnya': '📚',
}

export const getKategoriIcon = (kategori) => {
    const map = {
        'Programming':     { Icon: Code,         bg: 'bg-blue-50',   color: 'text-blue-500' },
        'Web Development': { Icon: Code,         bg: 'bg-blue-50',   color: 'text-blue-500' },
        'Mobile Dev':      { Icon: DeviceMobile, bg: 'bg-indigo-50', color: 'text-indigo-500' },
        'Analisis Data':   { Icon: ChartBar,     bg: 'bg-violet-50', color: 'text-violet-500' },
        'Statistik':       { Icon: ChartBar,     bg: 'bg-violet-50', color: 'text-violet-500' },
        'Penulisan':       { Icon: PencilSimple, bg: 'bg-amber-50',  color: 'text-amber-500' },
        'Makalah':         { Icon: PencilSimple, bg: 'bg-amber-50',  color: 'text-amber-500' },
        'Skripsi':         { Icon: PencilSimple, bg: 'bg-amber-50',  color: 'text-amber-500' },
        'Presentasi':      { Icon: Monitor,      bg: 'bg-orange-50', color: 'text-orange-500' },
        'Matematika':      { Icon: Calculator,   bg: 'bg-slate-50',  color: 'text-slate-600' },
        'Fisika':          { Icon: Calculator,   bg: 'bg-slate-50',  color: 'text-slate-600' },
        'Desain':          { Icon: PaintBrush,   bg: 'bg-pink-50',   color: 'text-pink-500' },
        'Video':           { Icon: VideoCamera,  bg: 'bg-red-50',    color: 'text-red-500' },
    }
    return map[kategori] ?? { Icon: BookOpen, bg: 'bg-slate-100', color: 'text-slate-500' }
}
