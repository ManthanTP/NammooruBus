// Map configuration and fallback tile settings
export const DEFAULT_CARTO_API_KEY = 'cb1_5ce8_1_212ae98d055bc2a63bdcc185'

export function getTileUrl() {
  const envUrl = import.meta.env.VITE_TILE_URL
  if (envUrl && (envUrl.includes('api_key=') || envUrl.includes('key='))) {
    return envUrl
  }
  const key = import.meta.env.VITE_CARTO_API_KEY || DEFAULT_CARTO_API_KEY
  const base = envUrl || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}api_key=${key}`
}

export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
