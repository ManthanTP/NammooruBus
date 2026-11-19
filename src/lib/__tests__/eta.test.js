import { describe, it, expect } from 'vitest'
import {
  computeMovingAverageSpeed,
  calculateBusEta,
  getDirectedStops,
  MIN_SPEED_KMH,
  MAX_SPEED_KMH,
} from '../eta'

describe('eta calculations', () => {
  it('clamps moving average speed to [8, 30] km/h', () => {
    // Empty speeds fallback to 17
    expect(computeMovingAverageSpeed([])).toBe(17)

    // Very low speed clamped to 8
    expect(computeMovingAverageSpeed([2, 4, 3])).toBe(MIN_SPEED_KMH)

    // Very high speed clamped to 30
    expect(computeMovingAverageSpeed([45, 60, 50])).toBe(MAX_SPEED_KMH)

    // Normal speed within range
    expect(computeMovingAverageSpeed([18, 22, 20])).toBe(20)
  })

  it('inverts stops sequence for reverse direction (direction 1)', () => {
    const stops = [
      { id: 'S1', seq: 0 },
      { id: 'S2', seq: 1 },
      { id: 'S3', seq: 2 },
    ]
    const forward = getDirectedStops(stops, 0)
    expect(forward[0].id).toBe('S1')
    expect(forward[2].id).toBe('S3')

    const reverse = getDirectedStops(stops, 1)
    expect(reverse[0].id).toBe('S3')
    expect(reverse[2].id).toBe('S1')
  })

  it('detects next stop and computes ETA correctly', () => {
    const routeStops = [
      { id: 'S1', stop: { id: 'S1', lat: 15.3524, lng: 75.1388 }, seq: 0 },
      { id: 'S2', stop: { id: 'S2', lat: 15.3617, lng: 75.1437 }, seq: 1 },
      { id: 'S3', stop: { id: 'S3', lat: 15.3685, lng: 75.1505 }, seq: 2 },
    ]

    // Bus is halfway between S1 and S2
    const busPos = { lat: 15.357, lng: 75.141 }

    const res = calculateBusEta({
      busPosition: busPos,
      routeStops,
      direction: 0,
      targetStopId: 'S3',
      speedHistory: [20],
    })

    expect(res.hasPassed).toBe(false)
    expect(res.nextStop?.stop?.id).toBe('S2')
    expect(res.remainingKm).toBeGreaterThan(0)
    expect(res.etaMinutes).toBeGreaterThanOrEqual(1)
  })

  it('flags hasPassed as true when bus is past the target stop', () => {
    const routeStops = [
      { id: 'S1', stop: { id: 'S1', lat: 15.3524, lng: 75.1388 }, seq: 0 },
      { id: 'S2', stop: { id: 'S2', lat: 15.3617, lng: 75.1437 }, seq: 1 },
      { id: 'S3', stop: { id: 'S3', lat: 15.3685, lng: 75.1505 }, seq: 2 },
    ]

    // Bus is near S3, past S1
    const busPos = { lat: 15.368, lng: 75.150 }

    const res = calculateBusEta({
      busPosition: busPos,
      routeStops,
      direction: 0,
      targetStopId: 'S1', // S1 is already passed!
      speedHistory: [20],
    })

    expect(res.hasPassed).toBe(true)
    expect(res.etaMinutes).toBeNull()
  })
})
