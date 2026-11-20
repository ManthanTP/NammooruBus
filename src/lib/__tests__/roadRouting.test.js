import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchDrivingRoute, fetchWalkingRoute, snapToRoad } from '../roadRouting'

// Mock localStorage for node test runner
const store = new Map()
const localStorageMock = {
  getItem: vi.fn((key) => store.get(key) || null),
  setItem: vi.fn((key, value) => store.set(key, String(value))),
  removeItem: vi.fn((key) => store.delete(key)),
  clear: vi.fn(() => store.clear()),
}
globalThis.localStorage = localStorageMock

describe('Road Routing (OSRM Integration & Fallback)', () => {
  const sampleWaypoints = [
    { lat: 15.3647, lng: 75.1240 },
    { lat: 15.3700, lng: 75.1300 },
  ]

  beforeEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('calculates fallback straight-line route with isApproximate when OSRM fails or times out', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchDrivingRoute(sampleWaypoints)
    expect(result.isApproximate).toBe(true)
    expect(result.polyline).toHaveLength(2)
    expect(result.polyline[0]).toEqual([15.3647, 75.1240])
    expect(result.polyline[1]).toEqual([15.3700, 75.1300])
  })

  it('fetches driving road geometry from OSRM and converts coordinates to Leaflet [lat, lng]', async () => {
    const mockOsmResponse = {
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [75.1240, 15.3647],
              [75.1270, 15.3670],
              [75.1300, 15.3700],
            ],
          },
          distance: 1200,
          duration: 180,
        },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOsmResponse,
    })

    const result = await fetchDrivingRoute(sampleWaypoints)
    expect(result.isApproximate).toBe(false)
    expect(result.polyline).toHaveLength(3)
    // Converted to [lat, lng]
    expect(result.polyline[0]).toEqual([15.3647, 75.1240])
    expect(result.polyline[1]).toEqual([15.3670, 75.1270])
    expect(result.polyline[2]).toEqual([15.3700, 75.1300])
  })

  it('caches driving route in localStorage to avoid hitting free OSRM server repeatedly', async () => {
    const mockOsmResponse = {
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [75.1240, 15.3647],
              [75.1300, 15.3700],
            ],
          },
          distance: 1000,
          duration: 120,
        },
      ],
    }

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOsmResponse,
    })
    globalThis.fetch = fetchSpy

    // First call
    const res1 = await fetchDrivingRoute(sampleWaypoints)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second call with same coordinates should read from localStorage cache
    const res2 = await fetchDrivingRoute(sampleWaypoints)
    expect(fetchSpy).toHaveBeenCalledTimes(1) // Still 1!
    expect(res2.polyline).toEqual(res1.polyline)
  })

  it('calculates walking route duration at 80 meters per minute and derives midpoint for badge', async () => {
    const mockFootResponse = {
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [75.1240, 15.3647],
              [75.1250, 15.3655],
              [75.1260, 15.3663],
            ],
          },
          distance: 400, // 400 meters / 80 m/min = 5 min
          duration: 300,
        },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFootResponse,
    })

    const from = { lat: 15.3647, lng: 75.1240 }
    const to = { lat: 15.3663, lng: 75.1260 }

    const walk = await fetchWalkingRoute(from, to)
    expect(walk.distanceMeters).toBe(400)
    expect(walk.walkMinutes).toBe(5)
    expect(walk.midpoint).toBeDefined()
    expect(walk.polyline).toHaveLength(3)
  })

  it('snaps a stop point to nearest road coordinate via OSRM nearest service', async () => {
    const mockNearestResponse = {
      code: 'Ok',
      waypoints: [
        {
          location: [75.12405, 15.36475],
        },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNearestResponse,
    })

    const snapped = await snapToRoad(15.3647, 75.1240)
    expect(snapped.lat).toBe(15.36475)
    expect(snapped.lng).toBe(75.12405)
  })
})
