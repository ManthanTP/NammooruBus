import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Footprints, Bus, ArrowRight } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useLocationStore } from '@/store/locationStore'
import { haversine } from '@/lib/geo'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import MapCard from '@/components/map/MapCard'
import LocationBanner from '@/components/ui/LocationBanner'

export default function NearbyPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops } = useDataStore()
  const { setCircle, setMarkers, setView, setCenter } = useMapStore()
  const { position: userPos } = useLocationStore()

  const parsedLat = parseFloat(import.meta.env.VITE_DEFAULT_LAT)
  const parsedLng = parseFloat(import.meta.env.VITE_DEFAULT_LNG)
  const defaultLat = !Number.isNaN(parsedLat) && Number.isFinite(parsedLat) ? parsedLat : 15.3647
  const defaultLng = !Number.isNaN(parsedLng) && Number.isFinite(parsedLng) ? parsedLng : 75.1240

  const hasValidUserPos =
    userPos?.lat !== undefined &&
    userPos?.lng !== undefined &&
    !Number.isNaN(Number(userPos.lat)) &&
    !Number.isNaN(Number(userPos.lng))

  const uLat = hasValidUserPos ? Number(userPos.lat) : defaultLat
  const uLng = hasValidUserPos ? Number(userPos.lng) : defaultLng

  // If user GPS is outside Hubballi (>35 km), fall back to Hubballi center so stops are visible
  const distFromCity = hasValidUserPos ? haversine(uLat, uLng, defaultLat, defaultLng) : 0
  const isOutsideCity = distFromCity > 35

  const centerLat = (!isOutsideCity && hasValidUserPos) ? uLat : defaultLat
  const centerLng = (!isOutsideCity && hasValidUserPos) ? uLng : defaultLng

  const [radiusM, setRadiusM] = useState(1000) // Default 1000m (1 km)

  // Map route badges per stop
  const routesByStop = useMemo(() => {
    const map = {}
    for (const rs of routeStops) {
      if (!map[rs.stop_id]) map[rs.stop_id] = new Set()
      const r = routes.find((route) => route.id === rs.route_id)
      if (r) map[rs.stop_id].add(r.code)
    }
    const result = {}
    for (const stopId in map) {
      result[stopId] = Array.from(map[stopId])
    }
    return result
  }, [routes, routeStops])

  // Compute nearby stops
  const nearbyStops = useMemo(() => {
    const radiusKm = radiusM / 1000
    const list = []

    for (const stop of stops) {
      if (!stop.lat || !stop.lng) continue
      const distKm = haversine(centerLat, centerLng, stop.lat, stop.lng)
      if (distKm <= radiusKm) {
        list.push({
          ...stop,
          distKm,
          walkMin: Math.max(1, Math.round((distKm * 1000) / 80)), // 80 m/min
          distMeters: Math.round(distKm * 1000),
          routes: routesByStop[stop.id] || [],
        })
      }
    }

    return list.sort((a, b) => a.distKm - b.distKm)
  }, [stops, centerLat, centerLng, radiusM, routesByStop])

  // Update map radius and stop markers
  useEffect(() => {
    if (typeof setCircle === 'function') {
      setCircle({ lat: centerLat, lng: centerLng, radiusM })
    }

    const markers = nearbyStops.map((stop) => ({
      id: stop.id,
      lat: stop.lat,
      lng: stop.lng,
      type: 'stop',
      label: stop.name_en,
    }))
    if (typeof setMarkers === 'function') {
      setMarkers(markers)
    }

    const setCoord = setView || setCenter
    if (typeof setCoord === 'function') {
      setCoord([centerLat, centerLng], 14)
    }
  }, [centerLat, centerLng, radiusM, nearbyStops, setCircle, setMarkers, setCenter, setView])

  return (
    <div className="space-y-3.5 pt-1 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-extrabold text-ink font-heading flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cobalt" />
          <span>{t('nav.nearby')}</span>
        </h1>
        <p className="text-xs text-text-secondary">
          {nearbyStops.length} stops within {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}
          {isOutsideCity && ' • Showing Hubballi Center (Outside city)'}
        </p>
      </div>

      {/* Small Map Card (Height 260px on Nearby per Part B) */}
      <MapCard height={260} />

      {/* Location Banner if GPS is not active */}
      <LocationBanner />

      {/* Radius Filter Pills */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-text-secondary">Radius:</span>
        {[500, 1000, 2000].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setRadiusM(m)}
            className={`px-3 py-1 rounded-pill text-xs font-bold transition ${
              radiusM === m
                ? 'bg-cobalt text-white shadow-xs'
                : 'bg-surface text-text-secondary border border-line hover:text-ink'
            }`}
          >
            {m >= 1000 ? `${m / 1000} km` : `${m} m`}
          </button>
        ))}
      </div>

      {/* Nearby Stops List */}
      <div className="space-y-2 pt-1">
        {nearbyStops.length === 0 ? (
          <div className="p-8 bg-surface rounded-card border border-line text-center text-xs text-text-secondary">
            No stops found within {radiusM}m. Try increasing the search radius above.
          </div>
        ) : (
          nearbyStops.map((stop) => (
            <div
              key={stop.id}
              onClick={() => navigate(`/stops/${stop.id}`)}
              role="button"
              tabIndex={0}
              className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-ink truncate">
                    {localName(stop, i18n.language)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-text-secondary flex items-center gap-1">
                      <Footprints className="w-3 h-3" />
                      <span>{stop.walkMin} min walk ({stop.distMeters} m)</span>
                    </span>
                  </div>

                  {stop.routes.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {stop.routes.slice(0, 4).map((code) => (
                        <RouteBadge key={code} code={code} size="xs" />
                      ))}
                      {stop.routes.length > 4 && (
                        <span className="text-[9px] text-text-secondary font-medium">
                          +{stop.routes.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-text-secondary shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
