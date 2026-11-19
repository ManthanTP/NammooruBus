import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Route as RouteIcon, Plus, Edit2, Trash2, RefreshCw, ArrowLeftRight, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import RouteBadge from '@/components/ui/RouteBadge'

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, route: null })

  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      // Fetch routes joined with route_stops count
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          route_stops (count)
        `)
        .order('code', { ascending: true })

      if (error) throw error

      const formatted = (data || []).map((r) => ({
        ...r,
        stops_count: r.route_stops?.[0]?.count || 0,
      }))

      setRoutes(formatted)
    } catch (err) {
      addToast({ message: `Failed to load routes: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  const handleConfirmDelete = async () => {
    const route = deleteDialog.route
    if (!route) return

    try {
      const { error } = await supabase.from('routes').delete().eq('id', route.id)
      if (error) throw error

      addToast({ message: `Deleted route ${route.code}`, type: 'success' })
      setDeleteDialog({ isOpen: false, route: null })
      fetchRoutes()
    } catch (err) {
      addToast({ message: `Failed to delete route: ${err.message}`, type: 'error' })
    }
  }

  const columns = [
    {
      key: 'code',
      label: 'Badge / Code',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <RouteBadge code={val} color={row.color} size="sm" />
          <span className="font-mono font-bold text-xs text-ink">{val}</span>
        </div>
      ),
    },
    {
      key: 'name_en',
      label: 'Route Title',
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
      key: 'stops_count',
      label: 'Stops',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-xs text-ink">
          {val} {val === 1 ? 'stop' : 'stops'}
        </span>
      ),
    },
    {
      key: 'two_way',
      label: 'Direction',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
          {val ? (
            <>
              <ArrowLeftRight className="w-3.5 h-3.5 text-cobalt" />
              <span>Two-way</span>
            </>
          ) : (
            <>
              <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
              <span>One-way</span>
            </>
          )}
        </div>
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
          <Link
            to={`/12345678/admin/routes/${row.id}`}
            className="p-1.5 hover:bg-cobalt-tint text-cobalt rounded-input transition"
            title="Edit Route"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteDialog({ isOpen: true, route: row })}
            className="p-1.5 hover:bg-danger/10 text-danger rounded-input transition"
            title="Delete Route"
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
            <RouteIcon className="w-5 h-5 text-cobalt" />
            Transit Routes
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure line codes, terminal destinations, bidirectional operations, and stop sequences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRoutes}
            className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/12345678/admin/routes/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-cobalt text-white text-xs font-bold rounded-input shadow-soft hover:bg-cobalt/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Route</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={routes}
        searchKey={(row, q) =>
          row.code?.toLowerCase().includes(q) ||
          row.name_en?.toLowerCase().includes(q) ||
          row.name_kn?.toLowerCase().includes(q)
        }
        searchPlaceholder="Search routes by code or name..."
        pageSize={10}
        emptyMessage="No routes configured yet. Click 'Add Route' to create one."
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Transit Route"
        message={`Are you sure you want to permanently delete route "${deleteDialog.route?.code} - ${deleteDialog.route?.name_en}"? Associated route stops and schedules will also be removed.`}
        confirmLabel="Delete Route"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, route: null })}
      />
    </div>
  )
}
