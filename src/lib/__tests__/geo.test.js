import { describe, it, expect } from 'vitest'
import { haversine, projectPointOnSegment, projectPointOnPolyline, kmAlongRoute } from '../geo'

describe('geo calculations', () => {
  it('computes haversine distance correctly', () => {
    // Distance between Old Bus Stand (15.3524, 75.1388) and Hubballi Railway Station (15.3617, 75.1437)
    const dist = haversine(15.3524, 75.1388, 15.3617, 75.1437)
    expect(dist).toBeGreaterThan(1.0)
    expect(dist).toBeLessThan(1.5)
  })

  it('returns 0 for identical points', () => {
    expect(haversine(15.35, 75.13, 15.35, 75.13)).toBe(0)
  })

  it('projects point onto polyline', () => {
    const polyline = [
      { lat: 15.0, lng: 75.0 },
      { lat: 15.0, lng: 76.0 },
      { lat: 16.0, lng: 76.0 },
    ]
    const p = { lat: 15.1, lng: 75.5 }
    const result = projectPointOnPolyline(p, polyline)
    expect(result.segmentIndex).toBe(0)
    expect(result.point.lat).toBeCloseTo(15.0, 1)
    expect(result.point.lng).toBeCloseTo(75.5, 1)
    expect(result.distKm).toBeGreaterThan(0)
  })

  it('computes cumulative km along route stops', () => {
    const routeStops = [
      { seq: 0, dist_km: 0 },
      { seq: 1, dist_km: 2.5 },
      { seq: 2, dist_km: 3.1 },
    ]
    expect(kmAlongRoute(routeStops, 0)).toBe(0)
    expect(kmAlongRoute(routeStops, 1)).toBe(2.5)
    expect(kmAlongRoute(routeStops, 2)).toBeCloseTo(5.6)
  })
})
