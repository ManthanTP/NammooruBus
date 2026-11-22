import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowUpDown, MapPin, Navigation, X, Check, Search, Bus, AlertCircle } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useLocationStore } from '@/store/locationStore'
import { localName } from '@/lib/formatters'
import { haversine } from '@/lib/geo'
import RouteBadge from '@/components/ui/RouteBadge'

export default function SearchPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops } = useDataStore()
  const { position: userPos, start: startLocation } = useLocationStore()

  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [fromStop, setFromStop] = useState(null)
  const [toStop, setToStop] = useState(null)
  const [activeField, setActiveField] = useState('from') // 'from' | 'to'
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState(location.state?.notice || null)
  const [isSwapping, setIsSwapping] = useState(false)

  // Pre-fill From if query param exists (e.g. from Nearby "Buses from here to...")
  useEffect(() => {
    const fromParam = searchParams.get('from')
    if (fromParam && stops.length > 0 && !fromStop) {
      const match = stops.find((s) => s.id === fromParam || s.code === fromParam)
      if (match) {
        setFromStop(match)
        setActiveField('to')
      }
    }
  }, [searchParams, stops, fromStop])

  // Map route badges passing each stop
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

  // Filter stops matching query (English or Kannada)
  const filteredStops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return stops

    return stops.filter((s) => {
      const en = (s.name_en || '').toLowerCase()
      const kn = (s.name_kn || '').toLowerCase()
      return en.includes(q) || kn.includes(q)
    })
  }, [stops, searchQuery])

  const handleSwap = () => {
    setIsSwapping((prev) => !prev)
    setFromStop(toStop)
    setToStop(fromStop)
    setErrorMessage(null)
  }

  const handleSelectStop = (stop) => {
    setErrorMessage(null)
    if (activeField === 'from') {
      if (toStop && toStop.id === stop.id) {
        setErrorMessage(t('passenger.same_stop_error'))
        return
      }
      setFromStop(stop)
      setSearchQuery('')
      setActiveField('to')
    } else {
      if (fromStop && fromStop.id === stop.id) {
        setErrorMessage(t('passenger.same_stop_error'))
        return
      }
      setToStop(stop)
      setSearchQuery('')
    }
  }

  const handleUseLocation = () => {
    if (!userPos) {
      startLocation()
      return
    }

    let nearest = null
    let minDist = Infinity
    for (const s of stops) {
      if (s.lat && s.lng) {
        const d = haversine(userPos.lat, userPos.lng, s.lat, s.lng)
        if (d < minDist) {
          minDist = d
          nearest = s
        }
      }
    }

    if (nearest && minDist <= 1.0) {
      handleSelectStop(nearest)
    } else {
      setErrorMessage('No stop within 1 km of you. Pick a start stop.')
    }
  }

  const handleFindBuses = () => {
    if (!fromStop || !toStop) {
      setErrorMessage('Please select both From and To stops')
      return
    }
    if (fromStop.id === toStop.id) {
      setErrorMessage(t('passenger.same_stop_error'))
      return
    }

    // Save to recents
    try {
      const recents = JSON.parse(localStorage.getItem('nb_recent') || '[]')
      const newRecent = {
        fromId: fromStop.id,
        toId: toStop.id,
        fromName: localName(fromStop, i18n.language),
        toName: localName(toStop, i18n.language),
      }
      const updated = [newRecent, ...recents.filter((r) => !(r.fromId === fromStop.id && r.toId === toStop.id))].slice(0, 5)
      localStorage.setItem('nb_recent', JSON.stringify(updated))
    } catch (e) {
      console.warn('Error saving recent search:', e)
    }

    navigate(`/results?from=${fromStop.id}&to=${toStop.id}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface text-ink font-body p-4 pt-2">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition p-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-sm font-heading">{t('passenger.where_to')}</span>
        <div className="w-12" />
      </header>

      {/* From / To Inputs with Animated Swap */}
      <div className="relative my-3 p-3 bg-page rounded-card border border-line flex flex-col gap-2">
        {/* From Field */}
        <div
          onClick={() => {
            setActiveField('from')
            setSearchQuery('')
          }}
          className={`flex items-center gap-2.5 p-3 rounded-input border transition cursor-pointer ${activeField === 'from' ? 'bg-surface border-cobalt shadow-xs' : 'bg-surface/70 border-line'
            }`}
        >
          <div className="w-3 h-3 rounded-full bg-success shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold uppercase text-text-secondary">
              {t('passenger.from')}
            </span>
            <span className={`block text-xs font-semibold truncate ${fromStop ? 'text-ink' : 'text-text-secondary'}`}>
              {fromStop ? localName(fromStop, i18n.language) : t('passenger.pick_from')}
            </span>
          </div>
          {fromStop && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setFromStop(null)
              }}
              className="text-text-secondary hover:text-ink p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Swap Button (Floating) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
          <motion.button
            type="button"
            onClick={handleSwap}
            animate={{ rotate: isSwapping ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="w-8 h-8 rounded-full bg-surface border border-line shadow-soft text-ink flex items-center justify-center hover:text-cobalt active:scale-95 transition"
            title="Swap stops"
          >
            <ArrowUpDown className="w-4 h-4" />
          </motion.button>
        </div>

        {/* To Field */}
        <div
          onClick={() => {
            setActiveField('to')
            setSearchQuery('')
          }}
          className={`flex items-center gap-2.5 p-3 rounded-input border transition cursor-pointer ${activeField === 'to' ? 'bg-surface border-cobalt shadow-xs' : 'bg-surface/70 border-line'
            }`}
        >
          <div className="w-3 h-3 rounded-full bg-danger shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold uppercase text-text-secondary">
              {t('passenger.to')}
            </span>
            <span className={`block text-xs font-semibold truncate ${toStop ? 'text-ink' : 'text-text-secondary'}`}>
              {toStop ? localName(toStop, i18n.language) : t('passenger.pick_to')}
            </span>
          </div>
          {toStop && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setToStop(null)
              }}
              className="text-text-secondary hover:text-ink p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error message if validation fails */}
      {errorMessage && (
        <div className="mb-2 p-2.5 bg-danger/10 border border-danger/30 rounded-input flex items-center gap-2 text-xs font-semibold text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* "Your location" Option (Part C.6) */}
      <button
        type="button"
        onClick={handleUseLocation}
        className="flex items-center gap-2 px-3 py-2.5 mb-2 bg-surface-2 hover:bg-surface border border-line rounded-input text-xs font-bold text-text transition text-left cursor-pointer"
      >
        <Navigation className="w-4 h-4 shrink-0 text-brand" />
        <span>{t('passenger.your_location')} (Pick nearest stop)</span>
      </button>

      {/* Search Filter Box */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeField === 'from' ? 'starting' : 'destination'} stop...`}
          className="w-full pl-9 pr-8 py-2.5 text-xs bg-page border border-line rounded-input focus:border-cobalt focus:bg-surface outline-none transition"
          autoFocus
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-ink p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stop List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pb-20">
        {filteredStops.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-secondary">
            No stops match &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredStops.map((stop) => {
            const isSelectedFrom = fromStop?.id === stop.id
            const isSelectedTo = toStop?.id === stop.id
            const isSelected = isSelectedFrom || isSelectedTo
            const badges = routesByStop[stop.id] || []

            return (
              <div
                key={stop.id}
                onClick={() => handleSelectStop(stop)}
                role="button"
                tabIndex={0}
                className={`p-3 rounded-input border transition flex items-center justify-between cursor-pointer ${isSelected
                  ? 'bg-cobalt-tint border-cobalt text-cobalt'
                  : 'bg-surface hover:bg-page border-line text-ink'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cobalt' : 'text-text-secondary'}`} />
                  <div className="truncate">
                    <p className="text-xs font-bold truncate">
                      {localName(stop, i18n.language)}
                    </p>
                    {badges.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {badges.slice(0, 3).map((code) => (
                          <RouteBadge key={code} code={code} size="xs" />
                        ))}
                        {badges.length > 3 && (
                          <span className="text-[9px] text-text-secondary font-medium">
                            +{badges.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-cobalt shrink-0" />}
              </div>
            )
          })
        )}
      </div>

      {/* Sticky Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-line z-30 flex justify-center">
        <button
          type="button"
          onClick={handleFindBuses}
          disabled={!fromStop || !toStop}
          className="w-full max-w-md py-3 px-4 bg-cobalt disabled:bg-line disabled:text-text-secondary text-white font-extrabold text-sm rounded-pill shadow-soft transition flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>{t('passenger.find_buses')}</span>
        </button>
      </div>
    </div>
  )
}
