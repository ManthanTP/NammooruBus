import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Bus, LogOut, History, Shield, Play } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer } from '@/components/ui/Toast'

export default function DriverLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuthStore()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0F24] text-[#F1F4FA] font-body flex flex-col select-none">
      {/* Driver Header */}
      <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0E1433]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-input bg-cobalt text-white flex items-center justify-center shadow-soft">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white font-heading">
              Nammooru Driver
            </h1>
            <p className="text-[11px] text-white/50">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {location.pathname !== '/driver' && (
            <Link
              to="/driver"
              className="p-2.5 rounded-input bg-white/5 text-white/80 hover:bg-white/10 transition"
              title="Start / Active Trip"
            >
              <Play className="w-5 h-5" />
            </Link>
          )}

          <Link
            to="/driver/history"
            className="p-2.5 rounded-input bg-white/5 text-white/80 hover:bg-white/10 transition"
            title="Trip History"
          >
            <History className="w-5 h-5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-input bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Driver Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-5 flex flex-col">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}
