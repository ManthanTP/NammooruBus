import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Sliders, Footprints, Bus, ArrowRight } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { haversine } from '@/lib/geo'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'

export default function NearbyPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops } = useDataStore()
  const { setCircle, setMarkers, setView, clearMap } = useMapStore()

  // Default to Hubballi city coordinates
  const [userLocation, setUserLocation] = useState({
    lat: parseFloat(import.meta.env.VITE_DEFAULT_LAT || '15.3647'),
    lng: parseFloat(import.meta.env.VITE_DEFAULT_LNG || '75.1240'),
  })
  const [radiusM, setRadiusM] = useState(1000) // Default 1000m (1 km)

  // Try GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        (err) => {
          console.warn('Geolocation denied, using default city center:', err.message)
        },
        { timeout: 5000 }
      )
    }
  }, [])

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
      const distKm = haversine(userLocation.lat, userLocation.lng, stop.lat, stop.lng)
      if (distKm <= radiusKm) {
        const distM = Math.round(distKm * 1000)
        const walkMin = Math.max(1, Math.round(distM / 80))
        list.push({
          ...stop,
          distM,
          distKm,
          walkMin,
          routesPassing: routesByStop[stop.id] || [],
        })
      }
    }

    return list.sort((a, b) => a.distM - b.distM)
  }, [stops, userLocation, radiusM, routesByStop])

  // Update circle and user marker on map
  useEffect(() => {
    setCircle({ lat: userLocation.lat, lng: userLocation.lng, radiusM })
    const markers = [
      {
        id: 'userLoc',
        lat: userLocation.lat,
        lng: userLocation.lng,
        type: 'user',
        label: 'You',
      },
      ...nearbyStops.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        type: 'stop',
        label: s.name_en,
      })),
    ]
    setMarkers(markers)
    setView([userLocation.lat, userLocation.lng], radiusM > 1500 ? 13 : 14)

    return () => clearMap()
  }, [userLocation, radiusM, nearbyStops, setCircle, setMarkers, setView, clearMap])

  return (
    <div className="space-y-3 pt-1">
      {/* Header and Radius Slider */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cobalt" />
            <h2 className="text-sm font-extrabold text-ink font-heading">{t('nav.nearby')}</h2>
          </div>
          <span className="text-xs font-bold text-cobalt font-mono bg-cobalt-tint px-2 py-0.5 rounded-pill">
            {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`}
          </span>
        </div>

        {/* Radius slider (300 m to 3000 m, 100 m steps) */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1">
            <span>300 m</span>
            <span>{t('passenger.nearby_radius', { radius: radiusM })}</span>
            <span>3 km</span>
          </div>
          <input
            type="range"
            min={300}
            max={3000}
            step={100}
            value={radiusM}
            onChange={(e) => setRadiusM(parseInt(e.target.value, 10))}
            className="w-full accent-cobalt cursor-pointer"
          />
        </div>
      </div>

      {/* Stop Cards List */}
      <div className="space-y-2 pb-4">
        {nearbyStops.length > 0 ? (
          nearbyStops.map((stop) => (
            <div
              key={stop.id}
              onClick={() => navigate(`/stops/${stop.id}`)}
              role="button"
              tabIndex={0}
              className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition cursor-pointer flex items-center justify-between group text-left"
            >
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="text-xs font-bold text-ink truncate mb-1">
                  {localName(stop, i18n.language)}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-text-secondary mb-2">
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <Footprints className="w-3.5 h-3.5 text-cobalt" />
                    {t('passenger.walking_time', { minutes: stop.walkMin })}
                  </span>
                  <span>&bull;</span>
                  <span>{stop.distM} m away</span>
                </div>

                {/* Passing routes badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {stop.routesPassing.map((code) => (
                    <RouteBadge key={code} code={code} size="xs" />
                  ))}
                  {stop.routesPassing.length === 0 && (
                    <span className="text-[10px] text-text-secondary">No active routes</span>
                  )}
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-page flex items-center justify-center text-text-secondary group-hover:bg-cobalt group-hover:text-white transition shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 bg-surface rounded-card border border-line text-center text-xs text-text-secondary">
            No stops found within {radiusM} meters. Increase the slider to expand the search radius.
          </div>
        )}
      </div>
    </div>
  )
}
