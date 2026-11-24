import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  AlertTriangle,
  Info,
  XCircle,
  ArrowLeft,
  CheckCircle2,
  CheckCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'
import { getReadAlertIds, markAlertAsRead, markAllAlertsAsRead } from '@/lib/alertsStorage'
import RouteBadge from '@/components/ui/RouteBadge'
import EmptyState from '@/components/ui/EmptyState'

export default function AlertsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { routes } = useDataStore()
  const [alerts, setAlerts] = useState([])
  const [readIds, setReadIds] = useState(() => getReadAlertIds())
  const [loading, setLoading] = useState(true)

  const fetchActiveAlerts = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .lte('starts_at', now)
        .order('starts_at', { ascending: false })

      if (error) throw error

      const activeOnly = (data || []).filter((a) => {
        if (!a.expires_at) return true
        return new Date(a.expires_at) > new Date()
      })

      setAlerts(activeOnly)
    } catch (err) {
      console.warn('Error loading alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveAlerts()

    const channel = supabase
      .channel('passenger_alerts_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchActiveAlerts()
      )
      .subscribe()

    const syncReadIds = () => setReadIds(getReadAlertIds())
    window.addEventListener('nb_alerts_updated', syncReadIds)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('nb_alerts_updated', syncReadIds)
    }
  }, [])

  const unreadAlerts = alerts.filter((a) => !readIds.includes(a.id))

  const handleMarkAll = () => {
    markAllAlertsAsRead(alerts.map((a) => a.id))
    setReadIds(getReadAlertIds())
  }

  const handleToggleRead = (id) => {
    markAlertAsRead(id)
    setReadIds(getReadAlertIds())
  }

  // Severity chips: info cobalt, warning amber, critical danger
  const getSeverityStyle = (type) => {
    switch (type) {
      case 'cancel':
      case 'critical':
        return {
          icon: XCircle,
          chip: 'bg-danger/10 text-danger border border-danger/30',
          label: 'Cancellation',
        }
      case 'diversion':
      case 'delay':
      case 'warning':
        return {
          icon: AlertTriangle,
          chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
          label: type === 'delay' ? 'Delay' : 'Diversion',
        }
      default:
        return {
          icon: Info,
          chip: 'bg-cobalt/10 text-brand border border-cobalt/20',
          label: 'Notice',
        }
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header */}
      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-surface border border-line text-muted hover:text-text flex items-center justify-center transition active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading font-extrabold text-xl text-text">
            Live Service Alerts
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {unreadAlerts.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1 px-2.5 py-1 rounded-pill bg-surface border border-line shadow-xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <span className="text-xs font-bold text-brand bg-sky-100 dark:bg-surface-2 border border-line px-2.5 py-0.5 rounded-full">
            {alerts.length} active
          </span>
        </div>
      </div>

      {/* 2. Alerts List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted">
          Loading alerts...
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isRead = readIds.includes(alert.id)
            const config = getSeverityStyle(alert.type)
            const Icon = config.icon
            const affectedRoute = alert.route_id ? routes.find((r) => r.id === alert.route_id) : null

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-[20px] transition-all text-left space-y-3 ${
                  isRead
                    ? 'bg-surface-2/60 border border-line opacity-65'
                    : 'bg-surface border-2 border-amber-500/50 shadow-soft'
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${config.chip}`}>
                      <Icon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </span>
                    {affectedRoute && (
                      <RouteBadge code={affectedRoute.code} size="xs" />
                    )}
                    {isRead ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted bg-surface px-2 py-0.5 rounded-full border border-line">
                        Viewed
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-navy-900 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted">
                      {new Date(alert.starts_at).toLocaleDateString()}
                    </span>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => handleToggleRead(alert.id)}
                        className="text-[10px] text-muted hover:text-text font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface border border-line"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className={`font-heading font-bold text-sm ${isRead ? 'text-text/80' : 'text-text font-extrabold'}`}>
                    {alert.title}
                  </h3>
                  {alert.body && (
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {alert.body}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="All services running normally"
          description="There are currently no active delays, diversions, or cancellations reported."
        />
      )}
    </div>
  )
}
