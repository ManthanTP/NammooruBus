import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  CheckCircle,
  RefreshCw,
  Route as RouteIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDataStore } from '@/store/dataStore'
import RouteBadge from '@/components/ui/RouteBadge'
import EmptyState from '@/components/ui/EmptyState'

export default function AlertsPage() {
  const { t } = useTranslation()
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

      // Filter active (not expired)
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

    // Realtime subscription for live alert broadcast
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

  const getTypeConfig = (type) => {
    switch (type) {
      case 'cancel':
        return {
          icon: XCircle,
          badgeColor: 'bg-danger/15 text-danger border-danger/30',
          titleColor: 'text-danger',
          label: 'Service Cancellation',
        }
      case 'diversion':
        return {
          icon: AlertTriangle,
          badgeColor: 'bg-warning/15 text-warning border-warning/30',
          titleColor: 'text-warning',
          label: 'Route Diversion',
        }
      case 'delay':
        return {
          icon: Clock,
          badgeColor: 'bg-warning/15 text-warning border-warning/30',
          titleColor: 'text-warning',
          label: 'Severe Delay',
        }
      default:
        return {
          icon: Info,
          badgeColor: 'bg-cobalt-tint text-cobalt border-cobalt/30',
          titleColor: 'text-cobalt',
          label: 'Service Advisory',
        }
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
            <Bell className="w-5 h-5 text-cobalt" />
            {t('alerts.title')}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {t('alerts.sub')}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchActiveAlerts}
          className="p-2 border border-line bg-surface hover:bg-page rounded-input text-text-secondary hover:text-ink transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={t('alerts.no_alerts')}
          description={t('alerts.no_alerts_sub')}
        />
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const config = getTypeConfig(alert.type)
            const Icon = config.icon

            // Map affected route badges
            const affectedRoutes = routes.filter((r) =>
              alert.route_ids?.includes(r.id)
            )

            return (
              <div
                key={alert.id}
                className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-3"
              >
                {/* Header row: Type badge, icon, time */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeColor}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{config.label}</span>
                  </span>

                  <span className="font-mono text-[11px] text-text-secondary">
                    {new Date(alert.starts_at).toLocaleDateString()} {new Date(alert.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title & Body */}
                <div>
                  <h3 className="text-sm font-extrabold text-ink font-heading">
                    {alert.title}
                  </h3>
                  {alert.body && (
                    <p className="text-xs text-ink/90 leading-relaxed mt-1 whitespace-pre-wrap">
                      {alert.body}
                    </p>
                  )}
                </div>

                {/* Affected Routes */}
                <div className="pt-2 border-t border-line flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-text-secondary">
                      {t('alerts.affects')}
                    </span>
                    {affectedRoutes.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {affectedRoutes.map((r) => (
                          <Link key={r.id} to={`/routes/${r.id}`}>
                            <RouteBadge code={r.code} color={r.color} size="sm" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="font-semibold text-ink bg-page px-2 py-0.5 rounded border border-line text-[11px]">
                        {t('alerts.all_routes')}
                      </span>
                    )}
                  </div>

                  {alert.expires_at && (
                    <span className="text-[10px] text-text-secondary font-mono">
                      Valid until {new Date(alert.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
