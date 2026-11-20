/**
 * Geographic calculations and polyline projection utilities.
 */

const EARTH_RADIUS_KM = 6371

/**
 * Calculates great-circle distance between two points on Earth using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const nLat1 = Number(lat1)
  const nLon1 = Number(lon1)
  const nLat2 = Number(lat2)
  const nLon2 = Number(lon2)

  if (
    Number.isNaN(nLat1) ||
    Number.isNaN(nLon1) ||
    Number.isNaN(nLat2) ||
    Number.isNaN(nLon2) ||
    !Number.isFinite(nLat1) ||
    !Number.isFinite(nLon1) ||
    !Number.isFinite(nLat2) ||
    !Number.isFinite(nLon2)
  ) {
    return 0
  }

  if (nLat1 === nLat2 && nLon1 === nLon2) return 0

  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(nLat2 - nLat1)
  const dLon = toRad(nLon2 - nLon1)
  const rLat1 = toRad(nLat1)
  const rLat2 = toRad(nLat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Projects a point onto a line segment [a, b].
 * Returns the closest point on segment and projection scalar t in [0, 1].
 */
export function projectPointOnSegment(p, a, b) {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat

  if (dx === 0 && dy === 0) {
    return { lat: a.lat, lng: a.lng, t: 0 }
  }

  // Linear projection on Euclidean approximation (suitable for city distances)
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy)))
  return {
    lat: a.lat + t * dy,
    lng: a.lng + t * dx,
    t,
  }
}

/**
 * Projects a point onto a polyline of { lat, lng } points.
 * Returns closest point, segment index, distance to polyline in km, and km along route.
 * @param {{lat: number, lng: number}} point
 * @param {Array<{lat: number, lng: number}>} polyline
 */
export function projectPointOnPolyline(point, polyline) {
  if (!polyline || polyline.length === 0) {
    return { point: null, segmentIndex: -1, distKm: Infinity, kmAlongRoute: 0 }
  }
  if (polyline.length === 1) {
    const d = haversine(point.lat, point.lng, polyline[0].lat, polyline[0].lng)
    return { point: polyline[0], segmentIndex: 0, distKm: d, kmAlongRoute: 0 }
  }

  let minDistance = Infinity
  let closestPoint = null
  let bestSegment = 0
  let kmBeforeBest = 0
  let cumulativeDist = 0

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i]
    const p2 = polyline[i + 1]
    const segLen = haversine(p1.lat, p1.lng, p2.lat, p2.lng)

    const projected = projectPointOnSegment(point, p1, p2)
    const dist = haversine(point.lat, point.lng, projected.lat, projected.lng)

    if (dist < minDistance) {
      minDistance = dist
      closestPoint = projected
      bestSegment = i
      kmBeforeBest = cumulativeDist + projected.t * segLen
    }

    cumulativeDist += segLen
  }

  return {
    point: closestPoint,
    segmentIndex: bestSegment,
    distKm: minDistance,
    kmAlongRoute: kmBeforeBest,
  }
}

/**
 * Calculates cumulative distance in km from route start up to stopIndex.
 * @param {Array<{dist_km: number}>} orderedRouteStops
 * @param {number} stopIndex
 * @returns {number}
 */
export function kmAlongRoute(orderedRouteStops, stopIndex) {
  if (!orderedRouteStops || stopIndex <= 0) return 0
  const limit = Math.min(stopIndex, orderedRouteStops.length - 1)
  let total = 0
  for (let i = 1; i <= limit; i++) {
    total += Number(orderedRouteStops[i].dist_km || 0)
  }
  return total
}
