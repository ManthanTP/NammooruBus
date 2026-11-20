/**
 * Road Routing & Geometry Service using OpenStreetMap / OSRM public APIs.
 * Supports:
 * - Driving route geometry following actual roads
 * - Walking route geometry (dotted line + distance/time label)
 * - Snap-to-road for stop placement in Admin
 * - 7-day localStorage caching
 * - 5-second timeout with graceful fallback
 */

import { haversine } from './geo'

const OSRM_DRIVING_URL = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_WALKING_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
const OSRM_NEAREST_URL = 'https://router.project-osrm.org/nearest/v1/driving'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const TIMEOUT_MS = 5000 // 5 seconds

// Simple hash for cache keying
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.time > CACHE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch (e) {
    return null
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        time: Date.now(),
        data,
      })
    )
  } catch (e) {
    // Quota exceeded or private browsing
  }
}

/**
 * Normalizes coordinate object or array to { lat, lng }
 */
function normalizeCoord(coord) {
  if (!coord) return null
  if (Array.isArray(coord) && coord.length >= 2) {
    const lat = Number(coord[0])
    const lng = Number(coord[1])
    return !Number.isNaN(lat) && !Number.isNaN(lng) ? { lat, lng } : null
  }
  if (coord.lat !== undefined && coord.lng !== undefined) {
    const lat = Number(coord.lat)
    const lng = Number(coord.lng)
    return !Number.isNaN(lat) && !Number.isNaN(lng) ? { lat, lng } : null
  }
  return null
}

/**
 * Fetches road-following geometry for a sequence of waypoints (stops in order).
 * @param {Array} waypoints - Array of [lat, lng] or { lat, lng }
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ polyline: Array<[number, number]>, distanceMeters: number, isApproximate: boolean }>}
 */
export async function fetchDrivingRoute(waypoints = [], { signal } = {}) {
  const valid = waypoints.map(normalizeCoord).filter(Boolean)
  if (valid.length < 2) {
    return {
      polyline: valid.map((p) => [p.lat, p.lng]),
      distanceMeters: 0,
      isApproximate: true,
    }
  }

  // Create coordinate string: lng,lat;lng,lat;...
  const coordStr = valid.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';')
  const cacheKey = `nb_route_drive_${hashString(coordStr)}`

  const cached = getCache(cacheKey)
  if (cached) {
    return { ...cached, isApproximate: false }
  }

  const url = `${OSRM_DRIVING_URL}/${coordStr}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: signal || controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`OSRM error: ${res.status}`)
    const json = await res.json()

    if (!json.routes || json.routes.length === 0) {
      throw new Error('No OSRM route found')
    }

    const route = json.routes[0]
    // OSRM returns coordinates as [lng, lat], convert to [lat, lng] for Leaflet
    const polyline = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng])
    const distanceMeters = Math.round(route.distance || 0)

    const result = { polyline, distanceMeters, isApproximate: false }
    setCache(cacheKey, result)
    return result
  } catch (err) {
    clearTimeout(timeoutId)
    // Fallback: draw straight lines joining waypoints
    const straightPolyline = valid.map((p) => [p.lat, p.lng])
    let totalKm = 0
    for (let i = 0; i < valid.length - 1; i++) {
      totalKm += haversine(valid[i].lat, valid[i].lng, valid[i + 1].lat, valid[i + 1].lng)
    }
    return {
      polyline: straightPolyline,
      distanceMeters: Math.round(totalKm * 1000),
      isApproximate: true,
    }
  }
}

/**
 * Fetches walking geometry between two points.
 * @param {Object|Array} from
 * @param {Object|Array} to
 * @param {Object} [options]
 * @returns {Promise<{ polyline: Array<[number, number]>, distanceMeters: number, walkMinutes: number, isApproximate: boolean, midpoint: [number, number] }>}
 */
export async function fetchWalkingRoute(from, to, { signal } = {}) {
  const p1 = normalizeCoord(from)
  const p2 = normalizeCoord(to)

  if (!p1 || !p2) {
    return null
  }

  const straightDistKm = haversine(p1.lat, p1.lng, p2.lat, p2.lng)
  const straightDistMeters = Math.round(straightDistKm * 1000)
  const defaultWalkMin = Math.max(1, Math.round(straightDistMeters / 80))
  const straightMidpoint = [(p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2]

  const coordStr = `${p1.lng.toFixed(6)},${p1.lat.toFixed(6)};${p2.lng.toFixed(6)},${p2.lat.toFixed(6)}`
  const cacheKey = `nb_route_walk_${hashString(coordStr)}`

  const cached = getCache(cacheKey)
  if (cached) {
    return { ...cached, isApproximate: false }
  }

  const url = `${OSRM_WALKING_URL}/${coordStr}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: signal || controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`OSRM foot error: ${res.status}`)
    const json = await res.json()

    if (!json.routes || json.routes.length === 0) {
      throw new Error('No OSRM walking route found')
    }

    const route = json.routes[0]
    const polyline = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng])
    const distanceMeters = Math.round(route.distance || straightDistMeters)
    const walkMinutes = Math.max(1, Math.round(distanceMeters / 80)) // 80 m/min

    // Find middle coordinate for the walk badge
    const midIdx = Math.floor(polyline.length / 2)
    const midpoint = polyline[midIdx] || straightMidpoint

    const result = {
      polyline,
      distanceMeters,
      walkMinutes,
      midpoint,
      isApproximate: false,
    }

    setCache(cacheKey, result)
    return result
  } catch (err) {
    clearTimeout(timeoutId)
    return {
      polyline: [
        [p1.lat, p1.lng],
        [p2.lat, p2.lng],
      ],
      distanceMeters: straightDistMeters,
      walkMinutes: defaultWalkMin,
      midpoint: straightMidpoint,
      isApproximate: true,
    }
  }
}

/**
 * Snaps a coordinate to the nearest road using OSRM nearest API.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ lat: number, lng: number, name: string, distanceMeters: number } | null>}
 */
export async function snapToRoad(lat, lng) {
  const pLat = Number(lat)
  const pLng = Number(lng)
  if (Number.isNaN(pLat) || Number.isNaN(pLng)) return null

  const url = `${OSRM_NEAREST_URL}/${pLng.toFixed(6)},${pLat.toFixed(6)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`OSRM nearest status: ${res.status}`)
    const json = await res.json()

    if (json.waypoints && json.waypoints.length > 0) {
      const wp = json.waypoints[0]
      return {
        lat: wp.location[1],
        lng: wp.location[0],
        name: wp.name || '',
        distanceMeters: Math.round(wp.distance || 0),
      }
    }
    return null
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('Failed to snap to road:', err)
    return null
  }
}
