import { describe, it, expect } from 'vitest'
import { calculateFare, calculateLegFare, calculateJourneyFare, isValidFareConfig } from '../fare'
import { findRoutes } from '../routeFinder'

describe('Unified Fare Calculation System (PRD 8.4 & Prompt 8.2)', () => {
  const config = { min_fare: 5, per_stage: 5, stage_km: 2.0 }

  it('validates fareConfig properly', () => {
    expect(isValidFareConfig(config)).toBe(true)
    expect(isValidFareConfig(null)).toBe(false)
    expect(isValidFareConfig(undefined)).toBe(false)
    expect(isValidFareConfig({})).toBe(false)
    expect(isValidFareConfig({ min_fare: -1, per_stage: 5, stage_km: 2.0 })).toBe(false)
    expect(isValidFareConfig({ min_fare: 5, per_stage: 0, stage_km: 2.0 })).toBe(false)
    expect(isValidFareConfig({ min_fare: 5, per_stage: 5, stage_km: 0 })).toBe(false)
  })

  it('calculates short ride with minimum fare', () => {
    // 0 km or short distance below 1 stage
    const zeroResult = calculateFare({ distanceKm: 0, fareConfig: config })
    expect(zeroResult.amount).toBe(5)
    expect(zeroResult.formatted).toBe('₹5')
    expect(zeroResult.isAvailable).toBe(true)

    const shortResult = calculateFare({ distanceKm: 0.8, fareConfig: config })
    expect(shortResult.amount).toBe(5)
    expect(shortResult.formatted).toBe('₹5')
    expect(shortResult.distanceText).toBe('Fare for 0.8 km')
  })

  it('calculates long ride across multiple stages', () => {
    // 15 km with stage_km 2.0 -> ceil(15 / 2) = 8 stages -> 8 * 5 = 40
    const longResult = calculateFare({ distanceKm: 15.0, fareConfig: config })
    expect(longResult.amount).toBe(40)
    expect(longResult.formatted).toBe('₹40')
    expect(longResult.distanceText).toBe('Fare for 15 km')

    // 25.4 km -> ceil(25.4 / 2) = 13 stages -> 13 * 5 = 65
    const superLong = calculateFare({ distanceKm: 25.4, fareConfig: config })
    expect(superLong.amount).toBe(65)
    expect(superLong.formatted).toBe('₹65')
    expect(superLong.distanceText).toBe('Fare for 25.4 km')
  })

  it('accurately distinguishes boundaries of two slabs', () => {
    // Exactly at 2.0 km (1 stage) -> 5
    expect(calculateLegFare(2.0, config)).toBe(5)
    expect(calculateFare({ distanceKm: 2.0, fareConfig: config }).amount).toBe(5)

    // Just past 2.0 km (2.01 km -> 2 stages) -> 10
    expect(calculateLegFare(2.01, config)).toBe(10)
    expect(calculateFare({ distanceKm: 2.01, fareConfig: config }).amount).toBe(10)

    // Exactly at 4.0 km (2 stages) -> 10
    expect(calculateLegFare(4.0, config)).toBe(10)
    expect(calculateFare({ distanceKm: 4.0, fareConfig: config }).amount).toBe(10)

    // Just past 4.0 km (4.01 km -> 3 stages) -> 15
    expect(calculateLegFare(4.01, config)).toBe(15)
    expect(calculateFare({ distanceKm: 4.01, fareConfig: config }).amount).toBe(15)
  })

  it('calculates transfer sum with breakdown format "₹X (₹a + ₹b)"', () => {
    const legs = [
      { distanceKm: 2.5 }, // 2 stages = ₹10
      { distanceKm: 5.0 }, // 3 stages = ₹15
    ]
    const transferResult = calculateFare({ legs, fareConfig: config })

    expect(transferResult.amount).toBe(25)
    expect(transferResult.legFares).toEqual([10, 15])
    expect(transferResult.breakdown).toBe('₹10 + ₹15')
    expect(transferResult.formatted).toBe('₹25 (₹10 + ₹15)')
    expect(transferResult.totalDistanceKm).toBe(7.5)
    expect(transferResult.distanceText).toBe('Fare for 7.5 km')

    // Also test calculateJourneyFare helper
    expect(calculateJourneyFare(legs, config)).toBe(25)
  })

  it('returns Fare unavailable when fareConfig is missing or null (never a made-up number)', () => {
    const noConfigResult = calculateFare({ distanceKm: 12.0, fareConfig: null })
    expect(noConfigResult.amount).toBeNull()
    expect(noConfigResult.isAvailable).toBe(false)
    expect(noConfigResult.formatted).toBe('Fare unavailable')
    expect(noConfigResult.legFares).toEqual([])

    expect(calculateLegFare(12.0, null)).toBeNull()
    expect(calculateJourneyFare([{ distanceKm: 12.0 }], null)).toBeNull()
  })

  it('ensures different trips in different slabs never return the same fare', () => {
    const tripShort = calculateFare({ distanceKm: 1.5, fareConfig: config }) // stage 1 -> 5
    const tripMed = calculateFare({ distanceKm: 5.5, fareConfig: config })   // stage 3 -> 15
    const tripLong = calculateFare({ distanceKm: 11.2, fareConfig: config }) // stage 6 -> 30

    expect(tripShort.amount).not.toBe(tripMed.amount)
    expect(tripMed.amount).not.toBe(tripLong.amount)
    expect(tripShort.amount).toBe(5)
    expect(tripMed.amount).toBe(15)
    expect(tripLong.amount).toBe(30)
  })

  it('falls back to Haversine x 1.3 when dist_km is missing in route_stops', () => {
    const stops = [
      { id: 'S1', name_en: 'Stop 1', lat: 15.3647, lng: 75.1240 },
      { id: 'S2', name_en: 'Stop 2', lat: 15.4000, lng: 75.1500 }, // ~4.9 km straight line
    ]
    const routes = [
      { id: 'R1', code: '101', name_en: 'Test Route', active: true, two_way: true },
    ]
    const routeStops = [
      { route_id: 'R1', stop_id: 'S1', seq: 1, dist_km: null, min_from_prev: null },
      { route_id: 'R1', stop_id: 'S2', seq: 2, dist_km: null, min_from_prev: null }, // missing dist_km!
    ]

    const results = findRoutes({
      fromStopId: 'S1',
      toStopId: 'S2',
      routes,
      routeStops,
      stops,
      fareConfig: config,
    })

    expect(results.length).toBeGreaterThan(0)
    const directTrip = results[0]

    // Haversine ~4.9 km * 1.3 ≈ 6.4 km
    expect(directTrip.totalDistanceKm).toBeGreaterThan(5.0)
    expect(directTrip.totalFare).toBeGreaterThanOrEqual(15) // At ~6.4 km, 4 stages -> 20 Rs
    expect(directTrip.fare).toBe(directTrip.totalFare)
    expect(directTrip.fareTotal).toBe(directTrip.totalFare)
    expect(directTrip.fareDistanceText).toContain('Fare for')
  })
})
