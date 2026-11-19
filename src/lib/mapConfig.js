// Map configuration - OpenStreetMap Humanitarian (HOT) tiles
// Free, fast raster tiles with no API key or token required, per PRD Section 16 line 477.
export const OSM_HOT_TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'

export function getTileUrl() {
  const envUrl = import.meta.env.VITE_TILE_URL
  // If an explicit non-cartocdn URL is set in env, use it; otherwise default to OSM HOT
  if (envUrl && !envUrl.includes('cartocdn')) {
    return envUrl
  }
  return OSM_HOT_TILE_URL
}

export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">Humanitarian OpenStreetMap Team</a>'
