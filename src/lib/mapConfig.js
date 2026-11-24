// Official OpenStreetMap Fastly Anycast CDN tiles (100% free, NO API key required, NO watermark)
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export function getTileUrl() {
  const envUrl = import.meta.env.VITE_TILE_URL
  if (envUrl && !envUrl.includes('cartocdn')) {
    return envUrl
  }
  return OSM_TILE_URL
}

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
