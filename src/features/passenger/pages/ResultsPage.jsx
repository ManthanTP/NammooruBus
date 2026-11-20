import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, Shuffle, IndianRupee, AlertCircle, RefreshCw } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { findRoutes, sortRoutes } from '@/lib/routeFinder'
import { localName } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import Ticket from '@/components/ui/Ticket'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import MapCard from '@/components/map/MapCard'

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

  // Ensure master data is ready
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
      setErrorMessage(t('passenger.same_stop_error'))
      setLoading(false)
      return
    }

    // Wait until data store has loaded stops and routes
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

      // Fit map to origin and destination
      if (fromStop?.lat && toStop?.lat) {
        const fit = fitBounds || setBounds
        if (typeof fit === 'function') {
          fit([
            [fromStop.lat, fromStop.lng],
            [toStop.lat, toStop.lng],
          ])
        }
      }

      // Anonymous log to search_log
      try {
        supabase.from('search_log').insert({
          from_stop: fromStopId,
          to_stop: toStopId,
        }).then(() => { })
      } catch (e) {
        // Silently catch offline/anonymous log failures
      }
    } catch (err) {
      console.error('Error finding routes:', err)
      setErrorMessage('Could not compute bus routes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [fromStopId, toStopId, routes, routeStops, stops, schedules, fareConfig, fromStop, toStop, setBounds, t])

  useEffect(() => {
    computeResults()
  }, [computeResults])

  const sortedResults = useMemo(() => {
    return sortRoutes(results, activeSort)
  }, [results, activeSort])

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
    { key: 'fastest', label: t('passenger.fastest'), icon: Zap },
    { key: 'fewer_changes', label: t('passenger.fewer_changes'), icon: Shuffle },
    { key: 'cheapest', label: t('passenger.cheapest'), icon: IndianRupee },
  ]

  return (
    <div className="space-y-3.5 pt-1">
      {/* Header with Origin & Destination */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-ink transition p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit</span>
        </button>
        <div className="text-center truncate px-2">
          <p className="text-xs font-extrabold text-ink truncate">
            {fromStop ? localName(fromStop, i18n.language) : 'From'} &rarr;{' '}
            {toStop ? localName(toStop, i18n.language) : 'To'}
          </p>
          <span className="text-[10px] text-text-secondary">
            {results.length} bus option{results.length === 1 ? '' : 's'} available
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Small Map Card (Height 220px per Part B) */}
      <MapCard height={220} />

      {/* Error Message with Retry */}
      {errorMessage && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-danger font-bold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={computeResults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cobalt text-white text-xs font-bold rounded-pill shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Sort Tabs with Sliding Pill */}
      {results.length > 0 && !loading && !errorMessage && (
        <div className="flex p-1 bg-surface rounded-pill border border-line shadow-xs">
          {sortTabs.map((tab) => {
            const Icon = tab.icon
            const isCurrent = activeSort === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSort(tab.key)}
                className={`relative flex-1 py-1.5 px-2 text-xs font-bold rounded-pill transition-colors flex items-center justify-center gap-1 ${isCurrent ? 'text-white' : 'text-text-secondary hover:text-ink'
                  }`}
              >
                {isCurrent && (
                  <motion.div
                    layoutId="resultsSortPill"
                    className="absolute inset-0 bg-cobalt rounded-pill -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Skeletons Loading State */}
      {(loading || storeLoading) && (
        <div className="space-y-3 pt-2">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      )}

      {/* Results List */}
      {!loading && !storeLoading && !errorMessage && sortedResults.length > 0 && (
        <div className="space-y-3 pb-4">
          {sortedResults.map((trip, idx) => (
            <Ticket
              key={trip.id}
              result={trip}
              index={idx}
              onClick={() => handleSelectTrip(trip)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !storeLoading && !errorMessage && results.length === 0 && (
        <EmptyState
          title={t('passenger.no_routes')}
          description="No direct or 1-transfer buses found between these stops. Try selecting a nearby central stop like Old Bus Stand or CBT."
          actionText="Change search"
          onAction={() => navigate('/search')}
        />
      )}
    </div>
  )
}
