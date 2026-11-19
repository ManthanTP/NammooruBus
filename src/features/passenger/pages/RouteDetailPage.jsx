import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Calendar, MapPin } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'

export default function RouteDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { routes, routeStops, stops, schedules } = useDataStore()
  const { setRoute, setMarkers, fitBounds, clearMap } = useMapStore()

  const [dayType, setDayType] = useState('weekday') // 'weekday' | 'weekend'

  const route = routes.find((r) => r.id === id)

  // Ordered stops for this route
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

  // Draw route and markers on map
  useEffect(() => {
    if (orderedStops.length < 2) return

    const polyline = orderedStops.map((item) => [item.stop.lat, item.stop.lng])
    const markers = orderedStops.map((item, idx) => ({
      id: item.stop.id,
      lat: item.stop.lat,
      lng: item.stop.lng,
      type: idx === 0 ? 'pinA' : idx === orderedStops.length - 1 ? 'pinB' : 'stop',
      label: item.stop.name_en,
    }))

    setRoute(polyline, route?.color || '#3451F2')
    setMarkers(markers)
    fitBounds(polyline)

    return () => clearMap()
  }, [orderedStops, route, setRoute, setMarkers, fitBounds, clearMap])

  if (!route) {
    return (
      <div className="p-6 text-center text-xs text-text-secondary">
        Route not found
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate('/routes')}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <RouteBadge code={route.code} color={route.color} size="md" />
        <div className="w-10" />
      </div>

      {/* Route Title */}
      <div>
        <h2 className="text-base font-extrabold text-ink font-heading">
          {localName(route, i18n.language)}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {t('passenger.stops_count', { count: orderedStops.length })} &bull;{' '}
          {route.two_way ? 'Two-way service' : 'One-way service'}
        </p>
      </div>

      {/* Weekday / Weekend Toggle */}
      <div className="flex p-1 bg-page rounded-pill border border-line shadow-xs">
        {['weekday', 'weekend'].map((dt) => {
          const isSelected = dayType === dt
          return (
            <button
              key={dt}
              type="button"
              onClick={() => setDayType(dt)}
              className={`relative flex-1 py-1 text-xs font-bold rounded-pill capitalize transition-colors flex items-center justify-center gap-1 ${
                isSelected ? 'text-white' : 'text-text-secondary hover:text-ink'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="dayTypePill"
                  className="absolute inset-0 bg-cobalt rounded-pill -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Calendar className="w-3.5 h-3.5" />
              <span>{t(`passenger.${dt}`)}</span>
            </button>
          )
        })}
      </div>

      {/* Schedule Summary Banner */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-surface rounded-card border border-line text-center text-xs">
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase block">
            {t('passenger.first_bus')}
          </span>
          <span className="font-bold text-ink font-mono">
            {schedule?.first_bus ? schedule.first_bus.slice(0, 5) : '06:00'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase block">
            {t('passenger.last_bus')}
          </span>
          <span className="font-bold text-ink font-mono">
            {schedule?.last_bus ? schedule.last_bus.slice(0, 5) : '21:30'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase block">
            Headway
          </span>
          <span className="font-bold text-cobalt font-mono">
            {schedule?.headway_min ? `${schedule.headway_min}m` : '15m'}
          </span>
        </div>
      </div>

      {/* Ordered Stop Timeline */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
          Route Timeline ({orderedStops.length} stops)
        </h3>

        <div className="space-y-0">
          {orderedStops.map((item, idx) => {
            const isFirst = idx === 0
            const isLast = idx === orderedStops.length - 1

            return (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isFirst
                        ? 'bg-success text-white'
                        : isLast
                        ? 'bg-danger text-white'
                        : 'bg-page border-2 border-line text-ink'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-line my-1" />}
                </div>

                <div className={`pb-4 flex-1 min-w-0 ${!isLast ? '' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span
                      onClick={() => navigate(`/stops/${item.stop.id}`)}
                      className="text-xs font-bold text-ink hover:text-cobalt cursor-pointer truncate"
                    >
                      {localName(item.stop, i18n.language)}
                    </span>
                    <span className="text-[11px] text-text-secondary font-mono shrink-0 ml-2">
                      +{item.cumulativeMin}m
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary">
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
