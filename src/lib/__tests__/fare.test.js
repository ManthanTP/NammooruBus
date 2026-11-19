import { describe, it, expect } from 'vitest'
import { calculateLegFare, calculateJourneyFare } from '../fare'

describe('fare calculation', () => {
  const config = { min_fare: 5, per_stage: 5, stage_km: 2.0 }

  it('applies minimum fare for 0 or short distances', () => {
    expect(calculateLegFare(0, config)).toBe(5)
    expect(calculateLegFare(1.2, config)).toBe(5)
  })

  it('rounds stages up correctly (ceil)', () => {
    // 2.0 km -> 1 stage -> 5 Rs
    expect(calculateLegFare(2.0, config)).toBe(5)
    // 2.1 km -> 2 stages -> 10 Rs
    expect(calculateLegFare(2.1, config)).toBe(10)
    // 4.0 km -> 2 stages -> 10 Rs
    expect(calculateLegFare(4.0, config)).toBe(10)
    // 4.5 km -> 3 stages -> 15 Rs
    expect(calculateLegFare(4.5, config)).toBe(15)
  })

  it('calculates journey fare across multiple legs', () => {
    const legs = [
      { distanceKm: 2.5 }, // 2 stages = 10
      { distanceKm: 1.5 }, // 1 stage = 5
    ]
    expect(calculateJourneyFare(legs, config)).toBe(15)
  })
})
