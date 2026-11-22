import { useMemo } from 'react'
import { Navigation, Footprints, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { haversine } from '@/lib/geo'
import { calculateBusEta } from '@/lib/eta'
import { localName } from '@/lib/formatters'
import { useTranslation } from 'react-i18next'

/**
 * UserBusComparison — leave-now comparison panel as a signature gradient Card
 * with a big verdict line and 3 numbers (you to bus, walk to stop, bus ETA).
 */
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

    const distToBusKm = haversine(userPos.lat, userPos.lng, busPos.lat, busPos.lng)
    const distToBusStr =
      distToBusKm < 1
        ? `${Math.round(distToBusKm * 1000)}m`
        : `${distToBusKm.toFixed(1)}km`

    const tripRouteStops = routeStops
      .filter((rs) => rs.route_id === selectedTrip.route_id)
      .map((rs) => ({
        ...rs,
        stop: stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id },
      }))

    if (tripRouteStops.length === 0) {
      return { distToBusStr, verdict: null }
    }

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

    const walkMinutes = Math.max(1, Math.round((minWalkDistKm * 1000) / 80))
    const walkDistStr =
      minWalkDistKm < 1
        ? `${Math.round(minWalkDistKm * 1000)}m`
        : `${minWalkDistKm.toFixed(1)}km`

    const etaData = calculateBusEta({
      busPosition: busPos,
      routeStops: tripRouteStops,
      direction: selectedTrip.direction || 0,
      targetStopId: nearestStop.id,
      speedHistory: selectedTrip.position.speed_kmh ? [selectedTrip.position.speed_kmh] : [],
    })

    const busEtaMin = etaData.etaMinutes
    const sched = schedules.find((s) => s.route_id === selectedTrip.route_id)
    const headway = sched?.headway_min || 15

    let verdictType = 'info'
    let verdictText = ''

    if (etaData.hasPassed || busEtaMin === null) {
      verdictType = 'warning'
      verdictText = `Bus has passed ${localName(nearestStop, i18n.language)}. Next in ${headway} min`
    } else if (walkMinutes > busEtaMin) {
      verdictType = 'warning'
      verdictText = `You will miss this bus (${walkMinutes}m walk vs ${busEtaMin}m ETA)`
    } else if (busEtaMin <= walkMinutes + 1) {
      verdictType = 'success'
      verdictText = 'Leave now, you can make it!'
    } else {
      const leaveInMin = busEtaMin - walkMinutes
      verdictType = 'info'
      verdictText = `Leave in ${leaveInMin} min (${walkMinutes}m walk, bus in ${busEtaMin}m)`
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
    <div
      className="rounded-[20px] p-4 on-brand shadow-soft space-y-3"
      style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
    >
      {/* Big Verdict Line */}
      <div className="flex items-center gap-2">
        {comparison.verdictType === 'warning' ? (
          <div className="w-7 h-7 rounded-full bg-amber-500 on-amber flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--on-amber)' }} />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFFFFF', color: '#0040FF' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: '#0040FF' }} />
          </div>
        )}
        <h4 className="font-heading font-extrabold text-sm md:text-base leading-tight" style={{ color: 'var(--on-brand)' }}>
          {comparison.verdictText}
        </h4>
      </div>

      {/* 3 Metric Numbers Row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
        {/* 1. You to bus */}
        <div className="rounded-[14px] p-2.5 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
          <span className="text-[10px] uppercase font-bold block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            To Bus
          </span>
          <span className="font-heading font-extrabold text-base" style={{ color: 'var(--on-brand)' }}>
            {comparison.distToBusStr}
          </span>
        </div>

        {/* 2. Walk to stop */}
        <div className="rounded-[14px] p-2.5 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
          <span className="text-[10px] uppercase font-bold block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            Walk
          </span>
          <span className="font-heading font-extrabold text-base" style={{ color: 'var(--on-brand)' }}>
            {comparison.walkMinutes} min
          </span>
        </div>

        {/* 3. Bus ETA */}
        <div className="rounded-[14px] p-2.5 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
          <span className="text-[10px] uppercase font-bold block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            Bus ETA
          </span>
          <span className="font-heading font-extrabold text-base" style={{ color: 'var(--amber)' }}>
            {comparison.busEtaMin ? `${comparison.busEtaMin} min` : '--'}
          </span>
        </div>
      </div>
    </div>
  )
}
