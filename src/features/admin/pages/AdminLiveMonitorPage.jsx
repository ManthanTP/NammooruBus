import { useState, useEffect, useMemo } from 'react'
import { Activity, AlertTriangle, ShieldAlert, Clock, PowerOff, RefreshCw, Bus } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import RouteBadge from '@/components/ui/RouteBadge'

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const DEFAULT_LAT = parseFloat(import.meta.env.VITE_DEFAULT_LAT || '15.3647')
const DEFAULT_LNG = parseFloat(import.meta.env.VITE_DEFAULT_LNG || '75.1240')

function createLiveBusIcon(routeCode, color, isSilent, isDelayed, isBreakdown) {
  let bgColor = color || '#3451F2'
  let borderColor = '#FFFFFF'
  let label = routeCode || 'BUS'

  if (isBreakdown) {
    bgColor = '#E5484D'
    borderColor = '#FFFFFF'
  } else if (isDelayed) {
    bgColor = '#F59E0B'
  } else if (isSilent) {
    bgColor = '#6B7494'
  }

  return L.divIcon({
    html: `
      <div style="background:${bgColor};color:white;border:2px solid ${borderColor};border-radius:12px;padding:3px 6px;display:flex;align-items:center;gap:3px;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-weight:800;font-size:10px;font-family:monospace;white-space:nowrap;">
        <span>🚌</span>
        <span>${label}</span>
      </div>
    `,
    className: 'admin-live-bus-marker',
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  })
}

function MapAutoCenter({ trips, selectedTripId }) {
  const map = useMap()
  useEffect(() => {
    if (selectedTripId) {
      const selected = trips.find((t) => t.id === selectedTripId)
      if (selected?.position?.lat && selected?.position?.lng) {
        map.setView([selected.position.lat, selected.position.lng], 15, { animate: true })
        return
      }
    }

    const validPositions = trips
      .filter((t) => t.position?.lat && t.position?.lng)
      .map((t) => [t.position.lat, t.position.lng])

    if (validPositions.length > 0) {
      try {
        if (validPositions.length === 1) {
          map.setView(validPositions[0], 14)
        } else {
          map.fitBounds(validPositions, { padding: [50, 50], maxZoom: 15, animate: true })
        }
      } catch (e) {}
    }
  }, [trips, selectedTripId, map])
  return null
}

