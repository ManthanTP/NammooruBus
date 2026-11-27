/**
 * Pure client-side Route Finder algorithm per PRD 8.1.
 * Supports:
 * - Direct routes (forward & reverse on two_way routes)
 * - 1-transfer routes (with 6 min change buffer)
 * - Ranking: fastest, fewer changes, cheapest
 * - Deduplication & cap at 8 results
 */

import { calculateFare } from './fare'
import { calculateNextDeparture, getDayType } from './schedule'
import { haversine } from './geo'

const DEFAULT_WALK_MIN = 3
const TRANSFER_BUFFER_MIN = 6

/**
 * Normalizes route stops for a route into an ordered list with cumulative km and minutes.
 * Uses sum of route_stops dist_km between them; falls back to Haversine x 1.3 if dist_km is missing.
 */
function getRouteLegMetrics(routeStops, fromIdx, toIdx, stopsById = {}) {
  let distanceKm = 0
  let durationMin = 0

  const start = Math.min(fromIdx, toIdx)
  const end = Math.max(fromIdx, toIdx)

  for (let i = start + 1; i <= end; i++) {
    const rs = routeStops[i]
    let legDist = Number(rs?.dist_km)

    if (isNaN(legDist) || legDist <= 0) {
      const prevStop = stopsById[routeStops[i - 1]?.stop_id]
      const currStop = stopsById[rs?.stop_id]
      if (prevStop && currStop && !isNaN(Number(prevStop.lat)) && !isNaN(Number(currStop.lat))) {
        legDist = haversine(
          Number(prevStop.lat),
          Number(prevStop.lng),
          Number(currStop.lat),
          Number(currStop.lng)
        ) * 1.3
      } else {
        legDist = 0
      }
    }

    let legMin = Number(rs?.min_from_prev)
    if (isNaN(legMin) || legMin <= 0) {
      legMin = Math.max(1, Math.round((legDist / 17) * 60) + 1)
    }

    distanceKm += legDist
    durationMin += legMin
  }

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMin: Math.max(1, durationMin),
  }
}

/**
 * Finds direct and 1-transfer transit options between two stops.
 *
 * @param {Object} params
 * @param {string} params.fromStopId - ID of starting stop
 * @param {string} params.toStopId - ID of destination stop
 * @param {Array<Object>} params.routes - List of routes
 * @param {Array<Object>} params.routeStops - List of route_stops
 * @param {Array<Object>} [params.stops] - List of stops
 * @param {Array<Object>} [params.schedules] - List of schedules
 * @param {Object} [params.fareConfig] - Fare configuration
 * @param {Date|number} [params.currentTime] - Current time for schedule calculation
 * @returns {Array<Object>} List of found route options (max 8)
 */
