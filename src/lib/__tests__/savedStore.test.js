import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage for node test runner before any store imports
const store = new Map()
const localStorageMock = {
  getItem: vi.fn((key) => store.get(key) || null),
  setItem: vi.fn((key, value) => store.set(key, String(value))),
  removeItem: vi.fn((key) => store.delete(key)),
  clear: vi.fn(() => store.clear()),
}
globalThis.localStorage = localStorageMock

import { useSavedStore } from '@/store/savedStore'

describe('Saved Trips Store (Problem 4)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useSavedStore.setState({ savedTrips: [], initialized: false })
  })

  it('normalizes trip endpoints and saves locally for guests', async () => {
    const journey = {
      id: 'journey-1',
      legs: [
        {
          route: { code: '201', color: '#3451F2' },
          fromStop: { id: 'stop-a', name_en: 'Chennamma Circle' },
          toStop: { id: 'stop-b', name_en: 'CBT Hubballi' },
          fare: 15,
        },
      ],
      totalFare: 15,
      totalMinutes: 20,
    }

    const { saveTrip, isSaved } = useSavedStore.getState()
    await saveTrip(journey, null) // guest

    const trips = useSavedStore.getState().savedTrips
    expect(trips).toHaveLength(1)
    expect(trips[0].from_stop).toBe('stop-a')
    expect(trips[0].to_stop).toBe('stop-b')
    expect(trips[0].route_key).toBe('201')

    // isSaved check by stops
    expect(isSaved('stop-a', 'stop-b')).toBe(true)
    expect(isSaved('stop-a', 'stop-other')).toBe(false)
  })

  it('correctly derives multi-leg route_key (e.g. 201+45A)', async () => {
    const journey = {
      legs: [
        { route: { code: '201' }, fromStop: { id: 's1' }, toStop: { id: 's2' } },
        { route: { code: '45A' }, fromStop: { id: 's2' }, toStop: { id: 's3' } },
      ],
    }

    const { saveTrip } = useSavedStore.getState()
    await saveTrip(journey, null)

    const trips = useSavedStore.getState().savedTrips
    expect(trips[0].route_key).toBe('201+45A')
  })

  it('removes trip by endpoints (from_stop and to_stop)', async () => {
    const journey = {
      legs: [
        { route: { code: '201' }, fromStop: { id: 's1' }, toStop: { id: 's2' } },
      ],
    }

    const { saveTrip, removeTrip, isSaved } = useSavedStore.getState()
    await saveTrip(journey, null)
    expect(isSaved('s1', 's2')).toBe(true)

    await removeTrip({ from_stop: 's1', to_stop: 's2' }, null)
    expect(isSaved('s1', 's2')).toBe(false)
    expect(useSavedStore.getState().savedTrips).toHaveLength(0)
  })
})
