// High-performance Cloudflare CDN-backed Map Tiles with edge locations across India (~230ms vs 6,400ms on OSM France)
export const CARTO_VOYAGER_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
export const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export function getTileUrl(theme = 'light') {
  const isDark = theme === 'dark' || theme === 'blue'
  return isDark ? CARTO_DARK_URL : CARTO_VOYAGER_URL
}

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
