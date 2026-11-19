import { useState, useEffect, useMemo, useRef } from 'react'
import { MapPin, Plus, Edit2, Trash2, AlertCircle, CheckCircle, RefreshCw, Layers } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import { getTileUrl } from '@/lib/mapConfig'

const TILE_URL = getTileUrl()
const DEFAULT_LAT = parseFloat(import.meta.env.VITE_DEFAULT_LAT || '15.3647')
const DEFAULT_LNG = parseFloat(import.meta.env.VITE_DEFAULT_LNG || '75.1240')

const pinIcon = L.divIcon({
  html: `<div style="background:#3451F2;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:14px;">📍</div>`,
  className: 'admin-pin-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  return null
}

export default function AdminStopsPage() {
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStop, setEditingStop] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, stop: null, blockers: [] })

  // Form state
  const [formData, setFormData] = useState({
    name_en: '',
    name_kn: '',
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    active: true,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const { addToast } = useToastStore()

  const fetchStops = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stops')
        .select('*')
        .order('name_en', { ascending: true })

      if (error) throw error
      setStops(data || [])
    } catch (err) {
      addToast({ message: `Failed to load stops: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStops()
  }, [])

  const handleOpenAdd = () => {
    setEditingStop(null)
    setFormData({
      name_en: '',
      name_kn: '',
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      active: true,
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (stop) => {
    setEditingStop(stop)
    setFormData({
      name_en: stop.name_en,
      name_kn: stop.name_kn || '',
      lat: Number(stop.lat),
      lng: Number(stop.lng),
      active: stop.active ?? true,
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleLocationChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name_en.trim()) {
      setFormError('English name is required.')
      return
    }
    if (isNaN(formData.lat) || isNaN(formData.lng)) {
      setFormError('Valid latitude and longitude are required.')
      return
    }

    setSaving(true)
    try {
      if (editingStop) {
        const { error } = await supabase
          .from('stops')
          .update({
            name_en: formData.name_en.trim(),
            name_kn: formData.name_kn.trim() || null,
            lat: formData.lat,
            lng: formData.lng,
            active: formData.active,
          })
          .eq('id', editingStop.id)

        if (error) throw error
        addToast({ message: `Updated stop "${formData.name_en}"`, type: 'success' })
      } else {
        const { error } = await supabase
          .from('stops')
          .insert({
            name_en: formData.name_en.trim(),
            name_kn: formData.name_kn.trim() || null,
            lat: formData.lat,
            lng: formData.lng,
            active: formData.active,
          })

        if (error) throw error
        addToast({ message: `Created stop "${formData.name_en}"`, type: 'success' })
      }

      setModalOpen(false)
      fetchStops()
    } catch (err) {
      setFormError(err.message)
      addToast({ message: `Error saving stop: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = async (stop) => {
    // Check if stop is used by any route
    try {
      const { data: usages, error } = await supabase
        .from('route_stops')
        .select('route_id, routes(code, name_en)')
        .eq('stop_id', stop.id)

      if (error) throw error

      if (usages && usages.length > 0) {
        // Collect unique route codes
        const routeNames = [
          ...new Set(
            usages.map((u) => u.routes?.code || u.routes?.name_en || 'Unknown Route')
          ),
        ]
        setDeleteDialog({
          isOpen: true,
          stop,
          blockers: routeNames,
        })
      } else {
        setDeleteDialog({
          isOpen: true,
          stop,
          blockers: [],
        })
      }
    } catch (err) {
      addToast({ message: `Error checking dependencies: ${err.message}`, type: 'error' })
    }
  }

  const handleConfirmDelete = async () => {
    const stop = deleteDialog.stop
    if (!stop) return

    try {
      const { error } = await supabase.from('stops').delete().eq('id', stop.id)
      if (error) throw error

      addToast({ message: `Deleted stop "${stop.name_en}"`, type: 'success' })
      setDeleteDialog({ isOpen: false, stop: null, blockers: [] })
      fetchStops()
    } catch (err) {
      addToast({ message: `Failed to delete stop: ${err.message}`, type: 'error' })
    }
  }

  const columns = [
    {
      key: 'name_en',
      label: 'English Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink">{val}</span>
          {row.name_kn && (
            <span className="block text-[11px] text-text-secondary">{row.name_kn}</span>
          )}
        </div>
      ),
    },
    {
      key: 'coords',
      label: 'Coordinates',
      sortable: false,
      render: (_, row) => (
        <span className="font-mono text-xs text-text-secondary">
          {Number(row.lat).toFixed(4)}, {Number(row.lng).toFixed(4)}
        </span>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            val ? 'bg-success/15 text-success' : 'bg-line text-text-secondary'
          }`}
        >
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 hover:bg-cobalt-tint text-cobalt rounded-input transition"
            title="Edit Stop"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteClick(row)}
            className="p-1.5 hover:bg-danger/10 text-danger rounded-input transition"
            title="Delete Stop"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cobalt" />
            Bus Stops Registry
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage all passenger stops, geographic coordinates, and regional Kannada translations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStops}
            className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stop</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={stops}
        searchKey={(row, q) =>
          row.name_en?.toLowerCase().includes(q) ||
          row.name_kn?.toLowerCase().includes(q)
        }
        searchPlaceholder="Search by English or Kannada name..."
        pageSize={12}
        emptyMessage="No stops found. Click 'Add Stop' to create one."
      />

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface rounded-card border border-line shadow-float p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-extrabold text-ink font-heading flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cobalt" />
                {editingStop ? `Edit Stop: ${editingStop.name_en}` : 'Create New Bus Stop'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-text-secondary hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {formError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-input text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    English Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Chennamma Circle"
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Kannada Name (ಕನ್ನಡ ಹೆಸರು)
                  </label>
                  <input
                    type="text"
                    value={formData.name_kn}
                    onChange={(e) => setFormData({ ...formData, name_kn: e.target.value })}
                    placeholder="e.g. ಚೆನ್ನಮ್ಮ ವೃತ್ತ"
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Latitude <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.lat}
                    onChange={(e) =>
                      setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Longitude <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.lng}
                    onChange={(e) =>
                      setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
                  />
                </div>
              </div>

              {/* Map Picker */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Location Picker <span className="text-text-secondary font-normal">(Click anywhere on map or drag pin to adjust)</span>
                </label>
                <div className="h-60 rounded-input overflow-hidden border border-line relative">
                  <MapContainer
                    center={[formData.lat, formData.lng]}
                    zoom={14}
                    className="w-full h-full"
                    attributionControl={false}
                  >
                    <TileLayer url={TILE_URL} />
                    <MapClickHandler onLocationChange={handleLocationChange} />
                    <MapUpdater center={[formData.lat, formData.lng]} />
                    <Marker
                      position={[formData.lat, formData.lng]}
                      icon={pinIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend(e) {
                          const latlng = e.target.getLatLng()
                          handleLocationChange(latlng.lat, latlng.lng)
                        },
                      }}
                    />
                  </MapContainer>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeStop"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-line text-cobalt focus:ring-cobalt w-4 h-4 cursor-pointer"
                />
                <label htmlFor="activeStop" className="text-xs font-semibold text-ink cursor-pointer">
                  Stop is actively serviced by transit routes
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-input text-xs font-bold text-ink hover:bg-page transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingStop ? 'Update Stop' : 'Create Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Dependency Block Dialog */}
      {deleteDialog.isOpen && (
        deleteDialog.blockers.length > 0 ? (
          <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface rounded-card border border-line p-6 shadow-float space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-ink font-heading">Cannot Delete Stop</h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                This stop is currently used by the following transit routes. To maintain timetable and route integrity, remove the stop from these routes first:
              </p>

              <div className="p-3 bg-page border border-line rounded-input space-y-1 max-h-32 overflow-y-auto">
                {deleteDialog.blockers.map((code) => (
                  <div key={code} className="text-xs font-bold text-cobalt flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
                    <span>Route {code}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, stop: null, blockers: [] })}
                className="w-full py-2.5 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition"
              >
                Understood
              </button>
            </div>
          </div>
        ) : (
          <ConfirmDialog
            isOpen={true}
            title="Delete Stop"
            message={`Are you sure you want to permanently delete "${deleteDialog.stop?.name_en}"? This action cannot be undone.`}
            confirmLabel="Delete Stop"
            variant="danger"
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteDialog({ isOpen: false, stop: null, blockers: [] })}
          />
        )
      )}
    </div>
  )
}
