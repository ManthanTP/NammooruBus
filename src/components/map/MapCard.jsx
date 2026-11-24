import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Navigation, AlertCircle, X } from 'lucide-react'
import MapView from './MapView'
import { useLocationStore } from '@/store/locationStore'
import { useMapStore } from '@/store/mapStore'
import { GeolocationService } from '@/lib/location'
import { hapticTick } from '@/lib/platform'

/**
 * MapCard — mobile in-page map container with full-screen portal expand.
 * Radius 28, white border 3px, soft shadow.
 * Expand button (round white, top right), Locate me button (round, bottom right, cobalt icon).
 * When expanded: rendered via React Portal to document.body with body scroll lock,
 * history back support, and escape key listener.
 */
export default function MapCard({ height = 220, isSticky = false, title = 'Explore Map', className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollYRef = useRef(0)
  const { position, accuracy, start } = useLocationStore()
  const { setCenter, setView } = useMapStore()

  const handleLocateMe = async (e) => {
    if (e) e.stopPropagation()
    hapticTick()
    const pLat = Number(position?.lat)
    const pLng = Number(position?.lng)
    if (!Number.isNaN(pLat) && !Number.isNaN(pLng) && Number.isFinite(pLat) && Number.isFinite(pLng)) {
      const centerFn = setView || setCenter
      if (typeof centerFn === 'function') {
        centerFn([pLat, pLng], 15)
      }
    } else {
      start()
      try {
        const freshPos = await GeolocationService.getCurrentPosition()
        if (freshPos?.coords) {
          const centerFn = setView || setCenter
          if (typeof centerFn === 'function') {
            centerFn([freshPos.coords.latitude, freshPos.coords.longitude], 15)
          }
        }
      } catch (_) { }
    }
  }

  const isApproximate = accuracy && accuracy > 100

  const handleOpen = () => {
    scrollYRef.current = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    setIsExpanded(true)
    window.history.pushState({ nbMapExpanded: true }, '')
  }

  const closeExpanded = () => {
    setIsExpanded(false)
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    window.scrollTo(0, scrollYRef.current)
  }

  const handleClose = () => {
    if (window.history.state?.nbMapExpanded) {
      window.history.back()
    } else {
      closeExpanded()
    }
  }

  // Listen for history popstate & Escape key
  useEffect(() => {
    if (!isExpanded) return

    const handlePopState = () => {
      closeExpanded()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isExpanded])

  // Invalidate map size 50ms after expand/collapse
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 50)
    return () => clearTimeout(timer)
  }, [isExpanded])

  return (
    <>
      {/* 1. Normal In-Page Map Card (Mobile Only) */}
      <div
        className={`w-full rounded-[28px] border-[3px] border-surface overflow-hidden relative bg-surface shrink-0 md:hidden transition-all ${isSticky ? 'sticky top-16 z-20' : ''
          } ${className}`}
        style={{
          height,
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        {/* Do NOT render in-page map or controls when expanded so Leaflet doesn't duplicate instances */}
        {!isExpanded ? (
          <>
            <MapView />

            {/* Top-Right: Expand button */}
            <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 pointer-events-auto">
              {isApproximate && (
                <div className="bg-surface/95 backdrop-blur-md px-2.5 py-1 rounded-pill border border-amber-500/30 text-[10px] font-bold text-amber-600 flex items-center gap-1 shadow-xs">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Approximate</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleOpen}
                className="w-10 h-10 rounded-full bg-surface border border-line shadow-soft text-ink-950 flex items-center justify-center hover:text-cobalt-500 active:scale-95 transition"
                title="Expand map"
                aria-label="Expand map"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom-Right: Locate Me button */}
            <div className="absolute bottom-3 right-3 z-[400] pointer-events-auto">
              <button
                type="button"
                onClick={handleLocateMe}
                className="w-10 h-10 rounded-full bg-surface border border-line shadow-soft text-cobalt-500 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-surface-2 active:scale-95 transition"
                title="Locate me"
                aria-label="Locate me"
              >
                <Navigation className="w-4 h-4 fill-cobalt-500/10 text-cobalt-500" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-surface-2 flex items-center justify-center text-xs font-bold text-muted">
            Map expanded
          </div>
        )}
      </div>

      {/* 2. Full-Screen Modal Overlay when Expanded (via React Portal to document.body) */}
      {isExpanded &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 w-[100vw] h-[100dvh] z-[3000] bg-bg flex flex-col overflow-hidden animate-fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100dvh',
            }}
          >
            <div className="relative w-full h-full flex-1">
              <MapView />

              {/* Top Controls Overlay */}
              <div
                className="absolute top-0 left-0 right-0 z-[400] px-3.5 py-3 pointer-events-none flex items-center justify-between"
                style={{ paddingTop: 'max(12px, var(--safe-top, 0px))' }}
              >
                {/* Title Chip */}
                <div className="bg-surface/95 backdrop-blur-md px-3.5 py-1.5 rounded-pill border border-line shadow-soft pointer-events-auto flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cobalt-500 animate-pulse" />
                  <span className="font-heading font-extrabold text-xs text-ink-950">
                    {title}
                  </span>
                </div>

                {/* Close Button: 44x44 min tap target with Close icon + label */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] px-3.5 bg-surface border border-line shadow-soft text-ink-950 rounded-pill font-heading font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition pointer-events-auto hover:text-cobalt-500"
                  aria-label="Close full map"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              {/* Bottom-Right Locate Button */}
              <div
                className="absolute bottom-6 right-4 z-[400] pointer-events-auto flex flex-col gap-2"
                style={{ paddingBottom: 'max(12px, var(--safe-bottom, 0px))' }}
              >
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="w-11 h-11 rounded-full bg-surface border border-line shadow-soft text-cobalt-500 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-surface-2 active:scale-95 transition"
                  title="Locate me"
                  aria-label="Locate me"
                >
                  <Navigation className="w-5 h-5 fill-cobalt-500/15 text-cobalt-500" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
