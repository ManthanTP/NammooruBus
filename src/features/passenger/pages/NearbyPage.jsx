import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Footprints, Navigation, ArrowRight } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useLocationStore } from '@/store/locationStore'
import { haversine } from '@/lib/geo'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import MapCard from '@/components/map/MapCard'
import LocationBanner from '@/components/ui/LocationBanner'
import Button from '@/components/ui/Button'

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

  const distFromCity = hasValidUserPos ? haversine(uLat, uLng, defaultLat, defaultLng) : 0
  const isOutsideCity = distFromCity > 35

  const centerLat = (!isOutsideCity && hasValidUserPos) ? uLat : defaultLat
  const centerLng = (!isOutsideCity && hasValidUserPos) ? uLng : defaultLng

  // Filter chips: 300m, 500m, 1 km, 2 km per Section 6
  const [radiusM, setRadiusM] = useState(500)

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
          walkMin: Math.max(1, Math.round((distKm * 1000) / 80)),
          distMeters: Math.round(distKm * 1000),
          routes: routesByStop[stop.id] || [],
        })
      }
    }

    return list.sort((a, b) => a.distKm - b.distKm)
  }, [stops, centerLat, centerLng, radiusM, routesByStop])

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

  const handleDirections = (e, stop) => {
    e.stopPropagation()
    navigate(`/results?to=${stop.id}`)
  }

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Header */}
      <div className="pt-1">
        <h1 className="font-heading font-extrabold text-xl text-ink-950 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <span>{t('nav.nearby') || 'Nearby Stops'}</span>
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {nearbyStops.length} stops within {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}
          {isOutsideCity && ' • Hubballi Center view'}
        </p>
      </div>

      {/* 2. Map Card (Height 260px on Nearby per Section 3) */}
      <MapCard height={260} />

      {/* 3. Location Banner */}
      <LocationBanner />

      {/* 4. Distance Filter Chip Row: 300m, 500m, 1km, 2km */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar select-none">
        <span className="text-xs font-bold text-muted shrink-0">Radius:</span>
        {[300, 500, 1000, 2000].map((m) => {
          const isSelected = radiusM === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => setRadiusM(m)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                isSelected
                  ? 'text-white shadow-xs'
                  : 'bg-white text-muted border border-line hover:text-ink-950'
              }`}
              style={isSelected ? { background: 'var(--gradient-brand)' } : {}}
            >
              {m >= 1000 ? `${m / 1000} km` : `${m} m`}
            </button>
          )
        })}
      </div>

      {/* 5. Nearby Stops List */}
      <div className="space-y-2.5 pt-1">
        {nearbyStops.length === 0 ? (
          <div className="p-8 bg-white rounded-[20px] border border-line text-center text-xs text-muted shadow-soft">
            No stops found within {radiusM}m. Try selecting a larger radius above.
          </div>
        ) : (
          nearbyStops.map((stop) => (
            <div
              key={stop.id}
              onClick={() => navigate(`/stops/${stop.id}`)}
              role="button"
              tabIndex={0}
              className="p-4 bg-white rounded-[20px] border border-line shadow-soft hover:border-cobalt-500 transition-all flex flex-col gap-3 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-navy-900 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-amber-600 fill-amber-500/20" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-ink-950 font-heading truncate">
                      {localName(stop, i18n.language)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1 font-medium">
                        <Footprints className="w-3.5 h-3.5 text-muted" />
                        <span>{stop.walkMin} min walk ({stop.distMeters} m)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Directions Button */}
                <button
                  type="button"
                  onClick={(e) => handleDirections(e, stop)}
                  className="px-3 py-1.5 bg-sky-100 hover:bg-sky-100/80 text-cobalt-500 text-xs font-bold rounded-full flex items-center gap-1 transition shrink-0 active:scale-95"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Directions</span>
                </button>
              </div>

              {/* Next buses chips */}
              {stop.routes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-line/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted mr-1">
                    Buses:
                  </span>
                  {stop.routes.slice(0, 5).map((code) => (
                    <RouteBadge key={code} code={code} size="xs" />
                  ))}
                  {stop.routes.length > 5 && (
                    <span className="text-[10px] text-muted font-semibold">
                      +{stop.routes.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
