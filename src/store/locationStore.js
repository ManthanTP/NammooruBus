import { create } from 'zustand'
import { Capacitor } from '@capacitor/core'
import { GeolocationService } from '@/lib/location'

export const useLocationStore = create((set, get) => ({
  position: null, // { lat: number, lng: number }
  accuracy: null, // in meters
  heading: null,
  speed: null,
  status: 'idle', // 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable'
  lastUpdated: null,
  errorMessage: null,

  start: async () => {
    if (!GeolocationService.isSupported()) {
      set({ status: 'unavailable', errorMessage: 'Geolocation not supported' })
      return
    }

    if (get().status === 'asking') return

    // On native Android, proactively request runtime permission dialog if not yet granted
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPermission = await GeolocationService.checkPermission()
        if (!hasPermission) {
          const granted = await GeolocationService.requestPermission()
          if (!granted) {
            set({ status: 'denied', errorMessage: 'Location permission denied' })
            return
          }
        }
      } catch (_) { }
    }

    set({ status: 'asking', errorMessage: null })

    // Step 1: Immediate Position Fix (with automatic high -> low accuracy fallback)
    GeolocationService.getCurrentPosition()
      .then((pos) => {
        if (pos?.coords) {
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
        }
      })
      .catch((err) => {
        if (err.code === 1 || err.message?.toLowerCase().includes('denied')) {
          set({ status: 'denied', errorMessage: err.message || 'Location permission denied' })
        }
      })

    // Step 2: Continuous Watch (with automatic fallback to low accuracy if GPS times out)
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
        // If we already have a valid position, keep it; do not set unavailable on transient watch glitches
        if (get().position) return

        let status = 'unavailable'
        if (err.code === 1 || err.message?.toLowerCase().includes('denied')) {
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
