import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bus, Radio, User, LogIn, RefreshCw } from 'lucide-react'
import MapView from '@/components/map/MapView'
import BottomSheet from '@/components/ui/BottomSheet'
import FloatingTabBar from '@/components/ui/FloatingTabBar'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { ToastContainer } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { useLiveStore } from '@/store/liveStore'

export default function PassengerLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuthStore()
  const { subscribe, unsubscribe, isReconnecting, trips, getActiveCount } = useLiveStore()

  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])

  const liveCount = getActiveCount()

  // Full-screen overlay routes like /search take over the full screen
  const isSearchPage = location.pathname === '/search'

  return (
    <div className="relative w-full h-screen overflow-hidden bg-page font-body select-none">
      {/* 1. Persistent Map Layer (Behind Everything) */}
      <MapView />

      {/* 2. Floating Top Bar */}
      <header className="fixed top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-pill border border-line shadow-soft">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cobalt text-white flex items-center justify-center shadow-xs">
              <Bus className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xs text-ink tracking-tight font-heading">
              {t('app.name')}
            </span>
          </Link>

          {/* Live Bus Count Indicator */}
          <div className="h-4 w-[1px] bg-line mx-0.5" />
          <Link
            to="/live"
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-pill transition-colors ${
              isReconnecting
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

        <div className="flex items-center gap-2 pointer-events-auto">
          <LanguageToggle />
          {user ? (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-soft text-cobalt flex items-center justify-center hover:border-cobalt transition"
              title={user.email}
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-soft text-ink flex items-center justify-center hover:border-cobalt transition"
              title={t('auth.login')}
            >
              <LogIn className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* 3. Toast Notifications */}
      <ToastContainer />

      {/* 4. Draggable Bottom Sheet or Full Screen Overlay */}
      {isSearchPage ? (
        <div className="fixed inset-0 z-40 bg-surface flex flex-col">
          <Outlet />
        </div>
      ) : (
        <BottomSheet initialSnap={1}>
          <Outlet />
        </BottomSheet>
      )}

      {/* 5. Floating Bottom Navigation Bar */}
      {!isSearchPage && <FloatingTabBar />}
    </div>
  )
}
