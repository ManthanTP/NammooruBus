/**
 * Live ETA and Next-Stop Calculations per PRD 8.2.
 *
 * - Projects bus position on route polyline.
 * - Computes remaining distance in the travel direction.
 * - Moving average speed clamped to 8 - 30 km/h (default 17 km/h).
 * - ETA minutes = (remaining km / speed * 60) + (0.5 min * remaining stops), clamped to minimum 1 min.
 */

import { haversine, projectPointOnPolyline } from './geo'

export const MIN_SPEED_KMH = 8
export const MAX_SPEED_KMH = 30
export const DEFAULT_SPEED_KMH = 17

/**
 * Calculates moving average speed clamped between 8 and 30 km/h.
 * @param {Array<number|{speed_kmh: number}>} speedHistory
 * @param {number} [fallbackSpeed=17]
 * @returns {number}
 */
export function computeMovingAverageSpeed(speedHistory = [], fallbackSpeed = DEFAULT_SPEED_KMH) {
  const validSpeeds = speedHistory
    .map((s) => (typeof s === 'number' ? s : s?.speed_kmh))
    .filter((s) => typeof s === 'number' && !isNaN(s) && s > 0)

  if (validSpeeds.length === 0) return fallbackSpeed

  const avg = validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length
  return Math.max(MIN_SPEED_KMH, Math.min(MAX_SPEED_KMH, Math.round(avg * 10) / 10))
}

/**
 * Normalizes stops along travel direction.
 * Direction 0: seq ascending (first to last).
 * Direction 1: seq descending (last to first).
 * @param {Array<Object>} routeStops
 * @param {number} direction
 * @returns {Array<Object>}
 */
export function getDirectedStops(routeStops = [], direction = 0) {
  const sorted = [...routeStops].sort((a, b) => a.seq - b.seq)
  return direction === 1 ? sorted.reverse() : sorted
}

/**
 * Detects the next stop and calculates remaining distance and ETA to a target stop.
 *
 * @param {Object} params
 * @param {{lat: number, lng: number}} params.busPosition
 * @param {Array<Object>} params.routeStops - Ordered route_stops with stop object ({lat, lng, ...})
 * @param {number} [params.direction=0] - 0 = forward, 1 = reverse
 * @param {string} [params.targetStopId] - Optional destination/passenger stop ID
 * @param {Array<number>} [params.speedHistory] - Recent speeds
 * @returns {{
 *   hasPassed: boolean,
 *   nextStop: Object|null,
 *   nextStopIndex: number,
 *   remainingKm: number,
 *   remainingStopsCount: number,
 *   etaMinutes: number|null,
 *   speedKmh: number,
 *   progressPercent: number
 * }}
 */
export function calculateBusEta({
  busPosition,
  routeStops = [],
  direction = 0,
  targetStopId,
  speedHistory = [],
}) {
  if (!busPosition || routeStops.length === 0) {
    return {
      hasPassed: false,
      nextStop: null,
      nextStopIndex: -1,
      remainingKm: 0,
      remainingStopsCount: 0,
      etaMinutes: null,
      speedKmh: DEFAULT_SPEED_KMH,
      progressPercent: 0,
    }
  }

  const directed = getDirectedStops(routeStops, direction)
  const polyline = directed.map((s) => ({
    lat: s.stop?.lat ?? s.lat,
    lng: s.stop?.lng ?? s.lng,
  }))

  // Project bus onto directed polyline
  const projection = projectPointOnPolyline(busPosition, polyline)
  const busKmAlong = projection.kmAlongRoute

  // Compute cumulative km to each stop along directed route
  let cumulativeDist = 0
  const stopDistances = [0]
  for (let i = 0; i < polyline.length - 1; i++) {
    cumulativeDist += haversine(
      polyline[i].lat,
      polyline[i].lng,
      polyline[i + 1].lat,
      polyline[i + 1].lng
    )
    stopDistances.push(cumulativeDist)
  }

  const totalRouteLengthKm = cumulativeDist || 1

  // Detect Next Stop: first stop where stop distance > bus projected distance (with 50m tolerance)
  let nextIdx = 0
  while (nextIdx < stopDistances.length - 1 && busKmAlong >= stopDistances[nextIdx] - 0.05) {
    nextIdx++
  }

  const nextStop = directed[nextIdx] || directed[directed.length - 1]

  // Overall route progress percentage (0 to 100%)
  const progressPercent = Math.min(100, Math.max(0, Math.round((busKmAlong / totalRouteLengthKm) * 100)))

  const speedKmh = computeMovingAverageSpeed(speedHistory)

  // Target Stop calculations
  if (targetStopId) {
    const targetIdx = directed.findIndex((s) => (s.stop?.id ?? s.stop_id ?? s.id) === targetStopId)

    if (targetIdx === -1) {
      return {
        hasPassed: false,
        nextStop,
        nextStopIndex: nextIdx,
        remainingKm: 0,
        remainingStopsCount: 0,
        etaMinutes: null,
        speedKmh,
        progressPercent,
      }
    }

    const targetKmAlong = stopDistances[targetIdx]

    // If bus is past target stop by more than 100 meters
    if (busKmAlong > targetKmAlong + 0.1) {
      return {
        hasPassed: true,
        nextStop,
        nextStopIndex: nextIdx,
        remainingKm: 0,
        remainingStopsCount: 0,
        etaMinutes: null,
        speedKmh,
        progressPercent,
      }
    }

    const remainingKm = Math.max(0, targetKmAlong - busKmAlong)
    const remainingStopsCount = Math.max(0, targetIdx - nextIdx)
    // ETA = km / speed * 60 + 0.5 min per remaining stop, min 1
    const rawMinutes = (remainingKm / speedKmh) * 60 + remainingStopsCount * 0.5
    const etaMinutes = Math.max(1, Math.round(rawMinutes))

    return {
      hasPassed: false,
      nextStop,
      nextStopIndex: nextIdx,
      remainingKm: Math.round(remainingKm * 10) / 10,
      remainingStopsCount,
      etaMinutes,
      speedKmh,
      progressPercent,
    }
  }

  // Next stop ETA if no target stop specified
  const distToNext = Math.max(0, stopDistances[nextIdx] - busKmAlong)
  const etaToNext = Math.max(1, Math.round((distToNext / speedKmh) * 60))

  return {
    hasPassed: false,
    nextStop,
    nextStopIndex: nextIdx,
    remainingKm: Math.round(distToNext * 10) / 10,
    remainingStopsCount: directed.length - 1 - nextIdx,
    etaMinutes: etaToNext,
    speedKmh,
    progressPercent,
  }
}
