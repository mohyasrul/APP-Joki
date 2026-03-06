/**
 * StatusBadge — compact rounded-md badge for order & payment statuses.
 *
 * Usage:
 *   <StatusBadge status="Sedang Dikerjakan" />
 *   <StatusBadge status="Lunas" />
 */

const BADGE_CONFIG = {
    // ── Order pekerjaan ──────────────────────────────────────────────
    'Menunggu Diproses': {
        cls: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    'Sedang Dikerjakan': {
        cls: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    'Selesai': {
        cls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    'Batal': {
        cls: 'text-red-600 bg-red-50 border-red-100',
    },
    // ── Order pembayaran ─────────────────────────────────────────────
    'Belum Bayar': {
        cls: 'text-red-500 bg-red-50 border-red-100',
    },
    'Menunggu Verifikasi': {
        cls: 'text-blue-500 bg-blue-50 border-blue-100',
    },
    'Lunas': {
        cls: 'text-emerald-500 bg-emerald-50 border-emerald-100',
    },
    // ── Custom request (raw key) ──────────────────────────────────────
    'pending': {
        cls: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    'accepted': {
        cls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    'rejected': {
        cls: 'text-red-600 bg-red-50 border-red-100',
    },
    // ── Custom request (display label) ───────────────────────────────
    'Menunggu': {
        cls: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    'Diterima': {
        cls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    'Ditolak': {
        cls: 'text-red-600 bg-red-50 border-red-100',
    },
    // ── Availability (Katalog) ────────────────────────────────────────
    'Tersedia': {
        cls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    'Tidak Tersedia': {
        cls: 'text-slate-500 bg-slate-50 border-slate-200',
    },
}

const FALLBACK = { cls: 'text-slate-500 bg-slate-50 border-slate-200' }

export default function StatusBadge({ status, label, className = '' }) {
    const config = BADGE_CONFIG[status] ?? FALLBACK
    return (
        <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${config.cls} ${className}`}
        >
            {label ?? status}
        </span>
    )
}
