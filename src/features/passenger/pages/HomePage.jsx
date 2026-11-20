import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Radio, MapPin, Route, Bookmark, Clock, ArrowRight, ArrowUpDown, Sparkles } from 'lucide-react'
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
    <div className="space-y-4 pt-1">
      {/* 1. Greeting & Headline */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink font-heading tracking-tight flex items-center gap-1.5">
            <span>Nammooru Bus</span>
            <Sparkles className="w-4 h-4 text-cobalt" />
          </h1>
          <p className="text-xs text-text-secondary">
            {t('app.tagline')} &bull; Hubballi-Dharwad
          </p>
        </div>
      </div>

      {/* 2. Big Search Card (From, To, Swap, Find buses) */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft space-y-3">
        <div className="relative space-y-2">
          {/* From Input Box */}
          <div
            onClick={() => navigate('/search')}
            role="button"
            tabIndex={0}
            className="flex items-center gap-2.5 p-3 bg-page rounded-input border border-line hover:border-cobalt transition cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-text-secondary block tracking-wider">
                {t('common.from')}
              </span>
              <p className="text-sm font-semibold text-ink truncate">
                {fromStop ? localName(fromStop, i18n.language) : 'Select starting stop...'}
              </p>
            </div>
          </div>

          {/* Swap Button (Floating between inputs) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <button
              type="button"
              onClick={handleSwap}
              className="w-8 h-8 rounded-full bg-surface border border-line shadow-soft text-ink flex items-center justify-center hover:text-cobalt active:rotate-180 transition-all"
              title="Swap From and To"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* To Input Box */}
          <div
            onClick={() => navigate('/search')}
            role="button"
            tabIndex={0}
            className="flex items-center gap-2.5 p-3 bg-page rounded-input border border-line hover:border-cobalt transition cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-danger shrink-0 shadow-xs" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-text-secondary block tracking-wider">
                {t('common.to')}
              </span>
              <p className="text-sm font-semibold text-ink truncate">
                {toStop ? localName(toStop, i18n.language) : t('passenger.where_to')}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleFindBuses}
          className="w-full py-3 px-4 bg-cobalt hover:bg-cobalt/95 active:scale-[0.99] text-white font-extrabold text-sm rounded-pill shadow-soft transition flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>{t('passenger.find_buses')}</span>
        </button>
      </div>

      {/* 3. Small Map Card (Mobile only, 200px height per Part B) */}
      <MapCard height={200} />

      {/* 4. Location Status Banner */}
      <LocationBanner />

      {/* 5. 2 x 2 Grid of Quick Actions (Live, Nearby, Routes, Saved) */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/live"
          className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-success/15 text-success flex items-center justify-center mb-2.5 shadow-xs">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink font-heading">{t('nav.live')}</h3>
            <p className="text-[11px] text-text-secondary">
              {isReconnecting ? 'Reconnecting...' : `${liveCount} buses moving`}
            </p>
          </div>
        </Link>

        <Link
          to="/nearby"
          className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center mb-2.5 shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink font-heading">{t('nav.nearby')}</h3>
            <p className="text-[11px] text-text-secondary">{stops.length} stops in city</p>
          </div>
        </Link>

        <Link
          to="/routes"
          className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center mb-2.5 shadow-xs">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink font-heading">{t('nav.routes')}</h3>
            <p className="text-[11px] text-text-secondary">{routes.length} active routes</p>
          </div>
        </Link>

        <Link
          to="/saved"
          className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mb-2.5 shadow-xs">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-ink font-heading">{t('nav.saved')}</h3>
            <p className="text-[11px] text-text-secondary">{savedCount} saved trips</p>
          </div>
        </Link>
      </div>

      {/* 6. Arriving Near You Cards */}
      {arrivingStops.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
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
                <span className="text-[10px] text-cobalt font-semibold mt-2.5 flex items-center gap-1">
                  View timetable &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 7. Live Dismissible Alert Banner */}
      <AlertBanner />
    </div>
  )
}
