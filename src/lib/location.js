/**
 * Core Geolocation service abstraction.
 * Seamlessly switches between Capacitor Geolocation on Android and navigator.geolocation on Web.
 * Features immediate two-phase acquisition (GPS high-accuracy with instant low-accuracy fallback
 * for laptops, desktops, and indoor phones where GPS signals cannot be acquired).
 */

import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

let nativeWatchId = null
let webWatchId = null

export const GeolocationService = {
  isSupported: () => {
    if (Capacitor.isNativePlatform()) return true
    return typeof navigator !== 'undefined' && 'geolocation' in navigator
  },

  checkPermission: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Geolocation.checkPermissions()
        return status.location === 'granted'
      } catch (_) {
        return false
      }
    }
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const res = await navigator.permissions.query({ name: 'geolocation' })
        return res.state === 'granted'
      } catch (_) {
        return null
      }
    }
    return null
  },

  requestPermission: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        let status = await Geolocation.checkPermissions()
        if (status.location !== 'granted') {
          status = await Geolocation.requestPermissions({ permissions: ['location'] })
        }
        return status.location === 'granted'
      } catch (err) {
        console.warn('Native permission request error:', err)
        return false
      }
    }

    // On Web: calling navigator.geolocation prompts the browser's native location permission dialog
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        resolve(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (err) => {
          if (err.code === 1) resolve(false) // Permission denied by user
          else resolve(true) // Granted, even if fix timed out
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      )
    })
  },

  getCurrentPosition: async (options = {}) => {
    const isNative = Capacitor.isNativePlatform()

    // Phase 1: High accuracy attempt
    try {
      if (isNative) {
        return await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 10000,
          ...options,
        })
      } else {
        return await new Promise((resolve, reject) => {
          if (!('geolocation' in navigator)) {
            reject(new Error('Geolocation is not supported by your browser'))
            return
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 10000,
            ...options,
          })
        })
      }
    } catch (err) {
      // If user denied permission explicitly, do not retry
      if (err.code === 1 || err.message?.toLowerCase().includes('denied')) {
        throw err
      }

      // Phase 2 Fallback: Low accuracy (Wi-Fi / Cell tower / IP)
      // Indispensable for desktop browsers, laptops without GPS, and indoor phone testing
      try {
        if (isNative) {
          return await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          })
        } else {
          return await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            })
          })
        }
      } catch (fallbackErr) {
        throw fallbackErr
      }
    }
  },

  startWatch: (onSuccess, onError, options = {}) => {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      if (nativeWatchId !== null) {
        Geolocation.clearWatch({ id: nativeWatchId }).catch(() => { })
        nativeWatchId = null
      }

      Geolocation.watchPosition(
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: 15000,
          maximumAge: 10000,
          ...options,
        },
        (pos, err) => {
          if (err) {
            // Auto fallback to low accuracy if high accuracy watch times out
            if (err.code === 3 && options.enableHighAccuracy !== false) {
              GeolocationService.startWatch(onSuccess, onError, { enableHighAccuracy: false })
              return
            }
            if (onError) onError(err)
          } else if (pos) {
            if (onSuccess) onSuccess(pos)
          }
        }
      ).then((id) => {
        nativeWatchId = id
      }).catch((e) => {
        if (onError) onError(e)
      })

      return 'native_watch'
    }

    if (!GeolocationService.isSupported()) {
      if (onError) onError(new Error('Geolocation is not supported by your browser'))
      return null
    }

    if (webWatchId !== null) {
      navigator.geolocation.clearWatch(webWatchId)
      webWatchId = null
    }

    try {
      webWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (onSuccess) onSuccess(pos)
        },
        (err) => {
          // Auto fallback to low accuracy if high accuracy watch times out
          if (err.code === 3 && options.enableHighAccuracy !== false) {
            GeolocationService.startWatch(onSuccess, onError, { enableHighAccuracy: false })
            return
          }
          if (onError) onError(err)
        },
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: 15000,
          maximumAge: 10000,
          ...options,
        }
      )
      return webWatchId
    } catch (e) {
      if (onError) onError(e)
      return null
    }
  },

  clearWatch: () => {
    const isNative = Capacitor.isNativePlatform()
    if (isNative && nativeWatchId !== null) {
      Geolocation.clearWatch({ id: nativeWatchId }).catch(() => { })
      nativeWatchId = null
    }
    if (webWatchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(webWatchId)
      webWatchId = null
    }
  },
}
