// Humanitarian OpenStreetMap (HOT) tiles - fast loading, high road contrast, 100% free, NO API key required
export const OSM_HOT_TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
export const OSM_TILE_URL = OSM_HOT_TILE_URL

export function getTileUrl() {
  const envUrl = import.meta.env.VITE_TILE_URL
  if (envUrl && !envUrl.includes('cartocdn') && !envUrl.includes('tile.openstreetmap.org')) {
    return envUrl
  }
  return OSM_HOT_TILE_URL
}

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/">HOT</a>'
