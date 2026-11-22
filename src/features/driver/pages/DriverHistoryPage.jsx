import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Download,
  Printer,
  Bus,
  FileSpreadsheet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import RouteBadge from '@/components/ui/RouteBadge'
import StatTile from '@/components/ui/StatTile'
import SegmentedControl from '@/components/ui/SegmentedControl'

export default function DriverHistoryPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()

  const [driverRow, setDriverRow] = useState(null)
  const [rangeType, setRangeType] = useState('7d') // '7d' | '30d' | 'custom'
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [customTo, setCustomTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [dailyReport, setDailyReport] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  // Calculate Date bounds
  const { fromIso, toIso } = useMemo(() => {
    const now = new Date()
    let from = new Date()
    if (rangeType === '7d') {
      from.setDate(now.getDate() - 7)
    } else if (rangeType === '30d') {
      from.setDate(now.getDate() - 30)
    } else if (rangeType === 'custom') {
      from = new Date(customFrom || now)
      from.setHours(0, 0, 0, 0)
      const to = new Date(customTo || now)
      to.setHours(23, 59, 59, 999)
      return { fromIso: from.toISOString(), toIso: to.toISOString() }
    }
    from.setHours(0, 0, 0, 0)
    return { fromIso: from.toISOString(), toIso: now.toISOString() }
  }, [rangeType, customFrom, customTo])

  // Fetch driver record and data
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. Get driver record with assigned bus
        const { data: dRow } = await supabase
          .from('drivers')
          .select('*, bus:buses(*)')
          .eq('profile_id', user.id)
          .maybeSingle()

        setDriverRow(dRow)

        if (dRow?.id) {
          // 2. Fetch daily report from RPC driver_report
          const { data: reportData, error: reportErr } = await supabase.rpc('driver_report', {
            p_from: fromIso,
            p_to: toIso,
          })
          if (!reportErr && reportData) {
            setDailyReport(reportData)
          } else {
            setDailyReport([])
          }

          // 3. Fetch detailed trips
          const { data: tripsData, error: tripsErr } = await supabase
            .from('trips')
            .select('*, route:routes(*), bus:buses(*)')
            .eq('driver_id', dRow.id)
            .gte('started_at', fromIso)
            .lte('started_at', toIso)
            .order('started_at', { ascending: false })

          if (!tripsErr && tripsData) {
            setTrips(tripsData)
          } else {
            setTrips([])
          }
        }
      } catch (err) {
        console.warn('Error loading driver history:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, fromIso, toIso])

  // Aggregate metrics
  const summary = useMemo(() => {
    const totalTrips = trips.length
    let totalMinutes = 0
    let delayedCount = 0
    let breakdownCount = 0

    trips.forEach((t) => {
      if (t.started_at) {
        const start = new Date(t.started_at).getTime()
        const end = t.ended_at ? new Date(t.ended_at).getTime() : Date.now()
        totalMinutes += Math.max(1, Math.round((end - start) / 60000))
      }
      if (t.status === 'delayed') delayedCount++
      if (t.status === 'breakdown') breakdownCount++
    })

    const totalHours = (totalMinutes / 60).toFixed(1)

    return { totalTrips, totalMinutes, totalHours, delayedCount, breakdownCount }
  }, [trips])

  const formatDuration = (started, ended) => {
    if (!started) return '--'
    const startMs = new Date(started).getTime()
    const endMs = ended ? new Date(ended).getTime() : Date.now()
    const mins = Math.max(1, Math.round((endMs - startMs) / 60000))
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${h}h ${m}m`
    }
    return `${mins} min`
  }

  // Client-side CSV Download
  const handleDownloadCsv = () => {
    if (trips.length === 0) return

    const headers = [
      'Trip ID',
      'Route Code',
      'Route Title',
      'Direction',
      'Bus Number',
      'Status',
      'Started At',
      'Ended At',
      'Duration (min)',
      'Crowd Level',
    ]

    const rows = trips.map((t) => {
      const startMs = t.started_at ? new Date(t.started_at).getTime() : null
      const endMs = t.ended_at ? new Date(t.ended_at).getTime() : Date.now()
      const durMin = startMs ? Math.max(1, Math.round((endMs - startMs) / 60000)) : 0

      return [
        `"${t.id}"`,
        `"${t.route?.code || ''}"`,
        `"${(t.route?.name_en || '').replace(/"/g, '""')}"`,
        t.direction === 1 ? '"Return (1)"' : '"Forward (0)"',
        `"${t.bus?.reg_no || ''}"`,
        `"${t.status || ''}"`,
        `"${t.started_at || ''}"`,
        `"${t.ended_at || ''}"`,
        durMin,
        `"${t.crowd_level || 'normal'}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `driver-report-${fromIso.slice(0, 10)}-to-${toIso.slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const driverName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Driver'
  const busNumber = driverRow?.bus?.reg_no || 'No bus assigned'

  return (
    <div className="flex-1 flex flex-col space-y-5 pb-8 text-left">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body { background: #FFFFFF !important; color: #050F45 !important; }
          .no-print { display: none !important; }
          .print-clean { background: transparent !important; color: #050F45 !important; border-color: #D9E2F7 !important; box-shadow: none !important; }
          .print-text-dark { color: #050F45 !important; }
        }
      `}</style>

      {/* Header with Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-line no-print">
        <h1 className="font-extrabold text-base text-ink-950 font-heading">Driver History & Reports</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={trips.length === 0}
            className="px-3 py-1.5 rounded-pill bg-white border border-line text-ink-950 shadow-soft hover:bg-sky-50 disabled:opacity-40 transition text-xs font-bold flex items-center gap-1.5"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-pill bg-white border border-line text-ink-950 shadow-soft hover:bg-sky-50 transition text-xs font-bold flex items-center gap-1.5"
            title="Print / Save PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Driver Info Header Card */}
      <div className="p-4 bg-white rounded-card border border-line shadow-soft flex items-center justify-between print-clean">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-cobalt-500 flex items-center justify-center shrink-0">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-ink-950 font-heading print-text-dark">{driverName}</h2>
            <p className="text-xs text-muted font-mono print-text-dark">Assigned Bus: <strong className="text-ink-950">{busNumber}</strong></p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-muted block print-text-dark">Total Trips</span>
          <span className="text-base font-extrabold text-ink-950 font-heading print-text-dark">{summary.totalTrips}</span>
        </div>
      </div>

      {/* Date Range Filter (no-print) */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Filter Date Range</span>
          <SegmentedControl
            options={[
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: 'custom', label: 'Custom' },
            ]}
            value={rangeType}
            onChange={setRangeType}
            ariaLabel="Date range filter"
          />
        </div>

        {rangeType === 'custom' && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-white border border-line rounded-input shadow-soft animate-fadeIn">
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted mb-1">From Date</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full h-10 px-2 bg-sky-50 border border-line rounded-input text-xs text-ink-950 focus:outline-none focus:border-cobalt-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted mb-1">To Date</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full h-10 px-2 bg-sky-50 border border-line rounded-input text-xs text-ink-950 focus:outline-none focus:border-cobalt-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Total Trips" value={summary.totalTrips} variant="gradient" />
        <StatTile label="Hours Driven" value={`${summary.totalHours}h`} />
        <StatTile label="Delayed Trips" value={summary.delayedCount} />
        <StatTile label="Breakdowns" value={summary.breakdownCount} />
      </div>

      {/* Daily Aggregation Table (from driver_report RPC) */}
      {dailyReport && dailyReport.length > 0 && (
        <div className="p-4 bg-white border border-line rounded-card space-y-3 shadow-soft print-clean">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-950 print-text-dark">
            Daily Shift Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-line text-muted text-[10px] uppercase print-text-dark">
                  <th className="py-2.5 pr-3 font-bold">Date</th>
                  <th className="py-2.5 px-3 font-bold">Trips</th>
                  <th className="py-2.5 px-3 font-bold">Time</th>
                  <th className="py-2.5 px-3 font-bold">Delayed</th>
                  <th className="py-2.5 pl-3 font-bold">Breakdowns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dailyReport.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-sky-50/50 print-clean' : 'print-clean'}>
                    <td className="py-2.5 pr-3 font-mono font-bold text-ink-950 print-text-dark">
                      {row.report_date}
                    </td>
                    <td className="py-2.5 px-3 text-ink-950 print-text-dark font-medium">{row.trips_count}</td>
                    <td className="py-2.5 px-3 text-ink-950 print-text-dark font-medium">
                      {Math.round(row.total_minutes / 60)}h {row.total_minutes % 60}m
                    </td>
                    <td className="py-2.5 px-3 text-amber-600 font-bold print-text-dark">{row.delayed_count}</td>
                    <td className="py-2.5 pl-3 text-danger font-bold print-text-dark">{row.breakdown_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Trip List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-950 print-text-dark">
            Trip Logs ({trips.length})
          </h3>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={trips.length === 0}
            className="text-[11px] font-bold text-cobalt-500 hover:underline flex items-center gap-1 no-print disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-cobalt-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-2.5">
            {trips.map((t) => (
              <div
                key={t.id}
                className="p-3.5 bg-white border border-line rounded-card shadow-soft space-y-2 text-left print-clean"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RouteBadge code={t.route?.code} color={t.route?.color} size="sm" />
                    <span className="text-xs font-bold text-ink-950 truncate max-w-[160px] print-text-dark">
                      {t.route?.name_en}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-pill capitalize ${
                      t.status === 'ended'
                        ? 'bg-sky-100 text-muted'
                        : t.status === 'delayed'
                        ? 'bg-amber-100 text-amber-800'
                        : t.status === 'breakdown'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line text-[11px] text-muted print-text-dark">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-muted">Direction</span>
                    <span className="font-bold text-ink-950 print-text-dark">
                      {t.direction === 1 ? 'Return (1)' : 'Forward (0)'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-muted">Bus</span>
                    <span className="font-mono font-bold text-ink-950 print-text-dark">
                      {t.bus?.reg_no || '---'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-muted">Start Time</span>
                    <span className="font-mono text-ink-950 print-text-dark">
                      {t.started_at ? new Date(t.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-muted">Duration</span>
                    <span className="font-mono font-bold text-cobalt-500 print-text-dark">
                      {formatDuration(t.started_at, t.ended_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white border border-line rounded-card shadow-soft print-clean">
            <Calendar className="w-8 h-8 text-muted/40 mx-auto mb-2" />
            <p className="text-xs text-muted print-text-dark">No trips found in this date range.</p>
          </div>
        )}
      </div>
    </div>
  )
}
