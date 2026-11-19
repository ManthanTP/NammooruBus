import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Radio, MapPin, Clock, History, AlertTriangle, X, ArrowRight } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useLiveStore } from '@/store/liveStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops, schedules, initData } = useDataStore()
  const { getActiveCount, isReconnecting } = useLiveStore()

  const liveCount = getActiveCount()

  const [showAlert, setShowAlert] = useState(true)
  const [recentSearches, setRecentSearches] = useState([])

  useEffect(() => {
    initData()
    try {
      const recents = JSON.parse(localStorage.getItem('nb_recent') || '[]')
      setRecentSearches(recents.slice(0, 5))
    } catch (e) {
      console.warn('Error reading recent searches:', e)
    }
  }, [initData])

  const handleClearRecents = (e) => {
    e.stopPropagation()
    localStorage.removeItem('nb_recent')
    setRecentSearches([])
  }

  const handleRecentClick = (recent) => {
    navigate(`/results?from=${recent.fromId}&to=${recent.toId}`)
  }

  // Sample "Arriving near you" stops (first 4 stops from master data)
  const arrivingStops = stops.slice(0, 4)

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Dismissible Alert Banner */}
      {showAlert && (
        <div className="p-3 bg-warning/15 border border-warning/30 rounded-card flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-ink">Service Notice</p>
              <p className="text-[11px] text-text-secondary leading-tight mt-0.5">
                Route 201 operating on schedule. Peak frequency active.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAlert(false)}
            className="text-text-secondary hover:text-ink p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main "Where to?" Search Trigger */}
      <Link
        to="/search"
        className="block p-4 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cobalt text-white flex items-center justify-center shadow-soft shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-ink font-heading truncate">
              {t('passenger.where_to')}
            </h2>
            <p className="text-xs text-text-secondary truncate">
              {t('passenger.where_to_sub')}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-text-secondary shrink-0" />
        </div>
      </Link>

      {/* 3. Quick Action Tiles (Live & Nearby) */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/live"
          className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-input bg-success/15 text-success flex items-center justify-center mb-3">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">{t('nav.live')}</h3>
            <p className="text-[11px] text-text-secondary">
              {isReconnecting ? 'Reconnecting...' : `${liveCount} active buses`}
            </p>
          </div>
        </Link>

        <Link
          to="/nearby"
          className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-input bg-cobalt-tint text-cobalt flex items-center justify-center mb-3">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">{t('nav.nearby')}</h3>
            <p className="text-[11px] text-text-secondary">{stops.length} stops in city</p>
          </div>
        </Link>
      </div>

      {/* 4. Arriving Near You (Horizontal Scroll Cards) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {t('passenger.arriving_near_you')}
          </h3>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {arrivingStops.map((stop, idx) => (
            <Link
              key={stop.id}
              to={`/stops/${stop.id}`}
              className="min-w-[170px] max-w-[190px] p-3 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between shrink-0 text-left"
            >
              <div>
                <p className="text-xs font-bold text-ink truncate mb-1">
                  {localName(stop, i18n.language)}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <RouteBadge code={idx % 2 === 0 ? '201' : '45A'} size="xs" />
                  <span className="text-[10px] text-text-secondary font-medium">
                    in {(idx + 1) * 4} min
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-cobalt font-semibold mt-2 flex items-center gap-1">
                View stop timetable &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 5. Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              {t('passenger.recent_searches')}
            </h3>
            <button
              type="button"
              onClick={handleClearRecents}
              className="text-[11px] text-cobalt font-semibold hover:underline"
            >
              {t('passenger.clear_recents')}
            </button>
          </div>
          <div className="space-y-1.5">
            {recentSearches.map((recent, idx) => (
              <div
                key={idx}
                onClick={() => handleRecentClick(recent)}
                role="button"
                tabIndex={0}
                className="p-2.5 bg-surface rounded-input border border-line flex items-center justify-between hover:border-cobalt cursor-pointer transition"
              >
                <div className="flex items-center gap-2 truncate text-xs font-medium text-ink">
                  <Clock className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                  <span className="truncate">{recent.fromName}</span>
                  <span className="text-text-secondary">&rarr;</span>
                  <span className="truncate">{recent.toName}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
