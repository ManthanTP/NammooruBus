import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, LayoutGroup } from 'framer-motion'
import { ArrowLeft, Clock, Calendar, MapPin } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { localName } from '@/lib/formatters'
import { fetchDrivingRoute } from '@/lib/roadRouting'
import RouteBadge from '@/components/ui/RouteBadge'
import MapCard from '@/components/map/MapCard'
import Skeleton from '@/components/ui/Skeleton'
import SegmentedControl from '@/components/ui/SegmentedControl'

export default function RouteDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { routes, routeStops, stops, schedules, loading: storeLoading, initData } = useDataStore()
  const { setRoute, setMarkers, fitBounds, clearMap } = useMapStore()

  const [dayType, setDayType] = useState('weekday') // 'weekday' | 'weekend'

  useEffect(() => {
    if (stops.length === 0 && !storeLoading) {
      initData()
    }
  }, [stops.length, storeLoading, initData])

  const route = routes.find((r) => r.id === id)

  const orderedStops = useMemo(() => {
    const list = routeStops.filter((rs) => rs.route_id === id).sort((a, b) => a.seq - b.seq)
    let cumulativeMin = 0
    let cumulativeKm = 0

    return list.map((rs) => {
      const stopObj = stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id, name_en: 'Stop' }
      cumulativeMin += Number(rs.min_from_prev || 0)
      cumulativeKm += Number(rs.dist_km || 0)

      return {
        ...rs,
        stop: stopObj,
        cumulativeMin,
        cumulativeKm: Math.round(cumulativeKm * 10) / 10,
      }
    })
  }, [routeStops, stops, id])

  const schedule = schedules.find((s) => s.route_id === id && s.day_type === dayType)

  useEffect(() => {
    if (orderedStops.length < 2) return

    let cancelled = false
    const straightLine = orderedStops.map((item) => [item.stop.lat, item.stop.lng])
    const markers = orderedStops.map((item, idx) => ({
      id: item.stop.id,
      lat: item.stop.lat,
      lng: item.stop.lng,
      type: idx === 0 ? 'pinA' : idx === orderedStops.length - 1 ? 'pinB' : 'stop',
      label: item.stop.name_en,
    }))

    setMarkers(markers)

    let precomputed = null
    if (Array.isArray(route?.geometry) && route.geometry.length > 1) {
      precomputed = route.geometry
    } else if (route?.geometry?.coordinates && Array.isArray(route.geometry.coordinates)) {
      precomputed = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    }

    if (precomputed && precomputed.length > 1) {
      setRoute(precomputed, '#0040FF', false)
      fitBounds(precomputed)
    } else {
      setRoute(straightLine, '#0040FF', true)
      fitBounds(straightLine)

      fetchDrivingRoute(straightLine).then((res) => {
        if (!cancelled && res?.polyline && res.polyline.length > 1) {
          setRoute(res.polyline, '#0040FF', res.isApproximate)
          fitBounds(res.polyline)
        }
      })
    }

    return () => {
      cancelled = true
      clearMap()
    }
  }, [orderedStops, route, setRoute, setMarkers, fitBounds, clearMap])

  if (!route && (storeLoading || stops.length === 0)) {
    return (
      <div className="space-y-4 pt-1 pb-6">
        <Skeleton height="36px" width="160px" />
        <Skeleton height="240px" />
        <Skeleton height="100px" />
      </div>
    )
  }

  if (!route) {
    return (
      <div className="p-8 text-center text-xs text-muted">
        Route not found
      </div>
    )
  }

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Coloured Header with Badge */}
      <div
        className="rounded-[20px] p-4 text-white shadow-soft flex items-center justify-between"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/routes')}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-95 shrink-0"
          title="Back to routes"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center min-w-0 px-2 flex-1">
          <h2 className="font-heading font-extrabold text-base text-white truncate">
            {localName(route, i18n.language)}
          </h2>
          <span className="text-[11px] text-white/70 block mt-0.5">
            {orderedStops.length} stops &bull; {route.two_way ? 'Two-way service' : 'One-way service'}
          </span>
        </div>

        <RouteBadge code={route.code} size="md" />
      </div>

      {/* 2. Small Map Card (Height 240px on Route Detail per Section 3) */}
      <MapCard height={240} />

      {/* 3. Weekday / Weekend Segmented Pill */}
      <SegmentedControl
        options={[
          { key: 'weekday', label: t('passenger.weekday') || 'Weekday', icon: Calendar },
          { key: 'weekend', label: t('passenger.weekend') || 'Weekend', icon: Calendar },
        ]}
        value={dayType}
        onChange={setDayType}
        ariaLabel="Schedule day type"
      />

      {/* 4. Schedule Summary Stat Row */}
      <div className="grid grid-cols-3 gap-2 p-3.5 bg-surface rounded-[20px] border border-line shadow-soft text-center text-xs">
        <div>
          <span className="text-[10px] font-bold text-muted uppercase block">
            {t('passenger.first_bus') || 'First Bus'}
          </span>
          <span className="font-extrabold text-text font-mono text-sm block mt-0.5">
            {schedule?.first_bus ? schedule.first_bus.slice(0, 5) : '06:00'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-muted uppercase block">
            {t('passenger.last_bus') || 'Last Bus'}
          </span>
          <span className="font-extrabold text-text font-mono text-sm block mt-0.5">
            {schedule?.last_bus ? schedule.last_bus.slice(0, 5) : '21:30'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-muted uppercase block">
            Headway
          </span>
          <span className="font-extrabold text-brand font-mono text-sm block mt-0.5">
            {schedule?.headway_min ? `${schedule.headway_min}m` : '15m'}
          </span>
        </div>
      </div>

      {/* 5. Stop Timeline on the Road Rail */}
      <div className="p-4 bg-surface rounded-[20px] border border-line shadow-soft space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
          Route Timeline ({orderedStops.length} stops)
        </h3>

        <div className="relative pl-6 space-y-4">
          {/* Vertical signature road rail */}
          <div
            className="absolute left-2.5 top-2 bottom-2 w-1.5 bg-sky-100 rounded-full"
            style={{
              backgroundImage: 'repeating-linear-gradient(180deg, var(--cobalt-500) 0px, var(--cobalt-500) 4px, transparent 4px, transparent 8px)'
            }}
          />

          {orderedStops.map((item, idx) => {
            const isFirst = idx === 0
            const isLast = idx === orderedStops.length - 1

            return (
              <div key={item.id} className="relative flex items-start gap-3">
                {/* Timeline node */}
                <div className="absolute -left-6 top-0.5 flex items-center justify-center">
                  {isFirst ? (
                    <div className="w-5 h-5 rounded-full bg-cobalt-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      A
                    </div>
                  ) : isLast ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center text-[10px] font-bold shadow-xs">
                      B
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cobalt-500 shadow-xs" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      onClick={() => navigate(`/stops/${item.stop.id}`)}
                      className="text-xs font-bold text-ink-950 hover:text-cobalt-500 cursor-pointer truncate font-heading"
                    >
                      {localName(item.stop, i18n.language)}
                    </span>
                    <span className="text-[11px] text-muted font-mono shrink-0 ml-2">
                      +{item.cumulativeMin}m
                    </span>
                  </div>
                  <span className="text-[10px] text-muted block mt-0.5">
                    {item.cumulativeKm} km from start
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
