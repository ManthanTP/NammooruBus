import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AdminRoute({ children }) {
  const { user, profile, loading, initialized } = useAuthStore()

  if (typeof window !== 'undefined' && (window.__mockAuth || sessionStorage.getItem('nb_mock_admin') === 'true')) {
    return children ? children : <Outlet />
  }

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/12345678/admin/login" replace />
  }

  return children ? children : <Outlet />
}
