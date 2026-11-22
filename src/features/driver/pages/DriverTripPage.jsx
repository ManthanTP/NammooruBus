import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ShieldAlert, Power, Users, Navigation } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'
import { startTracking, stopTracking } from '@/lib/tracker'
import { calculateBusEta } from '@/lib/eta'
import RouteBadge from '@/components/ui/RouteBadge'
import LiveDot from '@/components/ui/LiveDot'

export default function DriverTripPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { routeStops, stops } = useDataStore()

  const [trip, setTrip] = useState(location.state?.trip || null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentStatus, setCurrentStatus] = useState('active') // 'active' | 'delayed' | 'breakdown'
  const [crowdLevel, setCrowdLevel] = useState('empty') // 'empty' | 'moderate' | 'full'
  const [gpsData, setGpsData] = useState(null)
  const [networkStatus, setNetworkStatus] = useState('online')
  const [lastSyncTime, setLastSyncTime] = useState(Date.now())
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [wakeLockWarning, setWakeLockWarning] = useState(false)

  // Load trip from database if navigated directly
  useEffect(() => {
    if (!trip) {
      const loadActive = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          navigate('/login')
          return
        }
        const { data: dRow } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (dRow) {
          const { data: tRow } = await supabase
            .from('trips')
            .select('*, route:routes(*), bus:buses(*)')
            .eq('driver_id', dRow.id)
            .neq('status', 'ended')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (tRow) {
            setTrip(tRow)
            setCurrentStatus(tRow.status)
            if (tRow.crowd_level) setCrowdLevel(tRow.crowd_level)
          } else {
            navigate('/driver')
          }
        } else {
          navigate('/driver')
        }
      }
      loadActive()
    } else if (trip.crowd_level) {
      setCrowdLevel(trip.crowd_level)
    }
  }, [trip, navigate])

  // Trip Elapsed Timer
  useEffect(() => {
    if (!trip?.started_at) return
    const startMs = new Date(trip.started_at).getTime()
    const updateTimer = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [trip])

  // Visibility Change / Wake lock listener
  useEffect(() => {
    const handleVisibility = () => {
      setWakeLockWarning(document.visibilityState === 'hidden')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Start GPS Tracker
  useEffect(() => {
    if (!trip?.id) return

    startTracking({
      tripId: trip.id,
      onUpdate: (pos) => {
        setGpsData({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
        })
        setLastSyncTime(Date.now())
      },
      onError: (err) => {
        console.warn('GPS Tracker error:', err)
      },
      onStatusChange: ({ status }) => {
        setNetworkStatus(status)
        setLastSyncTime(Date.now())
      },
    })

    return () => {
      stopTracking()
    }
  }, [trip])

  // Compute Next Stop and Remaining Distance
  const tripMetrics = () => {
    if (!trip || !gpsData) return { nextStop: null, remainingKm: 0 }
    const rStops = routeStops
      .filter((rs) => rs.route_id === trip.route_id)
      .map((rs) => ({
        ...rs,
        stop: stops.find((s) => s.id === rs.stop_id) || { id: rs.stop_id, name_en: 'Stop' },
      }))

    return calculateBusEta({
      busPosition: gpsData,
      routeStops: rStops,
      direction: trip.direction || 0,
    })
  }

  const { nextStop, remainingKm } = tripMetrics()

  const handleStatusChange = async (newStatus) => {
    if (!trip) return
    setCurrentStatus(newStatus)
    try {
      await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', trip.id)
    } catch (e) {
      console.warn('Failed to update trip status:', e)
    }
  }

  const handleCrowdChange = async (newCrowd) => {
    if (!trip) return
    setCrowdLevel(newCrowd)
    try {
      await supabase
        .from('trips')
        .update({ crowd_level: newCrowd })
        .eq('id', trip.id)
    } catch (e) {
      console.warn('Failed to update crowd level:', e)
    }
  }

  const handleEndTrip = async () => {
    if (!trip) return
    setIsEnding(true)
    stopTracking()
    try {
      await supabase
        .from('trips')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', trip.id)

      navigate('/driver/history')
    } catch (e) {
      console.warn('Failed ending trip:', e)
      setIsEnding(false)
    }
  }

  const formatTimer = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatLastSync = () => {
    const diffSec = Math.round((Date.now() - lastSyncTime) / 1000)
    if (diffSec < 5) return 'just now'
    if (diffSec < 60) return `${diffSec}s ago`
    return `${Math.floor(diffSec / 60)}m ago`
  }

  if (!trip) return null

  return (
    <div className="flex-1 flex flex-col justify-between space-y-4">
      {/* Wake Lock Tab Hidden Warning Banner */}
      {wakeLockWarning && (
        <div className="p-3 bg-danger text-white rounded-input text-xs font-bold flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Keep this screen open! Background GPS broadcasting may be paused by your browser.</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RouteBadge code={trip.route?.code} color={trip.route?.color} size="lg" />
          <div>
            <h2 className="text-base font-extrabold text-text font-heading leading-tight">
              {trip.route?.name_en}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-muted">
                {trip.bus?.reg_no || 'KA-25-1001'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-2 text-brand font-bold uppercase tracking-wider">
                {trip.direction === 0 ? 'Forward' : 'Return'}
              </span>
            </div>
          </div>
        </div>

        {/* Live GPS Status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-line rounded-pill">
          <LiveDot />
          <span className="text-xs font-bold text-text">
            {networkStatus === 'reconnecting' ? 'Reconnecting' : 'GPS Live'}
          </span>
        </div>
      </div>

      {/* Live Distance & Next Stop Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
            Next Stop
          </span>
          <p className="text-base font-extrabold text-text font-heading truncate my-1">
            {nextStop?.stop?.name_en || 'En route'}
          </p>
          <span className="text-xs font-bold text-brand">
            {remainingKm} km away
          </span>
        </div>

        <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
            Trip Duration
          </span>
          <p className="text-xl font-extrabold text-text font-heading my-1">
            {formatTimer(elapsedSeconds)}
          </p>
          <span className="text-xs text-muted">
            Speed: {gpsData?.speed ?? 0} km/h • Sync: {formatLastSync()}
          </span>
        </div>
      </div>

      {/* Driver Status Buttons (64px Min Touch Targets) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
          Update Transit Status
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleStatusChange('active')}
            className={`min-h-[64px] rounded-input font-extrabold text-sm border flex flex-col items-center justify-center gap-1 active:scale-98 transition cursor-pointer ${
              currentStatus === 'active'
                ? 'bg-success text-white border-success shadow-soft'
                : 'bg-surface text-text border-line hover:border-brand'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>On Time</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('delayed')}
            className={`min-h-[64px] rounded-input font-extrabold text-sm border flex flex-col items-center justify-center gap-1 active:scale-98 transition cursor-pointer ${
              currentStatus === 'delayed'
                ? 'bg-amber-500 text-navy-900 border-amber-500 shadow-soft on-amber font-bold'
                : 'bg-surface text-text border-line hover:border-amber-500'
            }`}
            style={currentStatus === 'delayed' ? { color: 'var(--on-amber)' } : {}}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Delayed</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('breakdown')}
            className={`min-h-[64px] rounded-input font-extrabold text-sm border flex flex-col items-center justify-center gap-1 active:scale-98 transition cursor-pointer ${
              currentStatus === 'breakdown'
                ? 'bg-danger text-white border-danger shadow-soft'
                : 'bg-surface text-text border-line hover:border-danger'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Breakdown</span>
          </button>
        </div>
      </div>

      {/* Crowd Selector (3 big buttons) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
          Bus Crowd Level
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleCrowdChange('empty')}
            className={`min-h-[56px] rounded-input font-bold text-xs border flex flex-col items-center justify-center gap-1 active:scale-98 transition cursor-pointer ${
              crowdLevel === 'empty'
                ? 'on-brand border-transparent shadow-soft font-extrabold'
                : 'bg-surface text-text border-line hover:border-brand'
            }`}
            style={crowdLevel === 'empty' ? { background: 'var(--gradient-brand)', color: 'var(--on-brand)' } : {}}
          >
            <Users className="w-4 h-4" />
            <span>Seats Free</span>
          </button>

          <button
            type="button"
            onClick={() => handleCrowdChange('moderate')}
            className={`min-h-[56px] rounded-input font-bold text-xs border flex flex-col items-center justify-center gap-1 active:scale-98 transition cursor-pointer ${
              crowdLevel === 'moderate'
                ? 'bg-amber-500 text-navy-900 border-amber-500 shadow-soft on-amber font-extrabold'
                : 'bg-surface text-text border-line hover:border-amber-500'
            }`}
            style={crowdLevel === 'moderate' ? { color: 'var(--on-amber)' } : {}}
          >
            <Users className="w-4 h-4" />
            <span>Filling Up</span>
          </button>

          <button
            type="button"
            onClick={() => handleCrowdChange('full')}
            className={`min-h-[56px] rounded-input font-bold text-xs border flex flex-col items-center justify-center gap-1 active:scale-98 transition cursor-pointer ${
              crowdLevel === 'full'
                ? 'bg-danger text-white border-danger shadow-soft font-extrabold'
                : 'bg-surface text-text border-line hover:border-danger'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Packed</span>
          </button>
        </div>
      </div>

      {/* End Trip Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowEndConfirm(true)}
          className="w-full min-h-[56px] bg-danger text-white font-extrabold text-base rounded-pill shadow-soft hover:bg-danger/90 active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Power className="w-5 h-5" />
          <span>END TRIP</span>
        </button>
      </div>

      {/* Confirm End Trip Dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-surface rounded-sheet p-6 text-center space-y-4 shadow-xl border border-line">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-text font-heading">End Current Trip?</h3>
            <p className="text-xs text-muted leading-relaxed">
              This will stop GPS broadcasting and remove your bus from passenger live tracking.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 bg-surface-2 text-text font-bold text-xs rounded-pill hover:bg-line transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEnding}
                onClick={handleEndTrip}
                className="flex-1 py-3 bg-danger text-white font-bold text-xs rounded-pill hover:opacity-90 active:scale-98 transition cursor-pointer"
              >
                {isEnding ? 'Ending...' : 'Yes, End Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
