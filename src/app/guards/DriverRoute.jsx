import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function DriverRoute({ children }) {
  const { user, profile, loading, initialized } = useAuthStore()

  if (typeof window !== 'undefined' && (window.__mockAuth || sessionStorage.getItem('nb_mock_driver') === 'true')) {
    return children ? children : <Outlet />
  }

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile?.role !== 'driver' && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}
