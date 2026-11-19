import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Clock, AlertTriangle, Info, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info',
    route_ids: [],
    expires_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, alert: null })

  const { user } = useAuthStore()
  const { addToast } = useToastStore()

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const { data: routesData } = await supabase.from('routes').select('id, code, name_en')
      setRoutes(routesData || [])

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('starts_at', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (err) {
      addToast({ message: `Failed to load alerts: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleCreateAlert = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim() || null,
        type: form.type,
        route_ids: form.route_ids,
        starts_at: new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        created_by: user?.id || null,
      }

      const { error } = await supabase.from('alerts').insert(payload)
      if (error) throw error

      addToast({ message: 'Service alert published to all active riders.', type: 'success' })
      setModalOpen(false)
      setForm({ title: '', body: '', type: 'info', route_ids: [], expires_at: '' })
      fetchAlerts()
    } catch (err) {
      addToast({ message: `Failed to publish alert: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleExpireNow = async (alert) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', alert.id)

      if (error) throw error
      addToast({ message: `Expired alert: ${alert.title}`, type: 'info' })
      fetchAlerts()
    } catch (err) {
      addToast({ message: `Error expiring alert: ${err.message}`, type: 'error' })
    }
  }

  const handleDelete = async () => {
    const alert = deleteDialog.alert
    if (!alert) return

    try {
      const { error } = await supabase.from('alerts').delete().eq('id', alert.id)
      if (error) throw error

      addToast({ message: 'Alert deleted.', type: 'success' })
      setDeleteDialog({ isOpen: false, alert: null })
      fetchAlerts()
    } catch (err) {
      addToast({ message: `Failed to delete alert: ${err.message}`, type: 'error' })
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-danger/15 text-danger">
            <XCircle className="w-3 h-3" />
            <span>Cancellation</span>
          </span>
        )
      case 'diversion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning">
            <AlertTriangle className="w-3 h-3" />
            <span>Diversion</span>
          </span>
        )
      case 'delay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning">
            <Clock className="w-3 h-3" />
            <span>Heavy Delay</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cobalt-tint text-cobalt">
            <Info className="w-3 h-3" />
            <span>Notice</span>
          </span>
        )
    }
  }

  const columns = [
    {
      key: 'title',
      label: 'Alert Title & Description',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink block">{val}</span>
          {row.body && (
            <span className="text-[11px] text-text-secondary line-clamp-1">{row.body}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (val) => getTypeBadge(val),
    },
    {
      key: 'routes',
      label: 'Applies To',
      sortable: false,
      render: (_, row) => {
        if (!row.route_ids || row.route_ids.length === 0) {
          return <span className="font-bold text-xs text-ink">All Routes (System-wide)</span>
        }
        return (
          <span className="font-semibold text-xs text-cobalt">
            {row.route_ids.length} specific routes
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'Broadcast Status',
      sortable: false,
      render: (_, row) => {
        const isExpired = row.expires_at && new Date(row.expires_at) <= new Date()
        return isExpired ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-line text-text-secondary">
            Expired
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success animate-pulse">
            Broadcasting
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => {
        const isExpired = row.expires_at && new Date(row.expires_at) <= new Date()
        return (
          <div className="flex items-center gap-2">
            {!isExpired && (
              <button
                type="button"
                onClick={() => handleExpireNow(row)}
                className="px-2.5 py-1 text-xs font-bold text-warning hover:bg-warning/10 rounded-input transition"
                title="Expire immediately"
              >
                Expire Now
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteDialog({ isOpen: true, alert: row })}
              className="p-1.5 hover:bg-danger/10 text-danger rounded-input transition"
              title="Delete Alert"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <Bell className="w-5 h-5 text-cobalt" />
            Service Alerts & Disruption Broadcast
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Broadcast emergency alerts, road diversions, holiday schedules, and service interruptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAlerts}
            className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={alerts}
        searchKey={(row, q) =>
          row.title?.toLowerCase().includes(q) ||
          row.body?.toLowerCase().includes(q)
        }
        searchPlaceholder="Search alerts..."
        pageSize={10}
        emptyMessage="No service alerts recorded."
      />

      {/* Create Alert Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface rounded-card border border-line shadow-float p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-extrabold text-ink font-heading flex items-center gap-2">
                <Bell className="w-4 h-4 text-cobalt" />
                Publish Service Disruption Alert
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-text-secondary hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Alert Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Traffic Diversion near Railway Station"
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Alert Details / Passenger Instructions
                </label>
                <textarea
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Detailed information regarding alternative stops or expected delays..."
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Severity Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                  >
                    <option value="info">Notice / Advisory</option>
                    <option value="delay">Service Delay</option>
                    <option value="diversion">Route Diversion</option>
                    <option value="cancel">Trip Cancellation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Auto-Expiry Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Target Routes <span className="text-text-secondary font-normal">(Leave empty for all network routes)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-page border border-line rounded-input max-h-28 overflow-y-auto">
                  {routes.map((r) => {
                    const isSelected = form.route_ids.includes(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            route_ids: isSelected
                              ? prev.route_ids.filter((id) => id !== r.id)
                              : [...prev.route_ids, r.id],
                          }))
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cobalt text-white border-cobalt'
                            : 'bg-surface text-ink border-line hover:border-text-secondary'
                        }`}
                      >
                        <span>Route {r.code}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

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
                  {saving ? 'Publishing...' : 'Publish Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Service Alert"
        message={`Are you sure you want to permanently delete "${deleteDialog.alert?.title}"?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, alert: null })}
      />
    </div>
  )
}
