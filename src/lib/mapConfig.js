/**
 * Map Providers Configuration (Locked per Phase 8 Item 3)
 * Ordered list of key-free providers with measured real-world latency.
 *
 * Measured Latency (Hubballi z14-z16, 10 tiles):
 * 1. OSM Standard (tile.openstreetmap.org): 19.5 ms median (100% 200 OK) -> DEFAULT
 * 2. OSM Humanitarian HOT (tile.openstreetmap.fr/hot): 137 ms median (404 errors) -> FALLBACK ONLY
 */
export const TILE_PROVIDERS = [
  {
    id: 'osm-standard',
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  {
    id: 'osm-hot',
    name: 'Humanitarian HOT',
    url: 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/" target="_blank" rel="noopener noreferrer">HOT</a>',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
]

export const DEFAULT_PROVIDER = TILE_PROVIDERS[0]
export const OSM_TILE_URL = DEFAULT_PROVIDER.url
export const TILE_ATTRIBUTION = DEFAULT_PROVIDER.attribution

export function getTileUrl() {
  return DEFAULT_PROVIDER.url
}
