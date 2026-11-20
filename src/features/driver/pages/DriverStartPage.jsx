import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, AlertTriangle, ArrowRight, CheckCircle2, RotateCcw, Bus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import RouteBadge from '@/components/ui/RouteBadge'

export default function DriverStartPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { routes, stops, initData } = useDataStore()

  const [driverRecord, setDriverRecord] = useState(null)
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [direction, setDirection] = useState(0) // 0 or 1
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // For legacy drivers without assigned bus
  const [newBusReg, setNewBusReg] = useState('')
  const [newBusRoute, setNewBusRoute] = useState('')
  const [assigningBus, setAssigningBus] = useState(false)

  useEffect(() => {
    initData()
  }, [initData])

  const loadDriverData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Get or create driver entry with assigned bus
      let { data: dRow } = await supabase
        .from('drivers')
        .select('*, bus:buses(*)')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (!dRow) {
        const { data: created } = await supabase
          .from('drivers')
          .insert({ profile_id: user.id })
          .select('*, bus:buses(*)')
          .single()
        dRow = created
      }
      setDriverRecord(dRow)

      // 2. Set default route
      if (dRow?.bus?.route_id) {
        setSelectedRouteId(dRow.bus.route_id)
        setNewBusRoute(dRow.bus.route_id)
      } else if (routes.length > 0) {
        setSelectedRouteId(routes[0].id)
        setNewBusRoute(routes[0].id)
      }

      // 3. Check for any non-ended active trip for this driver
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

  useEffect(() => {
    loadDriverData()
  }, [user, routes])

  const handleSetMyBus = async () => {
    if (!newBusReg.trim()) {
      setErrorMsg('Please enter a bus registration number (e.g. KA25 F 1234).')
      return
    }

    setAssigningBus(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.rpc('set_my_bus', {
        p_reg_no: newBusReg.trim().toUpperCase(),
        p_route_id: newBusRoute || null,
      })
      if (error) throw error

      if (data === 'bus_taken') {
        setErrorMsg('This bus is already assigned to another driver. Please contact admin.')
      } else if (data === 'bus_required') {
        setErrorMsg('Please enter a valid bus registration number.')
      } else if (data === 'ok') {
        setNewBusReg('')
        await loadDriverData()
      } else {
        setErrorMsg(`Failed to assign bus: ${data}`)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error assigning bus')
    } finally {
      setAssigningBus(false)
    }
  }

  const handleStartTrip = async () => {
    if (!driverRecord?.bus_id) {
      setErrorMsg('You must assign your bus before starting a trip.')
      return
    }
    if (!driverRecord?.id || !selectedRouteId) {
      setErrorMsg('Please select a route.')
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
          bus_id: driverRecord.bus_id,
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
    } catch (err) {
      setErrorMsg('Failed to end previous trip.')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const assignedRoute = routes.find((r) => r.id === (driverRecord?.bus?.route_id || selectedRouteId))

  return (
    <div className="flex-1 flex flex-col justify-between space-y-6 pb-6 text-left">
      {/* Active Trip Resume Card */}
      {activeTrip ? (
        <div className="p-4 bg-warning/15 border border-warning/30 rounded-card space-y-4">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-extrabold font-heading">Active Trip in Progress</h3>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            You currently have an active trip broadcast on{' '}
            <strong>Route {activeTrip.route?.code}</strong> ({activeTrip.bus?.reg_no || 'Bus'}).
          </p>

          <div className="space-y-2">
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

          {/* Assigned Bus (Locked - Problem 5.3) */}
          {driverRecord?.bus ? (
            <div className="p-3.5 bg-[#121B3D] border border-white/10 rounded-input flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cobalt/20 text-cobalt flex items-center justify-center shrink-0">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/50 block">Your Assigned Bus</span>
                  <span className="text-sm font-extrabold text-white font-mono">{driverRecord.bus.reg_no}</span>
                  {assignedRoute && (
                    <span className="text-[11px] text-white/70 block">
                      Base: Route {assignedRoute.code} ({assignedRoute.name_en})
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold text-success bg-success/20 px-2 py-0.5 rounded-pill border border-success/30">
                Locked
              </span>
            </div>
          ) : (
            /* Add Your Bus Card (if driver has no bus set yet) */
            <div className="p-4 bg-warning/15 border border-warning/30 rounded-card space-y-3">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-extrabold font-heading">Add Your Bus</h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                You do not have a bus attached to your driver profile yet. Enter your bus registration number to link it.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBusReg}
                  onChange={(e) => setNewBusReg(e.target.value.toUpperCase())}
                  placeholder="e.g. KA25 F 1234"
                  className="w-full h-11 px-3 bg-[#121B3D] border border-white/10 rounded-input text-xs font-mono uppercase font-bold text-white focus:outline-none focus:border-cobalt"
                />
                <select
                  value={newBusRoute}
                  onChange={(e) => setNewBusRoute(e.target.value)}
                  className="w-full h-11 px-3 bg-[#121B3D] border border-white/10 rounded-input text-xs font-bold text-white focus:outline-none focus:border-cobalt"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Route {r.code} - {r.name_en}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSetMyBus}
                  disabled={assigningBus || !newBusReg.trim()}
                  className="w-full py-2.5 bg-cobalt text-white text-xs font-bold rounded-pill shadow-soft hover:opacity-95 disabled:opacity-50 transition"
                >
                  {assigningBus ? 'Assigning Bus...' : 'Save & Attach Bus'}
                </button>
              </div>
            </div>
          )}

          {/* Route Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Trip Route
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
        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={starting || !driverRecord?.bus_id}
            onClick={handleStartTrip}
            className="w-full h-16 bg-cobalt hover:bg-cobalt/90 disabled:opacity-50 text-white font-extrabold text-base rounded-input flex items-center justify-center gap-2 shadow-soft active:scale-98 transition"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>{starting ? 'Initializing GPS...' : 'Start Trip & Broadcast'}</span>
          </button>

          <p className="text-[11px] text-white/40 text-center leading-normal">
            Keep your screen awake or device plugged in. Location will transmit automatically to commuters until you tap "End Trip".
          </p>
        </div>
      )}
    </div>
  )
}
