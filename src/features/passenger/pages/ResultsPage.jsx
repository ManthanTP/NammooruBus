import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowUpDown, Zap, Shuffle, IndianRupee, AlertCircle, RotateCcw } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { findRoutes, sortRoutes } from '@/lib/routeFinder'
import { localName } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import Ticket from '@/components/ui/Ticket'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import MapCard from '@/components/map/MapCard'
import Button from '@/components/ui/Button'

export default function ResultsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const fromStopId = searchParams.get('from')
  const toStopId = searchParams.get('to')

  const { stops, routes, routeStops, schedules, fareConfig, loading: storeLoading, initData } = useDataStore()
  const { fitBounds, setBounds } = useMapStore()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [activeSort, setActiveSort] = useState('fastest') // 'fastest' | 'fewer_changes' | 'cheapest'
  const [results, setResults] = useState([])

  const fromStop = stops.find((s) => s.id === fromStopId)
  const toStop = stops.find((s) => s.id === toStopId)

  useEffect(() => {
    if (stops.length === 0 && !storeLoading) {
      initData()
    }
  }, [stops.length, storeLoading, initData])

  const computeResults = useCallback(() => {
    if (!fromStopId || !toStopId) {
      setErrorMessage('Missing origin or destination stop')
      setLoading(false)
      return
    }

    if (fromStopId === toStopId) {
      setErrorMessage(t('passenger.same_stop_error') || 'Origin and destination stops cannot be the same')
      setLoading(false)
      return
    }

    if (stops.length === 0 || routes.length === 0) {
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const found = findRoutes({
        fromStopId,
        toStopId,
        routes,
        routeStops,
        stops,
        schedules,
        fareConfig,
        currentTime: new Date(),
      })

      setResults(found || [])

      if (fromStop?.lat && toStop?.lat) {
        const fit = fitBounds || setBounds
        if (typeof fit === 'function') {
          fit([
            [fromStop.lat, fromStop.lng],
            [toStop.lat, toStop.lng],
          ])
        }
      }

      try {
        supabase.from('search_log').insert({
          from_stop: fromStopId,
          to_stop: toStopId,
        }).then(() => {})
      } catch (e) {}
    } catch (err) {
      console.error('Error finding routes:', err)
      setErrorMessage('Could not compute bus routes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [fromStopId, toStopId, routes, routeStops, stops, schedules, fareConfig, fromStop, toStop, fitBounds, setBounds, t])

  useEffect(() => {
    computeResults()
  }, [computeResults])

  const sortedResults = useMemo(() => {
    return sortRoutes(results, activeSort)
  }, [results, activeSort])

  const handleSwap = () => {
    if (fromStopId && toStopId) {
      navigate(`/results?from=${toStopId}&to=${fromStopId}`)
    }
  }

  const handleSelectTrip = (trip) => {
    try {
      sessionStorage.setItem('nb_current_journey', JSON.stringify(trip))
    } catch (e) {
      console.warn('Error storing current journey:', e)
    }
    const rCodes = trip.legs?.map((l) => l.route?.code).filter(Boolean).join('+') || ''
    navigate(`/journey?from=${fromStopId}&to=${toStopId}&r=${rCodes}`)
  }

  const sortTabs = [
    { key: 'fastest', label: t('passenger.fastest') || 'Fastest', icon: Zap },
    { key: 'fewer_changes', label: t('passenger.fewer_changes') || 'Fewest transfers', icon: Shuffle },
    { key: 'cheapest', label: t('passenger.cheapest') || 'Cheapest', icon: IndianRupee },
  ]

  return (
    <div className="space-y-3.5 pb-4">
      {/* 1. Slim Gradient Header with Back, From to To, and Swap button */}
      <div
        className="rounded-[20px] p-3.5 text-white flex items-center justify-between shadow-soft"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-95 shrink-0"
          title="Back to search"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center min-w-0 px-2 flex-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold font-heading text-white truncate">
            <span className="truncate max-w-[100px] sm:max-w-[130px]">
              {fromStop ? localName(fromStop, i18n.language) : 'Origin'}
            </span>
            <span className="text-amber-500 font-bold">&rarr;</span>
            <span className="truncate max-w-[100px] sm:max-w-[130px]">
              {toStop ? localName(toStop, i18n.language) : 'Destination'}
            </span>
          </div>
          <span className="text-[10.5px] text-white/70 block mt-0.5 font-medium">
            {results.length} bus option{results.length === 1 ? '' : 's'} found
          </span>
        </div>

        <button
          type="button"
          onClick={handleSwap}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-95 shrink-0"
          title="Swap stops"
        >
          <ArrowUpDown className="w-4 h-4 text-amber-500" />
        </button>
      </div>

      {/* 2. Map Card */}
      <MapCard height={220} />

      {/* 3. Error Message with Retry */}
      {errorMessage && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-[20px] text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-danger font-bold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={computeResults}
            className="mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* 4. Sort Chips */}
      {results.length > 0 && !loading && !errorMessage && (
        <div className="flex p-1 bg-white rounded-full border border-line shadow-xs gap-1">
          {sortTabs.map((tab) => {
            const Icon = tab.icon
            const isCurrent = activeSort === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSort(tab.key)}
                className={`relative flex-1 py-1.5 px-2 text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1 select-none ${
                  isCurrent ? 'text-white' : 'text-muted hover:text-ink-950'
                }`}
              >
                {isCurrent && (
                  <motion.div
                    layoutId="resultsSortPill"
                    className="absolute inset-0 rounded-full -z-10 shadow-xs"
                    style={{ background: 'var(--gradient-brand)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon size={14} strokeWidth={2} />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 5. Skeleton Loading State */}
      {(loading || storeLoading) && (
        <div className="space-y-3 pt-1">
          <Skeleton height="86px" />
          <Skeleton height="86px" />
          <Skeleton height="86px" />
        </div>
      )}

      {/* 6. Results List */}
      {!loading && !storeLoading && !errorMessage && sortedResults.length > 0 && (
        <div className="space-y-2.5">
          {sortedResults.map((trip, idx) => (
            <Ticket
              key={trip.id || idx}
              result={trip}
              index={idx}
              onClick={() => handleSelectTrip(trip)}
            />
          ))}
        </div>
      )}

      {/* 7. Empty State */}
      {!loading && !storeLoading && !errorMessage && results.length === 0 && (
        <EmptyState
          title={t('passenger.no_routes') || 'No direct routes found'}
          description="No direct or 1-transfer buses found between these stops. Try selecting a central hub like CBT, Old Bus Stand, or Hosur."
          action={{
            label: 'Change search',
            onClick: () => navigate('/search'),
          }}
        />
      )}
    </div>
  )
}
