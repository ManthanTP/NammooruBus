import { useState } from 'react'
import { Maximize2, Minimize2, Navigation, AlertCircle } from 'lucide-react'
import MapView from './MapView'
import { useLocationStore } from '@/store/locationStore'
import { useMapStore } from '@/store/mapStore'

/**
 * MapCard — mobile in-page map container.
 * Radius 28, white border 3px, soft shadow,
 * Expand button (round white, top right), Locate me button (round, bottom right, cobalt icon).
 */
export default function MapCard({ height = 220, isSticky = false, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { position, accuracy, start } = useLocationStore()
  const { setCenter, setView } = useMapStore()

  const handleLocateMe = (e) => {
    e.stopPropagation()
    const pLat = Number(position?.lat)
    const pLng = Number(position?.lng)
    if (!Number.isNaN(pLat) && !Number.isNaN(pLng) && Number.isFinite(pLat) && Number.isFinite(pLng)) {
      const centerFn = setView || setCenter
      if (typeof centerFn === 'function') {
        centerFn([pLat, pLng], 15)
      }
    } else {
      start()
    }
  }

  const isApproximate = accuracy && accuracy > 100

  return (
    <>
      {/* 1. Normal In-Page Map Card (Mobile Only) */}
      <div
        className={`w-full rounded-[28px] border-[3px] border-white overflow-hidden relative bg-white shrink-0 md:hidden transition-all ${isSticky ? 'sticky top-16 z-20' : ''
          } ${className}`}
        style={{
          height,
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <MapView />

        {/* Top-Right: Expand button */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 pointer-events-auto">
          {isApproximate && (
            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-pill border border-amber-500/30 text-[10px] font-bold text-amber-600 flex items-center gap-1 shadow-xs">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Approximate</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 rounded-full bg-white border border-line shadow-soft text-ink-950 flex items-center justify-center hover:text-cobalt-500 active:scale-95 transition"
            title="Expand map"
            aria-label="Expand map"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom-Right: Locate Me button (round white button with cobalt icon) */}
        <div className="absolute bottom-3 right-3 z-[400] pointer-events-auto">
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-10 h-10 rounded-full bg-white border border-line shadow-soft text-cobalt-500 flex items-center justify-center hover:bg-sky-50 active:scale-95 transition"
            title="Locate me"
            aria-label="Locate me"
          >
            <Navigation className="w-4 h-4 fill-cobalt-500/10 text-cobalt-500" />
          </button>
        </div>
      </div>

      {/* 2. Full-Screen Modal Overlay when Expanded */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
          <header className="p-3 bg-white/95 backdrop-blur-md border-b border-line flex items-center justify-between shrink-0 z-10">
            <span className="font-heading font-extrabold text-sm text-ink-950">Full Map</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                className="w-9 h-9 rounded-full bg-sky-50 border border-line text-cobalt-500 flex items-center justify-center active:scale-95 shadow-xs"
                title="Locate me"
              >
                <Navigation className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-9 h-9 rounded-full bg-sky-50 border border-line text-ink-950 flex items-center justify-center active:scale-95 shadow-xs"
                title="Close full map"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </header>
          <div className="flex-1 relative w-full h-full">
            <MapView />
          </div>
        </div>
      )}
    </>
  )
}
