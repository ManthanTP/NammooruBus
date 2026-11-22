// Map configuration - OpenStreetMap Humanitarian (HOT) tiles / Voyager tiles
export const OSM_HOT_TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'

export function getTileUrl() {
  const envUrl = import.meta.env.VITE_TILE_URL
  if (envUrl && !envUrl.includes('cartocdn')) {
    return envUrl
  }
  return OSM_HOT_TILE_URL
}

export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
