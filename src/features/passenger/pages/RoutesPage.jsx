import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Route, Clock, ArrowRight, Search } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import MapCard from '@/components/map/MapCard'

export default function RoutesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { routes, schedules, routeStops, stops } = useDataStore()
  const [searchTerm, setSearchTerm] = useState('')

  const schedulesByRoute = useMemo(() => {
    return schedules.reduce((acc, s) => {
      acc[s.route_id] = s
      return acc
    }, {})
  }, [schedules])

  // Get terminal stops for each route
  const terminalStopsByRoute = useMemo(() => {
    const map = {}
    for (const r of routes) {
      const rStops = routeStops
        .filter((rs) => rs.route_id === r.id)
        .sort((a, b) => a.seq - b.seq)
      if (rStops.length >= 2) {
        const first = stops.find((s) => s.id === rStops[0].stop_id)
        const last = stops.find((s) => s.id === rStops[rStops.length - 1].stop_id)
        map[r.id] = {
          from: first ? localName(first, i18n.language) : '',
          to: last ? localName(last, i18n.language) : '',
        }
      }
    }
    return map
  }, [routes, routeStops, stops, i18n.language])

  const filteredRoutes = useMemo(() => {
    if (!searchTerm.trim()) return routes
    const term = searchTerm.toLowerCase()
    return routes.filter((r) => {
      const codeMatch = r.code?.toLowerCase().includes(term)
      const nameMatch = r.name_en?.toLowerCase().includes(term) || r.name_kn?.toLowerCase().includes(term)
      const terminals = terminalStopsByRoute[r.id]
      const termMatch =
        terminals?.from?.toLowerCase().includes(term) ||
        terminals?.to?.toLowerCase().includes(term)
      return codeMatch || nameMatch || termMatch
    })
  }, [routes, searchTerm, terminalStopsByRoute])

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Header */}
      <div className="pt-1">
        <h1 className="font-heading font-extrabold text-xl text-ink-950 flex items-center gap-2">
          <Route className="w-5 h-5 text-cobalt-500" />
          <span>{t('passenger.all_routes') || 'Bus Routes'}</span>
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {routes.length} operational routes across Hubballi-Dharwad
        </p>
      </div>

      {/* 2. Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search route code or destination..."
          className="w-full h-12 bg-surface rounded-full pl-10 pr-4 text-xs font-semibold text-text border border-line shadow-xs focus:outline-none focus:border-brand transition"
        />
      </div>

      {/* 3. Small Map Card */}
      <MapCard height={200} />

      {/* 4. Routes List */}
      <div className="space-y-2.5 pt-1">
        {filteredRoutes.map((r) => {
          const sched = schedulesByRoute[r.id]
          const headway = sched?.headway_min || 15
          const firstBus = sched?.first_bus ? sched.first_bus.slice(0, 5) : '06:00'
          const lastBus = sched?.last_bus ? sched.last_bus.slice(0, 5) : '21:30'
          const terminals = terminalStopsByRoute[r.id]

          return (
            <div
              key={r.id}
              onClick={() => navigate(`/routes/${r.id}`)}
              role="button"
              tabIndex={0}
              className="p-4 bg-surface rounded-[20px] border border-line shadow-soft hover:border-brand transition-all cursor-pointer flex flex-col gap-3 group text-left active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <RouteBadge code={r.code} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-ink-950 font-heading truncate">
                      {localName(r, i18n.language)}
                    </h3>
                    {terminals?.from && terminals?.to && (
                      <p className="text-xs text-muted truncate mt-0.5">
                        {terminals.from} &rarr; {terminals.to}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-sky-50 group-hover:bg-cobalt-500 text-muted group-hover:text-white flex items-center justify-center transition shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Headway & Operating Hours Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
                <span className="text-[11px] font-bold text-cobalt-500 bg-sky-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cobalt-500" />
                  <span>Every {headway} min</span>
                </span>
                <span className="text-[11px] font-medium text-muted">
                  {firstBus} - {lastBus}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
