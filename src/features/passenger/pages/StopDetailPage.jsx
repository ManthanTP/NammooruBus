import { useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Clock, Search } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'

export default function StopDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops, schedules } = useDataStore()
  const { setMarkers, setView, clearMap } = useMapStore()

  const stop = stops.find((s) => s.id === id)

  // Find all routes that pass this stop
  const passingRoutes = useMemo(() => {
    const list = []
    for (const rs of routeStops) {
      if (rs.stop_id === id) {
        const routeObj = routes.find((r) => r.id === rs.route_id)
        if (routeObj && !list.some((item) => item.route.id === routeObj.id)) {
          const sched = schedules.find((s) => s.route_id === routeObj.id && s.day_type === 'weekday')
          list.push({
            route: routeObj,
            seq: rs.seq,
            distKm: rs.dist_km,
            minFromPrev: rs.min_from_prev,
            headway: sched?.headway_min || 15,
          })
        }
      }
    }
    return list
  }, [id, routeStops, routes, schedules])

  // Center map on stop
  useEffect(() => {
    if (stop) {
      setMarkers([
        {
          id: stop.id,
          lat: stop.lat,
          lng: stop.lng,
          type: 'stop',
          label: stop.name_en,
        },
      ])
      setView([stop.lat, stop.lng], 15)
    }
    return () => clearMap()
  }, [stop, setMarkers, setView, clearMap])

  if (!stop) {
    return (
      <div className="p-6 text-center text-xs text-text-secondary">
        Stop not found
      </div>
    )
  }

  const handleStartSearchFromHere = () => {
    navigate(`/search?from=${stop.id}`)
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-xs font-heading">Stop Timetable</span>
        <div className="w-10" />
      </div>

      {/* Stop Information Card */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-cobalt text-white flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-ink font-heading truncate">
              {localName(stop, i18n.language)}
            </h2>
            <p className="text-xs text-text-secondary">
              {i18n.language === 'kn' ? stop.name_en : stop.name_kn || ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartSearchFromHere}
          className="mt-4 w-full py-2.5 bg-cobalt-tint text-cobalt text-xs font-bold rounded-input border border-cobalt/20 hover:bg-cobalt hover:text-white transition flex items-center justify-center gap-2"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search buses from this stop</span>
        </button>
      </div>

      {/* Routes Passing with Next 3 Estimated Arrivals */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
          {t('passenger.routes_passing')} ({passingRoutes.length})
        </h3>

        <div className="space-y-2">
          {passingRoutes.map(({ route, headway }) => (
            <Link
              key={route.id}
              to={`/routes/${route.id}`}
              className="block p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RouteBadge code={route.code} color={route.color} size="sm" />
                  <span className="text-xs font-bold text-ink truncate">
                    {localName(route, i18n.language)}
                  </span>
                </div>
                <span className="text-[11px] text-text-secondary">
                  Every {headway}m
                </span>
              </div>

              {/* Next 3 Departures / Arrivals */}
              <div className="flex items-center gap-2 pt-1 border-t border-line text-[11px]">
                <span className="text-text-secondary">Upcoming:</span>
                <span className="px-2 py-0.5 bg-page rounded-pill font-mono font-bold text-ink">
                  in 5m
                </span>
                <span className="px-2 py-0.5 bg-page rounded-pill font-mono font-bold text-ink">
                  in {headway}m
                </span>
                <span className="px-2 py-0.5 bg-page rounded-pill font-mono font-bold text-ink">
                  in {headway * 2}m
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
