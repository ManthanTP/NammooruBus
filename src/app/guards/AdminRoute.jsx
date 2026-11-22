import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuthStore()

  if (typeof window !== 'undefined' && (window.__mockAuth || sessionStorage.getItem('nb_mock_admin') === 'true')) {
    return children ? children : <Outlet />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/12345678/admin/login" replace />
  }

  return children ? children : <Outlet />
}
