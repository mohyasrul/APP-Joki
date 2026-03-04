import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ToastProvider } from './components/Toast'
import { ProtectedRoute } from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'

// Lazy-loaded pages — each becomes a separate chunk
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const Katalog = lazy(() => import('./pages/client/Katalog'))
const BuatOrder = lazy(() => import('./pages/client/BuatOrder'))
const OrderDetail = lazy(() => import('./pages/client/OrderDetail'))
const PesananSaya = lazy(() => import('./pages/client/PesananSaya'))
const Profile = lazy(() => import('./pages/client/Profile'))
const CustomRequest = lazy(() => import('./pages/client/CustomRequest'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const KelolaLayanan = lazy(() => import('./pages/admin/KelolaLayanan'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const Keuangan = lazy(() => import('./pages/admin/Keuangan'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div role="status" aria-label="Memuat halaman" className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Memuat halaman...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div role="status" aria-label="Memuat aplikasi" className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to={isAdmin ? '/admin' : '/katalog'} replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={isAdmin ? '/admin' : '/katalog'} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/katalog" replace /> : <Register />} />

        {/* Client */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/katalog" element={<Katalog />} />
          <Route path="/order/baru" element={<BuatOrder />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/pesanan-saya" element={<PesananSaya />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/request-custom" element={<CustomRequest />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute adminOnly><Layout /></ProtectedRoute>}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/layanan" element={<KelolaLayanan />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/keuangan" element={<Keuangan />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/requests" element={<AdminRequests />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
