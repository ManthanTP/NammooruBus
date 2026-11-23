/**
 * GPS Tracking service for drivers per PRD 6.2, 9 and Phase 6 native Android specs.
 *
 * Integrates KeepAwake and background foreground notification on native Android.
 * Throttles upserts to Supabase bus_positions to once every 5 seconds.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { supabase } from './supabase'
import { keepAwake, allowSleep, isNative } from './platform'

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation')

const THROTTLE_MS = 5000 // 5 seconds per PRD

let nativeWatcherId = null
let webWatchId = null
let wakeLock = null
let lastUpsertTime = 0
let pendingPosition = null
let isUpserting = false
let currentTripId = null
let statusCallback = null

/**
 * Requests Screen Wake Lock on web if supported.
 */
async function acquireWebWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        wakeLock = null
      })
    } catch (err) {
      console.warn('Web Wake Lock request failed:', err.message)
    }
  }
}

export function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => { })
    wakeLock = null
  }
}

/**
 * Upserts a single GPS position row into bus_positions.
 */
async function upsertPosition(tripId, pos) {
  if (!tripId || !pos?.coords) return

  if (isUpserting) {
    pendingPosition = pos
    return
  }

  isUpserting = true
  lastUpsertTime = Date.now()

  const payload = {
    trip_id: tripId,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    speed_kmh:
      pos.coords.speed !== null && pos.coords.speed !== undefined
        ? Math.max(0, Math.round(pos.coords.speed * 3.6))
        : null,
    heading: pos.coords.heading || null,
    updated_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase.from('bus_positions').upsert(payload, {
      onConflict: 'trip_id',
    })

    if (error) throw error

    if (statusCallback) {
      statusCallback({ status: 'online', position: payload })
    }
  } catch (err) {
    console.warn('GPS upsert failed, retaining latest position:', err)
    pendingPosition = pos
    if (statusCallback) {
      statusCallback({ status: 'reconnecting', error: err.message })
    }
  } finally {
    isUpserting = false
    if (pendingPosition) {
      const nextPos = pendingPosition
      pendingPosition = null
      upsertPosition(tripId, nextPos)
    }
  }
}

/**
 * Starts continuous GPS tracking for an active trip.
 */
export async function startTracking({ tripId, onUpdate, onError, onStatusChange }) {
  stopTracking()

  currentTripId = tripId
  statusCallback = onStatusChange
  lastUpsertTime = 0
  pendingPosition = null

  // 1. Keep Awake on active trip (Native KeepAwake + Web Wake Lock)
  if (isNative()) {
    await keepAwake()
  } else {
    acquireWebWakeLock()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') acquireWebWakeLock()
    })
  }

  // 2. Native Background Geolocation with foreground notification fallback
  if (isNative()) {
    let bgStarted = false
    try {
      if (BackgroundGeolocation?.addWatcher) {
        nativeWatcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Trip in progress',
            backgroundTitle: 'Sharing bus location',
            requestPermissions: true,
            stale: false,
            distanceFilter: 5,
          },
          (location, error) => {
            if (error) {
              if (onError) onError(error)
              return
            }
            if (!location) return

            const pos = {
              coords: {
                latitude: location.latitude,
                longitude: location.longitude,
                speed: location.speed,
                heading: location.bearing,
                accuracy: location.accuracy,
              },
              timestamp: location.time || Date.now(),
            }

            if (onUpdate) onUpdate(pos)
            const now = Date.now()
            if (now - lastUpsertTime >= THROTTLE_MS) {
              upsertPosition(tripId, pos)
            } else {
              pendingPosition = pos
            }
          }
        )
        bgStarted = true
      }
    } catch (e) {
      console.warn('BackgroundGeolocation plugin unavailable or failed, using Geolocation fallback:', e)
    }

    if (!bgStarted) {
      // Fallback: Capacitor Geolocation watchPosition + KeepAwake
      try {
        nativeWatcherId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          (pos, err) => {
            if (err) {
              if (onError) onError(err)
              return
            }
            if (!pos) return
            if (onUpdate) onUpdate(pos)
            const now = Date.now()
            if (now - lastUpsertTime >= THROTTLE_MS) {
              upsertPosition(tripId, pos)
            } else {
              pendingPosition = pos
            }
          }
        )
      } catch (err) {
        if (onError) onError(err)
      }
    }
    return
  }

  // 3. Web Geolocation Watch
  if (!navigator?.geolocation) {
    if (onError) onError(new Error('Geolocation is not supported by your browser.'))
    return
  }

  webWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (onUpdate) onUpdate(pos)
      const now = Date.now()
      if (now - lastUpsertTime >= THROTTLE_MS) {
        upsertPosition(tripId, pos)
      } else {
        pendingPosition = pos
      }
    },
    (err) => {
      console.warn('Geolocation watch error:', err)
      if (onError) onError(err)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  )
}

/**
 * Stops continuous GPS tracking.
 */
export async function stopTracking() {
  if (isNative()) {
    if (nativeWatcherId !== null) {
      try {
        if (BackgroundGeolocation?.removeWatcher) {
          await BackgroundGeolocation.removeWatcher({ id: nativeWatcherId })
        } else {
          await Geolocation.clearWatch({ id: nativeWatcherId })
        }
      } catch (_) {
        try { await Geolocation.clearWatch({ id: nativeWatcherId }) } catch (__) { }
      }
      nativeWatcherId = null
    }
    await allowSleep()
  } else {
    if (webWatchId !== null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(webWatchId)
      webWatchId = null
    }
    releaseWakeLock()
  }

  currentTripId = null
  statusCallback = null
  pendingPosition = null
  isUpserting = false
}
