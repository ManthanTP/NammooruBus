import { describe, it, expect } from 'vitest'
import {
  getDayType,
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateNextDeparture,
} from '../schedule'

describe('schedule calculations', () => {
  const sampleSchedule = {
    first_bus: '06:00:00',
    last_bus: '21:30:00',
    headway_min: 15,
  }

  it('detects weekday vs weekend', () => {
    // 2026-11-19 is a Thursday (weekday)
    const thursday = new Date(2026, 10, 19)
    expect(getDayType(thursday)).toBe('weekday')

    // 2026-11-22 is a Sunday (weekend)
    const sunday = new Date(2026, 10, 22)
    expect(getDayType(sunday)).toBe('weekend')
  })

  it('converts time strings and formats back', () => {
    expect(parseTimeToMinutes('06:00')).toBe(360)
    expect(parseTimeToMinutes('21:30:00')).toBe(1290)
    expect(formatMinutesToTime(360)).toBe('06:00')
    expect(formatMinutesToTime(1290)).toBe('21:30')
  })

  it('handles outside service hours before first bus', () => {
    // 04:30 AM (270 min)
    const res = calculateNextDeparture(sampleSchedule, 270)
    expect(res.inService).toBe(false)
    expect(res.statusMessage).toContain('No service now. First bus at 06:00')
  })

  it('handles outside service hours after last bus', () => {
    // 22:15 (1335 min)
    const res = calculateNextDeparture(sampleSchedule, 1335)
    expect(res.inService).toBe(false)
    expect(res.statusMessage).toContain('No service now')
  })

  it('calculates next departure accurately inside service window', () => {
    // Current time: 08:05 (485 min)
    // Departures from 06:00 with headway 15: 06:00, 06:15, ..., 08:00, 08:15 (495 min)
    const res = calculateNextDeparture(sampleSchedule, 485, 0)
    expect(res.inService).toBe(true)
    expect(res.departureTimeStr).toBe('08:15')
    expect(res.waitMinutes).toBe(10)
  })

  it('factors in cumulative minutes to intermediate stop', () => {
    // Current time 08:05, cumulative min to stop = 12
    // Next departure from origin at 08:15 arrives at stop at 08:27 (507 min)
    // Wait from 08:05 = 22 minutes
    const res = calculateNextDeparture(sampleSchedule, 485, 12)
    expect(res.inService).toBe(true)
    expect(res.departureTimeStr).toBe('08:27')
    expect(res.waitMinutes).toBe(22)
  })
})