export function findRoutes({
  fromStopId,
  toStopId,
  routes = [],
  routeStops = [],
  stops = [],
  schedules = [],
  fareConfig,
  currentTime = new Date(),
}) {
  if (!fromStopId || !toStopId || fromStopId === toStopId) {
    return []
  }

  // Group route_stops by route_id and sort by seq ascending
  const stopsByRoute = {}
  for (const rs of routeStops) {
    if (!stopsByRoute[rs.route_id]) {
      stopsByRoute[rs.route_id] = []
    }
    stopsByRoute[rs.route_id].push(rs)
  }
  for (const routeId in stopsByRoute) {
    stopsByRoute[routeId].sort((a, b) => a.seq - b.seq)
  }

  // Lookup helpers
  const routesById = {}
  for (const r of routes) {
    if (r.active !== false) {
      routesById[r.id] = r
    }
  }

  const stopsById = {}
  for (const s of stops) {
    stopsById[s.id] = s
  }

  const dayType = getDayType(typeof currentTime === 'number' ? new Date() : currentTime)
  const schedulesByRoute = {}
  for (const s of schedules) {
    if (s.day_type === dayType) {
      schedulesByRoute[s.route_id] = s
    }
  }

  const getWaitMin = (routeId, cumulativeMin = 0) => {
    const sched = schedulesByRoute[routeId]
    if (!sched) return 5
    const dep = calculateNextDeparture(sched, currentTime, cumulativeMin)
    return dep.inService && dep.waitMinutes !== null ? dep.waitMinutes : Math.floor((sched.headway_min || 15) / 2)
  }

  const rawResults = []

  // 1. Direct Routes Search
  for (const route of Object.values(routesById)) {
    const rsList = stopsByRoute[route.id] || []
    if (rsList.length < 2) continue

    const fromIdx = rsList.findIndex((rs) => rs.stop_id === fromStopId)
    const toIdx = rsList.findIndex((rs) => rs.stop_id === toStopId)

    if (fromIdx === -1 || toIdx === -1) continue

    // Forward direction: fromIdx < toIdx
    if (fromIdx < toIdx) {
      const { distanceKm, durationMin } = getRouteLegMetrics(rsList, fromIdx, toIdx, stopsById)
      const fareResult = calculateFare({ distanceKm, fareConfig })
      const waitMin = getWaitMin(route.id, fromIdx * 3)
      const totalMinutes = DEFAULT_WALK_MIN + waitMin + durationMin

      rawResults.push({
        id: `direct-${route.id}-0`,
        type: 'direct',
        transfers: 0,
        totalDistanceKm: distanceKm,
        totalRideMinutes: durationMin,
        totalMinutes,
        totalFare: fareResult.amount,
        fare: fareResult.amount,
        fareTotal: fareResult.amount,
        fareFormatted: fareResult.formatted,
        fareBreakdown: fareResult.breakdown,
        fareDistanceText: fareResult.distanceText,
        nextBusMin: waitMin,
        summary: 'Direct',
        legs: [
          {
            route,
            direction: 0,
            fromStop: stopsById[fromStopId] || { id: fromStopId },
            toStop: stopsById[toStopId] || { id: toStopId },
            distanceKm,
            durationMin,
            fare: fareResult.amount,
            waitMin,
            stopsCount: toIdx - fromIdx,
          },
        ],
      })
    }

    // Reverse direction on two_way routes: fromIdx > toIdx
    if (route.two_way !== false && fromIdx > toIdx) {
      const { distanceKm, durationMin } = getRouteLegMetrics(rsList, toIdx, fromIdx, stopsById)
      const fareResult = calculateFare({ distanceKm, fareConfig })
      const waitMin = getWaitMin(route.id, (rsList.length - 1 - fromIdx) * 3)
      const totalMinutes = DEFAULT_WALK_MIN + waitMin + durationMin

      rawResults.push({
        id: `direct-${route.id}-1`,
        type: 'direct',
        transfers: 0,
        totalDistanceKm: distanceKm,
        totalRideMinutes: durationMin,
        totalMinutes,
        totalFare: fareResult.amount,
        fare: fareResult.amount,
        fareTotal: fareResult.amount,
        fareFormatted: fareResult.formatted,
        fareBreakdown: fareResult.breakdown,
        fareDistanceText: fareResult.distanceText,
        nextBusMin: waitMin,
        summary: 'Direct',
        legs: [
          {
            route,
            direction: 1,
            fromStop: stopsById[fromStopId] || { id: fromStopId },
            toStop: stopsById[toStopId] || { id: toStopId },
            distanceKm,
            durationMin,
            fare: fareResult.amount,
            waitMin,
            stopsCount: fromIdx - toIdx,
          },
        ],
      })
    }
  }

  // 2. One-Transfer Search
  // Candidate routes passing through origin
  for (const r1 of Object.values(routesById)) {
    const rs1 = stopsByRoute[r1.id] || []
    const fromIdx1 = rs1.findIndex((rs) => rs.stop_id === fromStopId)
    if (fromIdx1 === -1) continue

    // Explore both directions for Route 1
    const r1Directions = [0]
    if (r1.two_way !== false) r1Directions.push(1)

    for (const dir1 of r1Directions) {
      // Ordered intermediate stops after fromStopId on Route 1
      const transferCandidates = []
      if (dir1 === 0) {
        for (let i = fromIdx1 + 1; i < rs1.length; i++) {
          transferCandidates.push({ stopId: rs1[i].stop_id, idx: i })
        }
      } else {
        for (let i = fromIdx1 - 1; i >= 0; i--) {
          transferCandidates.push({ stopId: rs1[i].stop_id, idx: i })
        }
      }

      for (const tCand of transferCandidates) {
        const transferStopId = tCand.stopId
        if (transferStopId === toStopId) continue // already covered by direct

        // Find candidate Route 2 passing transfer stop and destination stop
        for (const r2 of Object.values(routesById)) {
          if (r2.id === r1.id) continue // Must transfer to a different route

          const rs2 = stopsByRoute[r2.id] || []
          const transferIdx2 = rs2.findIndex((rs) => rs.stop_id === transferStopId)
          const toIdx2 = rs2.findIndex((rs) => rs.stop_id === toStopId)

          if (transferIdx2 === -1 || toIdx2 === -1) continue

          const r2Directions = []
          if (transferIdx2 < toIdx2) r2Directions.push(0)
          if (r2.two_way !== false && transferIdx2 > toIdx2) r2Directions.push(1)

          for (const dir2 of r2Directions) {
            // Metrics for Leg 1
            const m1 = getRouteLegMetrics(rs1, fromIdx1, tCand.idx, stopsById)
            const wait1 = getWaitMin(r1.id, fromIdx1 * 3)

            // Metrics for Leg 2
            const m2 = getRouteLegMetrics(rs2, transferIdx2, toIdx2, stopsById)
            const wait2 = Math.min(getWaitMin(r2.id, transferIdx2 * 3), 10)

            const totalDist = Math.round((m1.distanceKm + m2.distanceKm) * 100) / 100
            const totalRideMin = m1.durationMin + m2.durationMin
            const totalMinutes = DEFAULT_WALK_MIN + wait1 + m1.durationMin + TRANSFER_BUFFER_MIN + wait2 + m2.durationMin

            const fareResult = calculateFare({
              legs: [{ distanceKm: m1.distanceKm }, { distanceKm: m2.distanceKm }],
              fareConfig,
            })

            const transferStopObj = stopsById[transferStopId] || { id: transferStopId, name_en: 'Transfer Stop' }

            rawResults.push({
              id: `transfer-${r1.id}-${transferStopId}-${r2.id}`,
              type: 'transfer',
              transfers: 1,
              transferStop: transferStopObj,
              totalDistanceKm: totalDist,
              totalRideMinutes: totalRideMin,
              totalMinutes,
              totalFare: fareResult.amount,
              fare: fareResult.amount,
              fareTotal: fareResult.amount,
              fareFormatted: fareResult.formatted,
              fareBreakdown: fareResult.breakdown,
              fareDistanceText: fareResult.distanceText,
              nextBusMin: wait1,
              summary: `1 change at ${transferStopObj.name_en || 'transfer stop'}`,
              legs: [
                {
                  route: r1,
                  direction: dir1,
                  fromStop: stopsById[fromStopId] || { id: fromStopId },
                  toStop: transferStopObj,
                  distanceKm: m1.distanceKm,
                  durationMin: m1.durationMin,
                  fare: fareResult.legFares[0] ?? null,
                  waitMin: wait1,
                  stopsCount: Math.abs(tCand.idx - fromIdx1),
                },
                {
                  route: r2,
                  direction: dir2,
                  fromStop: transferStopObj,
                  toStop: stopsById[toStopId] || { id: toStopId },
                  distanceKm: m2.distanceKm,
                  durationMin: m2.durationMin,
                  fare: fareResult.legFares[1] ?? null,
                  waitMin: wait2,
                  stopsCount: Math.abs(toIdx2 - transferIdx2),
                },
              ],
            })
          }
        }
      }
    }
  }

  // Deduplicate results by unique route sequence and stops
  const dedupeMap = new Map()
  for (const res of rawResults) {
    const key = res.type === 'direct'
      ? `D_${res.legs[0].route.id}_${res.legs[0].direction}`
      : `T_${res.legs[0].route.id}_${res.transferStop?.id}_${res.legs[1].route.id}`

    if (!dedupeMap.has(key) || dedupeMap.get(key).totalMinutes > res.totalMinutes) {
      dedupeMap.set(key, res)
    }
  }

  const deduped = Array.from(dedupeMap.values())

  // Default sorting: fastest
  return sortRoutes(deduped, 'fastest').slice(0, 8)
}

/**
 * Sorts route finder results by ranking criterion.
 *
 * @param {Array<Object>} results
 * @param {'fastest'|'fewer_changes'|'cheapest'} criterion
 * @returns {Array<Object>}
 */
export function sortRoutes(results, criterion = 'fastest') {
  const list = [...results]

  if (criterion === 'fewer_changes') {
    list.sort((a, b) => {
      if (a.transfers !== b.transfers) return a.transfers - b.transfers
      return a.totalMinutes - b.totalMinutes
    })
  } else if (criterion === 'cheapest') {
    list.sort((a, b) => {
      if (a.totalFare !== b.totalFare) return a.totalFare - b.totalFare
      return a.totalMinutes - b.totalMinutes
    })
  } else {
    // fastest
    list.sort((a, b) => {
      if (a.totalMinutes !== b.totalMinutes) return a.totalMinutes - b.totalMinutes
      if (a.transfers !== b.transfers) return a.transfers - b.transfers
      return a.totalFare - b.totalFare
    })
  }

  return list
}
