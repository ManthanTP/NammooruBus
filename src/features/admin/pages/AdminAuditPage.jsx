import { useState, useEffect } from 'react'
import { History, Shield, RefreshCw, Filter, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const { addToast } = useToastStore()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      addToast({ message: `Failed to load audit trail: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((l) => {
    if (entityFilter !== 'all' && l.entity !== entityFilter) return false
    if (actionFilter !== 'all' && l.action !== actionFilter) return false
    return true
  })

  const getActionBadge = (action) => {
    switch (action) {
      case 'INSERT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success">
            INSERT
          </span>
        )
      case 'UPDATE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cobalt-tint text-cobalt">
            UPDATE
          </span>
        )
      case 'DELETE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger">
            DELETE
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-line text-text-secondary">
            {action}
          </span>
        )
    }
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-text-secondary">
          {new Date(val).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Database Operation',
      sortable: true,
      render: (val) => getActionBadge(val),
    },
    {
      key: 'entity',
      label: 'Target Entity / Table',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-ink uppercase">
          {val}
        </span>
      ),
    },
    {
      key: 'entity_id',
      label: 'Entity Record ID',
      sortable: false,
      render: (val) => (
        <span className="font-mono text-[11px] text-text-secondary truncate max-w-xs block">
          {val || 'N/A'}
        </span>
      ),
    },
    {
      key: 'actor_id',
      label: 'Actor (User ID)',
      sortable: false,
      render: (val) => (
        <span className="font-mono text-[11px] text-text-secondary truncate max-w-xs block">
          {val || 'System Trigger'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <History className="w-5 h-5 text-cobalt" />
            Security & Data Audit Logs
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Immutable database trigger audit trail recording changes to stops, routes, fares, alerts, and roles.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-3 rounded-card border border-line shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
          >
            <option value="all">All Tables</option>
            <option value="stops">stops</option>
            <option value="routes">routes</option>
            <option value="fare_config">fare_config</option>
            <option value="alerts">alerts</option>
            <option value="profiles">profiles</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
          >
            <option value="all">All Actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        searchKey={(row, q) =>
          row.entity?.toLowerCase().includes(q) ||
          row.action?.toLowerCase().includes(q) ||
          row.entity_id?.toLowerCase().includes(q) ||
          row.actor_id?.toLowerCase().includes(q)
        }
        searchPlaceholder="Search audit records by table name, action, or ID..."
        pageSize={15}
        emptyMessage="No audit logs recorded yet."
      />
    </div>
  )
}
