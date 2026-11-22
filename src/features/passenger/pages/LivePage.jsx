import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Users, ChevronRight, RefreshCw, LogIn, X, Navigation } from 'lucide-react'
import { useLiveStore } from '@/store/liveStore'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useToastStore } from '@/components/ui/Toast'
import { calculateBusEta } from '@/lib/eta'
import { localName } from '@/lib/formatters'
import { haversine } from '@/lib/geo'
import RouteBadge from '@/components/ui/RouteBadge'
import CrowdMeter from '@/components/ui/CrowdMeter'
import Countdown from '@/components/ui/Countdown'
import EmptyState from '@/components/ui/EmptyState'
import LiveDot from '@/components/ui/LiveDot'
import MapCard from '@/components/map/MapCard'
import UserBusComparison from '@/features/passenger/components/UserBusComparison'
import LocationBanner from '@/components/ui/LocationBanner'

export default function LivePage() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialRouteFilter = searchParams.get('route')

  const { user } = useAuthStore()
  const { routes, routeStops, stops, schedules } = useDataStore()
  const { trips, selectedTripId, setSelectedTripId, isReconnecting, reportCrowd } = useLiveStore()
  const { setBounds, fitBounds, setCenter, setView } = useMapStore()
  const { position: userPos } = useLocationStore()
  const { addToast } = useToastStore()

  const [selectedRouteCode, setSelectedRouteCode] = useState(initialRouteFilter || 'all')
  const [showCrowdModal, setShowCrowdModal] = useState(false)
  const [crowdReporting, setCrowdReporting] = useState(false)
  const [crowdError, setCrowdError] = useState(null)

  const tripParam = searchParams.get('trip')
  useEffect(() => {
    if (tripParam && trips.length > 0) {
      const match = trips.find((t) => t.id === tripParam)
      if (match) {
        setSelectedTripId(match.id)
        if (match.route?.code) {
          setSelectedRouteCode(match.route.code)
        }
      }
    }
  }, [tripParam, trips, setSelectedTripId])

  const filteredTrips = useMemo(() => {
    if (selectedRouteCode === 'all') return trips
    return trips.filter((t) => t.route?.code === selectedRouteCode)
  }, [trips, selectedRouteCode])

  const selectedTrip = useMemo(() => {
    if (!selectedTripId && filteredTrips.length > 0) return filteredTrips[0]
    return trips.find((t) => t.id === selectedTripId) || filteredTrips[0] || null
  }, [trips, selectedTripId, filteredTrips])

  useEffect(() => {
    const busLat = Number(selectedTrip?.position?.lat)
    const busLng = Number(selectedTrip?.position?.lng)
    const hasBusPos = !Number.isNaN(busLat) && !Number.isNaN(busLng) && Number.isFinite(busLat) && Number.isFinite(busLng)

    if (hasBusPos) {
      const uLat = Number(userPos?.lat)
      const uLng = Number(userPos?.lng)
      const hasUserPos = !Number.isNaN(uLat) && !Number.isNaN(uLng) && Number.isFinite(uLat) && Number.isFinite(uLng)

      if (hasUserPos) {
        const fit = fitBounds || setBounds
        if (typeof fit === 'function') {
          fit([
            [uLat, uLng],
            [busLat, busLng],
          ])
        }
      } else {
        const centerFn = setView || setCenter
        if (typeof centerFn === 'function') {
          centerFn([busLat, busLng], 15)
        }
      }
    }
  }, [selectedTrip, userPos, setBounds, fitBounds, setCenter, setView])

  const tripDetails = useMemo(() => {
    if (!selectedTrip || !selectedTrip.position) return null

    const rStops = routeStops
      .filter((rs) => rs.route_id === selectedTrip.route_id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map((rs) => ({
        ...rs,
        stop: stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id, name_en: 'Stop' },
      }))

    if (rStops.length === 0) return null

    let targetStop = rStops[rStops.length - 1]?.stop
    if (userPos) {
      let minDist = Infinity
      for (const rs of rStops) {
        if (rs.stop?.lat && rs.stop?.lng) {
          const d = haversine(userPos.lat, userPos.lng, rs.stop.lat, rs.stop.lng)
          if (d < minDist) {
            minDist = d
            targetStop = rs.stop
          }
        }
      }
    }

    const etaResult = calculateBusEta({
      busPosition: selectedTrip.position,
      routeStops: rStops,
      direction: selectedTrip.direction || 0,
      targetStopId: targetStop?.id,
      speedHistory: selectedTrip.position.speed_kmh ? [selectedTrip.position.speed_kmh] : [],
    })

    const now = Date.now()
    const updatedAt = selectedTrip.position?.updated_at
      ? new Date(selectedTrip.position.updated_at).getTime()
      : now
    const ageSeconds = Math.max(0, Math.floor((now - updatedAt) / 1000))

    return {
      nextStop: etaResult.nextStop,
      etaMinutes: etaResult.etaMinutes,
      progressPercent: Math.round(etaResult.progressPercent || 0),
      remainingKm: (etaResult.remainingDistanceMeters / 1000).toFixed(1),
      speedKmh: Math.round(selectedTrip.position.speed_kmh || 0),
      isStale: ageSeconds > 60,
      ageMinutes: Math.floor(ageSeconds / 60),
    }
  }, [selectedTrip, routeStops, stops, userPos])

  const filterChips = useMemo(() => {
    const list = [{ key: 'all', code: 'All Buses' }]
    const seen = new Set()
    for (const t of trips) {
      const code = t.route?.code
      if (code && !seen.has(code)) {
        seen.add(code)
        list.push({ key: code, code: `Route ${code}` })
      }
    }
    return list
  }, [trips])

  const handleReportCrowd = async (level) => {
    if (!user) {
      setCrowdError('login_required')
      return
    }
    setCrowdReporting(true)
    setCrowdError(null)
    try {
      const res = await reportCrowd(selectedTrip.id, level, user.id)
      if (res.success) {
        addToast(t('passenger.crowd_reported_success') || 'Thank you for reporting crowd level!', 'success')
        setShowCrowdModal(false)
      } else if (res.rateLimited) {
        setCrowdError('rate_limited')
      } else {
        setCrowdError('failed')
      }
    } catch (e) {
      setCrowdError('failed')
    } finally {
      setCrowdReporting(false)
    }
  }

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Header with LiveDot */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <LiveDot />
          <h1 className="font-heading font-extrabold text-xl text-ink-950 tracking-tight">
            Live Buses
          </h1>
          <span className="text-xs font-bold text-cobalt-500 bg-sky-100 px-2.5 py-0.5 rounded-full">
            {trips.length} active
          </span>
        </div>

        {isReconnecting && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Reconnecting</span>
          </div>
        )}
      </div>

      {/* 2. Map Card (Height 300px per Section 6) */}
      <MapCard height={300} />

      {/* 3. Location Banner */}
      <LocationBanner />

      {/* 4. Leave-Now Comparison Panel as Gradient Card */}
      {selectedTrip && (
        <UserBusComparison
          userPos={userPos}
          selectedTrip={selectedTrip}
          stops={stops}
          routeStops={routeStops}
          schedules={schedules}
        />
      )}

      {/* 5. Route Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
        {filterChips.map((chip) => {
          const isSelected = selectedRouteCode === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSelectedRouteCode(chip.key)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                isSelected
                  ? 'text-white shadow-xs'
                  : 'text-muted bg-surface border border-line hover:text-text'
              }`}
              style={isSelected ? { background: 'var(--gradient-brand)' } : {}}
            >
              {chip.code}
            </button>
          )
        })}
      </div>

      {/* 6. Selected Bus Detail Card */}
      {selectedTrip && tripDetails ? (
        <div
          className="p-4 bg-surface rounded-[20px] border border-line space-y-3.5"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RouteBadge
                code={selectedTrip.route?.code}
                size="md"
              />
              <div className="min-w-0">
                <h3 className="text-xs font-bold font-heading text-ink-950 truncate">
                  {localName(selectedTrip.route, i18n.language)}
                </h3>
                <span className="text-[10px] text-muted font-mono block">
                  Bus: {selectedTrip.bus?.reg_no || 'KA-25-1001'}
                </span>
              </div>
            </div>

            {/* Status Chip */}
            <div>
              {tripDetails.isStale ? (
                <span className="px-2.5 py-0.5 bg-sky-100 text-muted text-[10px] font-bold rounded-full">
                  Last seen {tripDetails.ageMinutes}m ago
                </span>
              ) : selectedTrip.status === 'delayed' ? (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                  Delayed
                </span>
              ) : selectedTrip.status === 'breakdown' ? (
                <span className="px-2.5 py-0.5 bg-danger/10 text-danger text-[10px] font-bold rounded-full">
                  Breakdown
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-500 text-navy-900 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy-900 animate-pulse" />
                  On time
                </span>
              )}
            </div>
          </div>

          {/* Next stop and Countdown ETA */}
          <div className="p-3 bg-sky-50 rounded-[14px] flex items-center justify-between border border-line">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Next Stop
              </span>
              <p className="text-xs font-bold text-ink-950 truncate font-heading">
                {tripDetails.nextStop?.stop?.name_en || 'Approaching stop'}
              </p>
              <span className="text-[10px] text-muted">
                {tripDetails.remainingKm} km away &bull; {tripDetails.speedKmh} km/h
              </span>
            </div>

            <div className="text-right shrink-0">
              <Countdown value={tripDetails.etaMinutes} label="ETA" unit="min" />
            </div>
          </div>

          {/* Route progress */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted mb-1">
              <span>Origin</span>
              <span>{tripDetails.progressPercent}% of route completed</span>
              <span>Destination</span>
            </div>
            <div className="w-full h-2 bg-sky-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--gradient-brand)' }}
                initial={{ width: 0 }}
                animate={{ width: `${tripDetails.progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Crowd & Report Action */}
          <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
            <CrowdMeter level={selectedTrip.crowd_level || 1} />
            <button
              type="button"
              onClick={() => setShowCrowdModal(true)}
              className="text-xs font-bold text-cobalt-500 hover:underline flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Report crowd</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 7. Active Bus List */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
          Active Buses ({filteredTrips.length})
        </h3>

        {filteredTrips.length === 0 ? (
          <EmptyState
            title="No active buses for this route"
            description="Buses appear automatically when drivers start GPS tracking."
          />
        ) : (
          filteredTrips.map((trip) => {
            const isSelected = selectedTrip?.id === trip.id
            const tripDistKm =
              userPos && trip.position?.lat && trip.position?.lng
                ? haversine(userPos.lat, userPos.lng, trip.position.lat, trip.position.lng)
                : null

            return (
              <div
                key={trip.id}
                onClick={() => setSelectedTripId(trip.id)}
                role="button"
                tabIndex={0}
                className={`p-3.5 rounded-[20px] border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'bg-surface-2 border-brand shadow-soft'
                    : 'bg-surface hover:border-brand border-line shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 flex items-center gap-1.5">
                    <LiveDot />
                    <RouteBadge code={trip.route?.code} size="sm" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-ink-950 font-heading truncate">
                      {localName(trip.route, i18n.language)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted font-mono">
                        {trip.bus?.reg_no || 'KA-25-1001'}
                      </span>
                      {tripDistKm !== null && (
                        <span className="text-[10px] text-cobalt-500 font-bold flex items-center gap-0.5">
                          <Navigation className="w-2.5 h-2.5" />
                          <span>
                            {tripDistKm < 1
                              ? `${Math.round(tripDistKm * 1000)}m`
                              : `${tripDistKm.toFixed(1)}km`}{' '}
                            away
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <CrowdMeter level={trip.crowd_level || 1} />
                  <ChevronRight className="w-4 h-4 text-muted" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Crowd Reporting Modal */}
      <AnimatePresence>
        {showCrowdModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-sm bg-surface rounded-[28px] p-5 border border-line shadow-float space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-ink-950 font-heading">
                  Report Crowd Level
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCrowdModal(false)}
                  className="p-1 text-muted hover:text-ink-950"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {crowdError === 'login_required' ? (
                <div className="space-y-3 text-center py-2">
                  <p className="text-xs text-muted">
                    Please log in to report crowd levels and help your community.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-1.5 w-full h-11 text-white text-xs font-bold rounded-full shadow-soft"
                    style={{ background: 'var(--gradient-brand)' }}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log in</span>
                  </Link>
                </div>
              ) : crowdError === 'rate_limited' ? (
                <div className="p-3 bg-amber-100 rounded-[14px] text-xs text-amber-700 font-medium">
                  You already reported recently for this trip. Thank you!
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={crowdReporting}
                    onClick={() => handleReportCrowd(1)}
                    className="p-3 bg-sky-50 hover:bg-sky-100 border border-line rounded-[16px] text-center transition flex flex-col items-center gap-1.5 active:scale-95"
                  >
                    <span className="text-xl">💺</span>
                    <span className="text-xs font-bold text-ink-950">Seats free</span>
                  </button>

                  <button
                    type="button"
                    disabled={crowdReporting}
                    onClick={() => handleReportCrowd(2)}
                    className="p-3 bg-amber-100/60 hover:bg-amber-100 border border-amber-500/30 rounded-[16px] text-center transition flex flex-col items-center gap-1.5 active:scale-95"
                  >
                    <span className="text-xl">🚶</span>
                    <span className="text-xs font-bold text-ink-950">Filling up</span>
                  </button>

                  <button
                    type="button"
                    disabled={crowdReporting}
                    onClick={() => handleReportCrowd(3)}
                    className="p-3 bg-danger/10 hover:bg-danger/20 border border-danger/30 rounded-[16px] text-center transition flex flex-col items-center gap-1.5 active:scale-95"
                  >
                    <span className="text-xl">👥</span>
                    <span className="text-xs font-bold text-danger">Packed</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
