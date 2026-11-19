import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Route as RouteIcon,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Wand2,
  AlertCircle,
  MapPin,
  Check,
} from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { haversine } from '@/lib/geo'
import { useToastStore } from '@/components/ui/Toast'
import RouteBadge from '@/components/ui/RouteBadge'

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const DEFAULT_LAT = parseFloat(import.meta.env.VITE_DEFAULT_LAT || '15.3647')
const DEFAULT_LNG = parseFloat(import.meta.env.VITE_DEFAULT_LNG || '75.1240')

const COLOR_PRESETS = [
  { label: 'Cobalt', hex: '#3451F2' },
  { label: 'Coral', hex: '#F0643C' },
  { label: 'Green', hex: '#12A676' },
  { label: 'Violet', hex: '#8B5CF6' },
  { label: 'Danger Red', hex: '#E5484D' },
  { label: 'Amber', hex: '#FFC24A' },
]

function createStopNumberIcon(num, color = '#3451F2') {
  return L.divIcon({
    html: `<div style="background:${color};color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${num}</div>`,
    className: 'admin-route-stop-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function MapAutoFitter({ stops }) {
  const map = useMap()
  useEffect(() => {
    if (stops && stops.length > 0) {
      const validCoords = stops
        .filter((s) => s.stop && !isNaN(s.stop.lat) && !isNaN(s.stop.lng))
        .map((s) => [Number(s.stop.lat), Number(s.stop.lng)])

      if (validCoords.length > 0) {
        try {
          if (validCoords.length === 1) {
            map.setView(validCoords[0], 14)
          } else {
            map.fitBounds(validCoords, { padding: [40, 40], maxZoom: 15, animate: true })
          }
        } catch (e) {
          // ignore fit error
        }
      }
    }
  }, [stops, map])
  return null
}

export default function AdminRouteEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [allStops, setAllStops] = useState([])
  const [selectedStopToAdd, setSelectedStopToAdd] = useState('')
  const [formError, setFormError] = useState('')

  // Route metadata
  const [meta, setMeta] = useState({
    code: '',
    name_en: '',
    name_kn: '',
    color: '#3451F2',
    two_way: true,
    active: true,
  })

  // Route stops sequence: [{ stop_id, stop: { name_en, name_kn, lat, lng }, dist_km, min_from_prev }]
  const [routeStops, setRouteStops] = useState([])

  // Fetch stops and route data
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch all active stops
        const { data: stopsData, error: stopsErr } = await supabase
          .from('stops')
          .select('*')
          .order('name_en')

        if (stopsErr) throw stopsErr
        setAllStops(stopsData || [])

        if (!isNew) {
          // Fetch route metadata
          const { data: routeData, error: routeErr } = await supabase
            .from('routes')
            .select('*')
            .eq('id', id)
            .single()

          if (routeErr) throw routeErr
          if (routeData) {
            setMeta({
              code: routeData.code,
              name_en: routeData.name_en,
              name_kn: routeData.name_kn || '',
              color: routeData.color || '#3451F2',
              two_way: routeData.two_way ?? true,
              active: routeData.active ?? true,
            })
          }

          // Fetch route stops in order
          const { data: rsData, error: rsErr } = await supabase
            .from('route_stops')
            .select('seq, dist_km, min_from_prev, stop_id, stops(*)')
            .eq('route_id', id)
            .order('seq', { ascending: true })

          if (rsErr) throw rsErr
          if (rsData) {
            setRouteStops(
              rsData.map((item) => ({
                stop_id: item.stop_id,
                stop: item.stops,
                dist_km: Number(item.dist_km || 0),
                min_from_prev: Number(item.min_from_prev || 0),
              }))
            )
          }
        }
      } catch (err) {
        addToast({ message: `Error loading route data: ${err.message}`, type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id, isNew])

  // Available stops that aren't already in the sequence
  const unusedStops = useMemo(() => {
    const usedIds = new Set(routeStops.map((rs) => rs.stop_id))
    return allStops.filter((s) => !usedIds.has(s.id))
  }, [allStops, routeStops])

  // Add stop to end of sequence
  const handleAddStop = () => {
    if (!selectedStopToAdd) return
    const stopObj = allStops.find((s) => s.id === selectedStopToAdd)
    if (!stopObj) return

    let suggestedDist = 0
    let suggestedMin = 0

    if (routeStops.length > 0) {
      const prevStop = routeStops[routeStops.length - 1].stop
      if (prevStop && prevStop.lat && prevStop.lng && stopObj.lat && stopObj.lng) {
        const straight = haversine(
          Number(prevStop.lat),
          Number(prevStop.lng),
          Number(stopObj.lat),
          Number(stopObj.lng)
        )
        suggestedDist = parseFloat((straight * 1.3).toFixed(2))
        suggestedMin = Math.round((suggestedDist / 17) * 60) + 1
      }
    }

    setRouteStops((prev) => [
      ...prev,
      {
        stop_id: stopObj.id,
        stop: stopObj,
        dist_km: suggestedDist,
        min_from_prev: suggestedMin,
      },
    ])

    setSelectedStopToAdd('')
  }

  // Move stop up or down
  const handleMove = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= routeStops.length) return

    setRouteStops((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp

      // Ensure the new first stop has dist 0 and min 0
      copy[0] = { ...copy[0], dist_km: 0, min_from_prev: 0 }
      return copy
    })
  }

  // Remove stop
  const handleRemove = (index) => {
    setRouteStops((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length > 0) {
        next[0] = { ...next[0], dist_km: 0, min_from_prev: 0 }
      }
      return next
    })
  }

  // Update stop distance or minutes
  const handleStopParamChange = (index, field, value) => {
    setRouteStops((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          [field]: parseFloat(value) || 0,
        }
      })
    )
  }

  // Auto-calculate all distances along the sequence
  const handleAutoSuggestAll = () => {
    if (routeStops.length < 2) return

    setRouteStops((prev) =>
      prev.map((item, index) => {
        if (index === 0) {
          return { ...item, dist_km: 0, min_from_prev: 0 }
        }
        const prevItem = prev[index - 1]
        if (
          item.stop &&
          prevItem.stop &&
          !isNaN(item.stop.lat) &&
          !isNaN(prevItem.stop.lat)
        ) {
          const straight = haversine(
            Number(prevItem.stop.lat),
            Number(prevItem.stop.lng),
            Number(item.stop.lat),
            Number(item.stop.lng)
          )
          const dist = parseFloat((straight * 1.3).toFixed(2))
          const min = Math.round((dist / 17) * 60) + 1
          return { ...item, dist_km: dist, min_from_prev: min }
        }
        return item
      })
    )
    addToast({ message: 'Recalculated distances and run times (1.3x road factor, 17 km/h)', type: 'info' })
  }

  // Save Route and Sequence
  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!meta.code.trim()) {
      setFormError('Route code is required (e.g. 201, 45A).')
      return
    }
    if (!meta.name_en.trim()) {
      setFormError('Route title (English) is required.')
      return
    }
    if (routeStops.length < 2) {
      setFormError('A route must have at least 2 stops.')
      return
    }

    setSaving(true)
    try {
      let routeId = id

      if (isNew) {
        const { data: created, error: createErr } = await supabase
          .from('routes')
          .insert({
            code: meta.code.trim().toUpperCase(),
            name_en: meta.name_en.trim(),
            name_kn: meta.name_kn.trim() || null,
            color: meta.color,
            two_way: meta.two_way,
            active: meta.active,
          })
          .select('id')
          .single()

        if (createErr) throw createErr
        routeId = created.id
      } else {
        const { error: updateErr } = await supabase
          .from('routes')
          .update({
            code: meta.code.trim().toUpperCase(),
            name_en: meta.name_en.trim(),
            name_kn: meta.name_kn.trim() || null,
            color: meta.color,
            two_way: meta.two_way,
            active: meta.active,
          })
          .eq('id', routeId)

        if (updateErr) throw updateErr
      }

      // Format items for save_route_stops RPC
      const rpcItems = routeStops.map((rs, idx) => ({
        stop_id: rs.stop_id,
        seq: idx + 1,
        dist_km: idx === 0 ? 0 : Number(rs.dist_km),
        min_from_prev: idx === 0 ? 0 : Number(rs.min_from_prev),
      }))

      const { error: rpcErr } = await supabase.rpc('save_route_stops', {
        p_route: routeId,
        p_items: rpcItems,
      })

      if (rpcErr) throw rpcErr

      addToast({
        message: `Successfully saved route ${meta.code} with ${routeStops.length} stops!`,
        type: 'success',
      })
      navigate('/12345678/admin/routes')
    } catch (err) {
      setFormError(err.message)
      addToast({ message: `Save failed: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Coordinates for polyline
  const polylineCoords = useMemo(() => {
    return routeStops
      .filter((s) => s.stop && !isNaN(s.stop.lat) && !isNaN(s.stop.lng))
      .map((s) => [Number(s.stop.lat), Number(s.stop.lng)])
  }, [routeStops])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/12345678/admin/routes"
            className="p-2 bg-surface hover:bg-page border border-line rounded-input text-text-secondary hover:text-ink transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-cobalt" />
              {isNew ? 'Create New Transit Route' : `Edit Route: ${meta.code}`}
            </h2>
            <p className="text-xs text-text-secondary">
              Set route metadata, sequence stop order, and calibrate stop-to-stop distances and run times.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Route & Stops'}</span>
        </button>
      </div>

      {formError && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-input text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Grid: Form Left, Preview Map Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Stop Sequencer */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Card */}
          <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
            <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Route Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Route Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={meta.code}
                  onChange={(e) => setMeta({ ...meta, code: e.target.value })}
                  placeholder="e.g. 201"
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-bold text-ink uppercase focus:outline-none focus:border-cobalt"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-ink mb-1">
                  Route Title (English) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={meta.name_en}
                  onChange={(e) => setMeta({ ...meta, name_en: e.target.value })}
                  placeholder="e.g. OBS - Airport via Keshwapur"
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Kannada Title (ಕನ್ನಡ ವಿವರಣೆ)
              </label>
              <input
                type="text"
                value={meta.name_kn}
                onChange={(e) => setMeta({ ...meta, name_kn: e.target.value })}
                placeholder="e.g. ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣ - ವಿಮಾನ ನಿಲ್ದಾಣ"
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
              />
            </div>

            {/* Color Selector */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Badge & Line Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setMeta({ ...meta, color: p.hex })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                      meta.color === p.hex
                        ? 'border-ink shadow-xs scale-105'
                        : 'border-line hover:border-text-secondary'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span>{p.label}</span>
                  </button>
                ))}
                <input
                  type="color"
                  value={meta.color}
                  onChange={(e) => setMeta({ ...meta, color: e.target.value })}
                  className="w-7 h-7 rounded border border-line cursor-pointer p-0.5 ml-1"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 pt-2 border-t border-line">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={meta.two_way}
                  onChange={(e) => setMeta({ ...meta, two_way: e.target.checked })}
                  className="rounded border-line text-cobalt focus:ring-cobalt w-4 h-4"
                />
                <span>Two-way Route (Bidirectional)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={meta.active}
                  onChange={(e) => setMeta({ ...meta, active: e.target.checked })}
                  className="rounded border-line text-cobalt focus:ring-cobalt w-4 h-4"
                />
                <span>Active Route</span>
              </label>
            </div>
          </div>

          {/* Stop Sequencer Card */}
          <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
                  Stop Sequence ({routeStops.length} stops)
                </h3>
                <span className="text-[11px] text-text-secondary">
                  Order determines travel progression and cumulative ETA.
                </span>
              </div>

              {routeStops.length > 1 && (
                <button
                  type="button"
                  onClick={handleAutoSuggestAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cobalt-tint text-cobalt text-xs font-bold rounded-input hover:bg-cobalt/20 transition"
                  title="Auto-calculate distances & run times"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Calculate</span>
                </button>
              )}
            </div>

            {/* Add stop selector */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedStopToAdd}
                onChange={(e) => setSelectedStopToAdd(e.target.value)}
                className="flex-1 px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
              >
                <option value="">-- Choose a stop to append --</option>
                {unusedStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_en} {s.name_kn ? `(${s.name_kn})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddStop}
                disabled={!selectedStopToAdd}
                className="flex items-center gap-1.5 px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Stop</span>
              </button>
            </div>

            {/* Stops Sequence List */}
            {routeStops.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-line rounded-input text-xs text-text-secondary">
                No stops added to this route yet. Choose a stop above to begin building the sequence.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {routeStops.map((item, index) => {
                  const isFirst = index === 0
                  const isLast = index === routeStops.length - 1

                  return (
                    <div
                      key={item.stop_id}
                      className="p-3 bg-page border border-line rounded-input flex items-center justify-between gap-3 text-xs"
                    >
                      {/* Seq badge & Stop details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-6 h-6 rounded-full text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]"
                          style={{ backgroundColor: meta.color }}
                        >
                          {index + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-ink block truncate">
                            {item.stop?.name_en || 'Unknown Stop'}
                          </span>
                          {item.stop?.name_kn && (
                            <span className="text-[10px] text-text-secondary block truncate">
                              {item.stop.name_kn}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Distance & Min Inputs */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isFirst ? (
                          <span className="text-[11px] font-bold text-text-secondary px-3 py-1 bg-surface border border-line rounded-input">
                            Starting Terminal
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={item.dist_km}
                                onChange={(e) =>
                                  handleStopParamChange(index, 'dist_km', e.target.value)
                                }
                                className="w-16 px-2 py-1 bg-surface border border-line rounded-input text-xs font-mono text-ink text-center focus:outline-none focus:border-cobalt"
                                title="Kilometers from previous stop"
                              />
                              <span className="text-[10px] text-text-secondary">km</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={item.min_from_prev}
                                onChange={(e) =>
                                  handleStopParamChange(index, 'min_from_prev', e.target.value)
                                }
                                className="w-14 px-2 py-1 bg-surface border border-line rounded-input text-xs font-mono text-ink text-center focus:outline-none focus:border-cobalt"
                                title="Minutes from previous stop"
                              />
                              <span className="text-[10px] text-text-secondary">min</span>
                            </div>
                          </>
                        )}

                        {/* Reorder & Delete Buttons */}
                        <div className="flex items-center gap-1 pl-1 border-l border-line">
                          <button
                            type="button"
                            onClick={() => handleMove(index, -1)}
                            disabled={isFirst}
                            className="p-1 hover:bg-surface text-text-secondary hover:text-ink disabled:opacity-20 rounded transition"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, 1)}
                            disabled={isLast}
                            className="p-1 hover:bg-surface text-text-secondary hover:text-ink disabled:opacity-20 rounded transition"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="p-1 hover:bg-danger/10 text-danger rounded transition ml-1"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Map Preview */}
        <div className="lg:col-span-5 bg-surface rounded-card border border-line p-4 shadow-soft space-y-3 sticky top-20">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cobalt" />
              Route Alignment Preview
            </h3>
            <RouteBadge code={meta.code || '---'} color={meta.color} size="sm" />
          </div>

          <div className="h-[480px] rounded-input overflow-hidden border border-line relative">
            <MapContainer
              center={[DEFAULT_LAT, DEFAULT_LNG]}
              zoom={13}
              className="w-full h-full"
              attributionControl={false}
            >
              <TileLayer url={TILE_URL} />
              <MapAutoFitter stops={routeStops} />

              {polylineCoords.length >= 2 && (
                <Polyline
                  positions={polylineCoords}
                  pathOptions={{
                    color: meta.color,
                    weight: 5,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              {routeStops.map((rs, idx) => {
                if (!rs.stop || isNaN(rs.stop.lat) || isNaN(rs.stop.lng)) return null
                return (
                  <Marker
                    key={rs.stop_id}
                    position={[Number(rs.stop.lat), Number(rs.stop.lng)]}
                    icon={createStopNumberIcon(idx + 1, meta.color)}
                  />
                )
              })}
            </MapContainer>
          </div>

          <div className="p-3 bg-page border border-line rounded-input text-[11px] text-text-secondary flex justify-between">
            <span>
              Total stops: <strong className="text-ink">{routeStops.length}</strong>
            </span>
            <span>
              Total distance:{' '}
              <strong className="text-ink">
                {routeStops.reduce((acc, curr) => acc + (Number(curr.dist_km) || 0), 0).toFixed(1)} km
              </strong>
            </span>
            <span>
              Est. time:{' '}
              <strong className="text-ink">
                {routeStops.reduce((acc, curr) => acc + (Number(curr.min_from_prev) || 0), 0)} min
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
