import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowUpDown, MapPin, Navigation, X, Check, Search, Bus } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'

export default function SearchPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stops, routes, routeStops } = useDataStore()

  const [fromStop, setFromStop] = useState(null)
  const [toStop, setToStop] = useState(null)
  const [activeField, setActiveField] = useState('from') // 'from' | 'to'
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSwapping, setIsSwapping] = useState(false)

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
    // Pick closest stop (sample: first stop Old Bus Stand)
    if (stops.length > 0) {
      handleSelectStop(stops[0])
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
    <div className="flex flex-col h-full bg-surface text-ink font-body p-4">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
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
          className={`flex items-center gap-2 p-2.5 rounded-input border transition cursor-pointer ${
            activeField === 'from' ? 'bg-surface border-cobalt shadow-xs' : 'bg-surface/60 border-line'
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

        {/* Swap Button */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
          <motion.button
            type="button"
            animate={{ rotate: isSwapping ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={handleSwap}
            className="w-8 h-8 rounded-full bg-surface border border-line shadow-soft flex items-center justify-center text-cobalt hover:border-cobalt transition"
            aria-label="Swap stops"
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
          className={`flex items-center gap-2 p-2.5 rounded-input border transition cursor-pointer ${
            activeField === 'to' ? 'bg-surface border-cobalt shadow-xs' : 'bg-surface/60 border-line'
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

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="mb-2 p-2.5 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger font-medium flex items-center gap-1.5">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Type-Ahead Filter Field */}
      <div className="relative mb-2">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Type to filter ${activeField === 'from' ? 'origin' : 'destination'}...`}
          className="w-full pl-9 pr-4 py-2 bg-page border border-line rounded-input text-xs text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
        />
      </div>

      {/* "Your location" Quick Option */}
      {activeField === 'from' && !searchQuery && (
        <button
          type="button"
          onClick={handleUseLocation}
          className="flex items-center gap-2.5 p-2.5 mb-2 bg-cobalt-tint/50 border border-cobalt/20 rounded-input text-xs font-bold text-cobalt hover:bg-cobalt-tint transition text-left"
        >
          <Navigation className="w-4 h-4 shrink-0" />
          <span>{t('passenger.your_location')}</span>
        </button>
      )}

      {/* Stops Selection List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredStops.map((stop) => {
          const isSelected = (activeField === 'from' && fromStop?.id === stop.id) ||
                            (activeField === 'to' && toStop?.id === stop.id)
          const passCodes = routesByStop[stop.id] || []

          return (
            <div
              key={stop.id}
              onClick={() => handleSelectStop(stop)}
              role="button"
              tabIndex={0}
              className={`p-2.5 rounded-input border transition flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'bg-cobalt-tint/60 border-cobalt text-cobalt font-bold'
                  : 'bg-surface border-line hover:border-cobalt/50 text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-text-secondary shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-semibold truncate">
                    {localName(stop, i18n.language)}
                  </span>
                  <span className="block text-[10px] text-text-secondary truncate">
                    {i18n.language === 'kn' ? stop.name_en : stop.name_kn || ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {passCodes.slice(0, 3).map((c) => (
                  <RouteBadge key={c} code={c} size="xs" />
                ))}
                {isSelected && <Check className="w-4 h-4 text-cobalt ml-1" />}
              </div>
            </div>
          )
        })}
      </div>

      {/* Find Buses CTA */}
      <div className="pt-3 border-t border-line mt-2">
        <button
          type="button"
          onClick={handleFindBuses}
          disabled={!fromStop || !toStop}
          className="w-full py-3 bg-cobalt text-white text-sm font-bold rounded-input shadow-soft hover:opacity-95 active:scale-[0.99] disabled:opacity-40 transition flex items-center justify-center gap-2"
        >
          <Bus className="w-4 h-4" />
          <span>{t('passenger.find_buses')}</span>
        </button>
      </div>
    </div>
  )
}
