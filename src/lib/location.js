/**
 * Core Geolocation service abstraction.
 * Wraps navigator.geolocation for web; prepared for Capacitor Geolocation swap in Phase 6.
 */

let watchId = null

export const GeolocationService = {
  isSupported: () => typeof navigator !== 'undefined' && 'geolocation' in navigator,

  getCurrentPosition: (options = {}) => {
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
    if (!GeolocationService.isSupported()) {
      if (onError) onError(new Error('Geolocation is not supported by your browser'))
      return null
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }

    try {
      watchId = navigator.geolocation.watchPosition(
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
      return watchId
    } catch (e) {
      if (onError) onError(e)
      return null
    }
  },

  clearWatch: () => {
    if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  },
}
