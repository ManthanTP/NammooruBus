/**
 * GPS Tracking service for drivers per PRD 6.2 and 9.
 *
 * Uses navigator.geolocation.watchPosition with high accuracy.
 * Throttles upserts to Supabase bus_positions to once every 5 seconds.
 * Implements Screen Wake Lock API to prevent device sleep.
 * Designed behind a modular interface so Android Capacitor can swap implementation in Phase 6.
 */

import { supabase } from './supabase'

const THROTTLE_MS = 5000 // 5 seconds per PRD

let watchId = null
let wakeLock = null
let lastUpsertTime = 0
let pendingPosition = null
let isUpserting = false
let currentTripId = null
let statusCallback = null

/**
 * Requests Screen Wake Lock if supported.
 */
async function acquireWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        wakeLock = null
      })
    } catch (err) {
      console.warn('Wake Lock request failed:', err.message)
    }
  }
}

/**
 * Releases Screen Wake Lock.
 */
export function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {})
    wakeLock = null
  }
}

/**
 * Upserts a single GPS position row into bus_positions.
 */
async function upsertPosition(tripId, pos) {
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
    speed_kmh: pos.coords.speed !== null && pos.coords.speed !== undefined
      ? Math.max(0, Math.round(pos.coords.speed * 3.6)) // convert m/s to km/h
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
    // If a position arrived during upsert, process the latest one
    if (pendingPosition) {
      const nextPos = pendingPosition
      pendingPosition = null
      upsertPosition(tripId, nextPos)
    }
  }
}

/**
 * Starts continuous GPS tracking for an active trip.
 *
 * @param {Object} params
 * @param {string} params.tripId
 * @param {Function} [params.onUpdate] - Called on each raw GPS fix
 * @param {Function} [params.onError] - Called on GPS error
 * @param {Function} [params.onStatusChange] - Called on network/connectivity status
 */
export function startTracking({ tripId, onUpdate, onError, onStatusChange }) {
  stopTracking()

  currentTripId = tripId
  statusCallback = onStatusChange
  lastUpsertTime = 0
  pendingPosition = null

  // 1. Acquire Wake Lock
  acquireWakeLock()

  // 2. Setup Visibility Change Warning
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      acquireWakeLock()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)

  if (!navigator.geolocation) {
    if (onError) onError(new Error('Geolocation is not supported by your browser.'))
    return
  }

  // 3. Start Geolocation Watch
  watchId = navigator.geolocation.watchPosition(
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
export function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  releaseWakeLock()
  currentTripId = null
  statusCallback = null
  pendingPosition = null
  isUpserting = false
}
