import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Route,
  Calendar,
  CreditCard,
  Bus,
  Users,
  Activity,
  MessageSquare,
  Bell,
  FileText,
  Upload,
  History,
  Cpu,
  LogOut,
  ShieldAlert,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer, useToastStore } from '@/components/ui/Toast'

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { addToast } = useToastStore()

  const handleLogout = async () => {
    await signOut()
    addToast({ message: 'Logged out from Admin portal', type: 'info' })
    navigate('/12345678/admin/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/12345678/admin/dashboard', icon: LayoutDashboard },
    { name: 'Stops', path: '/12345678/admin/stops', icon: MapPin },
    { name: 'Routes', path: '/12345678/admin/routes', icon: Route },
    { name: 'Schedules', path: '/12345678/admin/schedules', icon: Calendar },
    { name: 'Fares', path: '/12345678/admin/fares', icon: CreditCard },
    { name: 'Fleet & Drivers', path: '/12345678/admin/fleet', icon: Bus },
    { name: 'Users & Roles', path: '/12345678/admin/users', icon: Users },
    { name: 'Live Monitor', path: '/12345678/admin/live', icon: Activity },
    { name: 'Complaints', path: '/12345678/admin/complaints', icon: MessageSquare },
    { name: 'Alerts', path: '/12345678/admin/alerts', icon: Bell },
    { name: 'Reports', path: '/12345678/admin/reports', icon: FileText },
    { name: 'CSV Import', path: '/12345678/admin/import', icon: Upload },
    { name: 'Audit Logs', path: '/12345678/admin/audit', icon: History },
    { name: 'GPS Simulator', path: '/12345678/admin/simulator', icon: Cpu },
  ]

  return (
    <div className="min-h-screen bg-page text-ink font-body flex select-none">
      {/* 1. Fixed Sidebar (Desktop-First) */}
      <aside className="w-64 bg-surface border-r border-line flex flex-col shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Brand header */}
        <div className="p-4 border-b border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-input bg-ink text-white flex items-center justify-center shadow-soft">
            <ShieldAlert className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-ink font-heading leading-tight">
              Nammooru Admin
            </h1>
            <span className="text-[10px] text-text-secondary font-mono">Central Control</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/12345678/admin/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-input text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-cobalt text-white shadow-soft font-bold'
                      : 'text-text-secondary hover:text-ink hover:bg-page'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-line">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 bg-page hover:bg-line/40 rounded-input text-xs font-bold text-cobalt flex items-center justify-center transition"
          >
            Open Passenger View &rarr;
          </Link>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-surface border-b border-line px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-bold text-ink">System Live</span>
            <span className="text-xs text-text-secondary hidden sm:inline">&bull; Supabase Operational</span>
          </div>

          {/* Admin User Info & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-ink block">{profile?.full_name || 'Administrator'}</span>
              <span className="text-[10px] text-text-secondary font-mono">{user?.email}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 bg-page hover:bg-danger/10 text-danger border border-line hover:border-danger/30 rounded-input transition flex items-center gap-1.5 text-xs font-semibold"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Log out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
