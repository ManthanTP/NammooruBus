import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Radio,
  Bus,
  AlertCircle,
  LogIn,
  UserPlus,
  X,
} from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useSavedStore } from '@/store/savedStore'
import { useAuthStore } from '@/store/authStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { useToastStore, toast } from '@/components/ui/Toast'
import { calculateBusEta } from '@/lib/eta'
import { localName } from '@/lib/formatters'
import { findRoutes } from '@/lib/routeFinder'
import { fetchDrivingRoute, fetchWalkingRoute } from '@/lib/roadRouting'
import RouteBadge from '@/components/ui/RouteBadge'
import CrowdMeter from '@/components/ui/CrowdMeter'
import SosButton from '@/components/ui/SosButton'
import MapCard from '@/components/map/MapCard'
import Skeleton from '@/components/ui/Skeleton'
import UserBusComparison from '@/features/passenger/components/UserBusComparison'
import { hapticTick, nativeShare } from '@/lib/platform'

export default function JourneyPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { stops, routes, routeStops, schedules, fareConfig, loading: storeLoading, initData } = useDataStore()
  const { setJourneyLegs, setMarkers, fitBounds, setBounds, clearMap } = useMapStore()
  const { isSaved, saveTrip, removeTrip, initSaved } = useSavedStore()
  const { trips, speedsByTrip } = useLiveStore()
  const { position: userPos } = useLocationStore()
  const { addToast } = useToastStore()

  const [journey, setJourney] = useState(null)
  const [computing, setComputing] = useState(true)
  const [showGuestModal, setShowGuestModal] = useState(false)

  const fromStopId = searchParams.get('from')
  const toStopId = searchParams.get('to')
  const rCodes = searchParams.get('r')

  // Initialize data if not yet loaded
  useEffect(() => {
    if (stops.length === 0 && !storeLoading) {
      initData()
    }
  }, [stops.length, storeLoading, initData])

  useEffect(() => {
    initSaved(user)
  }, [user, initSaved])

  // Restore or compute journey
  useEffect(() => {
    let resolved = null

    // 1. Check sessionStorage
    try {
      const stored = sessionStorage.getItem('nb_current_journey')
      if (stored) {
        const parsed = JSON.parse(stored)
        // If query parameters match stored journey endpoints
        const storedFrom = parsed?.legs?.[0]?.fromStop?.id
        const storedTo = parsed?.legs?.[parsed.legs.length - 1]?.toStop?.id
        if (!fromStopId || (storedFrom === fromStopId && storedTo === toStopId)) {
          resolved = parsed
        }
      }
    } catch (e) {
      console.warn('Error reading stored journey:', e)
    }

    if (resolved) {
      setJourney(resolved)
      setComputing(false)
      return
    }

    // 2. Compute from URL params if master data ready
    if (!fromStopId || !toStopId) {
      setComputing(false)
      return
    }

    if (stops.length === 0 || routes.length === 0) {
      // Waiting for dataStore to finish loading
      return
    }

    setComputing(true)
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

      if (found && found.length > 0) {
        let matched = found[0]
        if (rCodes) {
          const expected = rCodes.toLowerCase()
          const candidate = found.find((item) => {
            const codeStr = (item.legs || []).map((l) => l.route?.code?.toLowerCase()).filter(Boolean).join('+')
            return codeStr === expected || codeStr.includes(expected)
          })
          if (candidate) matched = candidate
        }
        setJourney(matched)
        sessionStorage.setItem('nb_current_journey', JSON.stringify(matched))
      } else {
        setJourney(null)
      }
    } catch (err) {
      console.error('Error calculating journey from URL:', err)
      setJourney(null)
    } finally {
      setComputing(false)
    }
  }, [fromStopId, toStopId, rCodes, stops, routes, routeStops, schedules, fareConfig])

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

  // Road Routing: compute multi-leg road geometries (walking + driving)
  useEffect(() => {
    if (!journey || !journey.legs || journey.legs.length === 0) return

    const ac = new AbortController()

    const calculateLegs = async () => {
      try {
        const calculatedLegs = []
        const markers = []
        const boundsCoords = []

        const firstLeg = journey.legs[0]
        const lastLeg = journey.legs[journey.legs.length - 1]

        // Origin Marker (A)
        if (firstLeg?.fromStop?.lat) {
          markers.push({
            id: 'pinA',
            lat: Number(firstLeg.fromStop.lat),
            lng: Number(firstLeg.fromStop.lng),
            type: 'pinA',
            label: 'A',
          })
          boundsCoords.push([Number(firstLeg.fromStop.lat), Number(firstLeg.fromStop.lng)])
        }

        // Optional Walk Leg from user location to boarding stop
        if (
          userPos?.lat &&
          userPos?.lng &&
          firstLeg?.fromStop?.lat &&
          !Number.isNaN(Number(userPos.lat)) &&
          !Number.isNaN(Number(userPos.lng))
        ) {
          const walkResult = await fetchWalkingRoute(
            { lat: Number(userPos.lat), lng: Number(userPos.lng) },
            { lat: Number(firstLeg.fromStop.lat), lng: Number(firstLeg.fromStop.lng) },
            { signal: ac.signal }
          )
          if (walkResult?.polyline?.length >= 2) {
            calculatedLegs.push({
              type: 'walk',
              polyline: walkResult.polyline,
              distanceMeters: walkResult.distanceMeters,
              walkMinutes: walkResult.walkMinutes,
              midpoint: walkResult.midpoint,
              isApproximate: walkResult.isApproximate,
            })
            walkResult.polyline.forEach(([lat, lng]) => boundsCoords.push([lat, lng]))
          }
        }

        // Process each bus leg & transfer
        for (let i = 0; i < journey.legs.length; i++) {
          const leg = journey.legs[i]

          // Transfer pin between legs
          if (i > 0 && leg.fromStop?.lat) {
            markers.push({
              id: `transfer-${i}`,
              lat: Number(leg.fromStop.lat),
              lng: Number(leg.fromStop.lng),
              type: 'transfer',
              label: '⇄',
            })
            boundsCoords.push([Number(leg.fromStop.lat), Number(leg.fromStop.lng)])
          }

          // Transfer walking leg if transfer stops are distinct
          if (i > 0) {
            const prevLeg = journey.legs[i - 1]
            if (
              prevLeg.toStop &&
              leg.fromStop &&
              prevLeg.toStop.id !== leg.fromStop.id &&
              prevLeg.toStop.lat &&
              leg.fromStop.lat
            ) {
              const transferWalk = await fetchWalkingRoute(
                { lat: Number(prevLeg.toStop.lat), lng: Number(prevLeg.toStop.lng) },
                { lat: Number(leg.fromStop.lat), lng: Number(leg.fromStop.lng) },
                { signal: ac.signal }
              )
              if (transferWalk?.polyline?.length >= 2) {
                calculatedLegs.push({
                  type: 'walk',
                  polyline: transferWalk.polyline,
                  distanceMeters: transferWalk.distanceMeters,
                  walkMinutes: transferWalk.walkMinutes,
                  midpoint: transferWalk.midpoint,
                  isApproximate: transferWalk.isApproximate,
                })
                transferWalk.polyline.forEach(([lat, lng]) => boundsCoords.push([lat, lng]))
              }
            }
          }

          // Gather stops along this route leg in sequence
          let legStops = []
          if (leg.route?.id && routeStops.length > 0) {
            const rStops = routeStops
              .filter((rs) => rs.route_id === leg.route.id)
              .sort((a, b) => a.seq - b.seq)
            const fromIdx = rStops.findIndex((rs) => rs.stop_id === leg.fromStop?.id)
            const toIdx = rStops.findIndex((rs) => rs.stop_id === leg.toStop?.id)

            if (fromIdx !== -1 && toIdx !== -1) {
              const slice =
                fromIdx <= toIdx
                  ? rStops.slice(fromIdx, toIdx + 1)
                  : rStops.slice(toIdx, fromIdx + 1).reverse()
              legStops = slice
                .map((rs) => stops.find((s) => s.id === rs.stop_id))
                .filter((s) => s && s.lat && s.lng)
            }
          }

          if (legStops.length < 2 && leg.fromStop?.lat && leg.toStop?.lat) {
            legStops = [leg.fromStop, leg.toStop]
          }

          // Check if route has pre-calculated geometry
          let busPolyline = null
          let isApprox = false

          if (leg.route?.geometry?.coordinates && Array.isArray(leg.route.geometry.coordinates)) {
            // GeoJSON LineString [lng, lat] -> [lat, lng]
            busPolyline = leg.route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
          } else {
            const waypoints = legStops.map((s) => ({
              lat: Number(s.lat),
              lng: Number(s.lng),
            }))
            const driving = await fetchDrivingRoute(waypoints, { signal: ac.signal })
            busPolyline = driving.polyline
            isApprox = driving.isApproximate
          }

          if (busPolyline && busPolyline.length >= 2) {
            calculatedLegs.push({
              type: 'bus',
              polyline: busPolyline,
              color: leg.route?.color || '#3451F2',
              isApproximate: isApprox,
            })
            busPolyline.forEach(([lat, lng]) => boundsCoords.push([lat, lng]))
          }
        }

        // Destination Marker (B)
        if (lastLeg?.toStop?.lat) {
          markers.push({
            id: 'pinB',
            lat: Number(lastLeg.toStop.lat),
            lng: Number(lastLeg.toStop.lng),
            type: 'pinB',
            label: 'B',
          })
          boundsCoords.push([Number(lastLeg.toStop.lat), Number(lastLeg.toStop.lng)])
        }

        setMarkers(markers)
        setJourneyLegs(calculatedLegs)

        if (boundsCoords.length >= 2) {
          const fit = fitBounds || setBounds
          if (typeof fit === 'function') {
            fit(boundsCoords)
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Error calculating journey road legs:', err)
        }
      }
    }

    calculateLegs()

    return () => {
      ac.abort()
      clearMap()
    }
  }, [journey, routeStops, stops, userPos, setJourneyLegs, setMarkers, fitBounds, setBounds, clearMap])

  const fromStop = journey?.legs?.[0]?.fromStop
  const toStop = journey?.legs?.[journey?.legs?.length - 1]?.toStop

  const currentlySaved = fromStop?.id && toStop?.id ? isSaved(fromStop.id, toStop.id) : false

  const handleToggleSave = () => {
    if (!journey) return
    hapticTick()

    // If guest, show login prompt sheet/modal and toast with action
    if (!user) {
      setShowGuestModal(true)
      toast.info('toast.login_required', {
        action: {
          label: t('auth.sign_in', 'Sign in'),
          onClick: () => navigate('/login'),
        },
      })
      return
    }

    if (currentlySaved) {
      removeTrip({ from_stop: fromStop.id, to_stop: toStop.id }, user)
      toast.info('toast.trip_removed')
    } else {
      saveTrip(journey, user)
      toast.success('toast.trip_saved')
    }
  }

  const handleShare = async () => {
    hapticTick()
    const text = `Bus journey: ${localName(fromStop, i18n.language)} to ${localName(toStop, i18n.language)} on Nammooru Bus. Fare: ₹${journey?.totalFare}, Time: ${journey?.totalMinutes} min.`
    try {
      await nativeShare({
        title: 'Nammooru Bus Journey',
        text,
        url: window.location.href,
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        navigator.clipboard.writeText(`${text} ${window.location.href}`)
        toast.info('toast.journey_copied')
      }
    }
  }

  // Skeleton loader during computation/fetch
  if (computing || (storeLoading && !journey)) {
    return (
      <div className="space-y-4 pt-1 pb-16">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <Skeleton className="h-5 w-16 rounded-pill" />
          <Skeleton className="h-5 w-28 rounded-pill" />
          <Skeleton className="h-6 w-14 rounded-pill" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-card" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
        </div>
        <div className="space-y-3 p-4 bg-surface rounded-card border border-line">
          <Skeleton className="h-12 w-full rounded-input" />
          <Skeleton className="h-16 w-full rounded-input" />
          <Skeleton className="h-12 w-full rounded-input" />
        </div>
      </div>
    )
  }

  if (!journey) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-text-secondary mx-auto" />
        <p className="text-xs text-text-secondary">No journey found for this route.</p>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="px-4 py-2 on-brand text-xs font-bold rounded-pill shadow-soft"
          style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
        >
          Plan a journey
        </button>
      </div>
    )
  }

  const currentRedirect = encodeURIComponent(location.pathname + location.search)

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
            className={`p-1.5 rounded-pill border transition ${currentlySaved
              ? 'bg-cobalt text-white border-cobalt'
              : 'bg-surface text-text-secondary border-line hover:text-ink'
              }`}
            title={currentlySaved ? 'Remove from saved' : 'Save trip'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${currentlySaved ? 'fill-current' : ''}`} />
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

      {/* Small Map Card (Height 240px) */}
      <MapCard height={240} />

      {/* Live Comparison Panel if Bus is Tracking */}
      {liveTripForLeg && (
        <UserBusComparison
          userPos={userPos}
          selectedTrip={liveTripForLeg}
          stops={stops}
          routeStops={routeStops}
          schedules={schedules}
        />
      )}

      {/* Summary Tiles Row (Gradient Style per Section 6) */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-3.5 rounded-[20px] on-brand shadow-soft text-center flex flex-col justify-between"
          style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
        >
          <span className="text-[10px] uppercase font-bold block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            {t('passenger.total_time') || 'Total time'}
          </span>
          <span className="text-lg font-extrabold font-heading mt-1" style={{ color: 'var(--on-brand)' }}>
            {journey.totalMinutes} <span className="text-xs font-semibold" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>min</span>
          </span>
        </div>

        <div
          className="p-3.5 rounded-[20px] on-brand shadow-soft text-center flex flex-col justify-between"
          style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
        >
          <span className="text-[10px] uppercase font-bold block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            {t('passenger.fare') || 'Fare'}
          </span>
          <span className="text-lg font-extrabold font-heading mt-1" style={{ color: 'var(--on-brand)' }}>
            ₹{journey.totalFare}
          </span>
        </div>

        <div
          className="p-3.5 rounded-[20px] on-brand shadow-soft text-center flex flex-col justify-between"
          style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
        >
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] uppercase font-bold" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              Next Bus
            </span>
            {liveEtaInfo && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <span className="text-lg font-extrabold font-heading mt-1" style={{ color: 'var(--amber)' }}>
            {liveEtaInfo ? liveEtaInfo.etaMin : journey.nextBusMin} <span className="text-xs font-semibold" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>min</span>
          </span>
        </div>
      </div>

      {/* Vertical Stepper with Signature Road Rail */}
      <div className="p-4 bg-surface rounded-[20px] border border-line shadow-soft space-y-4">
        {/* Step 1: Origin Stop */}
        <div className="flex gap-3.5 relative">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-cobalt-500 text-white flex items-center justify-center text-xs font-extrabold font-heading shrink-0 shadow-xs">
              A
            </div>
            {/* White road with dashed centre line on sky-100 rail */}
            <div
              className="w-1.5 flex-1 bg-sky-100 rounded-full my-1.5 relative overflow-hidden"
              style={{
                backgroundImage: 'repeating-linear-gradient(180deg, var(--cobalt-500) 0px, var(--cobalt-500) 4px, transparent 4px, transparent 8px)'
              }}
            />
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted block tracking-wider">
              Board Stop
            </span>
            <h4 className="text-sm font-bold text-ink-950 font-heading">
              {fromStop ? localName(fromStop, i18n.language) : 'Origin Stop'}
            </h4>
            <p className="text-xs text-muted">Board your bus here</p>
          </div>
        </div>

        {/* Step 2: Ride Legs */}
        {journey.legs.map((leg, idx) => {
          const isTransfer = idx > 0
          return (
            <div key={idx} className="space-y-4">
              {isTransfer && (
                <div className="flex gap-3.5 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      ⇄
                    </div>
                    <div
                      className="w-1.5 flex-1 bg-sky-100 rounded-full my-1.5"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(180deg, var(--cobalt-500) 0px, var(--cobalt-500) 4px, transparent 4px, transparent 8px)'
                      }}
                    />
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block">
                      Transfer Stop
                    </span>
                    <h4 className="text-sm font-bold text-ink-950 font-heading">
                      {localName(leg.fromStop, i18n.language)}
                    </h4>
                    <p className="text-xs text-muted">
                      Change bus &bull; 6 min buffer
                    </p>
                  </div>
                </div>
              )}

              {/* Ride Leg Card */}
              <div className="flex gap-3.5 relative">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-navy-900 text-amber-500 flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                  <div
                    className="w-1.5 flex-1 bg-sky-100 rounded-full my-1.5"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(180deg, var(--cobalt-500) 0px, var(--cobalt-500) 4px, transparent 4px, transparent 8px)'
                    }}
                  />
                </div>
                <div className="pb-3 flex-1 min-w-0 bg-sky-50 p-3.5 rounded-[16px] border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <RouteBadge code={leg.route?.code} size="sm" />
                    <CrowdMeter level="moderate" />
                  </div>
                  <p className="text-xs font-bold text-ink-950 font-heading">
                    Board Route {leg.route?.code} ({localName(leg.route, i18n.language)})
                  </p>
                  <p className="text-xs text-muted">
                    Ride {leg.stopsCount} stops &bull; {leg.durationMin} min &bull; ₹{leg.fare}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Final Step: Arrive Destination */}
        <div className="flex gap-3.5">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center text-xs font-extrabold font-heading shrink-0 shadow-xs">
              B
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted block tracking-wider">
              Destination
            </span>
            <h4 className="text-sm font-bold text-ink-950 font-heading">
              {toStop ? localName(toStop, i18n.language) : 'Destination Stop'}
            </h4>
            <p className="text-xs text-muted">Arrive at destination</p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar above tab bar: Save, Share, Track Live, compact SOS */}
      <div className="fixed bottom-16 md:bottom-4 left-0 right-0 p-3 bg-surface/95 backdrop-blur-md border-t border-line z-30 flex items-center justify-center gap-2 max-w-lg mx-auto md:max-w-none shadow-float">
        <button
          type="button"
          onClick={handleToggleSave}
          className={`h-11 px-3.5 rounded-full border flex items-center gap-1.5 text-xs font-bold transition active:scale-95 ${currentlySaved
            ? 'bg-amber border-amber text-navy-900'
            : 'bg-surface border-line text-muted hover:text-text'
            }`}
          title={currentlySaved ? 'Saved' : 'Save'}
        >
          <Bookmark className={`w-4 h-4 ${currentlySaved ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{currentlySaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="h-11 px-3.5 rounded-full bg-surface border border-line text-muted hover:text-text flex items-center gap-1.5 text-xs font-bold transition active:scale-95"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <Link
          to={`/live?route=${journey.legs[0]?.route?.code}`}
          className="flex-1 h-11 on-brand text-xs font-bold rounded-full shadow-soft flex items-center justify-center gap-2 active:scale-98 transition font-heading"
          style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
        >
          <Radio className="w-4 h-4 text-amber-500" style={{ color: 'var(--amber)' }} />
          <span style={{ color: 'var(--on-brand)' }}>{t('passenger.track_live') || 'Track live'}</span>
        </Link>

        <SosButton
          routeCode={firstLeg?.route?.code}
          busRegNo={liveTripForLeg?.bus?.reg_no}
          tripId={liveTripForLeg?.id}
          variant="compact"
        />
      </div>

      {/* Guest Save Sheet / Modal (Problem 4.1) */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface rounded-card border border-line shadow-float p-5 space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cobalt/15 text-cobalt flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-ink font-heading">Save this journey</h3>
                  <p className="text-[11px] text-text-secondary">Keep your favorite routes handy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="text-text-secondary hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Create a free account or log in so your saved journeys are available on all your devices.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <Link
                to={`/login?redirect=${currentRedirect}`}
                className="w-full py-2.5 bg-cobalt text-white text-xs font-bold rounded-pill flex items-center justify-center gap-2 shadow-soft hover:opacity-95 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Log in</span>
              </Link>
              <Link
                to={`/register?redirect=${currentRedirect}`}
                className="w-full py-2.5 bg-page border border-line text-ink text-xs font-bold rounded-pill flex items-center justify-center gap-2 hover:bg-surface transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create account</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
