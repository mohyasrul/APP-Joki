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
