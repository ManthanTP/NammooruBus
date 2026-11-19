import { useState, useEffect, useMemo } from 'react'
import { Calendar, Save, Clock, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import RouteBadge from '@/components/ui/RouteBadge'

export default function AdminSchedulesPage() {
  const [routes, setRoutes] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loadingRoutes, setLoadingRoutes] = useState(true)
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states for weekday and weekend
  const [weekdayForm, setWeekdayForm] = useState({
    first_bus: '06:00',
    last_bus: '21:30',
    headway_min: 15,
  })
  const [weekendForm, setWeekendForm] = useState({
    first_bus: '06:30',
    last_bus: '21:00',
    headway_min: 20,
  })

  const { addToast } = useToastStore()

  // 1. Fetch all routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('id, code, name_en, name_kn, color')
          .order('code')

        if (error) throw error
        setRoutes(data || [])
        if (data && data.length > 0) {
          setSelectedRouteId(data[0].id)
        }
      } catch (err) {
        addToast({ message: `Failed to load routes: ${err.message}`, type: 'error' })
      } finally {
        setLoadingRoutes(false)
      }
    }
    fetchRoutes()
  }, [])

  // 2. Fetch schedules for selected route
  const fetchSchedulesForRoute = async (routeId) => {
    if (!routeId) return
    setLoadingSchedules(true)
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('route_id', routeId)

      if (error) throw error
      setSchedules(data || [])

      // Map into weekday/weekend states
      const wd = data?.find((s) => s.day_type === 'weekday')
      if (wd) {
        setWeekdayForm({
          first_bus: wd.first_bus.slice(0, 5),
          last_bus: wd.last_bus.slice(0, 5),
          headway_min: wd.headway_min,
        })
      } else {
        setWeekdayForm({ first_bus: '06:00', last_bus: '21:30', headway_min: 15 })
      }

      const we = data?.find((s) => s.day_type === 'weekend')
      if (we) {
        setWeekendForm({
          first_bus: we.first_bus.slice(0, 5),
          last_bus: we.last_bus.slice(0, 5),
          headway_min: we.headway_min,
        })
      } else {
        setWeekendForm({ first_bus: '06:30', last_bus: '21:00', headway_min: 20 })
      }
    } catch (err) {
      addToast({ message: `Error loading timetable: ${err.message}`, type: 'error' })
    } finally {
      setLoadingSchedules(false)
    }
  }

  useEffect(() => {
    if (selectedRouteId) {
      fetchSchedulesForRoute(selectedRouteId)
    }
  }, [selectedRouteId])

  const selectedRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId)
  }, [routes, selectedRouteId])

  // Helper to calculate departures for timetable preview
  const generatePreviewDepartures = (first, last, headway) => {
    if (!first || !last || !headway || headway <= 0) return []
    const [h1, m1] = first.split(':').map(Number)
    const [h2, m2] = last.split(':').map(Number)
    const startMins = h1 * 60 + m1
    const endMins = h2 * 60 + m2

    if (startMins >= endMins) return []

    const departures = []
    for (let m = startMins; m <= endMins; m += Number(headway)) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0')
      const mm = String(m % 60).padStart(2, '0')
      departures.push(`${hh}:${mm}`)
    }
    return departures
  }

  const weekdayDepartures = useMemo(() => {
    return generatePreviewDepartures(weekdayForm.first_bus, weekdayForm.last_bus, weekdayForm.headway_min)
  }, [weekdayForm])

  const weekendDepartures = useMemo(() => {
    return generatePreviewDepartures(weekendForm.first_bus, weekendForm.last_bus, weekendForm.headway_min)
  }, [weekendForm])

  // Save both schedules
  const handleSave = async (e) => {
    e.preventDefault()
    if (!selectedRouteId) return

    setSaving(true)
    try {
      const rows = [
        {
          route_id: selectedRouteId,
          day_type: 'weekday',
          first_bus: `${weekdayForm.first_bus}:00`,
          last_bus: `${weekdayForm.last_bus}:00`,
          headway_min: Number(weekdayForm.headway_min),
        },
        {
          route_id: selectedRouteId,
          day_type: 'weekend',
          first_bus: `${weekendForm.first_bus}:00`,
          last_bus: `${weekendForm.last_bus}:00`,
          headway_min: Number(weekendForm.headway_min),
        },
      ]

      const { error } = await supabase.from('schedules').upsert(rows, {
        onConflict: 'route_id,day_type',
      })

      if (error) throw error

      addToast({
        message: `Saved timetable schedules for route ${selectedRoute?.code}!`,
        type: 'success',
      })
      fetchSchedulesForRoute(selectedRouteId)
    } catch (err) {
      addToast({ message: `Failed to save schedules: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cobalt" />
            Timetable Schedules
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure service hours, operating windows, and frequency headways for Weekday and Weekend operations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loadingSchedules}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Schedules'}</span>
        </button>
      </div>

      {/* Route Selector Tabs / Bar */}
      <div className="bg-surface rounded-card border border-line p-4 shadow-soft">
        <label className="block text-xs font-bold text-ink mb-2">
          Select Route to Configure:
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {routes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRouteId(r.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-input text-xs font-bold transition shrink-0 border ${
                selectedRouteId === r.id
                  ? 'border-cobalt bg-cobalt-tint text-cobalt shadow-xs'
                  : 'border-line bg-page text-ink hover:border-text-secondary'
              }`}
            >
              <RouteBadge code={r.code} color={r.color} size="sm" />
              <span>{r.name_en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekday Schedule */}
        <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cobalt" />
              <h3 className="text-sm font-extrabold text-ink font-heading">
                Weekday (Monday – Friday)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-text-secondary">
              {weekdayDepartures.length} trips/day
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                First Bus Departure
              </label>
              <input
                type="time"
                value={weekdayForm.first_bus}
                onChange={(e) =>
                  setWeekdayForm({ ...weekdayForm, first_bus: e.target.value })
                }
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Last Bus Departure
              </label>
              <input
                type="time"
                value={weekdayForm.last_bus}
                onChange={(e) =>
                  setWeekdayForm({ ...weekdayForm, last_bus: e.target.value })
                }
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Frequency Headway (Minutes between buses)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="3"
                max="180"
                value={weekdayForm.headway_min}
                onChange={(e) =>
                  setWeekdayForm({
                    ...weekdayForm,
                    headway_min: parseInt(e.target.value, 10) || 10,
                  })
                }
                className="w-28 px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink text-center focus:outline-none focus:border-cobalt"
              />
              <span className="text-xs text-text-secondary">minutes (e.g. 15 = every 15 min)</span>
            </div>
          </div>

          {/* Timetable Preview */}
          <div className="pt-2 border-t border-line">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Departure Matrix Preview:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-page border border-line rounded-input">
              {weekdayDepartures.map((time) => (
                <span
                  key={time}
                  className="px-2 py-0.5 bg-surface border border-line rounded text-[11px] font-mono text-ink"
                >
                  {time}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Weekend Schedule */}
        <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning" />
              <h3 className="text-sm font-extrabold text-ink font-heading">
                Weekend (Saturday & Sunday)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-text-secondary">
              {weekendDepartures.length} trips/day
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                First Bus Departure
              </label>
              <input
                type="time"
                value={weekendForm.first_bus}
                onChange={(e) =>
                  setWeekendForm({ ...weekendForm, first_bus: e.target.value })
                }
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Last Bus Departure
              </label>
              <input
                type="time"
                value={weekendForm.last_bus}
                onChange={(e) =>
                  setWeekendForm({ ...weekendForm, last_bus: e.target.value })
                }
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Frequency Headway (Minutes between buses)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="3"
                max="180"
                value={weekendForm.headway_min}
                onChange={(e) =>
                  setWeekendForm({
                    ...weekendForm,
                    headway_min: parseInt(e.target.value, 10) || 10,
                  })
                }
                className="w-28 px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink text-center focus:outline-none focus:border-cobalt"
              />
              <span className="text-xs text-text-secondary">minutes (e.g. 20 = every 20 min)</span>
            </div>
          </div>

          {/* Timetable Preview */}
          <div className="pt-2 border-t border-line">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Departure Matrix Preview:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-page border border-line rounded-input">
              {weekendDepartures.map((time) => (
                <span
                  key={time}
                  className="px-2 py-0.5 bg-surface border border-line rounded text-[11px] font-mono text-ink"
                >
                  {time}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