export default function AdminLiveMonitorPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'delayed' | 'breakdown' | 'silent'
  const [endTripDialog, setEndTripDialog] = useState({ isOpen: false, trip: null })
  const [currentTime, setCurrentTime] = useState(Date.now())

  const { addToast } = useToastStore()

  // Heartbeat to update seconds counter
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  // Fetch active trips with joined position, route, bus and driver
  const fetchActiveTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          direction,
          status,
          crowd_level,
          started_at,
          buses (id, reg_no),
          routes (id, code, name_en, color),
          drivers (id, phone, profiles(id, full_name)),
          bus_positions (lat, lng, speed_kmh, heading, updated_at)
        `)
        .neq('status', 'ended')
        .order('started_at', { ascending: false })

      if (error) throw error

      // Normalize position field (bus_positions is 1-to-1 or array depending on Supabase relations)
      const normalized = (data || []).map((t) => {
        const pos = Array.isArray(t.bus_positions)
          ? t.bus_positions[0]
          : t.bus_positions
        return {
          ...t,
          position: pos || null,
        }
      })

      setTrips(normalized)
    } catch (err) {
      addToast({ message: `Failed to load active fleet trips: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Initial load and Realtime subscriptions
  useEffect(() => {
    fetchActiveTrips()

    const channel = supabase
      .channel('admin_live_monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bus_positions' },
        () => fetchActiveTrips()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => fetchActiveTrips()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Helper to categorize flags
  const enrichedTrips = useMemo(() => {
    return trips.map((t) => {
      let ageSeconds = 9999
      if (t.position?.updated_at) {
        ageSeconds = Math.max(0, Math.floor((currentTime - new Date(t.position.updated_at).getTime()) / 1000))
      }

      const isSilent = ageSeconds > 60
      const isDelayed = t.status === 'delayed'
      const isBreakdown = t.status === 'breakdown'

      return {
        ...t,
        ageSeconds,
        isSilent,
        isDelayed,
        isBreakdown,
      }
    })
  }, [trips, currentTime])

  const filteredTrips = useMemo(() => {
    if (filter === 'delayed') return enrichedTrips.filter((t) => t.isDelayed)
    if (filter === 'breakdown') return enrichedTrips.filter((t) => t.isBreakdown)
    if (filter === 'silent') return enrichedTrips.filter((t) => t.isSilent)
    return enrichedTrips
  }, [enrichedTrips, filter])

  // Force End Trip
  const handleForceEndTrip = async () => {
    const trip = endTripDialog.trip
    if (!trip) return

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', trip.id)

      if (error) throw error

      addToast({
        message: `Trip for bus ${trip.buses?.reg_no} has been terminated.`,
        type: 'info',
      })
      setEndTripDialog({ isOpen: false, trip: null })
      fetchActiveTrips()
    } catch (err) {
      addToast({ message: `Error ending trip: ${err.message}`, type: 'error' })
    }
  }

  const counts = {
    all: enrichedTrips.length,
    delayed: enrichedTrips.filter((t) => t.isDelayed).length,
    breakdown: enrichedTrips.filter((t) => t.isBreakdown).length,
    silent: enrichedTrips.filter((t) => t.isSilent).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <Activity className="w-5 h-5 text-cobalt" />
            Live Network Dispatch Monitor
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time telemetry map of active trips, signal latency health, and incident response.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchActiveTrips}
          className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-input text-xs font-bold transition flex items-center gap-1.5 ${
            filter === 'all'
              ? 'bg-cobalt text-white shadow-soft'
              : 'bg-surface border border-line text-text-secondary hover:text-ink'
          }`}
        >
          <span>All Active Trips</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('delayed')}
          className={`px-3 py-1.5 rounded-input text-xs font-bold transition flex items-center gap-1.5 ${
            filter === 'delayed'
              ? 'bg-warning text-ink shadow-soft'
              : 'bg-surface border border-line text-warning hover:bg-warning/10'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Delayed</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
            {counts.delayed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('breakdown')}
          className={`px-3 py-1.5 rounded-input text-xs font-bold transition flex items-center gap-1.5 ${
            filter === 'breakdown'
              ? 'bg-danger text-white shadow-soft'
              : 'bg-surface border border-line text-danger hover:bg-danger/10'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Breakdown</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {counts.breakdown}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('silent')}
          className={`px-3 py-1.5 rounded-input text-xs font-bold transition flex items-center gap-1.5 ${
            filter === 'silent'
              ? 'bg-text-secondary text-white shadow-soft'
              : 'bg-surface border border-line text-text-secondary hover:bg-page'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Silent (&gt;60s)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {counts.silent}
          </span>
        </button>
      </div>

      {/* Split View: Map + Live Trip List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Live Map */}
        <div className="lg:col-span-8 bg-surface rounded-card border border-line p-3 shadow-soft space-y-3">
          <div className="h-[520px] rounded-input overflow-hidden border border-line relative">
            <MapContainer
              center={[DEFAULT_LAT, DEFAULT_LNG]}
              zoom={13}
              className="w-full h-full"
              attributionControl={false}
            >
              <TileLayer url={TILE_URL} />
              <MapAutoCenter trips={filteredTrips} selectedTripId={selectedTripId} />

              {filteredTrips.map((t) => {
                if (!t.position?.lat || !t.position?.lng) return null

                return (
                  <Marker
                    key={t.id}
                    position={[t.position.lat, t.position.lng]}
                    icon={createLiveBusIcon(
                      t.routes?.code,
                      t.routes?.color,
                      t.isSilent,
                      t.isDelayed,
                      t.isBreakdown
                    )}
                    eventHandlers={{
                      click: () => setSelectedTripId(t.id),
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1 font-body">
                        <div className="font-bold text-ink flex items-center gap-1.5">
                          <span>Route {t.routes?.code}</span>
                          <span className="font-normal text-text-secondary">
                            ({t.buses?.reg_no})
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          Driver: {t.drivers?.profiles?.full_name || 'Assigned Driver'}
                        </div>
                        <div className="text-[11px] font-mono">
                          Speed: {Math.round(t.position.speed_kmh || 0)} km/h &bull; Signal: {t.ageSeconds}s ago
                        </div>
                        <button
                          type="button"
                          onClick={() => setEndTripDialog({ isOpen: true, trip: t })}
                          className="mt-2 w-full py-1 bg-danger text-white rounded text-[11px] font-bold"
                        >
                          Force End Trip
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Trips Panel */}
        <div className="lg:col-span-4 space-y-3 max-h-[550px] overflow-y-auto pr-1">
          {filteredTrips.length === 0 ? (
            <div className="bg-surface rounded-card border border-line p-8 text-center text-xs text-text-secondary shadow-soft">
              No active bus trips match the selected filter.
            </div>
          ) : (
            filteredTrips.map((t) => {
              const isSelected = selectedTripId === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  className={`p-4 bg-surface rounded-card border transition cursor-pointer shadow-soft space-y-3 ${
                    isSelected
                      ? 'border-cobalt ring-1 ring-cobalt'
                      : 'border-line hover:border-text-secondary'
                  }`}
                >
                  {/* Top row: Route Badge + Status Chips */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RouteBadge
                        code={t.routes?.code || '---'}
                        color={t.routes?.color}
                        size="sm"
                      />
                      <span className="font-mono font-bold text-xs text-ink">
                        {t.buses?.reg_no}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {t.isBreakdown && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger text-white">
                          Breakdown
                        </span>
                      )}
                      {t.isDelayed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning text-ink">
                          Delayed
                        </span>
                      )}
                      {t.isSilent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-line text-text-secondary">
                          Silent ({t.ageSeconds}s)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
                          Live
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Route title & Driver */}
                  <div>
                    <h4 className="text-xs font-bold text-ink truncate">
                      {t.routes?.name_en || 'Active Route'}
                    </h4>
                    <span className="text-[11px] text-text-secondary block">
                      Driver: {t.drivers?.profiles?.full_name || 'Driver'} {t.drivers?.phone ? `(${t.drivers.phone})` : ''}
                    </span>
                  </div>

                  {/* Telemetry info & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-line text-[11px]">
                    <span className="font-mono text-text-secondary">
                      Speed: <strong className="text-ink">{Math.round(t.position?.speed_kmh || 0)} km/h</strong>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEndTripDialog({ isOpen: true, trip: t })
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-danger hover:bg-danger/10 rounded-input text-xs font-bold transition"
                      title="Force End Trip"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      <span>End Trip</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Force End Trip Dialog */}
      <ConfirmDialog
        isOpen={endTripDialog.isOpen}
        title="Force End Active Trip"
        message={`Are you sure you want to forcibly terminate the active trip for bus ${endTripDialog.trip?.buses?.reg_no} on Route ${endTripDialog.trip?.routes?.code}? This will immediately remove it from the live passenger tracking map.`}
        confirmLabel="Force End"
        variant="danger"
        onConfirm={handleForceEndTrip}
        onCancel={() => setEndTripDialog({ isOpen: false, trip: null })}
      />
    </div>
  )
}
