import { useMemo } from 'react'
import { Navigation, Footprints, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { haversine } from '@/lib/geo'
import { calculateBusEta } from '@/lib/eta'
import { localName } from '@/lib/formatters'
import { useTranslation } from 'react-i18next'

export default function UserBusComparison({
  userPos,
  selectedTrip,
  stops = [],
  routeStops = [],
  schedules = [],
}) {
  const { i18n } = useTranslation()

  const comparison = useMemo(() => {
    if (!userPos || !selectedTrip?.position?.lat || !selectedTrip?.position?.lng) {
      return null
    }

    const busPos = {
      lat: selectedTrip.position.lat,
      lng: selectedTrip.position.lng,
    }

    // 1. Straight line distance to bus
    const distToBusKm = haversine(userPos.lat, userPos.lng, busPos.lat, busPos.lng)
    const distToBusStr =
      distToBusKm < 1
        ? `${Math.round(distToBusKm * 1000)} m`
        : `${distToBusKm.toFixed(1)} km`

    // 2. Filter route stops for this trip
    const tripRouteStops = routeStops
      .filter((rs) => rs.route_id === selectedTrip.route_id)
      .map((rs) => ({
        ...rs,
        stop: stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id },
      }))

    if (tripRouteStops.length === 0) {
      return { distToBusStr, verdict: null }
    }

    // 3. Find user's nearest stop on this route
    let nearestStop = null
    let minWalkDistKm = Infinity

    for (const rs of tripRouteStops) {
      const s = rs.stop
      if (s?.lat && s?.lng) {
        const d = haversine(userPos.lat, userPos.lng, s.lat, s.lng)
        if (d < minWalkDistKm) {
          minWalkDistKm = d
          nearestStop = s
        }
      }
    }

    if (!nearestStop) {
      return { distToBusStr, verdict: null }
    }

    // Walking speed: 80 meters per minute (PRD Part C.4)
    const walkMinutes = Math.max(1, Math.round((minWalkDistKm * 1000) / 80))
    const walkDistStr =
      minWalkDistKm < 1
        ? `${Math.round(minWalkDistKm * 1000)} m`
        : `${minWalkDistKm.toFixed(1)} km`

    // 4. Calculate bus ETA to that nearest stop
    const etaData = calculateBusEta({
      busPosition: busPos,
      routeStops: tripRouteStops,
      direction: selectedTrip.direction || 0,
      targetStopId: nearestStop.id,
      speedHistory: selectedTrip.position.speed_kmh ? [selectedTrip.position.speed_kmh] : [],
    })

    const busEtaMin = etaData.etaMinutes

    // Find headway for next bus estimate
    const sched = schedules.find((s) => s.route_id === selectedTrip.route_id)
    const headway = sched?.headway_min || 15

    // 5. Compute verdict
    let verdictType = 'info' // 'success' | 'warning' | 'info'
    let verdictText = ''

    if (etaData.hasPassed || busEtaMin === null) {
      verdictType = 'warning'
      verdictText = `Bus has passed ${localName(nearestStop, i18n.language)}. Next in ${headway} min`
    } else if (walkMinutes > busEtaMin) {
      verdictType = 'warning'
      verdictText = `You will miss this bus (${walkMinutes}m walk vs ${busEtaMin}m ETA). Next in ${headway} min`
    } else if (busEtaMin <= walkMinutes + 1) {
      verdictType = 'success'
      verdictText = 'Leave now, you can make it!'
    } else {
      const leaveInMin = busEtaMin - walkMinutes
      verdictType = 'info'
      verdictText = `Leave in ${leaveInMin} min (${walkMinutes}m walk, bus arrives in ${busEtaMin}m)`
    }

    return {
      distToBusStr,
      nearestStopName: localName(nearestStop, i18n.language),
      walkDistStr,
      walkMinutes,
      busEtaMin,
      verdictType,
      verdictText,
    }
  }, [userPos, selectedTrip, stops, routeStops, schedules, i18n.language])

  if (!comparison) return null

  return (
    <div className="bg-surface rounded-card border border-line p-3.5 shadow-soft space-y-2.5">
      {/* Top metrics comparison row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-page rounded-input border border-line flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cobalt shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-text-secondary block">To this bus</span>
            <span className="font-extrabold text-ink">{comparison.distToBusStr} away</span>
          </div>
        </div>

        {comparison.nearestStopName && (
          <div className="p-2 bg-page rounded-input border border-line flex items-center gap-2">
            <Footprints className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-text-secondary block">To {comparison.nearestStopName}</span>
              <span className="font-extrabold text-ink">
                {comparison.walkDistStr} ({comparison.walkMinutes} min)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Clear Verdict Banner */}
      {comparison.verdictText && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-input text-xs font-bold ${
            comparison.verdictType === 'success'
              ? 'bg-success/15 text-success border border-success/30'
              : comparison.verdictType === 'warning'
              ? 'bg-warning/15 text-warning border border-warning/30'
              : 'bg-cobalt-tint text-cobalt border border-cobalt/20'
          }`}
        >
          {comparison.verdictType === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span className="leading-snug">{comparison.verdictText}</span>
        </div>
      )}
    </div>
  )
}
