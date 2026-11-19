import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Zap, Shuffle, IndianRupee, AlertCircle, MapPin } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { findRoutes, sortRoutes } from '@/lib/routeFinder'
import { localName } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import Ticket from '@/components/ui/Ticket'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'

export default function ResultsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const fromStopId = searchParams.get('from')
  const toStopId = searchParams.get('to')

  const { stops, routes, routeStops, schedules, fareConfig, loading: storeLoading } = useDataStore()

  const [loading, setLoading] = useState(true)
  const [activeSort, setActiveSort] = useState('fastest') // 'fastest' | 'fewer_changes' | 'cheapest'
  const [results, setResults] = useState([])

  const fromStop = stops.find((s) => s.id === fromStopId)
  const toStop = stops.find((s) => s.id === toStopId)

  useEffect(() => {
    if (!fromStopId || !toStopId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
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
      setResults(found)
      setLoading(false)

      // Anonymous log to search_log
      try {
        supabase.from('search_log').insert({
          from_stop: fromStopId,
          to_stop: toStopId,
        }).then(() => {})
      } catch (e) {
        // Silently catch offline/anonymous log failures
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [fromStopId, toStopId, routes, routeStops, stops, schedules, fareConfig])

  const sortedResults = useMemo(() => {
    return sortRoutes(results, activeSort)
  }, [results, activeSort])

  const handleSelectTrip = (trip) => {
    // Store selected trip in sessionStorage so JourneyPage can load it
    sessionStorage.setItem('nb_current_journey', JSON.stringify(trip))
    navigate(`/journey?from=${fromStopId}&to=${toStopId}`)
  }

  const sortTabs = [
    { key: 'fastest', label: t('passenger.fastest'), icon: Zap },
    { key: 'fewer_changes', label: t('passenger.fewer_changes'), icon: Shuffle },
    { key: 'cheapest', label: t('passenger.cheapest'), icon: IndianRupee },
  ]

  return (
    <div className="space-y-3 pt-1">
      {/* Header with Origin & Destination */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit</span>
        </button>
        <div className="text-center truncate px-2">
          <p className="text-xs font-extrabold text-ink truncate">
            {fromStop ? localName(fromStop, i18n.language) : 'From'} &rarr; {toStop ? localName(toStop, i18n.language) : 'To'}
          </p>
          <span className="text-[10px] text-text-secondary">
            {t('passenger.results_count', { count: results.length })}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Sort Tabs with Sliding Pill */}
      {results.length > 0 && !loading && (
        <div className="flex p-1 bg-page rounded-pill border border-line shadow-xs">
          {sortTabs.map((tab) => {
            const Icon = tab.icon
            const isCurrent = activeSort === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSort(tab.key)}
                className={`relative flex-1 py-1 px-2 text-xs font-bold rounded-pill transition-colors flex items-center justify-center gap-1 ${
                  isCurrent ? 'text-white' : 'text-text-secondary hover:text-ink'
                }`}
              >
                {isCurrent && (
                  <motion.div
                    layoutId="sortPill"
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
      {loading && (
        <div className="space-y-3 pt-2">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      )}

      {/* Results List */}
      {!loading && sortedResults.length > 0 && (
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
      {!loading && sortedResults.length === 0 && (
        <EmptyState
          icon={AlertCircle}
          title={t('passenger.no_results')}
          description={t('passenger.no_results_sub')}
          actionLabel="Choose other stops"
          onAction={() => navigate('/search')}
        />
      )}
    </div>
  )
}
