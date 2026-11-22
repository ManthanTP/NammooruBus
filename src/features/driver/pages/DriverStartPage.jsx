import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, AlertTriangle, Bus, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import RouteBadge from '@/components/ui/RouteBadge'
import Button from '@/components/ui/Button'
import SegmentedControl from '@/components/ui/SegmentedControl'

export default function DriverStartPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { routes, stops, initData } = useDataStore()

  const [driverRecord, setDriverRecord] = useState(null)
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [direction, setDirection] = useState(0)
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const [newBusReg, setNewBusReg] = useState('')
  const [newBusRoute, setNewBusRoute] = useState('')
  const [assigningBus, setAssigningBus] = useState(false)

  useEffect(() => {
    initData()
  }, [initData])

  const loadDriverData = async () => {
    if (typeof window !== 'undefined' && (window.__mockAuth || sessionStorage.getItem('nb_mock_driver') === 'true')) {
      setDriverRecord({
        id: 'driver_mock_1',
        bus: { id: 'bus_mock_1', reg_no: 'KA-25-F-1001', route_id: routes[0]?.id || 'route_1' },
      })
      if (routes.length > 0) {
        setSelectedRouteId(routes[0].id)
      }
      setLoading(false)
      return
    }

    if (!user) return
    setLoading(true)
    try {
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

      if (dRow?.bus?.route_id) {
        setSelectedRouteId(dRow.bus.route_id)
        setNewBusRoute(dRow.bus.route_id)
      } else if (routes.length > 0) {
        setSelectedRouteId(routes[0].id)
        setNewBusRoute(routes[0].id)
      }

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

      if (data && data.status === 'ok') {
        setNewBusReg('')
        await loadDriverData()
      } else if (data?.status === 'bus_taken') {
        setErrorMsg('This bus registration is already claimed by another driver. Please contact admin.')
      } else {
        setErrorMsg(data?.message || 'Could not assign bus. Please try again.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving bus assignment.')
    } finally {
      setAssigningBus(false)
    }
  }

  const handleStartTrip = async () => {
    if (!driverRecord?.bus_id) {
      setErrorMsg('You do not have a bus assigned yet. Please assign a bus below.')
      return
    }
    if (!selectedRouteId) {
      setErrorMsg('Please select a route.')
      return
    }

    setStarting(true)
    setErrorMsg(null)

    try {
      const { data: newTrip, error } = await supabase
        .from('trips')
        .insert({
          bus_id: driverRecord.bus_id,
          driver_id: driverRecord.id,
          route_id: selectedRouteId,
          direction,
          status: 'on_time',
          crowd_level: 1,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      navigate('/driver/trip')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start trip.')
    } finally {
      setStarting(false)
    }
  }

  const handleEndExistingTrip = async () => {
    if (!activeTrip) return
    try {
      await supabase
        .from('trips')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeTrip.id)

      setActiveTrip(null)
    } catch (err) {
      setErrorMsg('Failed to end previous trip.')
    }
  }

  const assignedRoute = routes.find((r) => r.id === driverRecord?.bus?.route_id)
  const currentRoute = routes.find((r) => r.id === selectedRouteId)

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Gradient Header with Driver Name & Assigned Bus Chip */}
      <div
        className="rounded-[28px] p-5 on-brand shadow-soft relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
      >
        <span className="text-xs font-semibold block uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          Driver Console
        </span>
        <h2 className="font-heading font-extrabold text-xl mt-0.5" style={{ color: 'var(--on-brand)' }}>
          {user?.user_metadata?.full_name || 'Driver Shift'}
        </h2>

        {/* Bus Badge Chip */}
        {driverRecord?.bus ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className="px-3 py-1 bg-amber-500 on-amber rounded-full font-heading font-extrabold text-xs shadow-xs flex items-center gap-1.5"
              style={{ color: 'var(--on-amber)' }}
            >
              <Bus className="w-3.5 h-3.5" style={{ color: 'var(--on-amber)' }} />
              <span>Your Bus: {driverRecord.bus.reg_no}</span>
            </span>
            {assignedRoute && (
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold" style={{ color: 'var(--on-brand)' }}>
                Route {assignedRoute.code}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-3 inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
            No Bus Assigned
          </div>
        )}
      </div>

      {/* 2. Active Trip Notification (if already ongoing) */}
      {activeTrip ? (
        <div className="p-5 bg-surface rounded-[20px] border-2 border-amber-500 shadow-soft space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              Trip in Progress
            </span>
            <h3 className="font-heading font-extrabold text-base text-text mt-1">
              Route {activeTrip.route?.code} - {activeTrip.bus?.reg_no}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Started {new Date(activeTrip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/driver/trip')}
              className="w-full font-bold"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Trip</span>
            </Button>
            <button
              type="button"
              onClick={handleEndExistingTrip}
              className="w-full py-2.5 text-xs font-bold text-danger hover:bg-danger/10 rounded-full transition cursor-pointer"
            >
              End Previous Trip
            </button>
          </div>
        </div>
      ) : (
        /* 3. New Trip Configuration Form */
        <div className="bg-surface p-5 rounded-[20px] border border-line shadow-soft space-y-4">
          <div>
            <h3 className="font-heading font-extrabold text-base text-text">
              Start Shift
            </h3>
            <p className="text-xs text-muted">
              Select route and direction to begin GPS broadcast to commuters.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-[12px] text-xs text-danger font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add Bus Card if not assigned */}
          {!driverRecord?.bus && (
            <div className="p-4 bg-amber-100/60 border border-amber-500/30 rounded-[16px] space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-xs font-bold font-heading">Link Your Bus</h4>
              </div>
              <p className="text-xs text-muted">
                Enter your registration number to attach your vehicle.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBusReg}
                  onChange={(e) => setNewBusReg(e.target.value.toUpperCase())}
                  placeholder="e.g. KA25 F 1234"
                  className="w-full h-11 px-3.5 bg-white border border-line rounded-[12px] text-xs font-mono uppercase font-bold text-ink-950"
                />
                <select
                  value={newBusRoute}
                  onChange={(e) => setNewBusRoute(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-line rounded-[12px] text-xs font-bold text-ink-950"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Route {r.code} - {r.name_en}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSetMyBus}
                  loading={assigningBus}
                  className="w-full"
                >
                  Save & Attach Bus
                </Button>
              </div>
            </div>
          )}

          {/* Route Selector */}
          <div>
            <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
              Select Route
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full h-12 px-3.5 bg-sky-50 border border-line rounded-[12px] text-xs font-bold text-ink-950 focus:outline-none focus:border-cobalt-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.code} - {r.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Toggle */}
          <div>
            <label className="block text-xs font-bold text-text mb-1.5 font-heading">
              Trip Direction
            </label>
            <SegmentedControl
              options={[
                { key: 0, label: 'Forward (0)' },
                { key: 1, label: 'Return (1)', icon: RotateCcw },
              ]}
              value={direction}
              onChange={setDirection}
              ariaLabel="Trip Direction"
            />
          </div>
        </div>
      )}

      {/* 4. Giant Amber "Start Trip" Primary CTA Button per Section 6 */}
      {!activeTrip && (
        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={starting || !driverRecord?.bus_id}
            onClick={handleStartTrip}
            className="w-full h-16 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy-900 font-extrabold text-lg rounded-full flex items-center justify-center gap-2.5 shadow-float active:scale-98 transition font-heading"
          >
            <Play className="w-6 h-6 fill-navy-900" />
            <span>{starting ? 'Initializing GPS...' : 'Start Trip'}</span>
          </button>

          <p className="text-[11px] text-muted text-center leading-normal">
            Keep your screen on or device plugged in. Realtime GPS transmits every 5 seconds until you tap "End Trip".
          </p>
        </div>
      )}
    </div>
  )
}
