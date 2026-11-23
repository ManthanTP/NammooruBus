import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  Menu,
  X,
  Compass,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer, useToastStore } from '@/components/ui/Toast'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function AdminLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuthStore()
  const { addToast } = useToastStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [userMenuOpen])

  const handleLogout = async () => {
    setUserMenuOpen(false)
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

  const userInitials = (profile?.full_name || 'Admin')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen font-body flex bg-bg text-text select-none transition-colors">
      {/* 1. Fixed Sidebar (Desktop: 240px wide = w-60) */}
      <aside className="hidden md:flex w-60 flex-col shrink-0 fixed inset-y-0 left-0 z-30 bg-surface border-r border-line text-text transition-colors">
        {/* Single Brand Header */}
        <div className="p-4 flex items-center gap-3 border-b border-line">
          <div className="w-10 h-10 rounded-[12px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs shrink-0">
            <img
              src="/brand/logo-mark.png"
              alt="Nammooru Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-extrabold font-heading leading-tight text-text">
              Nammooru <span className="text-brand">Admin</span>
            </h1>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Control Panel
            </span>
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
                  `flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-pill transition-all cursor-pointer ${
                    isActive
                      ? 'on-brand font-bold shadow-soft'
                      : 'text-text/75 hover:text-text hover:bg-surface-2 font-bold'
                  }`
                }
                style={({ isActive }) =>
                  isActive ? { background: 'var(--gradient-brand)', color: 'var(--on-brand)' } : {}
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
            className="w-full py-2.5 px-3 rounded-pill text-xs font-bold flex items-center justify-center transition text-text bg-surface-2 hover:bg-line border border-line"
          >
            Open Passenger View →
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer (Collapses to bottom drawer or slide-over) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 bg-surface text-text border-t border-line rounded-t-sheet max-h-[85vh] flex flex-col p-4 shadow-2xl animate-sheet-up">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs">
                  <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-extrabold font-heading text-text">
                  Nammooru <span className="text-brand">Admin</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto space-y-1 py-2 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/12345678/admin/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-pill transition-all ${
                        isActive
                          ? 'on-brand font-bold shadow-soft'
                          : 'text-text/75 hover:text-text hover:bg-surface-2 font-bold'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive ? { background: 'var(--gradient-brand)', color: 'var(--on-brand)' } : {}
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Content Area */}
      <div className="flex-1 md:ml-60 flex flex-col min-w-0 bg-bg transition-colors">
        {/* Top bar: 56px height, solid surface, no duplicate branding on desktop */}
        <header className="h-14 bg-surface px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 border-b border-line shadow-xs transition-colors">
          <div className="flex items-center gap-2.5">
            {/* Mobile-only toggle and brand mark */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-text hover:bg-surface-2 rounded-pill transition cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-[10px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs">
                <img
                  src="/brand/logo-mark.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-heading text-sm font-extrabold text-text">
                Nammooru <span className="text-brand">Admin</span>
              </span>
            </div>

            {/* Desktop-only operational tag & section label (No duplicate logo mark) */}
            <div className="hidden md:flex items-center gap-3">
              <span className="font-heading text-sm font-extrabold text-text">
                Admin Panel
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-surface-2 border border-line">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-text">Operational</span>
              </div>
            </div>
          </div>

          {/* Admin User Info, Theme Toggle & Avatar Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-text block">
                {profile?.full_name || 'Administrator'}
              </span>
              <span className="text-[10px] text-muted font-mono">
                {user?.email}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Admin Avatar Circle with Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-surface-2 text-brand border-2 border-brand font-heading font-extrabold text-xs flex items-center justify-center shadow-soft cursor-pointer active:scale-95 transition"
                aria-label="Admin account menu"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-56 bg-surface border border-line rounded-[20px] p-2 shadow-float z-50 animate-scale-in space-y-1">
                  <div className="px-3 py-2 border-b border-line">
                    <p className="font-heading font-bold text-xs text-text truncate">
                      {profile?.full_name || 'Admin'}
                    </p>
                    <p className="text-[10px] text-muted font-mono truncate">{user?.email}</p>
                  </div>

                  <Link
                    to="/"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-bold text-text hover:bg-surface-2 transition"
                  >
                    <Compass className="w-4 h-4 text-brand" />
                    <span>Open Passenger View</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-bold text-danger hover:bg-danger/10 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('auth.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-bg">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
