import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogIn, RefreshCw, Compass, Radio, MapPin, Route, Bookmark } from 'lucide-react'
import MapView from '@/components/map/MapView'
import FloatingTabBar from '@/components/ui/FloatingTabBar'
import LanguageToggle from '@/components/ui/LanguageToggle'
import LiveDot from '@/components/ui/LiveDot'
import { ToastContainer } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { useDataStore } from '@/store/dataStore'

export default function PassengerLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuthStore()
  const { subscribe, unsubscribe, isReconnecting, getActiveCount } = useLiveStore()
  const { start: startLocationWatcher } = useLocationStore()
  const { initData } = useDataStore()

  // Initialize master data & background subscriptions
  useEffect(() => {
    initData()
    subscribe()
    startLocationWatcher()
    return () => unsubscribe()
  }, [initData, subscribe, unsubscribe, startLocationWatcher])

  const liveCount = getActiveCount()
  const isSearchPage = location.pathname === '/search'
  const isHomePage = location.pathname === '/'

  const navLinks = [
    { key: 'explore', label: t('nav.explore'), path: '/', icon: Compass },
    { key: 'live', label: t('nav.live'), path: '/live', icon: Radio },
    { key: 'nearby', label: t('nav.nearby'), path: '/nearby', icon: MapPin },
    { key: 'routes', label: t('nav.routes'), path: '/routes', icon: Route },
    { key: 'saved', label: t('nav.saved'), path: '/saved', icon: Bookmark },
  ]

  return (
    <div className="relative w-full min-h-screen bg-sky-50 font-body text-ink-950 flex flex-col md:flex-row overflow-x-hidden">
      {/* 1. Global Top App Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 px-4 md:px-6 py-2.5 flex items-center justify-between transition-all duration-300 ${
          isHomePage
            ? 'bg-transparent border-b-0 text-white'
            : 'bg-white/95 backdrop-blur-md border-b text-ink-950 shadow-xs'
        }`}
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 select-none group">
            <img
              src="/brand/logo-mark-transparent.png"
              alt="Logo"
              className="h-9 w-9 object-contain"
            />
            <span className="font-heading text-base font-extrabold tracking-tight">
              <span className={isHomePage ? 'text-white' : 'text-ink-950'}>Nammooru</span>
              <span className="text-cobalt-500 ml-0.5">Bus</span>
            </span>
          </Link>

          {/* Live Bus Count Pill */}
          <div className="h-4 w-[1px] bg-line/60 mx-1 hidden sm:block" />
          <Link
            to="/live"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-pill transition-transform active:scale-95 shadow-xs"
            style={
              isReconnecting
                ? { backgroundColor: 'var(--sky-100)', color: 'var(--color-warning)' }
                : { backgroundColor: 'var(--amber-500)', color: 'var(--navy-900)' }
            }
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span>Reconnecting</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-navy-900 animate-pulse" />
                <span>{liveCount} live</span>
              </>
            )}
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-pill border border-line shadow-xs">
          {navLinks.map((item) => {
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition ${
                  active
                    ? 'text-white shadow-xs'
                    : 'text-muted hover:text-ink-950 hover:bg-sky-50'
                }`}
                style={active ? { background: 'var(--gradient-brand)' } : {}}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side actions (Language & Profile) */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {user ? (
            <Link
              to="/profile"
              className="rounded-full w-8 h-8 bg-sky-100 border-2 border-cobalt-500 text-cobalt-500 flex items-center justify-center transition active:scale-95 shadow-xs"
              title={user.email}
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full w-8 h-8 bg-white border border-line text-muted hover:text-cobalt-500 flex items-center justify-center transition active:scale-95 shadow-xs"
              title={t('auth.login')}
            >
              <LogIn className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* 2. Toast Notifications Container */}
      <ToastContainer />

      {/* 3. Main Content Area */}
      {/* Mobile: Normal scrolling container with in-page map cards */}
      {/* Desktop (768px+): Left column 440px white panel with radius 28 inside sky-50 page + Right column large map */}
      <div className="flex-1 w-full flex flex-col md:flex-row min-h-screen pt-14 md:pt-16">
        {/* Left Column (Content) */}
        <main
          className={`flex-1 md:w-[460px] md:max-w-[460px] md:flex-none min-h-screen pb-24 md:pb-8 px-4 md:px-5 overflow-y-auto md:border-r md:border-line md:bg-white md:m-3 md:rounded-[28px] md:shadow-soft transition-all ${
            isSearchPage ? 'bg-white' : ''
          }`}
          style={{
            paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
          }}
        >
          <div key={location.pathname} className="max-w-lg mx-auto md:max-w-none pt-2 page-enter">
            <Outlet />
          </div>
        </main>

        {/* Right Column (Desktop Large Map View) */}
        <aside className="hidden md:block flex-1 h-[calc(100vh-64px)] sticky top-16 relative bg-white overflow-hidden md:m-3 md:ml-0 md:rounded-[28px] md:shadow-soft border border-line">
          <MapView />
        </aside>
      </div>

      {/* 4. Bottom Tab Bar (Mobile only, hidden on search or desktop) */}
      <div className="md:hidden">
        {!isSearchPage && <FloatingTabBar />}
      </div>
    </div>
  )
}
