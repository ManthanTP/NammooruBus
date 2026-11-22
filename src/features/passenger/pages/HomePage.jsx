import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Radio, MapPin, Route, Bookmark, ArrowUpDown } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { useMapStore } from '@/store/mapStore'
import { useSavedStore } from '@/store/savedStore'
import { useAuthStore } from '@/store/authStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import AlertBanner from '@/features/passenger/components/AlertBanner'
import MapCard from '@/components/map/MapCard'
import LocationBanner from '@/components/ui/LocationBanner'
import HeroBlock from '@/components/ui/HeroBlock'

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes } = useDataStore()
  const { getActiveCount, isReconnecting } = useLiveStore()
  const { position: userPos } = useLocationStore()
  const { clearMap } = useMapStore()
  const { user } = useAuthStore()
  const { savedTrips, initSaved } = useSavedStore()

  const liveCount = getActiveCount()
  const [fromStop, setFromStop] = useState(null)
  const [toStop, setToStop] = useState(null)
  const [recentSearches, setRecentSearches] = useState([])

  // Ensure map is completely clean of any leftover polylines when entering Explore (Problem 3.3)
  useEffect(() => {
    clearMap()
  }, [clearMap])

  // Sync saved count
  useEffect(() => {
    initSaved(user)
  }, [user, initSaved])

  const savedCount = savedTrips.length

  useEffect(() => {
    try {
      const recents = JSON.parse(localStorage.getItem('nb_recent') || '[]')
      setRecentSearches(recents.slice(0, 5))
    } catch (e) {
      console.warn('Error reading recent searches:', e)
    }
  }, [])

  // Auto-set nearest stop as default From if user location is available and not set yet
  useEffect(() => {
    if (userPos && stops.length > 0 && !fromStop) {
      // Find closest stop within 1 km
      let nearest = null
      let minDist = Infinity
      for (const s of stops) {
        if (s.lat && s.lng) {
          const d = Math.hypot(s.lat - userPos.lat, s.lng - userPos.lng)
          if (d < minDist) {
            minDist = d
            nearest = s
          }
        }
      }
      if (nearest) {
        setFromStop(nearest)
      }
    }
  }, [userPos, stops, fromStop])

  const handleSwap = (e) => {
    e.stopPropagation()
    const temp = fromStop
    setFromStop(toStop)
    setToStop(temp)
  }

  const handleFindBuses = () => {
    if (fromStop && toStop && fromStop.id !== toStop.id) {
      navigate(`/results?from=${fromStop.id}&to=${toStop.id}`)
    } else {
      navigate('/search')
    }
  }

  const arrivingStops = stops.slice(0, 4)

  return (
    <div className="space-y-4 pb-4">

      {/* 1. Hero Block */}
      <HeroBlock
        greeting="ನಮಸ್ಕಾರ 👋"
        title="Nammooru Bus"
        subtitle="Our town. Our bus. • Hubballi-Dharwad"
      />

      {/* 2. Search Card */}
      <div
        className="bg-surface rounded-[20px] p-5 -mt-5 relative z-10 border border-line"
        style={{ boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="relative space-y-2">
          {/* FROM Input */}
          <div
            onClick={() => navigate('/search')}
            role="button"
            tabIndex={0}
            className="flex items-center gap-2.5 px-4 py-3 bg-sky-50 dark:bg-surface-2 rounded-[12px] border border-line hover:border-cobalt-500 transition cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-cobalt-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted block tracking-wider">
                {t('common.from')}
              </span>
              <p className="text-sm font-semibold text-ink-950 truncate">
                {fromStop ? localName(fromStop, i18n.language) : 'Select starting stop...'}
              </p>
            </div>
          </div>

          {/* Swap Button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <button
              type="button"
              onClick={handleSwap}
              className="w-8 h-8 rounded-full bg-surface border-2 border-cobalt-500 text-cobalt-500 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-surface-2 active:rotate-180 transition-all"
              style={{ boxShadow: 'var(--shadow-soft)' }}
              title="Swap From and To"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* TO Input */}
          <div
            onClick={() => navigate('/search')}
            role="button"
            tabIndex={0}
            className="flex items-center gap-2.5 px-4 py-3 bg-sky-50 dark:bg-surface-2 rounded-[12px] border border-line hover:border-cobalt-500 transition cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted block tracking-wider">
                {t('common.to')}
              </span>
              <p className="text-sm font-semibold text-ink-950 truncate">
                {toStop ? localName(toStop, i18n.language) : t('passenger.where_to')}
              </p>
            </div>
          </div>
        </div>

        {/* Find buses button */}
        <button
          type="button"
          onClick={handleFindBuses}
          className="mt-3 w-full h-12 px-4 rounded-full text-white font-heading font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <Search className="w-4 h-4" />
          <span>{t('passenger.find_buses')}</span>
        </button>
      </div>

      {/* 3. Map Card */}
      <MapCard height={200} />

      {/* 4. Location Banner */}
      <LocationBanner />

      {/* 5. 2×2 Quick Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Live */}
        <Link
          to="/live"
          className="p-4 bg-surface rounded-[20px] border border-line flex flex-col justify-between hover:border-cobalt-500 transition"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mb-2.5"
            style={{ backgroundColor: 'rgba(0,64,255,0.12)' }}
          >
            <Radio className="w-4 h-4 text-cobalt-500" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink-950 font-heading">{t('nav.live')}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-muted">
                {isReconnecting ? 'Reconnecting...' : `${liveCount} buses moving`}
              </p>
              {liveCount > 0 && !isReconnecting && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-navy-900 bg-amber-500 px-1.5 py-0.5 rounded-full">
                  Live
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Nearby */}
        <Link
          to="/nearby"
          className="p-4 bg-surface rounded-[20px] border border-line flex flex-col justify-between hover:border-cobalt-500 transition"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-surface-2 flex items-center justify-center mb-2.5">
            <MapPin className="w-4 h-4 text-cobalt-500" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink-950 font-heading">{t('nav.nearby')}</h3>
            <p className="text-[11px] text-muted mt-0.5">{stops.length} stops in city</p>
          </div>
        </Link>

        {/* Routes */}
        <Link
          to="/routes"
          className="p-4 bg-surface rounded-[20px] border border-line flex flex-col justify-between hover:border-cobalt-500 transition"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-surface-2 flex items-center justify-center mb-2.5">
            <Route className="w-4 h-4 text-cobalt-500" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink-950 font-heading">{t('nav.routes')}</h3>
            <p className="text-[11px] text-muted mt-0.5">{routes.length} active routes</p>
          </div>
        </Link>

        {/* Saved */}
        <Link
          to="/saved"
          className="p-4 bg-surface rounded-[20px] border border-line flex flex-col justify-between hover:border-cobalt-500 transition"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mb-2.5">
            <Bookmark className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink-950 font-heading">{t('nav.saved')}</h3>
            <p className="text-[11px] text-muted mt-0.5">{savedCount} saved trips</p>
          </div>
        </Link>
      </div>

      {/* 6. Arriving Near You horizontal scroll */}
      {arrivingStops.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              {t('passenger.arriving_near_you')}
            </h3>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {arrivingStops.map((stop, idx) => (
              <Link
                key={stop.id}
                to={`/stops/${stop.id}`}
                className="min-w-[170px] max-w-[190px] p-3 bg-surface rounded-[20px] border border-line flex flex-col justify-between shrink-0 text-left hover:border-cobalt-500 transition"
                style={{ boxShadow: 'var(--shadow-soft)' }}
              >
                <div>
                  <p className="text-xs font-bold text-ink-950 truncate mb-1">
                    {localName(stop, i18n.language)}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RouteBadge code={idx % 2 === 0 ? '201' : '45A'} size="xs" />
                    <span className="text-[10px] text-muted font-medium">
                      in {(idx + 1) * 4} min
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-cobalt-500 font-semibold mt-2.5 flex items-center gap-1">
                  View timetable →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 7. Alert Banner */}
      <AlertBanner />
    </div>
  )
}
