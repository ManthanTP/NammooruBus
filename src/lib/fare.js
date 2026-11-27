/**
 * Stage-based fare calculation per PRD 8.4 and Prompt 8.2.
 *
 * Single source of truth for all fare calculations across the app:
 * Results cards, Journey details, Saved trips, Share text, Live page, and Admin preview.
 *
 * Formula per bus leg:
 * fare = max(min_fare, ceil(distance_km / stage_km) * per_stage)
 * Journey fare is the sum of each bus leg's fare.
 */

/**
 * Checks if a fareConfig object is valid.
 * @param {Object} [config]
 * @returns {boolean}
 */
export function isValidFareConfig(config) {
  if (!config || typeof config !== 'object') return false
  const minFare = Number(config.min_fare)
  const perStage = Number(config.per_stage ?? config.fare_per_stage)
  const stageKm = Number(config.stage_km ?? config.stage_len_km)

  return !isNaN(minFare) && minFare >= 0 && !isNaN(perStage) && perStage > 0 && !isNaN(stageKm) && stageKm > 0
}

/**
 * Calculates fare for a single trip leg given distance in km and fare configuration.
 * Returns null if fareConfig is missing or invalid.
 *
 * @param {number} distanceKm
 * @param {Object} [config]
 * @returns {number | null}
 */
export function calculateLegFare(distanceKm, config) {
  if (!isValidFareConfig(config)) {
    return null
  }

  const minFare = Number(config.min_fare)
  const perStage = Number(config.per_stage ?? config.fare_per_stage)
  const stageKm = Number(config.stage_km ?? config.stage_len_km)

  const dist = Number(distanceKm)
  if (isNaN(dist) || dist <= 0) {
    return minFare
  }

  const stages = Math.ceil(dist / stageKm)
  const computed = stages * perStage
  return Math.max(minFare, computed)
}

/**
 * Calculates total journey fare across multiple legs.
 * Returns null if fareConfig is missing or invalid.
 *
 * @param {Array<{distanceKm: number}>} legs
 * @param {Object} [config]
 * @returns {number | null} Total fare in Rupees
 */
export function calculateJourneyFare(legs = [], config) {
  if (!isValidFareConfig(config)) {
    return null
  }
  if (!legs || legs.length === 0) return 0

  let total = 0
  for (const leg of legs) {
    const legDist = Number(leg?.distanceKm ?? leg?.dist_km ?? 0)
    const legFare = calculateLegFare(legDist, config)
    if (legFare === null) return null
    total += legFare
  }
  return total
}

/**
 * Master unified fare calculation function.
 * Accepts flexible parameters:
 * - calculateFare({ distanceKm, fareConfig, legs })
 * - calculateFare(distanceKm, fareConfig)
 * - calculateFare(distanceKm, fareConfig, legs)
 *
 * Returns:
 * {
 *   amount: number | null,         // Total fare number (e.g. 54) or null if unavailable
 *   formatted: string,             // "₹54", "₹54 (₹36 + ₹18)", or "Fare unavailable"
 *   breakdown: string,             // "₹36 + ₹18" or ""
 *   legFares: number[],            // array of individual leg fares [36, 18]
 *   totalDistanceKm: number,       // Total bus distance in km
 *   distanceText: string,          // "Fare for 18.2 km" or ""
 *   isAvailable: boolean,          // true if valid config was used
 * }
 */
export function calculateFare(arg1, arg2, arg3) {
  let distanceKm = 0
  let legs = []
  let config = null

  if (typeof arg1 === 'number') {
    // calculateFare(distanceKm, config, legs)
    distanceKm = arg1
    config = arg2
    if (Array.isArray(arg3) && arg3.length > 0) {
      legs = arg3
    } else {
      legs = [{ distanceKm }]
    }
  } else if (arg1 && typeof arg1 === 'object') {
    if (Array.isArray(arg1.legs) && arg1.legs.length > 0) {
      legs = arg1.legs
      config = arg1.fareConfig || arg2
      distanceKm = legs.reduce((acc, l) => acc + (Number(l.distanceKm ?? l.dist_km) || 0), 0)
    } else if (arg1.distanceKm !== undefined) {
      distanceKm = Number(arg1.distanceKm) || 0
      config = arg1.fareConfig || arg2
      legs = [{ distanceKm }]
    } else if (Array.isArray(arg1) && arg1.length > 0) {
      legs = arg1
      config = arg2
      distanceKm = legs.reduce((acc, l) => acc + (Number(l.distanceKm ?? l.dist_km) || 0), 0)
    } else {
      config = arg1
    }
  }

  const roundedDistance = Math.round(distanceKm * 10) / 10

  if (!isValidFareConfig(config)) {
    return {
      amount: null,
      formatted: 'Fare unavailable',
      breakdown: '',
      legFares: [],
      totalDistanceKm: roundedDistance,
      distanceText: '',
      isAvailable: false,
    }
  }

  const distanceText = `Fare for ${roundedDistance} km`

  if (!legs || legs.length === 0) {
    const singleFare = calculateLegFare(distanceKm, config)
    return {
      amount: singleFare,
      formatted: singleFare !== null ? `₹${singleFare}` : 'Fare unavailable',
      breakdown: '',
      legFares: singleFare !== null ? [singleFare] : [],
      totalDistanceKm: roundedDistance,
      distanceText,
      isAvailable: singleFare !== null,
    }
  }

  const legFares = legs.map((leg) => {
    const dist = Number(leg?.distanceKm ?? leg?.dist_km ?? 0)
    return calculateLegFare(dist, config)
  })

  if (legFares.some((f) => f === null)) {
    return {
      amount: null,
      formatted: 'Fare unavailable',
      breakdown: '',
      legFares: [],
      totalDistanceKm: roundedDistance,
      distanceText: '',
      isAvailable: false,
    }
  }

  const totalAmount = legFares.reduce((sum, f) => sum + f, 0)

  let breakdown = ''
  let formatted = `₹${totalAmount}`

  if (legFares.length > 1) {
    breakdown = legFares.map((f) => `₹${f}`).join(' + ')
    formatted = `₹${totalAmount} (${breakdown})`
  }

  return {
    amount: totalAmount,
    formatted,
    breakdown,
    legFares,
    totalDistanceKm: roundedDistance,
    distanceText,
    isAvailable: true,
  }
}
