import { useState, useEffect } from 'react'
import { Bus, UserCheck, Plus, Edit2, Trash2, RefreshCw, AlertCircle, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import RouteBadge from '@/components/ui/RouteBadge'

export default function AdminFleetPage() {
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  // Tabs: 'buses' | 'drivers'
  const [activeTab, setActiveTab] = useState('buses')

  // Bus Modal
  const [busModalOpen, setBusModalOpen] = useState(false)
  const [editingBus, setEditingBus] = useState(null)
  const [busForm, setBusForm] = useState({ reg_no: '', route_id: '', active: true })
  const [deleteBusDialog, setDeleteBusDialog] = useState({ isOpen: false, bus: null })

  // Driver Assignment Modal
  const [driverModalOpen, setDriverModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [driverForm, setDriverForm] = useState({ bus_id: '', phone: '' })

  const [saving, setSaving] = useState(false)
  const { addToast } = useToastStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch routes for mapping dropdowns
      const { data: routesData } = await supabase
        .from('routes')
        .select('id, code, name_en, color')
        .order('code')
      setRoutes(routesData || [])

      // 2. Fetch buses with joined routes
      const { data: busesData, error: busesErr } = await supabase
        .from('buses')
        .select('*, routes(id, code, name_en, color)')
        .order('reg_no')
      if (busesErr) throw busesErr
      setBuses(busesData || [])

      // 3. Fetch drivers with joined profiles and buses
      const { data: driversData, error: driversErr } = await supabase
        .from('drivers')
        .select(`
          id,
          profile_id,
          bus_id,
          phone,
          profiles (id, full_name),
          buses (id, reg_no)
        `)
      if (driversErr) throw driversErr
      setDrivers(driversData || [])
    } catch (err) {
      addToast({ message: `Failed to load fleet data: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Bus Handlers
  const handleOpenAddBus = () => {
    setEditingBus(null)
    setBusForm({ reg_no: '', route_id: '', active: true })
    setBusModalOpen(true)
  }

  const handleOpenEditBus = (bus) => {
    setEditingBus(bus)
    setBusForm({
      reg_no: bus.reg_no,
      route_id: bus.route_id || '',
      active: bus.active ?? true,
    })
    setBusModalOpen(true)
  }

  const handleSaveBus = async (e) => {
    e.preventDefault()
    if (!busForm.reg_no.trim()) return

    setSaving(true)
    try {
      const payload = {
        reg_no: busForm.reg_no.trim().toUpperCase(),
        route_id: busForm.route_id || null,
        active: busForm.active,
      }

      if (editingBus) {
        const { error } = await supabase.from('buses').update(payload).eq('id', editingBus.id)
        if (error) throw error
        addToast({ message: `Updated bus ${payload.reg_no}`, type: 'success' })
      } else {
        const { error } = await supabase.from('buses').insert(payload)
        if (error) throw error
        addToast({ message: `Registered bus ${payload.reg_no}`, type: 'success' })
      }

      setBusModalOpen(false)
      fetchData()
    } catch (err) {
      addToast({ message: `Error saving bus: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBus = async () => {
    const bus = deleteBusDialog.bus
    if (!bus) return

    try {
      const { error } = await supabase.from('buses').delete().eq('id', bus.id)
      if (error) throw error
      addToast({ message: `Deleted bus ${bus.reg_no}`, type: 'success' })
      setDeleteBusDialog({ isOpen: false, bus: null })
      fetchData()
    } catch (err) {
      addToast({ message: `Failed to delete bus: ${err.message}`, type: 'error' })
    }
  }

  // Driver Assignment Handlers
  const handleOpenEditDriver = (driver) => {
    setEditingDriver(driver)
    setDriverForm({
      bus_id: driver.bus_id || '',
      phone: driver.phone || '',
    })
    setDriverModalOpen(true)
  }

  const handleSaveDriver = async (e) => {
    e.preventDefault()
    if (!editingDriver) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          bus_id: driverForm.bus_id || null,
          phone: driverForm.phone.trim() || null,
        })
        .eq('id', editingDriver.id)

      if (error) throw error

      addToast({
        message: `Updated driver details for ${editingDriver.profiles?.full_name}`,
        type: 'success',
      })
      setDriverModalOpen(false)
      fetchData()
    } catch (err) {
      addToast({ message: `Error updating driver: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const busColumns = [
    {
      key: 'reg_no',
      label: 'Vehicle Reg Number',
      sortable: true,
      render: (val) => <span className="font-mono font-bold text-ink">{val}</span>,
    },
    {
      key: 'route',
      label: 'Assigned Route',
      sortable: false,
      render: (_, row) =>
        row.routes ? (
          <div className="flex items-center gap-2">
            <RouteBadge code={row.routes.code} color={row.routes.color} size="sm" />
            <span className="text-xs font-semibold text-ink">{row.routes.name_en}</span>
          </div>
        ) : (
          <span className="text-xs text-text-secondary italic">Unassigned (Spare)</span>
        ),
    },
    {
      key: 'active',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
            val ? 'bg-success/15 text-success' : 'bg-line text-text-secondary'
          }`}
        >
          {val ? 'In Service' : 'Decommissioned'}
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
            onClick={() => handleOpenEditBus(row)}
            className="p-1.5 hover:bg-cobalt-tint text-cobalt rounded-input transition"
            title="Edit Bus"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteBusDialog({ isOpen: true, bus: row })}
            className="p-1.5 hover:bg-danger/10 text-danger rounded-input transition"
            title="Delete Bus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  const driverColumns = [
    {
      key: 'driver_name',
      label: 'Driver Name',
      sortable: true,
      render: (_, row) => (
        <span className="font-bold text-ink">
          {row.profiles?.full_name || 'Unnamed Driver'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Contact Phone',
      sortable: false,
      render: (val) => (
        <span className="font-mono text-xs text-text-secondary">
          {val || 'Not provided'}
        </span>
      ),
    },
    {
      key: 'bus',
      label: 'Assigned Vehicle',
      sortable: false,
      render: (_, row) =>
        row.buses ? (
          <span className="font-mono font-bold text-cobalt bg-cobalt-tint px-2.5 py-0.5 rounded-full text-xs">
            {row.buses.reg_no}
          </span>
        ) : (
          <span className="text-xs text-text-secondary italic">No vehicle assigned</span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleOpenEditDriver(row)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-cobalt hover:bg-cobalt-tint rounded-input transition"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Assign Vehicle</span>
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <Bus className="w-5 h-5 text-cobalt" />
            Fleet & Driver Operations
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage public bus vehicles, route allocations, driver profiles, and vehicle assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'buses' && (
            <button
              type="button"
              onClick={handleOpenAddBus}
              className="flex items-center gap-1.5 px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register Bus</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('buses')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'buses'
              ? 'border-cobalt text-cobalt'
              : 'border-transparent text-text-secondary hover:text-ink'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Buses Registry ({buses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('drivers')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'drivers'
              ? 'border-cobalt text-cobalt'
              : 'border-transparent text-text-secondary hover:text-ink'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Drivers Registry ({drivers.length})</span>
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'buses' ? (
        <DataTable
          columns={busColumns}
          data={buses}
          searchKey={(row, q) =>
            row.reg_no?.toLowerCase().includes(q) ||
            row.routes?.code?.toLowerCase().includes(q) ||
            row.routes?.name_en?.toLowerCase().includes(q)
          }
          searchPlaceholder="Search buses by registration number or route..."
          pageSize={10}
          emptyMessage="No buses registered. Click 'Register Bus' to add one."
        />
      ) : (
        <DataTable
          columns={driverColumns}
          data={drivers}
          searchKey={(row, q) =>
            row.profiles?.full_name?.toLowerCase().includes(q) ||
            row.buses?.reg_no?.toLowerCase().includes(q) ||
            row.phone?.toLowerCase().includes(q)
          }
          searchPlaceholder="Search drivers by name or registration number..."
          pageSize={10}
          emptyMessage="No drivers registered. Promote a user to 'Driver' in the Users page."
        />
      )}

      {/* Add / Edit Bus Modal */}
      {busModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-card border border-line shadow-float p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-extrabold text-ink font-heading flex items-center gap-2">
                <Bus className="w-4 h-4 text-cobalt" />
                {editingBus ? `Edit Bus: ${editingBus.reg_no}` : 'Register New Bus'}
              </h3>
              <button
                type="button"
                onClick={() => setBusModalOpen(false)}
                className="text-text-secondary hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Registration Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={busForm.reg_no}
                  onChange={(e) => setBusForm({ ...busForm, reg_no: e.target.value })}
                  placeholder="e.g. KA-25-F-1024"
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono font-bold uppercase text-ink focus:outline-none focus:border-cobalt"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Assigned Route
                </label>
                <select
                  value={busForm.route_id}
                  onChange={(e) => setBusForm({ ...busForm, route_id: e.target.value })}
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                >
                  <option value="">-- Unassigned (Spare Bus) --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Route {r.code} - {r.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="busActive"
                  checked={busForm.active}
                  onChange={(e) => setBusForm({ ...busForm, active: e.target.checked })}
                  className="rounded border-line text-cobalt focus:ring-cobalt w-4 h-4 cursor-pointer"
                />
                <label htmlFor="busActive" className="text-xs font-semibold text-ink cursor-pointer">
                  Vehicle is active and available for dispatch
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setBusModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-input text-xs font-bold text-ink hover:bg-page transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBus ? 'Update Bus' : 'Save Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Assignment Modal */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-card border border-line shadow-float p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-extrabold text-ink font-heading flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cobalt" />
                Assign Vehicle: {editingDriver?.profiles?.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setDriverModalOpen(false)}
                className="text-text-secondary hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Assigned Bus Vehicle
                </label>
                <select
                  value={driverForm.bus_id}
                  onChange={(e) => setDriverForm({ ...driverForm, bus_id: e.target.value })}
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                >
                  <option value="">-- No Vehicle Assigned --</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reg_no} {b.routes ? `(Route ${b.routes.code})` : '(Spare)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono text-ink focus:outline-none focus:border-cobalt"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setDriverModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-input text-xs font-bold text-ink hover:bg-page transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bus Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteBusDialog.isOpen}
        title="Delete Vehicle"
        message={`Are you sure you want to delete bus "${deleteBusDialog.bus?.reg_no}"? Any active assignments or trips for this bus will be unlinked.`}
        confirmLabel="Delete Bus"
        variant="danger"
        onConfirm={handleDeleteBus}
        onCancel={() => setDeleteBusDialog({ isOpen: false, bus: null })}
      />
    </div>
  )
}
