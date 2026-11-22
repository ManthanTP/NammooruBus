// Map configuration - OpenStreetMap Humanitarian (HOT) tiles & Carto Dark tiles
export const OSM_HOT_TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
export const CARTO_DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export function getTileUrl(isDark = false) {
  if (isDark) {
    return import.meta.env.VITE_TILE_URL_DARK || CARTO_DARK_TILE_URL
  }
  const envUrl = import.meta.env.VITE_TILE_URL
  if (envUrl && !envUrl.includes('cartocdn')) {
    return envUrl
  }
  return OSM_HOT_TILE_URL
}

export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
