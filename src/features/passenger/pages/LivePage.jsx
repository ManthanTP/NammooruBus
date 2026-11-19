import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Users, AlertTriangle, Clock, MapPin, ChevronRight, RefreshCw, LogIn, X, ShieldAlert, Bus } from 'lucide-react'
import { useLiveStore } from '@/store/liveStore'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/components/ui/Toast'
import { calculateBusEta } from '@/lib/eta'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import CrowdMeter from '@/components/ui/CrowdMeter'
import Countdown from '@/components/ui/Countdown'
import EmptyState from '@/components/ui/EmptyState'
import SosButton from '@/components/ui/SosButton'

export default function LivePage() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialRouteFilter = searchParams.get('route')

  const { user } = useAuthStore()
  const { routes, routeStops, stops } = useDataStore()
  const { trips, selectedTripId, setSelectedTripId, isReconnecting, reportCrowd, speedsByTrip } = useLiveStore()
  const { setRoute, fitBounds, setView } = useMapStore()
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
        if (match.position?.lat && match.position?.lng) {
          setView([match.position.lat, match.position.lng], 16)
        }
      }
    }
  }, [tripParam, trips, setSelectedTripId, setView])

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

  // Center on selected bus
  useEffect(() => {
    if (selectedTrip?.position?.lat && selectedTrip?.position?.lng) {
      setView([selectedTrip.position.lat, selectedTrip.position.lng], 15)
    }
  }, [selectedTrip, setView])

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
      if (error.message?.includes('rate_limited')) {
        setCrowdError('rate_limited')
      } else if (error.message?.includes('login_required')) {
        setCrowdError('login_required')
      } else {
        setCrowdError(error.message)
      }
    } else {
      setShowCrowdModal(false)
      addToast({ message: 'Crowd level submitted. Thank you!', type: 'success' })
    }
  }

  const handleSos = () => {
    const routeCode = selectedTrip?.route?.code || ''
    const regNo = selectedTrip?.bus?.reg_no || ''
    const msg = `I am on bus Route ${routeCode} (${regNo}). Track me: ${window.location.origin}/live?trip=${selectedTrip?.id}`
    if (navigator.share) {
      navigator.share({ title: 'Nammooru Bus SOS', text: msg })
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  // Filter chips options
  const filterChips = useMemo(() => {
    return [{ key: 'all', code: 'All' }, ...routes.map((r) => ({ key: r.code, code: r.code }))]
  }, [routes])

  return (
    <div className="space-y-3 pt-1 pb-6">
      {/* Route Filter Chips with Sliding Pill */}
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

      {/* Selected Bus Detail Card */}
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
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Crowd Meter and Action Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-line">
            <div className="flex items-center gap-2">
              <CrowdMeter level={selectedTrip.crowd_level} />
              {!selectedTrip.crowd_level && (
                <span className="text-[10px] text-text-secondary italic">No crowd report</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCrowdModal(true)}
                className="px-2.5 py-1.5 bg-cobalt-tint text-cobalt text-xs font-bold rounded-input hover:bg-cobalt hover:text-white transition flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Report crowd</span>
              </button>

              <SosButton
                routeCode={selectedTrip.route?.code}
                busRegNo={selectedTrip.bus?.reg_no}
                tripId={selectedTrip.id}
                variant="compact"
              />
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Radio}
          title="No Active Buses"
          description={
            selectedRouteCode === 'all'
              ? 'No drivers are currently sharing location. Check back during service hours or use the Dev Simulator.'
              : `No live buses running on Route ${selectedRouteCode}.`
          }
        />
      )}

      {/* Screen Reader Accessible List of All Active Buses */}
      {filteredTrips.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Live Buses ({filteredTrips.length})
          </h4>
          <div className="space-y-1.5">
            {filteredTrips.map((t) => {
              const isSelected = selectedTrip?.id === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  role="button"
                  tabIndex={0}
                  className={`p-2.5 rounded-input border transition flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-cobalt-tint/60 border-cobalt' : 'bg-surface border-line hover:border-cobalt'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RouteBadge code={t.route?.code} color={t.route?.color} size="xs" />
                    <span className="text-xs font-bold text-ink truncate">
                      {localName(t.route, i18n.language)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cobalt shrink-0">
                    <span>{t.bus?.reg_no || 'BUS'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Report Crowd Modal / Bottom Sheet */}
      <AnimatePresence>
        {showCrowdModal && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-end justify-center p-4">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-surface rounded-card border border-line p-5 shadow-float"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cobalt" />
                  <h3 className="text-sm font-bold text-ink font-heading">Report Bus Crowd</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCrowdModal(false)}
                  className="text-text-secondary hover:text-ink p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error messages */}
              {crowdError === 'login_required' && (
                <div className="mb-4 p-3 bg-warning/15 border border-warning/30 rounded-input text-xs text-ink flex flex-col gap-2">
                  <p>You must be signed in to submit crowd feedback.</p>
                  <Link
                    to="/login"
                    className="self-end px-3 py-1 bg-cobalt text-white font-bold rounded-pill text-xs flex items-center gap-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Log in</span>
                  </Link>
                </div>
              )}

              {crowdError === 'rate_limited' && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger">
                  You already submitted a report recently. Please wait 5 minutes before reporting again.
                </div>
              )}

              {crowdError && crowdError !== 'login_required' && crowdError !== 'rate_limited' && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger">
                  {crowdError}
                </div>
              )}

              {/* Three Big Crowd Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={crowdReporting}
                  onClick={() => handleReportCrowd('empty')}
                  className="p-3 bg-success/10 border border-success/30 rounded-input hover:bg-success hover:text-white transition flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-3 h-3 rounded-full bg-success group-hover:bg-white" />
                  <span className="text-xs font-bold">Seats free</span>
                </button>

                <button
                  type="button"
                  disabled={crowdReporting}
                  onClick={() => handleReportCrowd('moderate')}
                  className="p-3 bg-warning/10 border border-warning/30 rounded-input hover:bg-warning hover:text-white transition flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-3 h-3 rounded-full bg-warning group-hover:bg-white" />
                  <span className="text-xs font-bold">Filling up</span>
                </button>

                <button
                  type="button"
                  disabled={crowdReporting}
                  onClick={() => handleReportCrowd('full')}
                  className="p-3 bg-danger/10 border border-danger/30 rounded-input hover:bg-danger hover:text-white transition flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-3 h-3 rounded-full bg-danger group-hover:bg-white" />
                  <span className="text-xs font-bold">Packed</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
