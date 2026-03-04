import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children, adminOnly = false }) {
    const { user, profile, loading, isAdmin } = useAuth()

    if (loading) {
        return (
            <div role="status" aria-label="Memeriksa sesi" className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) return <Navigate to="/login" replace />
    if (adminOnly && !isAdmin) return <Navigate to="/katalog" replace />
    if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />

    return children
}
