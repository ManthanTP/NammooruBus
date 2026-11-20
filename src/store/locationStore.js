import { create } from 'zustand'
import { GeolocationService } from '@/lib/location'

export const useLocationStore = create((set, get) => ({
  position: null, // { lat: number, lng: number }
  accuracy: null, // in meters
  heading: null,
  speed: null,
  status: 'idle', // 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable'
  lastUpdated: null,
  errorMessage: null,

  start: () => {
    if (!GeolocationService.isSupported()) {
      set({ status: 'unavailable', errorMessage: 'Geolocation not supported' })
      return
    }

    if (get().status === 'asking') return

    set({ status: 'asking', errorMessage: null })

    GeolocationService.startWatch(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords
        set({
          position: { lat: latitude, lng: longitude },
          accuracy,
          heading,
          speed,
          status: 'granted',
          lastUpdated: Date.now(),
          errorMessage: null,
        })
      },
      (err) => {
        let status = 'unavailable'
        if (err.code === 1) { // PERMISSION_DENIED
          status = 'denied'
        }
        set({
          status,
          errorMessage: err.message || 'Unable to retrieve location',
        })
      }
    )
  },

  stop: () => {
    GeolocationService.clearWatch()
    set({ status: 'idle' })
  },
}))
