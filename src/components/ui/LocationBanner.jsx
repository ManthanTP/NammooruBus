import { useState } from 'react'
import { MapPinOff, RefreshCw } from 'lucide-react'
import { useLocationStore } from '@/store/locationStore'
import LocationPermissionModal from './LocationPermissionModal'

export default function LocationBanner() {
  const { status, position, start } = useLocationStore()
  const [modalOpen, setModalOpen] = useState(false)

  if (status === 'asking' && !position) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2 bg-cobalt-tint/50 border border-cobalt/20 rounded-card text-xs text-cobalt font-medium animate-pulse">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Finding your location...</span>
        </div>
      </div>
    )
  }

  if (status === 'denied' || status === 'unavailable') {
    return (
      <>
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-warning/10 border border-warning/30 rounded-card text-xs text-text">
          <div className="flex items-center gap-2">
            <MapPinOff className="w-4 h-4 text-warning shrink-0" />
            <span className="font-medium text-[12px]">Turn on location to see where you are</span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-2.5 py-1 bg-brand text-white font-bold rounded-pill text-[11px] shadow-xs active:scale-95 transition cursor-pointer"
          >
            Enable
          </button>
        </div>
        <LocationPermissionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onPermissionGranted={() => start()}
        />
      </>
    )
  }

  return null
}
