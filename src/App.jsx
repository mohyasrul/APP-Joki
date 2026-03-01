import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ToastProvider } from './components/Toast'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Katalog from './pages/client/Katalog'
import BuatOrder from './pages/client/BuatOrder'
import OrderDetail from './pages/client/OrderDetail'
import PesananSaya from './pages/client/PesananSaya'
import Profile from './pages/client/Profile'
import CustomRequest from './pages/client/CustomRequest'
import Dashboard from './pages/admin/Dashboard'
import KelolaLayanan from './pages/admin/KelolaLayanan'
import AdminOrders from './pages/admin/AdminOrders'
import Keuangan from './pages/admin/Keuangan'
import AdminSettings from './pages/admin/AdminSettings'
import AdminPromo from './pages/admin/AdminPromo'
import AdminRequests from './pages/admin/AdminRequests'

function AppRoutes() {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
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
        <Route path="/admin/promo" element={<AdminPromo />} />
        <Route path="/admin/requests" element={<AdminRequests />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
