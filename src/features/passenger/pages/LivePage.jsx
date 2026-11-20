import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Users, AlertTriangle, Clock, MapPin, ChevronRight, RefreshCw, LogIn, X, ShieldAlert, Bus, Navigation } from 'lucide-react'
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
import SosButton from '@/components/ui/SosButton'
import MapCard from '@/components/map/MapCard'
import UserBusComparison from '@/features/passenger/components/UserBusComparison'
import LocationBanner from '@/components/ui/LocationBanner'

export default function LivePage() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialRouteFilter = searchParams.get('route')

  const { user } = useAuthStore()
  const { routes, routeStops, stops, schedules } = useDataStore()
  const { trips, selectedTripId, setSelectedTripId, isReconnecting, reportCrowd, speedsByTrip } = useLiveStore()
  const { setBounds, fitBounds, setCenter, setView } = useMapStore()
  const { position: userPos } = useLocationStore()
  const { addToast } = useToastStore()

  const [selectedRouteCode, setSelectedRouteCode] = useState(initialRouteFilter || 'all')
  const [showCrowdModal, setShowCrowdModal] = useState(false)
  const [crowdReporting, setCrowdReporting] = useState(false)
  const [crowdError, setCrowdError] = useState(null)

  // Handle URL query ?trip=<id>
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

  // Filter trips by route code
  const filteredTrips = useMemo(() => {
    if (selectedRouteCode === 'all') return trips
    return trips.filter((t) => t.route?.code === selectedRouteCode)
  }, [trips, selectedRouteCode])

  // Get currently selected trip or fallback to first trip
  const selectedTrip = useMemo(() => {
    if (!selectedTripId && filteredTrips.length > 0) return filteredTrips[0]
    return trips.find((t) => t.id === selectedTripId) || filteredTrips[0] || null
  }, [trips, selectedTripId, filteredTrips])

  // Center or fit bounds on selected bus + user
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

  // Compute ETA and Next Stop for selected trip
  const tripDetails = useMemo(() => {
    if (!selectedTrip || !selectedTrip.position) return null

    const rStops = routeStops
      .filter((rs) => rs.route_id === selectedTrip.route_id)
      .map((rs) => ({
        ...rs,
        stop: stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id, name_en: 'Stop' },
      }))

    const speedHistory = speedsByTrip[selectedTrip.id] || []
    const etaData = calculateBusEta({
      busPosition: selectedTrip.position,
      routeStops: rStops,
      direction: selectedTrip.direction || 0,
      speedHistory,
    })

    const now = Date.now()
    const updatedAt = selectedTrip.position.updated_at
      ? new Date(selectedTrip.position.updated_at).getTime()
      : now
    const ageSeconds = Math.floor((now - updatedAt) / 1000)
    const isStale = ageSeconds > 60

    return {
      ...etaData,
      isStale,
      ageMinutes: Math.max(1, Math.floor(ageSeconds / 60)),
    }
  }, [selectedTrip, routeStops, stops, speedsByTrip])

  // Handle Crowd Reporting
  const handleReportCrowd = async (level) => {
    if (!user) {
      setCrowdError('login_required')
      return
    }
    if (!selectedTrip) return

    setCrowdReporting(true)
    setCrowdError(null)

    const { error } = await reportCrowd(selectedTrip.id, level)
    setCrowdReporting(false)

    if (error) {
      if (error.message?.includes('rate_limit') || error.code === 'P0001') {
        setCrowdError('rate_limited')
      } else {
        setCrowdError('Failed to record report. Please try again.')
      }
    } else {
      setShowCrowdModal(false)
      addToast('Crowd status reported. Thank you for helping!', 'success')
    }
  }

  // Route filter list
  const filterChips = useMemo(() => {
    const list = [{ key: 'all', code: 'All' }]
    const activeRouteIds = new Set(trips.map((t) => t.route_id))
    routes.forEach((r) => {
      if (activeRouteIds.has(r.id)) {
        list.push({ key: r.code, code: r.code })
      }
    })
    return list
  }, [routes, trips])

  return (
    <div className="space-y-3.5 pt-1">
      {/* 1. Header with live status & SOS button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-ink font-heading flex items-center gap-2">
            <Radio className="w-5 h-5 text-cobalt" />
            <span>{t('passenger.live_tracking')}</span>
          </h1>
          <p className="text-xs text-text-secondary">
            {trips.length} active buses &bull; Real-time GPS pings
          </p>
        </div>

        {selectedTrip && (
          <SosButton
            routeCode={selectedTrip.route?.code}
            busRegNo={selectedTrip.bus?.reg_no}
            tripId={selectedTrip.id}
          />
        )}
      </div>

      {/* 2. Small Map Card (Height 300px on Live, sticky per Part B) */}
      <MapCard height={300} isSticky={true} />

      {/* 3. Location Banner if location is not active */}
      <LocationBanner />

      {/* 4. Comparison Panel between User and Selected Bus (Part C.4) */}
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
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        {filterChips.map((chip) => {
          const isSelected = selectedRouteCode === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSelectedRouteCode(chip.key)}
              className={`relative px-3 py-1 rounded-pill text-xs font-bold transition-colors shrink-0 ${
                isSelected ? 'text-white' : 'text-text-secondary bg-surface border border-line hover:text-ink'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="liveFilterPill"
                  className="absolute inset-0 bg-cobalt rounded-pill -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {chip.code}
            </button>
          )
        })}
      </div>

      {/* 6. Selected Bus Detail Card */}
      {selectedTrip && tripDetails ? (
        <div className="p-4 bg-surface rounded-card border border-line shadow-soft space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RouteBadge
                code={selectedTrip.route?.code}
                color={selectedTrip.route?.color}
                size="md"
              />
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-ink truncate">
                  {localName(selectedTrip.route, i18n.language)}
                </h3>
                <span className="text-[10px] text-text-secondary font-mono">
                  Bus: {selectedTrip.bus?.reg_no || 'KA-25-1001'}
                </span>
              </div>
            </div>

            {/* Status Chip */}
            <div className="flex items-center gap-1.5">
              {tripDetails.isStale ? (
                <span className="px-2 py-0.5 bg-line text-text-secondary text-[10px] font-bold rounded-pill">
                  Last seen {tripDetails.ageMinutes}m ago
                </span>
              ) : selectedTrip.status === 'delayed' ? (
                <span className="px-2 py-0.5 bg-warning/15 text-warning text-[10px] font-bold rounded-pill">
                  Delayed
                </span>
              ) : selectedTrip.status === 'breakdown' ? (
                <span className="px-2 py-0.5 bg-danger/15 text-danger text-[10px] font-bold rounded-pill">
                  Breakdown
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-success/15 text-success text-[10px] font-bold rounded-pill flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  On time
                </span>
              )}
            </div>
          </div>

          {/* Next stop and Rolling ETA */}
          <div className="p-3 bg-page rounded-input flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                Next Stop
              </span>
              <p className="text-xs font-extrabold text-ink truncate">
                {tripDetails.nextStop?.stop?.name_en || 'Approaching stop'}
              </p>
              <span className="text-[10px] text-text-secondary">
                {tripDetails.remainingKm} km away &bull; {tripDetails.speedKmh} km/h
              </span>
            </div>

            <div className="text-right shrink-0">
              <Countdown value={tripDetails.etaMinutes} label="ETA" unit="min" />
            </div>
          </div>

          {/* Progress Bar from First to Last Stop */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary mb-1">
              <span>Origin</span>
              <span>{tripDetails.progressPercent}% of route completed</span>
              <span>Destination</span>
            </div>
            <div className="w-full h-2 bg-line rounded-pill overflow-hidden">
              <motion.div
                className="h-full bg-cobalt rounded-pill"
                initial={{ width: 0 }}
                animate={{ width: `${tripDetails.progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Crowd & Report Action */}
          <div className="flex items-center justify-between pt-1 border-t border-line text-xs">
            <CrowdMeter level={selectedTrip.crowd_level || 1} />
            <button
              type="button"
              onClick={() => setShowCrowdModal(true)}
              className="text-xs font-bold text-cobalt hover:underline flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Report crowd</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 7. Active Bus List */}
      <div className="space-y-2 pt-2 pb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
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
                className={`p-3 rounded-card border transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-cobalt-tint/60 border-cobalt shadow-soft'
                    : 'bg-surface hover:bg-page border-line'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RouteBadge code={trip.route?.code} color={trip.route?.color} size="sm" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-ink truncate">
                      {localName(trip.route, i18n.language)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-secondary font-mono">
                        {trip.bus?.reg_no || 'KA-25-1001'}
                      </span>
                      {tripDistKm !== null && (
                        <span className="text-[10px] text-cobalt font-bold flex items-center gap-0.5">
                          <Navigation className="w-2.5 h-2.5" />
                          <span>
                            {tripDistKm < 1
                              ? `${Math.round(tripDistKm * 1000)}m`
                              : `${tripDistKm.toFixed(1)}km`}{' '}
                            from you
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                      trip.status === 'delayed'
                        ? 'bg-warning/15 text-warning'
                        : trip.status === 'breakdown'
                        ? 'bg-danger/15 text-danger'
                        : 'bg-success/15 text-success'
                    }`}
                  >
                    {trip.status || 'Active'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Crowd Reporting Modal */}
      <AnimatePresence>
        {showCrowdModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-sm bg-surface rounded-card p-5 border border-line shadow-float space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink font-heading">
                  Report Crowd Level
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCrowdModal(false)}
                  className="p-1 text-text-secondary hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {crowdError === 'login_required' ? (
                <div className="space-y-3 text-center py-2">
                  <p className="text-xs text-text-secondary">
                    Please log in to report crowd levels and help your community.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-cobalt text-white text-xs font-bold rounded-pill"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log in</span>
                  </Link>
                </div>
              ) : crowdError === 'rate_limited' ? (
                <div className="p-3 bg-warning/15 rounded-input text-xs text-warning font-medium">
                  You already reported recently for this trip. Thank you!
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={crowdReporting}
                    onClick={() => handleReportCrowd(1)}
                    className="p-3 bg-page hover:bg-success/15 border border-line hover:border-success rounded-card text-center transition flex flex-col items-center gap-1.5"
                  >
                    <span className="text-xl">💺</span>
                    <span className="text-xs font-bold text-ink">Seats free</span>
                  </button>

                  <button
                    type="button"
                    disabled={crowdReporting}
                    onClick={() => handleReportCrowd(2)}
                    className="p-3 bg-page hover:bg-warning/15 border border-line hover:border-warning rounded-card text-center transition flex flex-col items-center gap-1.5"
                  >
                    <span className="text-xl">🚶</span>
                    <span className="text-xs font-bold text-ink">Filling up</span>
                  </button>

                  <button
                    type="button"
                    disabled={crowdReporting}
                    onClick={() => handleReportCrowd(3)}
                    className="p-3 bg-page hover:bg-danger/15 border border-line hover:border-danger rounded-card text-center transition flex flex-col items-center gap-1.5"
                  >
                    <span className="text-xl">👥</span>
                    <span className="text-xs font-bold text-ink">Packed</span>
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
