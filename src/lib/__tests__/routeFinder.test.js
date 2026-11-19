import { describe, it, expect } from 'vitest'
import { findRoutes, sortRoutes } from '../routeFinder'

describe('routeFinder', () => {
  const stops = [
    { id: 'S1', name_en: 'Old Bus Stand' },
    { id: 'S2', name_en: 'Railway Station' },
    { id: 'S3', name_en: 'Chennamma Circle' },
    { id: 'S4', name_en: 'Keshwapur' },
    { id: 'S5', name_en: 'Vidyanagar' },
    { id: 'S6', name_en: 'Navanagar' },
    { id: 'S7', name_en: 'Unkal' },
    { id: 'S8', name_en: 'Airport' },
    { id: 'S_ISOLATED', name_en: 'Isolated Stop' },
  ]

  const routes = [
    // Route 201: S1 -> S3 -> S4 -> S6 -> S8 (two-way)
    { id: 'R201', code: '201', name_en: '201', two_way: true, active: true },
    // Route 45A: S1 -> S2 -> S3 (two-way)
    { id: 'R45A', code: '45A', name_en: '45A', two_way: true, active: true },
    // Route 12: S3 -> S5 -> S7 -> S8 (one-way only)
    { id: 'R12', code: '12', name_en: '12', two_way: false, active: true },
    // Route 7: S1 -> S2 -> S5 -> S8 (two-way)
    { id: 'R7', code: '7', name_en: '7', two_way: true, active: true },
  ]

  const routeStops = [
    // 201: S1 (0), S3 (1), S4 (2), S6 (3), S8 (4)
    { route_id: 'R201', stop_id: 'S1', seq: 0, dist_km: 0, min_from_prev: 0 },
    { route_id: 'R201', stop_id: 'S3', seq: 1, dist_km: 2.0, min_from_prev: 6 },
    { route_id: 'R201', stop_id: 'S4', seq: 2, dist_km: 3.0, min_from_prev: 9 },
    { route_id: 'R201', stop_id: 'S6', seq: 3, dist_km: 4.0, min_from_prev: 12 },
    { route_id: 'R201', stop_id: 'S8', seq: 4, dist_km: 3.5, min_from_prev: 11 },

    // 45A: S1 (0), S2 (1), S3 (2)
    { route_id: 'R45A', stop_id: 'S1', seq: 0, dist_km: 0, min_from_prev: 0 },
    { route_id: 'R45A', stop_id: 'S2', seq: 1, dist_km: 1.5, min_from_prev: 5 },
    { route_id: 'R45A', stop_id: 'S3', seq: 2, dist_km: 1.5, min_from_prev: 5 },

    // 12 (one-way): S3 (0), S5 (1), S7 (2), S8 (3)
    { route_id: 'R12', stop_id: 'S3', seq: 0, dist_km: 0, min_from_prev: 0 },
    { route_id: 'R12', stop_id: 'S5', seq: 1, dist_km: 2.5, min_from_prev: 8 },
    { route_id: 'R12', stop_id: 'S7', seq: 2, dist_km: 2.0, min_from_prev: 6 },
    { route_id: 'R12', stop_id: 'S8', seq: 3, dist_km: 3.0, min_from_prev: 9 },

    // 7: S1 (0), S2 (1), S5 (2), S8 (3)
    { route_id: 'R7', stop_id: 'S1', seq: 0, dist_km: 0, min_from_prev: 0 },
    { route_id: 'R7', stop_id: 'S2', seq: 1, dist_km: 1.5, min_from_prev: 5 },
    { route_id: 'R7', stop_id: 'S5', seq: 2, dist_km: 3.0, min_from_prev: 10 },
    { route_id: 'R7', stop_id: 'S8', seq: 3, dist_km: 4.0, min_from_prev: 12 },
  ]

  const fareConfig = { min_fare: 5, per_stage: 5, stage_km: 2.0 }

  it('returns empty array when from and to are identical or missing', () => {
    expect(findRoutes({ fromStopId: 'S1', toStopId: 'S1', routes, routeStops, stops, fareConfig })).toEqual([])
    expect(findRoutes({ fromStopId: null, toStopId: 'S2', routes, routeStops, stops, fareConfig })).toEqual([])
  })

  it('finds direct forward routes', () => {
    const results = findRoutes({
      fromStopId: 'S1',
      toStopId: 'S8',
      routes,
      routeStops,
      stops,
      fareConfig,
    })

    const directRoutes = results.filter((r) => r.type === 'direct')
    expect(directRoutes.length).toBeGreaterThanOrEqual(2)
    const codes = directRoutes.map((r) => r.legs[0].route.code)
    expect(codes).toContain('201')
    expect(codes).toContain('7')
  })

  it('finds reverse routes on two-way routes', () => {
    // S8 to S1 on two-way route 201
    const results = findRoutes({
      fromStopId: 'S8',
      toStopId: 'S1',
      routes,
      routeStops,
      stops,
      fareConfig,
    })

    const r201 = results.find((r) => r.legs[0]?.route.code === '201')
    expect(r201).toBeDefined()
    expect(r201.legs[0].direction).toBe(1)
  })

  it('blocks reverse direction on one-way routes', () => {
    // R12 is one-way from S3 to S8. Reverse S8 to S3 should NOT return R12
    const results = findRoutes({
      fromStopId: 'S8',
      toStopId: 'S3',
      routes,
      routeStops,
      stops,
      fareConfig,
    })

    const r12 = results.find((r) => r.legs[0]?.route.code === '12')
    expect(r12).toBeUndefined()
  })

  it('finds one-transfer options', () => {
    // S2 (Railway Station) to S7 (Unkal Lake)
    // S2 is on 45A and 7.
    // Transfer at S3 (Chennamma Circle) to 12 (to S7), or S5 (Vidyanagar)
    const results = findRoutes({
      fromStopId: 'S2',
      toStopId: 'S7',
      routes,
      routeStops,
      stops,
      fareConfig,
    })

    expect(results.length).toBeGreaterThan(0)
    const transferOption = results.find((r) => r.type === 'transfer')
    expect(transferOption).toBeDefined()
    expect(transferOption.transfers).toBe(1)
    expect(transferOption.legs.length).toBe(2)
  })

  it('returns empty array when no path exists', () => {
    const results = findRoutes({
      fromStopId: 'S1',
      toStopId: 'S_ISOLATED',
      routes,
      routeStops,
      stops,
      fareConfig,
    })
    expect(results).toEqual([])
  })

  it('sorts correctly by fastest, fewer_changes, and cheapest', () => {
    const sample = [
      { id: '1', totalMinutes: 45, transfers: 1, totalFare: 10 },
      { id: '2', totalMinutes: 30, transfers: 0, totalFare: 20 },
      { id: '3', totalMinutes: 50, transfers: 0, totalFare: 15 },
    ]

    const byFastest = sortRoutes(sample, 'fastest')
    expect(byFastest[0].id).toBe('2') // 30 min

    const byChanges = sortRoutes(sample, 'fewer_changes')
    expect(byChanges[0].transfers).toBe(0)
    expect(byChanges[0].id).toBe('2') // 0 transfers, 30 min

    const byCheapest = sortRoutes(sample, 'cheapest')
    expect(byCheapest[0].id).toBe('1') // Rs 10
  })
})
