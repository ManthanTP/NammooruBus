import { useState, useEffect } from 'react'
import { Users, Shield, Bus, User, RefreshCw, AlertCircle, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState([])
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('passenger')
  const [selectedBusId, setSelectedBusId] = useState('')
  const [saving, setSaving] = useState(false)

  const { user: currentUser } = useAuthStore()
  const { addToast } = useToastStore()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: profs, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: false })

      if (error) throw error

      const { data: driversData } = await supabase
        .from('drivers')
        .select('*, bus:buses(*)')

      const { data: busList } = await supabase
        .from('buses')
        .select('*')
        .order('reg_no')

      setBuses(busList || [])

      const driverMap = {}
      ;(driversData || []).forEach((d) => {
        driverMap[d.profile_id] = d
      })

      const joined = (profs || []).map((p) => ({
        ...p,
        driver: driverMap[p.id] || null,
      }))

      setProfiles(joined)
    } catch (err) {
      addToast({ message: `Failed to load users: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setSelectedRole(user.role || 'passenger')
    setSelectedBusId(user.driver?.bus_id || '')
    setModalOpen(true)
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    if (!editingUser) return

    if (editingUser.id === currentUser?.id && selectedRole !== 'admin') {
      addToast({
        message: 'You cannot revoke your own administrator privileges.',
        type: 'error',
      })
      return
    }

    setSaving(true)
    try {
      // 1. Update profiles.role
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', editingUser.id)

      if (profileErr) throw profileErr

      // 2. If driver role, update or insert driver and assigned bus
      if (selectedRole === 'driver') {
        const { data: existingD } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', editingUser.id)
          .maybeSingle()

        if (existingD) {
          await supabase
            .from('drivers')
            .update({ bus_id: selectedBusId || null })
            .eq('id', existingD.id)
        } else {
          await supabase
            .from('drivers')
            .insert({ profile_id: editingUser.id, bus_id: selectedBusId || null })
        }
      }

      addToast({
        message: `Updated role for ${editingUser.full_name || 'user'} to ${selectedRole}`,
        type: 'success',
      })
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      addToast({ message: `Error updating role: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning border border-warning/30">
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </span>
        )
      case 'driver':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cobalt-tint text-cobalt border border-cobalt/30">
            <Bus className="w-3 h-3" />
            <span>Driver</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-line text-text-secondary">
            <User className="w-3 h-3" />
            <span>Passenger</span>
          </span>
        )
    }
  }

  const columns = [
    {
      key: 'full_name',
      label: 'Full Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink">{val || 'Anonymous User'}</span>
          {row.id === currentUser?.id && (
            <span className="ml-2 text-[10px] bg-cobalt text-white px-1.5 py-0.5 rounded font-bold">
              You
            </span>
          )}
          <span className="block text-[10px] font-mono text-text-secondary truncate max-w-xs">
            {row.id}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (val) => getRoleBadge(val),
    },
    {
      key: 'assigned_bus',
      label: 'Assigned Bus',
      sortable: false,
      render: (_, row) =>
        row.role === 'driver' ? (
          <span className="font-mono text-xs font-bold text-ink">
            {row.driver?.bus?.reg_no || (
              <span className="text-text-secondary font-normal italic">Unassigned</span>
            )}
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
    {
      key: 'lang',
      label: 'Language',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-xs text-text-secondary uppercase">
          {val === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English (EN)'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Role Permissions',
      sortable: false,
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleOpenEdit(row)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-cobalt hover:bg-cobalt-tint rounded-input transition"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Change Role</span>
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
            <Users className="w-5 h-5 text-cobalt" />
            Users & Access Control
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage user accounts, assign driver privileges, and delegate administrator security roles.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-cobalt-tint border border-cobalt/20 rounded-pill text-[11px] font-semibold text-cobalt">
            <span>Note: Driver key is set in Supabase (see README)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={profiles}
        searchKey={(row, q) =>
          row.full_name?.toLowerCase().includes(q) ||
          row.role?.toLowerCase().includes(q) ||
          row.id?.toLowerCase().includes(q)
        }
        searchPlaceholder="Search users by name, role, or user ID..."
        pageSize={12}
        emptyMessage="No user profiles found."
      />

      {/* Role Change Modal */}
      {modalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface rounded-card border border-line shadow-float p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-extrabold text-ink font-heading">
                Change Role: {editingUser.full_name || 'User'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-text-secondary hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink">
                  Select User Privilege Level:
                </label>

                {/* Passenger */}
                <label
                  className={`p-3 rounded-input border flex items-center gap-3 cursor-pointer transition ${
                    selectedRole === 'passenger'
                      ? 'border-cobalt bg-cobalt-tint/30'
                      : 'border-line hover:bg-page'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="passenger"
                    checked={selectedRole === 'passenger'}
                    onChange={() => setSelectedRole('passenger')}
                    className="text-cobalt focus:ring-cobalt"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Passenger</span>
                    <span className="text-[11px] text-text-secondary block">
                      Standard transit search, live map tracking, and feedback.
                    </span>
                  </div>
                </label>

                {/* Driver */}
                <label
                  className={`p-3 rounded-input border flex items-center gap-3 cursor-pointer transition ${
                    selectedRole === 'driver'
                      ? 'border-cobalt bg-cobalt-tint/30'
                      : 'border-line hover:bg-page'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="driver"
                    checked={selectedRole === 'driver'}
                    onChange={() => setSelectedRole('driver')}
                    className="text-cobalt focus:ring-cobalt"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Driver</span>
                    <span className="text-[11px] text-text-secondary block">
                      Access to Driver Portal and real-time GPS telemetry broadcast.
                    </span>
                  </div>
                </label>

                {/* Admin */}
                <label
                  className={`p-3 rounded-input border flex items-center gap-3 cursor-pointer transition ${
                    selectedRole === 'admin'
                      ? 'border-warning bg-warning/10'
                      : 'border-line hover:bg-page'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={selectedRole === 'admin'}
                    onChange={() => setSelectedRole('admin')}
                    className="text-warning focus:ring-warning"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Administrator</span>
                    <span className="text-[11px] text-text-secondary block">
                      Full administrative access to routes, schedules, fares, and system control.
                    </span>
                  </div>
                </label>
              </div>

              {/* Driver Bus Assignment (Problem 5.5) */}
              {selectedRole === 'driver' && (
                <div className="pt-2 border-t border-line space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-ink">
                    Assigned Vehicle (Bus):
                  </label>
                  <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono font-bold text-ink focus:outline-none focus:border-cobalt"
                  >
                    <option value="">(No bus assigned / Clear)</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.reg_no}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-text-secondary">
                    Binds this driver to the chosen bus for all shifts and live tracking.
                  </p>
                </div>
              )}

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
                  {saving ? 'Saving...' : 'Apply Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
