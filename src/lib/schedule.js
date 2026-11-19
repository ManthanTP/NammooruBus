/**
 * Schedule and timetable fallback calculations per PRD 8.3.
 */

/**
 * Returns 'weekday' (Mon-Fri) or 'weekend' (Sat-Sun) for a given Date.
 * @param {Date} [date]
 * @returns {'weekday' | 'weekend'}
 */
export function getDayType(date = new Date()) {
  const day = date.getDay()
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

/**
 * Converts "HH:MM" or "HH:MM:SS" to minutes from midnight.
 * @param {string} timeStr
 * @returns {number}
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

/**
 * Formats minutes from midnight into 24-hour "HH:MM".
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Calculates next departure information for a route schedule given current time.
 *
 * @param {Object} schedule - { first_bus, last_bus, headway_min }
 * @param {Date|number} [currentTime] - Date object or minutes from midnight
 * @param {number} [cumulativeMinToStop=0] - Minutes from route origin to stop
 * @returns {{
 *   inService: boolean,
 *   waitMinutes: number|null,
 *   departureTimeStr: string|null,
 *   firstBusTimeStr: string,
 *   statusMessage: string
 * }}
 */
export function calculateNextDeparture(schedule, currentTime = new Date(), cumulativeMinToStop = 0) {
  if (!schedule) {
    return {
      inService: false,
      waitMinutes: null,
      departureTimeStr: null,
      firstBusTimeStr: '06:00',
      statusMessage: 'No schedule available',
    }
  }

  const firstMin = parseTimeToMinutes(schedule.first_bus)
  const lastMin = parseTimeToMinutes(schedule.last_bus)
  const headway = Number(schedule.headway_min) || 15

  const nowMin = typeof currentTime === 'number'
    ? currentTime
    : currentTime.getHours() * 60 + currentTime.getMinutes()

  const firstBusTimeStr = formatMinutesToTime(firstMin + cumulativeMinToStop)

  // Before first bus or after last bus
  if (nowMin < firstMin || nowMin > lastMin) {
    return {
      inService: false,
      waitMinutes: null,
      departureTimeStr: null,
      firstBusTimeStr,
      statusMessage: `No service now. First bus at ${firstBusTimeStr}`,
    }
  }

  // Inside service window
  const elapsedFromStart = nowMin - firstMin
  const departuresPassed = Math.floor(elapsedFromStart / headway)
  // Next trip departure from origin
  const nextOriginDep = firstMin + (departuresPassed + 1) * headway
  // Arrival at the passenger's stop
  const nextStopArrival = nextOriginDep + cumulativeMinToStop

  const waitMinutes = Math.max(1, nextStopArrival - nowMin)

  return {
    inService: true,
    waitMinutes,
    departureTimeStr: formatMinutesToTime(nextStopArrival),
    firstBusTimeStr,
    statusMessage: `Next bus in ${waitMinutes} min`,
  }
}
