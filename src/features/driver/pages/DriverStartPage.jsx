import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, AlertTriangle, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import RouteBadge from '@/components/ui/RouteBadge'

export default function DriverStartPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { routes, stops, initData } = useDataStore()

  const [driverRecord, setDriverRecord] = useState(null)
  const [buses, setBuses] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [selectedBusId, setSelectedBusId] = useState('')
  const [direction, setDirection] = useState(0) // 0 or 1
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    initData()
  }, [initData])

  // Fetch driver record, buses, and active trip
  useEffect(() => {
    if (!user) return

    const loadDriverData = async () => {
      setLoading(true)
      try {
        // 1. Get or create driver entry
        let { data: dRow } = await supabase
          .from('drivers')
          .select('*, bus:buses(*)')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (!dRow) {
          // If admin promoted profile to driver without inserting drivers row yet
          const { data: created } = await supabase
            .from('drivers')
            .insert({ profile_id: user.id })
            .select()
            .single()
          dRow = created
        }
        setDriverRecord(dRow)

        // 2. Fetch buses
        const { data: busList } = await supabase.from('buses').select('*').eq('active', true)
        setBuses(busList || [])
        if (busList && busList.length > 0) {
          setSelectedBusId(dRow?.bus_id || busList[0].id)
        }

        // 3. Set default route
        if (routes.length > 0) {
          setSelectedRouteId(routes[0].id)
        }

        // 4. Check for any non-ended active trip for this driver
        if (dRow?.id) {
          const { data: existingTrip } = await supabase
            .from('trips')
            .select('*, route:routes(*), bus:buses(*)')
            .eq('driver_id', dRow.id)
            .neq('status', 'ended')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (existingTrip) {
            setActiveTrip(existingTrip)
          }
        }
      } catch (err) {
        console.warn('Error loading driver start data:', err)
        setErrorMsg(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDriverData()
  }, [user, routes])

  const handleStartTrip = async () => {
    if (!driverRecord?.id || !selectedRouteId) {
      setErrorMsg('Please select a route and bus.')
      return
    }

    setStarting(true)
    setErrorMsg(null)

    try {
      const { data: newTrip, error } = await supabase
        .from('trips')
        .insert({
          driver_id: driverRecord.id,
          route_id: selectedRouteId,
          bus_id: selectedBusId || null,
          direction: Number(direction),
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select('*, route:routes(*), bus:buses(*)')
        .single()

      if (error) throw error

      navigate('/driver/trip', { state: { trip: newTrip } })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start trip.')
      setStarting(false)
    }
  }

  const handleEndExistingTrip = async () => {
    if (!activeTrip) return
    try {
      await supabase
        .from('trips')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activeTrip.id)
      setActiveTrip(null)
    } catch (e) {
      setErrorMsg(e.message)
    }
  }

  const selectedRouteObj = routes.find((r) => r.id === selectedRouteId)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col justify-between space-y-6">
      {/* Existing Active Trip Notice */}
      {activeTrip ? (
        <div className="bg-[#121B3D] border border-warning/30 rounded-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Active Trip In Progress</h2>
          </div>
          <p className="text-xs text-white/70">
            You already have an active trip on Route{' '}
            <strong className="text-white">{activeTrip.route?.code}</strong> ({activeTrip.bus?.reg_no || 'BUS'}).
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/driver/trip', { state: { trip: activeTrip } })}
              className="w-full h-16 bg-success text-white font-extrabold text-base rounded-input flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>Resume Trip</span>
            </button>
            <button
              type="button"
              onClick={handleEndExistingTrip}
              className="w-full py-3 bg-danger/15 text-danger border border-danger/30 font-bold text-xs rounded-input hover:bg-danger hover:text-white transition"
            >
              End Previous Trip
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-white font-heading">Start New Trip</h2>
            <p className="text-xs text-white/60">Configure your shift before beginning GPS broadcasting.</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-danger/20 border border-danger/40 rounded-input text-xs text-danger font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Route Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Select Route
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full h-14 px-4 bg-[#121B3D] border border-white/10 rounded-input text-sm font-bold text-white focus:outline-none focus:border-cobalt"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.code} - {r.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Bus Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Assigned Bus
            </label>
            <select
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              className="w-full h-14 px-4 bg-[#121B3D] border border-white/10 rounded-input text-sm font-bold text-white focus:outline-none focus:border-cobalt font-mono"
            >
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.reg_no}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Trip Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection(0)}
                className={`h-14 rounded-input font-bold text-xs border flex items-center justify-center gap-1.5 transition ${
                  direction === 0
                    ? 'bg-cobalt border-cobalt text-white shadow-soft'
                    : 'bg-[#121B3D] border-white/10 text-white/60'
                }`}
              >
                <span>Forward (0)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection(1)}
                className={`h-14 rounded-input font-bold text-xs border flex items-center justify-center gap-1.5 transition ${
                  direction === 1
                    ? 'bg-cobalt border-cobalt text-white shadow-soft'
                    : 'bg-[#121B3D] border-white/10 text-white/60'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return / Reverse (1)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Button & Safety Disclaimer */}
      {!activeTrip && (
        <div className="space-y-4 pt-4">
          <button
            type="button"
            disabled={starting}
            onClick={handleStartTrip}
            className="w-full h-16 min-h-[64px] bg-success text-white font-extrabold text-lg tracking-wide rounded-input shadow-float hover:opacity-95 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-3"
          >
            <Play className="w-7 h-7 fill-white" />
            <span>{starting ? 'STARTING GPS...' : 'START TRIP'}</span>
          </button>

          <p className="text-center text-[11px] text-white/40 leading-relaxed font-semibold">
            &bull; Safety Notice: Do not use the phone while driving &bull;
          </p>
        </div>
      )}
    </div>
  )
}
