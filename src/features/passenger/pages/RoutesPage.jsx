import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Route, Clock, ArrowRight } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'

export default function RoutesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { routes, schedules } = useDataStore()

  const schedulesByRoute = schedules.reduce((acc, s) => {
    acc[s.route_id] = s
    return acc
  }, {})

  return (
    <div className="space-y-3 pt-1 pb-4">
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-cobalt" />
          <h2 className="text-sm font-extrabold text-ink font-heading">{t('passenger.all_routes')}</h2>
        </div>
        <span className="text-xs font-bold text-text-secondary">
          {routes.length} active
        </span>
      </div>

      <div className="space-y-2">
        {routes.map((r) => {
          const sched = schedulesByRoute[r.id]
          const headway = sched?.headway_min || 15

          return (
            <div
              key={r.id}
              onClick={() => navigate(`/routes/${r.id}`)}
              role="button"
              tabIndex={0}
              className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition cursor-pointer flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <RouteBadge code={r.code} color={r.color} size="md" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-ink truncate">
                    {localName(r, i18n.language)}
                  </h4>
                  <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-text-secondary" />
                    <span>{t('passenger.headway', { min: headway })}</span>
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-page flex items-center justify-center text-text-secondary group-hover:bg-cobalt group-hover:text-white transition shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
