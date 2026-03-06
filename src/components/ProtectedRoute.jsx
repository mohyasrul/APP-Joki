import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { SpinnerGap } from '@phosphor-icons/react'

export function ProtectedRoute({ children, adminOnly = false }) {
    const { user, profile, loading, isAdmin } = useAuth()

    if (loading) {
        return (
            <div role="status" aria-label="Memeriksa sesi" className="min-h-screen flex items-center justify-center">
                <SpinnerGap className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        )
    }

    if (!user) return <Navigate to="/login" replace />
    if (adminOnly && !isAdmin) return <Navigate to="/katalog" replace />
    if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />

    return children
}
