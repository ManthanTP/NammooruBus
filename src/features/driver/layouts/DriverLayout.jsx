import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, History, Play, ChevronLeft } from 'lucide-react'
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

  const isRoot = location.pathname === '/driver'

  return (
    <div className="min-h-screen font-body flex flex-col select-none" style={{ backgroundColor: 'var(--sky-50)', color: 'var(--ink-950)' }}>
      {/* Driver Header — gradient brand bar */}
      <header
        className="px-5 py-4 flex items-center justify-between sticky top-0 z-40"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="flex items-center gap-3">
          {/* Large back button when not on root */}
          {!isRoot && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-white/15 text-white hover:bg-white/25 transition mr-1"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white font-heading leading-none">
              Nammooru Driver
            </h1>
            <p className="text-[11px] text-white/60 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isRoot && (
            <Link
              to="/driver"
              className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition"
              title="Start / Active Trip"
            >
              <Play className="w-5 h-5" />
            </Link>
          )}

          <Link
            to="/driver/history"
            className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition"
            title="Trip History"
          >
            <History className="w-5 h-5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-full transition"
            style={{
              backgroundColor: 'rgba(229,72,77,0.18)',
              color: '#fca5a5',
              border: '1px solid rgba(229,72,77,0.3)',
            }}
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Driver Content */}
      <main key={location.pathname} className="flex-1 max-w-md w-full mx-auto p-5 flex flex-col page-enter">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}
