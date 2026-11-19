import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function PublicRoute({ children }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    if (profile?.role === 'driver') {
      return <Navigate to="/driver" replace />
    }
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}
