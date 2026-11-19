import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, IndianRupee, Bookmark, Share2, Radio, Footprints, Bus, AlertCircle, ShieldAlert } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useMapStore } from '@/store/mapStore'
import { useSavedStore } from '@/store/savedStore'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/components/ui/Toast'
import { localName } from '@/lib/formatters'
import RouteBadge from '@/components/ui/RouteBadge'
import CrowdMeter from '@/components/ui/CrowdMeter'
import Countdown from '@/components/ui/Countdown'

export default function JourneyPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { stops, routes, routeStops } = useDataStore()
  const { setRoute, setMarkers, fitBounds, clearMap } = useMapStore()
  const { isSaved, saveTrip, removeTrip, initSaved } = useSavedStore()
  const { addToast } = useToastStore()

  const [journey, setJourney] = useState(null)

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

    const firstLeg = journey.legs[0]
    const lastLeg = journey.legs[journey.legs.length - 1]

    // Origin Pin A
    if (firstLeg?.fromStop) {
      markers.push({
        id: 'pinA',
        lat: firstLeg.fromStop.lat,
        lng: firstLeg.fromStop.lng,
        type: 'pinA',
        label: 'A',
      })
      polyline.push([firstLeg.fromStop.lat, firstLeg.fromStop.lng])
    }

    // Transfer Pin if transfer exists
    if (journey.legs.length > 1 && firstLeg?.toStop) {
      markers.push({
        id: 'transfer',
        lat: firstLeg.toStop.lat,
        lng: firstLeg.toStop.lng,
        type: 'transfer',
        label: '⇄',
      })
      polyline.push([firstLeg.toStop.lat, firstLeg.toStop.lng])
    }

    // Destination Pin B
    if (lastLeg?.toStop) {
      markers.push({
        id: 'pinB',
        lat: lastLeg.toStop.lat,
        lng: lastLeg.toStop.lng,
        type: 'pinB',
        label: 'B',
      })
      polyline.push([lastLeg.toStop.lat, lastLeg.toStop.lng])
    }

    setMarkers(markers)
    if (polyline.length >= 2) {
      setRoute(polyline, firstLeg.route?.color || '#3451F2')
      fitBounds(polyline)
    }

    return () => clearMap()
  }, [journey, setMarkers, setRoute, fitBounds, clearMap])

  if (!journey) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-text-secondary mb-3">No active journey selected</p>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-input"
        >
          {t('passenger.find_buses')}
        </button>
      </div>
    )
  }

  const fromStop = journey.legs[0]?.fromStop
  const toStop = journey.legs[journey.legs.length - 1]?.toStop
  const currentlySaved = fromStop && toStop ? isSaved(fromStop.id, toStop.id) : false

  const handleToggleSave = async () => {
    if (currentlySaved) {
      const match = useSavedStore.getState().savedTrips.find(
        (t) => t.from_stop === fromStop.id && t.to_stop === toStop.id
      )
      if (match) {
        await removeTrip(match.id, user)
        addToast({ message: 'Removed from saved trips', type: 'info' })
      }
    } else {
      await saveTrip({
        fromStop,
        toStop,
        summary: journey.summary,
      }, user)
      addToast({ message: 'Saved to trips', type: 'success' })
    }
  }

  const handleShare = async () => {
    const shareText = `Bus from ${fromStop ? localName(fromStop, i18n.language) : ''} to ${toStop ? localName(toStop, i18n.language) : ''} via Nammooru Bus.`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nammooru Bus Journey',
          text: shareText,
          url: window.location.href,
        })
      } catch (e) {
        // user cancelled or failed
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`)
      addToast({ message: t('passenger.copied'), type: 'success' })
    }
  }

  const handleSos = async () => {
    const routeCode = journey.legs[0]?.route?.code || ''
    const msg = `${t('passenger.sos_message')} Bus ${routeCode}. ${window.location.origin}/live?route=${routeCode}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Nammooru Bus SOS', text: msg })
      } catch (e) {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-xs font-heading">Journey Details</span>
        <div className="flex items-center gap-2">
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

      {/* Summary Tiles */}
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
          <span className="text-[10px] uppercase font-bold text-text-secondary block">
            Next Bus
          </span>
          <span className="text-base font-extrabold text-cobalt font-heading">
            {journey.nextBusMin} min
          </span>
        </div>
      </div>

      {/* Vertical Stepper */}
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

              {/* Ride Leg */}
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
                <div className="pb-3 flex-1 min-w-0 bg-page/50 p-2.5 rounded-input border border-line">
                  <div className="flex items-center justify-between mb-1">
                    <RouteBadge code={leg.route?.code} color={leg.route?.color} size="sm" />
                    <CrowdMeter level="moderate" />
                  </div>
                  <p className="text-xs font-bold text-ink">
                    Board Route {leg.route?.code}
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

      {/* Action Buttons: Track Live & SOS */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          to={`/live?route=${journey.legs[0]?.route?.code}`}
          className="flex-1 py-3 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft flex items-center justify-center gap-2 hover:opacity-95 transition"
        >
          <Radio className="w-4 h-4" />
          <span>{t('passenger.track_live')}</span>
        </Link>

        <button
          type="button"
          onClick={handleSos}
          className="px-4 py-3 bg-danger/10 text-danger border border-danger/30 text-xs font-bold rounded-input hover:bg-danger hover:text-white transition flex items-center justify-center gap-1.5"
          title="SOS Share"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t('passenger.sos')}</span>
        </button>
      </div>
    </div>
  )
}
