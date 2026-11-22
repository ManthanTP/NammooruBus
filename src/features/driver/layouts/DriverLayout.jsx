import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, LayoutGroup } from 'framer-motion'
import {
  Play,
  Radio,
  FileText,
  Bus,
  User,
  LogOut,
  Compass,
  Sun,
  Moon,
  Laptop,
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { ToastContainer } from '@/components/ui/Toast'

export default function DriverLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const [hasActiveTrip, setHasActiveTrip] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Check if driver has an ongoing trip
  useEffect(() => {
    let isMounted = true

    const checkActiveTrip = async () => {
      if (!user) return
      try {
        const { data: dRow } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (dRow && isMounted) {
          const { data: trip } = await supabase
            .from('trips')
            .select('id')
            .eq('driver_id', dRow.id)
            .neq('status', 'ended')
            .maybeSingle()

          if (isMounted) {
            setHasActiveTrip(Boolean(trip))
          }
        }
      } catch (err) {
        // Fallback for mock or network error
      }
    }

    checkActiveTrip()
    const interval = setInterval(checkActiveTrip, 10000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user, location.pathname])

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  const driverTabs = [
    { key: 'trip', label: 'Trip', path: '/driver', icon: Play, exact: true },
    { key: 'live', label: 'Live', path: '/driver/trip', icon: Radio },
    { key: 'reports', label: 'Reports', path: '/driver/history', icon: FileText },
    { key: 'bus', label: 'Bus', path: '/driver/bus', icon: Bus },
    { key: 'profile', label: 'Profile', path: '/driver/profile', icon: User },
  ]

  const userInitials = (profile?.full_name || user?.email || 'D')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-bg font-body text-ink-950 flex flex-col select-none transition-colors">
      {/* 1. Global Top App Bar: 56px height, solid surface matching passenger style */}
      <header className="sticky top-0 z-40 h-14 px-3 sm:px-5 flex items-center justify-between bg-surface border-b border-line shadow-xs transition-colors">
        {/* Left: Logo mark + "Nammooru Bus" + Driver tag */}
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/driver" className="flex items-center gap-2 select-none shrink-0 group">
            {/* White-box logo: 40px, radius 12, logo mark on white rounded square */}
            <div className="w-10 h-10 rounded-[12px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/brand/logo-mark.png"
                alt="Nammooru Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-lg sm:text-xl font-extrabold tracking-tight whitespace-nowrap">
                <span className="text-ink-950">Nammooru</span>
                <span className="text-brand ml-0.5">Bus</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] uppercase tracking-wider hidden xs:inline-block">
                Driver
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions: Status pill, Theme toggle, Profile avatar with menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Status Pill: "On trip" amber pulsing OR "Off duty" grey */}
          <Link
            to={hasActiveTrip ? '/driver/trip' : '/driver'}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-pill transition-transform active:scale-95 shadow-xs shrink-0"
            style={
              hasActiveTrip
                ? { backgroundColor: 'var(--amber-500)', color: 'var(--navy-900)' }
                : { backgroundColor: 'var(--sky-100)', color: 'var(--text-muted)' }
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${hasActiveTrip ? 'bg-navy-900 animate-pulse' : 'bg-muted'
                }`}
            />
            <span className="whitespace-nowrap">
              {hasActiveTrip ? 'On trip' : 'Off duty'}
            </span>
          </Link>

          {/* Theme toggle: 44px min tap target */}
          <ThemeToggle />

          {/* Profile Avatar Button with Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full w-9 h-9 bg-sky-100 dark:bg-surface-2 border-2 border-cobalt-500 text-cobalt-500 font-heading font-extrabold text-xs flex items-center justify-center transition active:scale-95 shadow-xs shrink-0 cursor-pointer"
              aria-label="Driver account menu"
            >
              {userInitials}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-11 w-64 bg-surface border border-line rounded-[20px] p-2.5 shadow-float z-50 animate-scale-in space-y-2">
                <div className="px-3 py-2 border-b border-line">
                  <p className="font-heading font-bold text-xs text-ink-950 truncate">
                    {profile?.full_name || 'Driver'}
                  </p>
                  <p className="text-[11px] text-muted truncate">{user?.email}</p>
                </div>

                {/* Profile Link */}
                <Link
                  to="/driver/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-bold text-ink-950 hover:bg-sky-50 dark:hover:bg-surface-2 transition"
                >
                  <User className="w-4 h-4 text-cobalt-500" />
                  <span>Driver Profile</span>
                </Link>

                {/* Language Switch */}
                <div className="px-3 py-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted">Language</span>
                  <LanguageToggle />
                </div>

                {/* Theme Switch */}
                <div className="px-3 py-1">
                  <span className="text-xs font-bold text-muted block mb-1">Theme</span>
                  <div className="flex items-center p-0.5 bg-sky-50 dark:bg-navy-950/70 border border-line rounded-pill">
                    {[
                      { key: 'light', label: 'Light', icon: Sun },
                      { key: 'dark', label: 'Dark', icon: Moon },
                      { key: 'system', label: 'Auto', icon: Laptop },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className={`flex-1 py-1 rounded-pill text-[11px] font-bold flex items-center justify-center gap-1 transition ${theme === key
                          ? 'bg-cobalt-500 text-white shadow-xs'
                          : 'text-muted hover:text-ink-950'
                          }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[1px] bg-line/60" />

                {/* Switch to Passenger View */}
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-bold text-ink-950 hover:bg-sky-50 dark:hover:bg-surface-2 transition"
                >
                  <Compass className="w-4 h-4 text-cobalt-500" />
                  <span>Switch to Passenger View</span>
                </Link>

                {/* Log Out */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-bold text-danger hover:bg-danger/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('auth.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Driver Content */}
      <main
        key={location.pathname}
        className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-5 flex flex-col page-enter"
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </main>

      {/* 3. Mobile Floating Tab Bar (5 tabs max: Trip, Live, Reports, Bus, Profile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center pb-3 px-3">
        <LayoutGroup id="driver-tab-bar">
          <nav
            role="navigation"
            aria-label="Driver Navigation"
            className="w-full max-w-md pointer-events-auto bg-surface/95 backdrop-blur-md border border-line rounded-pill p-1.5 shadow-float flex items-center justify-around"
          >
            {driverTabs.map((tab) => {
              const active = tab.exact
                ? location.pathname === tab.path
                : location.pathname.startsWith(tab.path)
              const Icon = tab.icon

              return (
                <NavLink
                  key={tab.key}
                  to={tab.path}
                  end={tab.exact}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-pill transition-colors flex-1 min-w-0 ${
                    active ? 'on-brand' : 'text-muted hover:text-text'
                  }`}
                  style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}
                  aria-label={tab.label}
                >
                  {active && (
                    <motion.div
                      layoutId="driver-tab-pill"
                      className="absolute inset-0 rounded-pill shadow-xs z-0 pointer-events-none"
                      style={{ background: 'var(--gradient-brand)' }}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center" style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}>
                    <Icon className="w-5 h-5 mb-0.5" strokeWidth={active ? 2.5 : 2} style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }} />
                    <span className="text-[10px] font-heading font-extrabold tracking-tight" style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}>
                      {tab.label}
                    </span>
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </LayoutGroup>
      </div>

      <ToastContainer />
    </div>
  )
}
