import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, IndianRupee, Bookmark, Share2, Radio, Footprints, Bus, AlertCircle } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useSavedStore } from '@/store/savedStore'
import { useAuthStore } from '@/store/authStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { useToastStore } from '@/components/ui/Toast'
import { calculateBusEta } from '@/lib/eta'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import CrowdMeter from '@/components/ui/CrowdMeter'
import SosButton from '@/components/ui/SosButton'
import MapCard from '@/components/map/MapCard'
import UserBusComparison from '@/features/passenger/components/UserBusComparison'

export default function JourneyPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { stops, routes, routeStops, schedules } = useDataStore()
  const { setRoute, setMarkers, fitBounds } = useMapStore()
  const { isSaved, saveTrip, removeTrip, initSaved } = useSavedStore()
  const { trips, speedsByTrip } = useLiveStore()
  const { position: userPos } = useLocationStore()
  const { addToast } = useToastStore()

  const [journey, setJourney] = useState(null)

  const firstLeg = journey?.legs?.[0]
  const liveTripForLeg = useMemo(() => {
    if (!firstLeg?.route?.id || !trips || trips.length === 0) return null
    return trips.find(
      (t) =>
        t.route_id === firstLeg.route.id &&
        t.direction === (firstLeg.direction || 0) &&
        t.position
    )
  }, [firstLeg, trips])

  const liveEtaInfo = useMemo(() => {
    if (!liveTripForLeg?.position || !firstLeg?.fromStop?.id) return null
    const rStops = routeStops
      .filter((rs) => rs.route_id === firstLeg.route.id)
      .map((rs) => ({
        ...rs,
        stop: stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id, lat: 0, lng: 0 },
      }))
    const speedHist = speedsByTrip[liveTripForLeg.id] || []
    const eta = calculateBusEta({
      busPosition: liveTripForLeg.position,
      routeStops: rStops,
      direction: firstLeg.direction || 0,
      targetStopId: firstLeg.fromStop.id,
      speedHistory: speedHist,
    })
    if (!eta.hasPassed && eta.etaMinutes !== null) {
      return { isLive: true, etaMin: eta.etaMinutes, trip: liveTripForLeg }
    }
    return null
  }, [liveTripForLeg, firstLeg, routeStops, stops, speedsByTrip])

  useEffect(() => {
    initSaved(user)
    try {
      const stored = sessionStorage.getItem('nb_current_journey')
      if (stored) {
        setJourney(JSON.parse(stored))
      }
    } catch (e) {
      console.warn('Error reading stored journey:', e)
    }
  }, [user, initSaved])

  // Fit map and place pins for this journey
  useEffect(() => {
    if (!journey || !journey.legs || journey.legs.length === 0) return

    const markers = []
    const polyline = []

    const first = journey.legs[0]
    const last = journey.legs[journey.legs.length - 1]

    if (first?.fromStop) {
      markers.push({
        id: 'pinA',
        lat: first.fromStop.lat,
        lng: first.fromStop.lng,
        type: 'pinA',
        label: 'A',
      })
      polyline.push([first.fromStop.lat, first.fromStop.lng])
    }

    if (journey.legs.length > 1 && first?.toStop) {
      markers.push({
        id: 'transfer',
        lat: first.toStop.lat,
        lng: first.toStop.lng,
        type: 'transfer',
        label: '⇄',
      })
      polyline.push([first.toStop.lat, first.toStop.lng])
    }

    if (last?.toStop) {
      markers.push({
        id: 'pinB',
        lat: last.toStop.lat,
        lng: last.toStop.lng,
        type: 'pinB',
        label: 'B',
      })
      polyline.push([last.toStop.lat, last.toStop.lng])
    }

    setMarkers(markers)

    if (first?.fromStop && last?.toStop) {
      setRoute(polyline, first.route?.color || '#3451F2')
      fitBounds([
        [first.fromStop.lat, first.fromStop.lng],
        [last.toStop.lat, last.toStop.lng],
      ])
    }
  }, [journey, setMarkers, setRoute, fitBounds])

  const fromStop = journey?.legs?.[0]?.fromStop
  const toStop = journey?.legs?.[journey?.legs?.length - 1]?.toStop

  const currentlySaved = journey ? isSaved(journey.id) : false

  const handleToggleSave = () => {
    if (!journey) return
    if (currentlySaved) {
      removeTrip(journey.id)
      addToast('Removed from saved trips', 'info')
    } else {
      saveTrip({
        id: journey.id,
        fromStopId: fromStop?.id,
        toStopId: toStop?.id,
        fromName: localName(fromStop, i18n.language),
        toName: localName(toStop, i18n.language),
        totalFare: journey.totalFare,
        totalMinutes: journey.totalMinutes,
        transfers: journey.transfers,
        legsSummary: journey.legs.map((l) => l.route?.code).join(' → '),
        savedAt: new Date().toISOString(),
      })
      addToast('Saved to your trips', 'success')
    }
  }

  const handleShare = async () => {
    const text = `Bus journey: ${localName(fromStop, i18n.language)} to ${localName(toStop, i18n.language)} on Nammooru Bus. Fare: ₹${journey?.totalFare}, Time: ${journey?.totalMinutes} min.`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nammooru Bus Journey',
          text,
          url: window.location.href,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(`${text} ${window.location.href}`)
          addToast('Journey copied to clipboard!', 'info')
        }
      }
    } else {
      navigator.clipboard.writeText(`${text} ${window.location.href}`)
      addToast('Journey link copied to clipboard!', 'info')
    }
  }

  if (!journey) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-text-secondary mx-auto" />
        <p className="text-xs text-text-secondary">No journey selected.</p>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-pill"
        >
          Plan a journey
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 pt-1 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-ink transition p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-xs font-heading">Journey Details</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`p-1.5 rounded-pill border transition ${
              currentlySaved ? 'bg-cobalt text-white border-cobalt' : 'bg-surface text-text-secondary border-line'
            }`}
            title="Save trip"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-pill bg-surface text-text-secondary border border-line hover:text-ink transition"
            title="Share trip"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Small Map Card (Height 240px per Part B) */}
      <MapCard height={240} />

      {/* Live Comparison Panel if Bus is Tracking (Part C.4) */}
      {liveTripForLeg && (
        <UserBusComparison
          userPos={userPos}
          selectedTrip={liveTripForLeg}
          stops={stops}
          routeStops={routeStops}
          schedules={schedules}
        />
      )}

      {/* Summary Tiles Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-surface rounded-card border border-line shadow-soft text-center">
          <span className="text-[10px] uppercase font-bold text-text-secondary block">
            {t('passenger.total_time')}
          </span>
          <span className="text-base font-extrabold text-ink font-heading">
            {journey.totalMinutes} min
          </span>
        </div>

        <div className="p-3 bg-surface rounded-card border border-line shadow-soft text-center">
          <span className="text-[10px] uppercase font-bold text-text-secondary block">
            {t('passenger.fare')}
          </span>
          <span className="text-base font-extrabold text-ink font-heading">
            ₹{journey.totalFare}
          </span>
        </div>

        <div className="p-3 bg-surface rounded-card border border-line shadow-soft text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="text-[10px] uppercase font-bold text-text-secondary">
              Next Bus
            </span>
            {liveEtaInfo ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-success bg-success/15 px-1.5 py-0.2 rounded-pill flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary bg-page px-1 rounded-pill">
                Sched
              </span>
            )}
          </div>
          <span className={`text-base font-extrabold font-heading ${liveEtaInfo ? 'text-success' : 'text-cobalt'}`}>
            {liveEtaInfo ? liveEtaInfo.etaMin : journey.nextBusMin} min
          </span>
        </div>
      </div>

      {/* Vertical Stepper Cards */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft space-y-4">
        {/* Step 1: Walk to Origin Stop */}
        <div className="flex gap-3 relative">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-success text-white flex items-center justify-center text-xs font-bold shrink-0">
              A
            </div>
            <div className="w-0.5 flex-1 bg-line my-1" />
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <h4 className="text-xs font-bold text-ink">
              {fromStop ? localName(fromStop, i18n.language) : 'Origin Stop'}
            </h4>
            <p className="text-[11px] text-text-secondary">Walk 3 min to stop</p>
          </div>
        </div>

        {/* Step 2: Legs */}
        {journey.legs.map((leg, idx) => {
          const isTransfer = idx > 0
          return (
            <div key={idx} className="space-y-3">
              {isTransfer && (
                <div className="flex gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-warning text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ⇄
                    </div>
                    <div className="w-0.5 flex-1 bg-line my-1" />
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
                      Transfer Stop
                    </span>
                    <h4 className="text-xs font-bold text-ink">
                      {localName(leg.fromStop, i18n.language)}
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Change bus &bull; 6 min transfer buffer
                    </p>
                  </div>
                </div>
              )}

              {/* Ride Leg Card */}
              <div className="flex gap-3 relative">
                <div className="flex flex-col items-center">
                  <div
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: leg.route?.color || '#3451F2' }}
                  >
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-0.5 flex-1 bg-line my-1" />
                </div>
                <div className="pb-3 flex-1 min-w-0 bg-page/70 p-3 rounded-input border border-line space-y-1.5">
                  <div className="flex items-center justify-between">
                    <RouteBadge code={leg.route?.code} color={leg.route?.color} size="sm" />
                    <CrowdMeter level="moderate" />
                  </div>
                  <p className="text-xs font-bold text-ink">
                    Board Route {leg.route?.code} ({localName(leg.route, i18n.language)})
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Ride {leg.stopsCount} stops &bull; {leg.durationMin} min &bull; ₹{leg.fare}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Final Step: Destination */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center text-xs font-bold shrink-0">
              B
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-ink">
              {toStop ? localName(toStop, i18n.language) : 'Destination Stop'}
            </h4>
            <p className="text-[11px] text-text-secondary">Arrive at destination</p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar (Save, Share, Track live, SOS) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur-md border-t border-line z-30 flex items-center justify-center gap-2 max-w-lg mx-auto md:max-w-none">
        <Link
          to={`/live?route=${journey.legs[0]?.route?.code}`}
          className="flex-1 py-2.5 bg-cobalt text-white text-xs font-bold rounded-pill shadow-soft flex items-center justify-center gap-2 hover:opacity-95 transition"
        >
          <Radio className="w-4 h-4" />
          <span>{t('passenger.track_live')}</span>
        </Link>

        <SosButton
          routeCode={firstLeg?.route?.code}
          busRegNo={liveTripForLeg?.bus?.reg_no}
          tripId={liveTripForLeg?.id}
          variant="compact"
        />
      </div>
    </div>
  )
}
