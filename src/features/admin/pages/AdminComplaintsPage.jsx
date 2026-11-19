import { useState, useEffect } from 'react'
import { MessageSquare, Star, CheckCircle2, Clock, AlertCircle, RefreshCw, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/components/ui/Toast'
import DataTable from '../components/DataTable'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'delay', label: 'Bus Delay / Punctuality' },
  { value: 'behaviour', label: 'Crew Behaviour' },
  { value: 'cleanliness', label: 'Vehicle Cleanliness' },
  { value: 'safety', label: 'Safety / Rash Driving' },
  { value: 'other', label: 'Other' },
]

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('all')

  // Review Drawer / Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [newStatus, setNewStatus] = useState('open')
  const [saving, setSaving] = useState(false)

  const { addToast } = useToastStore()

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const { data: routesData } = await supabase.from('routes').select('id, code, name_en').order('code')
      setRoutes(routesData || [])

      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles (id, full_name),
          routes (id, code, name_en)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComplaints(data || [])
    } catch (err) {
      addToast({ message: `Failed to load complaints: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const handleOpenReview = (complaint) => {
    setSelectedComplaint(complaint)
    setReplyText(complaint.admin_reply || '')
    setNewStatus(complaint.status || 'open')
  }

  const handleSaveReply = async (e) => {
    e.preventDefault()
    if (!selectedComplaint) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: newStatus,
          admin_reply: replyText.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedComplaint.id)

      if (error) throw error

      addToast({ message: 'Complaint status and response updated.', type: 'success' })
      setSelectedComplaint(null)
      fetchComplaints()
    } catch (err) {
      addToast({ message: `Failed to update complaint: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const filteredData = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false
    if (routeFilter !== 'all' && c.route_id !== routeFilter) return false
    return true
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/15 text-success">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning">
            <Clock className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-danger/15 text-danger">
            <AlertCircle className="w-3 h-3" />
            <span>Open</span>
          </span>
        )
    }
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Submitted Date',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-text-secondary">
          {new Date(val).toLocaleDateString()} {new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-xs text-ink capitalize">
          {val}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-0.5 text-warning text-xs">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < (val || 0) ? 'fill-warning text-warning' : 'text-line'
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'user',
      label: 'Passenger',
      sortable: false,
      render: (_, row) => (
        <span className="font-semibold text-xs text-ink">
          {row.profiles?.full_name || 'Passenger'}
        </span>
      ),
    },
    {
      key: 'route',
      label: 'Route',
      sortable: false,
      render: (_, row) =>
        row.routes ? (
          <span className="font-mono font-bold text-xs text-cobalt">
            Route {row.routes.code}
          </span>
        ) : (
          <span className="text-xs text-text-secondary italic">General</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => getStatusBadge(val),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleOpenReview(row)}
          className="px-3 py-1 bg-cobalt-tint text-cobalt hover:bg-cobalt/20 rounded-input text-xs font-bold transition"
        >
          Review & Reply
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
            <MessageSquare className="w-5 h-5 text-cobalt" />
            Passenger Complaints & Feedback
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Review service reports, ratings, driver complaints, and dispatch official administrator replies.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchComplaints}
          className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-3 rounded-card border border-line shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">Route:</span>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
          >
            <option value="all">All Routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                Route {r.code} ({r.name_en})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey={(row, q) =>
          row.message?.toLowerCase().includes(q) ||
          row.profiles?.full_name?.toLowerCase().includes(q) ||
          row.routes?.code?.toLowerCase().includes(q)
        }
        searchPlaceholder="Search complaints by message text, passenger, or route..."
        pageSize={10}
        emptyMessage="No passenger complaints matching the current criteria."
      />

      {/* Review Drawer / Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface rounded-card border border-line shadow-float p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-extrabold text-ink font-heading flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cobalt" />
                Review Complaint #{selectedComplaint.id.slice(0, 8)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="text-text-secondary hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Complaint details */}
            <div className="p-4 bg-page border border-line rounded-input space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink">
                  {selectedComplaint.profiles?.full_name || 'Passenger'}
                </span>
                <span className="text-text-secondary font-mono">
                  {new Date(selectedComplaint.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="capitalize font-bold text-cobalt bg-cobalt-tint px-2 py-0.5 rounded-full">
                  {selectedComplaint.category}
                </span>
                {selectedComplaint.routes && (
                  <span className="font-semibold text-text-secondary">
                    Route {selectedComplaint.routes.code}
                  </span>
                )}
                {selectedComplaint.rating && (
                  <span className="font-bold text-warning">
                    ★ {selectedComplaint.rating} / 5
                  </span>
                )}
              </div>

              <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                "{selectedComplaint.message}"
              </p>
            </div>

            {/* Resolution Form */}
            <form onSubmit={handleSaveReply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Update Resolution Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
                >
                  <option value="open">Open (Under Review)</option>
                  <option value="in_progress">In Progress (Investigating)</option>
                  <option value="resolved">Resolved (Closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Official Administrative Reply (Visible to passenger)
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Explain actions taken or respond to the passenger..."
                  className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 border border-line rounded-input text-xs font-bold text-ink hover:bg-page transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft hover:bg-cobalt/90 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
