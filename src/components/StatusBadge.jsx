/**
 * StatusBadge — shared pill badge for order & payment statuses.
 *
 * Usage:
 *   <StatusBadge status="Sedang Dikerjakan" />
 *   <StatusBadge status="Lunas" />
 *   <StatusBadge status="pending" />   // custom-request status key
 *
 * Active statuses (those with dot=true) render an animated pulse dot.
 */

const BADGE_CONFIG = {
    // ── Order pekerjaan ──────────────────────────────────────────────
    'Menunggu Diproses': {
        cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        dot: true,
        dotCls: 'bg-yellow-400',
    },
    'Sedang Dikerjakan': {
        cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        dot: true,
        dotCls: 'bg-blue-400',
    },
    'Selesai': {
        cls: 'text-green-400 bg-green-500/10 border-green-500/30',
        dot: false,
    },
    'Batal': {
        cls: 'text-red-400 bg-red-500/10 border-red-500/30',
        dot: false,
    },
    // ── Order pembayaran ─────────────────────────────────────────────
    'Belum Bayar': {
        cls: 'text-red-400 bg-red-500/10 border-red-500/30',
        dot: false,
    },
    'Menunggu Verifikasi': {
        cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        dot: true,
        dotCls: 'bg-yellow-400',
    },
    'Lunas': {
        cls: 'text-green-400 bg-green-500/10 border-green-500/30',
        dot: false,
    },
    // ── Custom request (raw key) ──────────────────────────────────────
    'pending': {
        cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        dot: true,
        dotCls: 'bg-yellow-400',
    },
    'accepted': {
        cls: 'text-green-400 bg-green-500/10 border-green-500/30',
        dot: false,
    },
    'rejected': {
        cls: 'text-red-400 bg-red-500/10 border-red-500/30',
        dot: false,
    },
    // ── Custom request (display label) ───────────────────────────────
    'Menunggu': {
        cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        dot: true,
        dotCls: 'bg-yellow-400',
    },
    'Diterima': {
        cls: 'text-green-400 bg-green-500/10 border-green-500/30',
        dot: false,
    },
    'Ditolak': {
        cls: 'text-red-400 bg-red-500/10 border-red-500/30',
        dot: false,
    },
    // ── Availability (Katalog) ────────────────────────────────────────
    'Tersedia': {
        cls: 'text-green-400 bg-green-500/10 border-green-500/30',
        dot: false,
    },
    'Tidak Tersedia': {
        cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        dot: false,
    },
}

const FALLBACK = { cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30', dot: false }

/**
 * @param {{ status: string, label?: string, className?: string }} props
 * - `status`    The raw status value (must match a key in BADGE_CONFIG)
 * - `label`     Optional display override; defaults to `status`
 * - `className` Extra classes appended to the pill
 */
export default function StatusBadge({ status, label, className = '' }) {
    const config = BADGE_CONFIG[status] ?? FALLBACK
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${config.cls} ${className}`}
        >
            {config.dot && (
                <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${config.dotCls}`}
                />
            )}
            {label ?? status}
        </span>
    )
}
