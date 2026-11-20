import { useState } from 'react'
import { Maximize2, Minimize2, Navigation, AlertCircle } from 'lucide-react'
import MapView from './MapView'
import { useLocationStore } from '@/store/locationStore'
import { useMapStore } from '@/store/mapStore'

export default function MapCard({ height = 220, isSticky = false, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { position, status, accuracy, start } = useLocationStore()
  const { setCenter, setView } = useMapStore()

  const handleLocateMe = (e) => {
    e.stopPropagation()
    if (position) {
      const centerFn = setView || setCenter
      if (typeof centerFn === 'function') {
        centerFn([position.lat, position.lng], 15)
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
        className={`w-full rounded-[24px] border border-line overflow-hidden relative shadow-soft bg-surface shrink-0 md:hidden transition-all ${
          isSticky ? 'sticky top-16 z-20' : ''
        } ${className}`}
        style={{ height }}
      >
        <MapView />

        {/* Top-Right Action Controls (Locate me + Expand) */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5 pointer-events-auto">
          {/* Approximate Accuracy Pill */}
          {isApproximate && (
            <div className="bg-surface/90 backdrop-blur-md px-2 py-0.5 rounded-pill border border-warning/40 text-[10px] font-semibold text-warning flex items-center gap-1 shadow-xs">
              <AlertCircle className="w-3 h-3" />
              <span>Approximate</span>
            </div>
          )}

          {/* Locate Me */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-soft text-ink flex items-center justify-center hover:text-cobalt active:scale-95 transition"
            title="Locate me"
          >
            <Navigation className={`w-4 h-4 ${position ? 'text-cobalt' : 'text-text-secondary'}`} />
          </button>

          {/* Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-soft text-ink flex items-center justify-center hover:text-cobalt active:scale-95 transition"
            title="Expand map"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Full-Screen Modal Overlay when Expanded */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-surface flex flex-col md:hidden">
          <header className="p-3 bg-surface/95 backdrop-blur-md border-b border-line flex items-center justify-between shrink-0 z-10">
            <span className="font-extrabold text-sm text-ink font-heading">Full Map</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                className="w-8 h-8 rounded-full bg-page border border-line shadow-xs text-cobalt flex items-center justify-center active:scale-95"
                title="Locate me"
              >
                <Navigation className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-full bg-page border border-line shadow-xs text-ink flex items-center justify-center active:scale-95"
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
