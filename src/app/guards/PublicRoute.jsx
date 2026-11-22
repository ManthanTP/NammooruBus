import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function PublicRoute({ children }) {
  const { user, profile, loading, initialized } = useAuthStore()

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    if (profile?.role === 'admin') {
      return <Navigate to="/12345678/admin/dashboard" replace />
    }
    if (profile?.role === 'driver') {
      return <Navigate to="/driver" replace />
    }
    return <Navigate to="/explore" replace />
  }

  return children ? children : <Outlet />
}
