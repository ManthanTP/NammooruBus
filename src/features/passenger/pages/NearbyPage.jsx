import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MapPin,
  Footprints,
  Navigation,
  ArrowRight,
  ExternalLink,
  X,
  Compass,
  Bus,
} from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useLocationStore } from '@/store/locationStore'
import { haversine } from '@/lib/geo'
import { localName } from '@/lib/formatters'
import { fetchWalkingRoute } from '@/lib/roadRouting'
import RouteBadge from '@/components/ui/RouteBadge'
import MapCard from '@/components/map/MapCard'
import LocationBanner from '@/components/ui/LocationBanner'
import Button from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'

export default function NearbyPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops } = useDataStore()
  const { setCircle, setMarkers, setView, setCenter, setJourneyLegs, fitBounds, setBounds, clearMap } =
    useMapStore()
  const { position: userPos, start: startLocationWatcher } = useLocationStore()

  const [activeWalkingStop, setActiveWalkingStop] = useState(null)
  const [walkingInfo, setWalkingInfo] = useState(null)
  const [showLocationBanner, setShowLocationBanner] = useState(false)

  const parsedLat = parseFloat(import.meta.env.VITE_DEFAULT_LAT)
  const parsedLng = parseFloat(import.meta.env.VITE_DEFAULT_LNG)
  const defaultLat = !Number.isNaN(parsedLat) && Number.isFinite(parsedLat) ? parsedLat : 15.3647
  const defaultLng = !Number.isNaN(parsedLng) && Number.isFinite(parsedLng) ? parsedLng : 75.124

  const hasValidUserPos =
    userPos?.lat !== undefined &&
    userPos?.lng !== undefined &&
    !Number.isNaN(Number(userPos.lat)) &&
    !Number.isNaN(Number(userPos.lng))

  const uLat = hasValidUserPos ? Number(userPos.lat) : defaultLat
  const uLng = hasValidUserPos ? Number(userPos.lng) : defaultLng

  const distFromCity = hasValidUserPos ? haversine(uLat, uLng, defaultLat, defaultLng) : 0
  const isOutsideCity = distFromCity > 35

  const centerLat = !isOutsideCity && hasValidUserPos ? uLat : defaultLat
  const centerLng = !isOutsideCity && hasValidUserPos ? uLng : defaultLng

  // Filter chips: 300m, 500m, 1 km, 2 km
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

    if (!activeWalkingStop) {
      const setCoord = setView || setCenter
      if (typeof setCoord === 'function') {
        setCoord([centerLat, centerLng], 14)
      }
    }
  }, [centerLat, centerLng, radiusM, nearbyStops, setCircle, setMarkers, setCenter, setView, activeWalkingStop])

  // Clear walking legs when unmounting
  useEffect(() => {
    return () => {
      setJourneyLegs([])
    }
  }, [setJourneyLegs])

  const handleDirections = async (e, stop) => {
    e.stopPropagation()

    if (!hasValidUserPos) {
      setShowLocationBanner(true)
      startLocationWatcher()
      toast.info('toast.location_denied')
      return
    }

    try {
      const userCoord = { lat: uLat, lng: uLng }
      const stopCoord = { lat: stop.lat, lng: stop.lng }
      const walkResult = await fetchWalkingRoute(userCoord, stopCoord)

      if (walkResult && walkResult.polyline) {
        setJourneyLegs([
          {
            type: 'walk',
            polyline: walkResult.polyline,
            distanceMeters: walkResult.distanceMeters,
            walkMinutes: walkResult.walkMinutes,
            midpoint: walkResult.midpoint,
            isApproximate: walkResult.isApproximate,
          },
        ])

        const fit = fitBounds || setBounds
        if (typeof fit === 'function') {
          fit([
            [uLat, uLng],
            [stop.lat, stop.lng],
          ])
        }

        setActiveWalkingStop(stop)
        setWalkingInfo(walkResult)
      }
    } catch (err) {
      console.warn('Failed to calculate walking route:', err)
      toast.error('toast.network_error')
    }
  }

  const handleClearWalking = () => {
    setActiveWalkingStop(null)
    setWalkingInfo(null)
    setJourneyLegs([])
  }

  return (
    <div className="space-y-3.5 pb-24">
      {/* 1. Header */}
      <div className="pt-1">
        <h1 className="font-heading font-extrabold text-xl text-text flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber fill-amber/20" />
          <span>{t('nav.nearby') || 'Nearby Stops'}</span>
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {nearbyStops.length} stops within {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}
          {isOutsideCity && ' • Hubballi Center view'}
        </p>
      </div>

      {/* 2. Map Card */}
      <MapCard height={260} />

      {/* 3. Location Banner */}
      {(!hasValidUserPos || showLocationBanner) && <LocationBanner />}

      {/* 4. Active Walking Directions Floating Card */}
      {activeWalkingStop && walkingInfo && (
        <div className="p-4 bg-surface rounded-[20px] border-2 border-brand shadow-card flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs"
                style={{ background: 'var(--gradient-brand)' }}
              >
                <Footprints className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded-full bg-surface-2 border border-line">
                    Walking Directions
                  </span>
                </div>
                <h3 className="text-sm font-heading font-bold text-text truncate mt-1">
                  {localName(activeWalkingStop, i18n.language)}
                </h3>
                <p className="text-xs text-muted font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="text-text font-bold">{walkingInfo.walkMinutes} min walk</span>
                  <span>•</span>
                  <span>{walkingInfo.distanceMeters} meters</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearWalking}
              aria-label="Close directions"
              className="p-1 rounded-full text-muted hover:text-text hover:bg-surface-2 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-line">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeWalkingStop.lat},${activeWalkingStop.lng}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] flex-1 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-2 border border-line text-text hover:border-brand flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand" />
              <span>Open in Google Maps</span>
            </a>
            <button
              type="button"
              onClick={() => navigate(`/search?from=${activeWalkingStop.id}`)}
              className="min-h-[38px] flex-1 px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Buses from here</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Distance Filter Chip Row: 300m, 500m, 1km, 2km */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar select-none">
        <span className="text-xs font-bold text-muted shrink-0">Radius:</span>
        {[300, 500, 1000, 2000].map((m) => {
          const isSelected = radiusM === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => setRadiusM(m)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${isSelected
                ? 'text-white shadow-xs'
                : 'bg-surface text-muted border border-line hover:text-text hover:bg-surface-2'
                }`}
              style={isSelected ? { background: 'var(--gradient-brand)' } : {}}
            >
              {m >= 1000 ? `${m / 1000} km` : `${m} m`}
            </button>
          )
        })}
      </div>

      {/* 6. Nearby Stops List */}
      <div className="space-y-3 pt-1">
        {nearbyStops.length === 0 ? (
          <div className="p-8 bg-surface rounded-[20px] border border-line text-center text-xs text-muted shadow-card">
            No stops found within {radiusM}m. Try selecting a larger radius above.
          </div>
        ) : (
          nearbyStops.map((stop) => {
            const isSelected = activeWalkingStop?.id === stop.id

            return (
              <div
                key={stop.id}
                className={`p-4 bg-surface rounded-[20px] border transition-all flex flex-col gap-3 shadow-card ${isSelected ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-brand/50'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber/15 text-navy-900 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-amber fill-amber/20" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text font-heading truncate">
                        {localName(stop, i18n.language)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted flex items-center gap-1 font-medium">
                          <Footprints className="w-3.5 h-3.5 text-muted" />
                          <span>
                            {stop.walkMin} min walk ({stop.distMeters} m)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Directions Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDirections(e, stop)}
                    className="min-h-[36px] px-3.5 py-1.5 text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition shrink-0 active:scale-95 cursor-pointer shadow-xs"
                    style={{ background: 'var(--gradient-brand)' }}
                  >
                    <Navigation className="w-3.5 h-3.5 fill-white/20" />
                    <span>Directions</span>
                  </button>
                </div>

                {/* Multi-action buttons per item 4 */}
                <div className="flex items-center gap-2 pt-1 border-t border-line/60 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate(`/search?from=${stop.id}`)}
                    className="min-h-[32px] px-3 py-1 bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-text rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <span>Buses from here to...</span>
                    <ArrowRight className="w-3 h-3 text-muted" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/stops/${stop.id}`)}
                    className="min-h-[32px] px-3 py-1 bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-muted hover:text-text rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <Bus className="w-3 h-3 text-muted" />
                    <span>Buses from this stop</span>
                  </button>
                </div>

                {/* Next buses chips */}
                {stop.routes.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-line/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted mr-1">
                      Routes:
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
            )
          })
        )}
      </div>
    </div>
  )
}
