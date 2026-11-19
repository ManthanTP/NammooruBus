import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, Square, AlertTriangle, ShieldAlert, Cpu, Activity, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import RouteBadge from '@/components/ui/RouteBadge'

export default function AdminSimulatorPage() {
  const isDevToolsEnabled = import.meta.env.VITE_DEV_TOOLS === 'true'
  const { routes, routeStops, stops, initData } = useDataStore()
  const { user } = useAuthStore()

  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [direction, setDirection] = useState(0)
  const [simSpeedKmh, setSimSpeedKmh] = useState(30)
  const [isSimulating, setIsSimulating] = useState(false)
  const [activeTripId, setActiveTripId] = useState(null)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [tripStatus, setTripStatus] = useState('active')

  const intervalRef = useRef(null)
  const progressIndexRef = useRef(0)

  useEffect(() => {
    initData()
  }, [initData])

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id)
    }
  }, [routes, selectedRouteId])

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!isDevToolsEnabled) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <Cpu className="w-10 h-10 text-danger mx-auto" />
        <h2 className="text-lg font-bold text-ink">Dev Tools Disabled</h2>
        <p className="text-xs text-text-secondary">
          Set <code>VITE_DEV_TOOLS=true</code> in your <code>.env</code> file to enable the GPS Simulator.
        </p>
      </div>
    )
  }

  // Generate dense polyline points between ordered stops for smooth 2-second simulation
  const getSimulationPoints = () => {
    const rStops = routeStops
      .filter((rs) => rs.route_id === selectedRouteId)
      .sort((a, b) => a.seq - b.seq)

    const directed = direction === 1 ? [...rStops].reverse() : rStops
    const stopCoords = directed
      .map((rs) => stops.find((s) => s.id === rs.stop_id))
      .filter(Boolean)

    if (stopCoords.length < 2) return []

    // Interpolate 10 points between each stop
    const points = []
    for (let i = 0; i < stopCoords.length - 1; i++) {
      const p1 = stopCoords[i]
      const p2 = stopCoords[i + 1]
      const steps = 12
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        points.push({
          lat: p1.lat + (p2.lat - p1.lat) * t,
          lng: p1.lng + (p2.lng - p1.lng) * t,
          fromName: p1.name_en,
          toName: p2.name_en,
        })
      }
    }
    // Add destination
    const last = stopCoords[stopCoords.length - 1]
    points.push({ lat: last.lat, lng: last.lng, fromName: last.name_en, toName: last.name_en })
    return points
  }

  const handleStartSimulation = async () => {
    if (!selectedRouteId) return
    setStatusMessage('Initializing simulator trip...')

    try {
      // Find or create a driver row for simulator
      let { data: dRow } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (!dRow) {
        const { data: created } = await supabase
          .from('drivers')
          .insert({ profile_id: user.id })
          .select()
          .single()
        dRow = created
      }

      // Find any bus
      const { data: buses } = await supabase.from('buses').select('id, reg_no').limit(1)
      const busId = buses?.[0]?.id || null

      // Create new active trip
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          driver_id: dRow.id,
          route_id: selectedRouteId,
          bus_id: busId,
          direction: Number(direction),
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setActiveTripId(trip.id)
      setIsSimulating(true)
      setTripStatus('active')
      progressIndexRef.current = 0

      const points = getSimulationPoints()
      if (points.length === 0) {
        setStatusMessage('Error: Route has fewer than 2 stops.')
        return
      }

      // Upsert first position immediately
      const firstPt = points[0]
      await supabase.from('bus_positions').upsert({
        trip_id: trip.id,
        lat: firstPt.lat,
        lng: firstPt.lng,
        speed_kmh: simSpeedKmh,
        heading: 90,
        updated_at: new Date().toISOString(),
      })
      setCurrentPosition(firstPt)

      // Start 2-second interval loop
      intervalRef.current = setInterval(async () => {
        progressIndexRef.current = (progressIndexRef.current + 1) % points.length
        const pt = points[progressIndexRef.current]

        try {
          await supabase.from('bus_positions').upsert({
            trip_id: trip.id,
            lat: pt.lat,
            lng: pt.lng,
            speed_kmh: simSpeedKmh,
            heading: 90,
            updated_at: new Date().toISOString(),
          })
          setCurrentPosition(pt)
          setStatusMessage(`Simulating en route: ${pt.fromName} -> ${pt.toName}`)
        } catch (e) {
          console.warn('Simulator upsert error:', e)
        }
      }, 2000)
    } catch (err) {
      setStatusMessage(`Failed: ${err.message}`)
      setIsSimulating(false)
    }
  }

  const handleStopSimulation = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsSimulating(false)

    if (activeTripId) {
      try {
        await supabase
          .from('trips')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', activeTripId)
        setStatusMessage('Simulation stopped. Trip marked ended (position deleted).')
      } catch (e) {
        console.warn('Error ending simulator trip:', e)
      }
      setActiveTripId(null)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    if (!activeTripId) return
    setTripStatus(newStatus)
    try {
      await supabase.from('trips').update({ status: newStatus }).eq('id', activeTripId)
      setStatusMessage(`Trip marked as ${newStatus}`)
    } catch (e) {
      console.warn('Error updating status:', e)
    }
  }

  const selectedRouteObj = routes.find((r) => r.id === selectedRouteId)

  return (
    <div className="min-h-screen bg-page p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <Link
          to="/12345678/admin/dashboard"
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Admin Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cobalt" />
          <h1 className="text-base font-extrabold text-ink font-heading">GPS Simulator (Viva Demo)</h1>
        </div>
      </div>

      {/* Simulator Control Panel */}
      <div className="p-5 bg-surface rounded-card border border-line shadow-soft space-y-4">
        <div>
          <h2 className="text-sm font-bold text-ink">Simulated GPS Broadcaster</h2>
          <p className="text-xs text-text-secondary">
            Simulates a driver phone broadcasting GPS coordinates every 2 seconds along the route line.
          </p>
        </div>

        {/* Route Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ink mb-1 block">Route</label>
            <select
              value={selectedRouteId}
              disabled={isSimulating}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-bold text-ink focus:outline-none focus:border-cobalt disabled:opacity-50"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink mb-1 block">Direction</label>
            <select
              value={direction}
              disabled={isSimulating}
              onChange={(e) => setDirection(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-bold text-ink focus:outline-none focus:border-cobalt disabled:opacity-50"
            >
              <option value={0}>Forward (0)</option>
              <option value={1}>Reverse / Return (1)</option>
            </select>
          </div>
        </div>

        {/* Speed Slider */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-ink mb-1">
            <span>Simulated Speed</span>
            <span className="font-mono text-cobalt">{simSpeedKmh} km/h</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={simSpeedKmh}
            onChange={(e) => setSimSpeedKmh(parseInt(e.target.value, 10))}
            className="w-full accent-cobalt cursor-pointer"
          />
        </div>

        {/* Start / Stop Buttons */}
        <div className="pt-2">
          {!isSimulating ? (
            <button
              type="button"
              onClick={handleStartSimulation}
              className="w-full py-3 bg-success text-white font-bold text-sm rounded-input shadow-soft hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START SIMULATION (Broadcasts every 2s)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopSimulation}
              className="w-full py-3 bg-danger text-white font-bold text-sm rounded-input shadow-soft hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP SIMULATION</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Simulation Monitor Status */}
      {isSimulating && (
        <div className="p-5 bg-surface rounded-card border border-line shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-success animate-pulse" />
              Broadcasting Live Coordinates
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill ${
                tripStatus === 'delayed'
                  ? 'bg-warning/20 text-warning'
                  : tripStatus === 'breakdown'
                  ? 'bg-danger/20 text-danger'
                  : 'bg-success/20 text-success'
              }`}
            >
              {tripStatus}
            </span>
          </div>

          <div className="p-3 bg-page rounded-input font-mono text-xs space-y-1">
            <p>
              Lat: <strong>{currentPosition?.lat.toFixed(5)}</strong>, Lng:{' '}
              <strong>{currentPosition?.lng.toFixed(5)}</strong>
            </p>
            <p className="text-text-secondary text-[11px] truncate">
              {statusMessage}
            </p>
          </div>

          {/* Incident / Delay Testing Controls */}
          <div>
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Inject Status Change (Tests Passenger UI reaction)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusUpdate('active')}
                className="py-2 bg-success/15 text-success border border-success/30 font-bold text-xs rounded-input hover:bg-success hover:text-white transition"
              >
                On Time
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate('delayed')}
                className="py-2 bg-warning/15 text-warning border border-warning/30 font-bold text-xs rounded-input hover:bg-warning hover:text-ink transition"
              >
                Mark Delayed
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate('breakdown')}
                className="py-2 bg-danger/15 text-danger border border-danger/30 font-bold text-xs rounded-input hover:bg-danger hover:text-white transition"
              >
                Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
