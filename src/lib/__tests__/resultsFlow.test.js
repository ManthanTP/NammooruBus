import { describe, it, expect } from 'vitest'
import { findRoutes, sortRoutes } from '../routeFinder'

describe('Part A: Results Flow Regression Test', () => {
  const sampleStops = [
    { id: 'stop-1', name_en: 'Old Bus Stand', lat: 15.3647, lng: 75.1240 },
    { id: 'stop-2', name_en: 'Chennamma Circle', lat: 15.3580, lng: 75.1320 },
    { id: 'stop-3', name_en: 'Railway Station', lat: 15.3500, lng: 75.1410 },
    { id: 'stop-4', name_en: 'Isolated Village', lat: 15.4200, lng: 75.2100 },
  ]

  const sampleRoutes = [
    { id: 'route-1', code: '201', name_en: 'CBT to Station', color: '#3451F2', two_way: true, active: true },
  ]

  const sampleRouteStops = [
    { route_id: 'route-1', stop_id: 'stop-1', seq: 1, dist_km: 0, min_from_prev: 0 },
    { route_id: 'route-1', stop_id: 'stop-2', seq: 2, dist_km: 2.1, min_from_prev: 6 },
    { route_id: 'route-1', stop_id: 'stop-3', seq: 3, dist_km: 2.3, min_from_prev: 7 },
  ]

  const sampleSchedules = [
    { route_id: 'route-1', day_type: 'weekday', first_bus: '06:00', last_bus: '22:00', headway_min: 15 },
    { route_id: 'route-1', day_type: 'weekend', first_bus: '06:30', last_bus: '21:30', headway_min: 20 },
  ]

  const sampleFare = { min_fare: 7, fare_per_stage: 3, stage_len_km: 2.0 }

  it('selects two connected stops and finds buses successfully', () => {
    const results = findRoutes({
      fromStopId: 'stop-1',
      toStopId: 'stop-3',
      routes: sampleRoutes,
      routeStops: sampleRouteStops,
      stops: sampleStops,
      schedules: sampleSchedules,
      fareConfig: sampleFare,
      currentTime: new Date('2026-11-20T10:00:00'),
    })

    expect(results).toBeDefined()
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].legs[0].route.code).toBe('201')
    expect(results[0].totalFare).toBeGreaterThan(0)
    expect(results[0].totalMinutes).toBeGreaterThan(0)
  })

  it('selects disconnected stop and safely returns empty results (triggers no result message)', () => {
    const results = findRoutes({
      fromStopId: 'stop-1',
      toStopId: 'stop-4', // Isolated stop with no bus route
      routes: sampleRoutes,
      routeStops: sampleRouteStops,
      stops: sampleStops,
      schedules: sampleSchedules,
      fareConfig: sampleFare,
    })

    expect(results).toBeDefined()
    expect(results.length).toBe(0)
  })

  it('returns empty array when stops are not selected or identical', () => {
    expect(findRoutes({ fromStopId: null, toStopId: 'stop-2' })).toEqual([])
    expect(findRoutes({ fromStopId: 'stop-1', toStopId: null })).toEqual([])
    expect(findRoutes({ fromStopId: 'stop-1', toStopId: 'stop-1' })).toEqual([])
  })

  it('handles empty or loading master data gracefully without throwing', () => {
    expect(() => {
      findRoutes({
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
        routes: [],
        routeStops: [],
        stops: [],
      })
    }).not.toThrow()
  })

  it('sortRoutes correctly orders by fastest and cheapest', () => {
    const results = findRoutes({
      fromStopId: 'stop-1',
      toStopId: 'stop-3',
      routes: sampleRoutes,
      routeStops: sampleRouteStops,
      stops: sampleStops,
      schedules: sampleSchedules,
      fareConfig: sampleFare,
    })

    const fastest = sortRoutes(results, 'fastest')
    expect(fastest.length).toBe(results.length)

    const cheapest = sortRoutes(results, 'cheapest')
    expect(cheapest.length).toBe(results.length)
  })
})
