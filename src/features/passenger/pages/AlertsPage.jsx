import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'
import RouteBadge from '@/components/ui/RouteBadge'
import EmptyState from '@/components/ui/EmptyState'

export default function AlertsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { routes } = useDataStore()
  const [alerts, setAlerts] = useState([])
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
          chip: 'bg-amber-100 text-amber-700 border border-amber-500/30',
          label: type === 'delay' ? 'Delay' : 'Diversion',
        }
      default:
        return {
          icon: Info,
          chip: 'bg-sky-100 text-cobalt-500 border border-cobalt-500/20',
          label: 'Notice',
        }
    }
  }

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white border border-line text-muted hover:text-ink-950 flex items-center justify-center transition active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading font-extrabold text-xl text-ink-950">
            Live Service Alerts
          </h1>
        </div>
        <span className="text-xs font-bold text-cobalt-500 bg-sky-100 px-2.5 py-0.5 rounded-full">
          {alerts.length} active
        </span>
      </div>

      {/* 2. Alerts List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted">
          Loading alerts...
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = getSeverityStyle(alert.type)
            const Icon = config.icon
            const affectedRoute = alert.route_id ? routes.find((r) => r.id === alert.route_id) : null

            return (
              <div
                key={alert.id}
                className="p-4 bg-white rounded-[20px] border border-line shadow-soft space-y-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${config.chip}`}>
                      <Icon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </span>
                    {affectedRoute && (
                      <RouteBadge code={affectedRoute.code} size="xs" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted">
                    {new Date(alert.starts_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-sm text-ink-950">
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
