/**
 * Core Geolocation service abstraction.
 * Seamlessly switches between Capacitor Geolocation on Android and navigator.geolocation on Web.
 */

import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

const isNative = Capacitor.isNativePlatform()
let nativeWatchId = null
let webWatchId = null

export const GeolocationService = {
  isSupported: () => {
    if (isNative) return true
    return typeof navigator !== 'undefined' && 'geolocation' in navigator
  },

  checkPermission: async () => {
    if (isNative) {
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
    if (isNative) {
      try {
        const status = await Geolocation.requestPermissions({ permissions: ['location'] })
        return status.location === 'granted'
      } catch (err) {
        console.warn('Native permission request error:', err)
        return false
      }
    }
    return true
  },

  getCurrentPosition: async (options = {}) => {
    if (isNative) {
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
          ...options,
        })
        return pos
      } catch (err) {
        throw err
      }
    }

    return new Promise((resolve, reject) => {
      if (!GeolocationService.isSupported()) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
          ...options,
        }
      )
    })
  },

  startWatch: (onSuccess, onError, options = {}) => {
    if (isNative) {
      if (nativeWatchId !== null) {
        Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {})
        nativeWatchId = null
      }

      Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
          ...options,
        },
        (pos, err) => {
          if (err) {
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
          if (onError) onError(err)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
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
    if (isNative && nativeWatchId !== null) {
      Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {})
      nativeWatchId = null
    }
    if (webWatchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(webWatchId)
      webWatchId = null
    }
  },
}
