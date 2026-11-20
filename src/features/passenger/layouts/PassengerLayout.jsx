import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bus, User, LogIn, RefreshCw } from 'lucide-react'
import MapView from '@/components/map/MapView'
import FloatingTabBar from '@/components/ui/FloatingTabBar'
import LanguageToggle from '@/components/ui/LanguageToggle'
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

  return (
    <div className="relative w-full min-h-screen bg-page font-body text-ink flex flex-col md:flex-row overflow-x-hidden">
      {/* 1. Global Floating Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cobalt text-white flex items-center justify-center shadow-xs">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-ink tracking-tight font-heading block leading-none">
                {t('app.name')}
              </span>
              <span className="text-[10px] text-text-secondary leading-none hidden sm:inline">
                {t('app.tagline')}
              </span>
            </div>
          </Link>

          {/* Live Bus Count Indicator */}
          <div className="h-4 w-[1px] bg-line mx-1" />
          <Link
            to="/live"
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-pill transition-colors ${isReconnecting
              ? 'text-warning bg-warning/15'
              : liveCount > 0
                ? 'text-success bg-success/15'
                : 'text-text-secondary bg-page'
              }`}
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-warning" />
                <span>Reconnecting</span>
              </>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${liveCount > 0 ? 'bg-success animate-pulse' : 'bg-text-secondary'}`} />
                <span>{liveCount} live</span>
              </>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          {user ? (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full bg-surface border border-line shadow-xs text-cobalt flex items-center justify-center hover:border-cobalt transition"
              title={user.email}
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-8 h-8 rounded-full bg-surface border border-line shadow-xs text-ink flex items-center justify-center hover:border-cobalt transition"
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
      {/* On Mobile: Normal scrolling container with map card inside screens */}
      {/* On Desktop: Left column (w-[440px]) scrolling content + Right column (flex-1) full-height map */}
      <div className="flex-1 w-full flex flex-col md:flex-row min-h-screen">
        {/* Left Column (Content) */}
        <main
          className={`flex-1 md:w-[440px] md:max-w-[440px] md:flex-none min-h-screen pt-16 pb-24 px-4 overflow-y-auto md:border-r md:border-line md:bg-page transition-all ${isSearchPage ? 'bg-surface' : ''
            }`}
        >
          <div className="max-w-lg mx-auto md:max-w-none">
            <Outlet />
          </div>
        </main>

        {/* Right Column (Desktop Large Map View) */}
        <aside className="hidden md:block flex-1 h-screen sticky top-0 relative bg-surface overflow-hidden">
          <MapView />
        </aside>
      </div>

      {/* 4. Bottom Tab Bar (Explore, Live, Nearby, Routes, Saved) */}
      {!isSearchPage && <FloatingTabBar />}
    </div>
  )
}
