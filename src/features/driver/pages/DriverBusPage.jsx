import { useState, useEffect } from 'react'
import { Bus, Route, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { useToastStore } from '@/components/ui/Toast'
import RouteBadge from '@/components/ui/RouteBadge'
import Button from '@/components/ui/Button'

export default function DriverBusPage() {
  const { user } = useAuthStore()
  const { routes, initData } = useDataStore()
  const { addToast } = useToastStore()

  const [driverRecord, setDriverRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busReg, setBusReg] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    initData()
  }, [initData])

  const fetchDriverInfo = async () => {
    if (typeof window !== 'undefined' && (window.__mockAuth || sessionStorage.getItem('nb_mock_driver') === 'true')) {
      setDriverRecord({
        id: 'driver_mock_1',
        bus: { id: 'bus_mock_1', reg_no: 'KA-25-F-1001', route_id: routes[0]?.id || 'route_1' },
      })
      setBusReg('KA-25-F-1001')
      if (routes.length > 0) setSelectedRouteId(routes[0].id)
      setLoading(false)
      return
    }

    if (!user) return
    setLoading(true)
    try {
      const { data: dRow, error } = await supabase
        .from('drivers')
        .select('*, bus:buses(*)')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (error) throw error
      setDriverRecord(dRow)

      if (dRow?.bus) {
        setBusReg(dRow.bus.reg_no || '')
        if (dRow.bus.route_id) {
          setSelectedRouteId(dRow.bus.route_id)
        }
      } else if (routes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(routes[0].id)
      }
    } catch (err) {
      console.warn('Failed loading driver bus data:', err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDriverInfo()
  }, [user, routes])

  const handleSaveBus = async (e) => {
    e.preventDefault()
    if (!busReg.trim()) {
      setErrorMsg('Please enter a bus registration number (e.g. KA-25-F-1234).')
      return
    }

    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { data, error } = await supabase.rpc('set_my_bus', {
        p_reg_no: busReg.trim().toUpperCase(),
        p_route_id: selectedRouteId || null,
      })

      if (error) throw error

      if (data && data.status === 'ok') {
        setSuccessMsg('Bus assignment updated successfully!')
        addToast('Bus assignment saved', 'success')
        await fetchDriverInfo()
      } else if (data?.status === 'bus_taken') {
        setErrorMsg('This bus registration is already claimed by another driver. Please contact admin.')
      } else {
        setErrorMsg(data?.message || 'Could not assign bus. Please check details.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating bus assignment.')
    } finally {
      setSaving(false)
    }
  }

  const assignedRoute = routes.find((r) => r.id === driverRecord?.bus?.route_id || r.id === selectedRouteId)

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Card */}
      <div
        className="rounded-[28px] p-5 text-white shadow-soft relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <span className="text-xs font-semibold text-white/70 block uppercase tracking-wider">
          Vehicle & Route Management
        </span>
        <h1 className="font-heading font-extrabold text-xl text-white mt-0.5">
          Assigned Bus Details
        </h1>
        <p className="text-xs text-white/80 mt-1">
          Your bus broadcasts live GPS location along the selected route.
        </p>
      </div>

      {/* 2. Current Bus Status Card */}
      <div className="p-5 bg-surface rounded-[20px] border border-line shadow-soft space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted font-heading">
          Current Assignment
        </h2>

        {driverRecord?.bus ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3.5 bg-sky-50 dark:bg-surface-2 rounded-[16px] border border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center font-bold">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Bus Number
                  </span>
                  <p className="font-mono font-extrabold text-base text-ink-950">
                    {driverRecord.bus.reg_no}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-full uppercase">
                Active
              </span>
            </div>

            {assignedRoute && (
              <div className="flex items-center justify-between p-3.5 bg-sky-50 dark:bg-surface-2 rounded-[16px] border border-line">
                <div className="flex items-center gap-3">
                  <RouteBadge code={assignedRoute.code} color={assignedRoute.color} size="md" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Assigned Route
                    </span>
                    <p className="font-heading font-bold text-sm text-ink-950">
                      {assignedRoute.name_en}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-[16px] text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No bus currently assigned to your driver account. Add your bus below.</span>
          </div>
        )}
      </div>

      {/* 3. Change / Add Bus Form */}
      <div className="p-5 bg-surface rounded-[20px] border border-line shadow-soft space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted font-heading">
          {driverRecord?.bus ? 'Change Your Bus' : 'Add Your Bus'}
        </h2>

        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-[12px] text-xs text-danger font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-[12px] text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveBus} className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-bold text-ink-950 block mb-1">
              Bus Registration Number
            </label>
            <input
              type="text"
              value={busReg}
              onChange={(e) => setBusReg(e.target.value.toUpperCase())}
              placeholder="e.g. KA25 F 1234"
              className="w-full h-11 px-3.5 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-sm font-mono font-bold text-ink-950 uppercase focus:outline-none focus:border-cobalt-500"
            />
            <span className="text-[10px] text-muted mt-1 block">
              Format: Karnataka RTO registration number
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-950 block mb-1">
              Operating Route
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full h-11 px-3 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-xs font-bold text-ink-950 focus:outline-none focus:border-cobalt-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.code} - {r.name_en}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            className="w-full font-bold shadow-soft"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>Save Bus Assignment</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
