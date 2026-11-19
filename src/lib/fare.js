/**
 * Stage-based fare calculation per PRD 8.4.
 *
 * Formula per leg:
 * fare = max(min_fare, ceil(distance_km / stage_km) * per_stage)
 * Journey fare is the sum of leg fares.
 */

const DEFAULT_FARE_CONFIG = {
  min_fare: 5,
  per_stage: 5,
  stage_km: 2.0,
}

/**
 * Calculates fare for a single trip leg given distance in km and fare configuration.
 *
 * @param {number} distanceKm
 * @param {Object} [config]
 * @returns {number}
 */
export function calculateLegFare(distanceKm, config = DEFAULT_FARE_CONFIG) {
  const minFare = config?.min_fare ?? 5
  const perStage = config?.per_stage ?? 5
  const stageKm = Number(config?.stage_km ?? 2.0)

  if (distanceKm <= 0) return minFare

  const stages = Math.ceil(distanceKm / stageKm)
  const computed = stages * perStage
  return Math.max(minFare, computed)
}

/**
 * Calculates total journey fare across multiple legs.
 *
 * @param {Array<{distanceKm: number}>} legs
 * @param {Object} [config]
 * @returns {number} Total fare in Rupees
 */
export function calculateJourneyFare(legs = [], config = DEFAULT_FARE_CONFIG) {
  if (!legs || legs.length === 0) return 0
  return legs.reduce((acc, leg) => acc + calculateLegFare(leg.distanceKm || 0, config), 0)
}
