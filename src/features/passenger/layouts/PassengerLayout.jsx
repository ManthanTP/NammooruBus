import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogIn, RefreshCw, Compass, Radio, MapPin, Route, Bookmark, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getReadAlertIds } from '@/lib/alertsStorage'
import MapView from '@/components/map/MapView'
import FloatingTabBar from '@/components/ui/FloatingTabBar'
import LanguageToggle from '@/components/ui/LanguageToggle'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LiveDot from '@/components/ui/LiveDot'
import { ToastContainer } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { useDataStore } from '@/store/dataStore'

export default function PassengerLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, profile } = useAuthStore()

  // Strict role separation: drivers should NEVER access the passenger portal
  if (user && profile?.role === 'driver') {
    return <Navigate to="/driver" replace />
  }
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
  const isJourneyPage = location.pathname === '/journey'
  const isHomePage = location.pathname === '/'

  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0)

  const checkUnreadAlerts = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('alerts')
        .select('id, expires_at')
        .lte('starts_at', now)

      if (error) throw error

      const readIds = getReadAlertIds()
      const unread = (data || []).filter((a) => {
        if (readIds.includes(a.id)) return false
        if (!a.expires_at) return true
        return new Date(a.expires_at) > new Date()
      })
      setUnreadAlertsCount(unread.length)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    checkUnreadAlerts()

    const channel = supabase
      .channel('passenger_header_alerts_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => checkUnreadAlerts()
      )
      .subscribe()

    const handleLocalUpdate = () => checkUnreadAlerts()
    window.addEventListener('nb_alerts_updated', handleLocalUpdate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('nb_alerts_updated', handleLocalUpdate)
    }
  }, [])

  const navLinks = [
    { key: 'explore', label: t('nav.explore'), path: '/explore', icon: Compass },
    { key: 'live', label: t('nav.live'), path: '/live', icon: Radio },
    { key: 'nearby', label: t('nav.nearby'), path: '/nearby', icon: MapPin },
    { key: 'routes', label: t('nav.routes'), path: '/routes', icon: Route },
    { key: 'saved', label: t('nav.saved'), path: '/saved', icon: Bookmark },
  ]

  return (
    <div className="relative w-full min-h-screen bg-bg font-body text-text flex flex-col md:flex-row overflow-x-hidden">
      {/* 1. Global Top App Bar: 56px content + safe top padding, solid surface on all pages, line border */}
      <header
        className="fixed top-0 left-0 right-0 z-40 px-2.5 sm:px-4 md:px-6 flex items-center justify-between bg-surface border-b border-line shadow-xs transition-colors"
        style={{
          paddingTop: 'var(--safe-top, 0px)',
          height: 'calc(3.5rem + var(--safe-top, 0px))',
        }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <Link to="/explore" className="flex items-center gap-2 select-none shrink-0 group">
            {/* White-box logo: 40px, radius 12, logo mark on white rounded square */}
            <div className="w-10 h-10 rounded-[12px] bg-white overflow-hidden p-0.5 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/brand/logo-mark.png"
                alt="Nammooru Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-heading text-lg sm:text-xl font-extrabold tracking-tight whitespace-nowrap">
              <span className="text-text">Nammooru</span>
              <span className="text-brand ml-0.5">Bus</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-2 p-1 rounded-pill border border-line shadow-xs">
          {navLinks.map((item) => {
            const active = location.pathname.startsWith(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition ${active
                  ? 'on-brand shadow-soft'
                  : 'text-muted hover:text-text hover:bg-surface'
                  }`}
                style={
                  active
                    ? { background: 'var(--gradient-brand)', color: 'var(--on-brand)' }
                    : { color: 'var(--muted)' }
                }
              >
                <Icon
                  size={16}
                  strokeWidth={2}
                  style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}
                />
                <span style={{ color: active ? 'var(--on-brand)' : 'var(--muted)' }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Right side actions (Notification bell, Live pill, Theme, Language on Desktop, Profile) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Live Service Alerts Notification Bell */}
          <Link
            to="/alerts"
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface border border-line text-muted hover:text-text flex items-center justify-center transition active:scale-95 shadow-xs shrink-0"
            title="Live Service Alerts"
          >
            <Bell className="w-4 h-4 text-text" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-navy-900 text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </Link>

          {/* Live Bus Count Pill */}
          <Link
            to="/live"
            className="flex items-center gap-1.5 text-xs font-bold px-2 sm:px-2.5 py-1 rounded-pill transition-transform active:scale-95 shadow-xs shrink-0"
            style={
              isReconnecting
                ? { backgroundColor: 'var(--sky-100)', color: 'var(--color-warning)' }
                : { backgroundColor: 'var(--amber-500)', color: 'var(--navy-900)' }
            }
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-900 shrink-0" />
                <span className="hidden min-[400px]:inline">Reconnecting</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-navy-900 animate-pulse shrink-0" />
                <span>{liveCount}</span>
                <span className="hidden min-[360px]:inline">live</span>
              </>
            )}
          </Link>

          {/* Language toggle: DESKTOP ONLY (hidden on mobile under 768px) */}
          <div className="hidden md:block">
            <LanguageToggle />
          </div>

          {/* Theme toggle (44x44 icon button) */}
          <ThemeToggle />

          {/* Profile avatar (36px circle) */}
          {user ? (
            <Link
              to="/profile"
              className="rounded-full w-9 h-9 bg-sky-100 dark:bg-surface-2 border-2 border-cobalt-500 text-cobalt-500 flex items-center justify-center transition active:scale-95 shadow-xs shrink-0"
              title={user.email}
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full w-9 h-9 bg-surface border border-line text-muted hover:text-cobalt-500 flex items-center justify-center transition active:scale-95 shadow-xs shrink-0"
              title={t('auth.sign_in')}
            >
              <LogIn className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* 2. Toast Notifications Container */}
      <ToastContainer />

      {/* 3. Main Content Area */}
      <div
        className={`flex-1 w-full flex flex-col md:flex-row ${
          isSearchPage ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
        }`}
        style={{
          paddingTop: 'calc(3.5rem + var(--safe-top, 0px))',
        }}
      >
        {/* Left Column (Content) */}
        <main
          className={`flex-1 min-h-0 md:w-[460px] md:max-w-[460px] md:flex-none transition-all ${
            isSearchPage
              ? 'h-full overflow-hidden flex flex-col p-0 bg-surface md:border-r md:border-line md:m-3 md:rounded-[28px] md:shadow-soft'
              : 'min-h-screen pb-24 md:pb-8 px-4 md:px-5 overflow-y-auto md:border-r md:border-line md:bg-surface md:m-3 md:rounded-[28px] md:shadow-soft'
          }`}
          style={
            isSearchPage || isJourneyPage
              ? { paddingBottom: 0 }
              : { paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }
          }
        >
          <div
            key={location.pathname}
            className={`page-enter ${
              isSearchPage
                ? 'flex-1 min-h-0 flex flex-col overflow-hidden max-w-lg mx-auto md:max-w-none w-full'
                : 'max-w-lg mx-auto md:max-w-none pt-2'
            }`}
          >
            <Outlet />
          </div>
        </main>

        {/* Right Column (Desktop Large Map View) */}
        <aside className="hidden md:block flex-1 h-[calc(100vh-64px)] sticky top-16 relative bg-surface overflow-hidden md:m-3 md:ml-0 md:rounded-[28px] md:shadow-soft border border-line">
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
