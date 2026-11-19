import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Info, XCircle, Clock, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AlertBanner() {
  const [activeAlert, setActiveAlert] = useState(null)

  const fetchNewestAlert = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .lte('starts_at', now)
        .order('starts_at', { ascending: false })
        .limit(5)

      if (error) throw error

      // Get dismissed alert IDs from localStorage
      let dismissed = []
      try {
        dismissed = JSON.parse(localStorage.getItem('nb_dismissed_alerts') || '[]')
      } catch (e) {}

      // Find the first alert that hasn't expired and hasn't been dismissed
      const candidate = (data || []).find((a) => {
        if (dismissed.includes(a.id)) return false
        if (!a.expires_at) return true
        return new Date(a.expires_at) > new Date()
      })

      setActiveAlert(candidate || null)
    } catch (err) {
      console.warn('Error fetching alert banner:', err)
    }
  }

  useEffect(() => {
    fetchNewestAlert()

    // Realtime listener for live alert pushes
    const channel = supabase
      .channel('home_alert_banner_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchNewestAlert()
      )
      .subscribe()

    // Heartbeat every 30s to check for expired alerts
    const interval = setInterval(fetchNewestAlert, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const handleDismiss = (e) => {
    e.stopPropagation()
    if (!activeAlert) return

    try {
      let dismissed = JSON.parse(localStorage.getItem('nb_dismissed_alerts') || '[]')
      if (!dismissed.includes(activeAlert.id)) {
        dismissed.push(activeAlert.id)
        localStorage.setItem('nb_dismissed_alerts', JSON.stringify(dismissed))
      }
    } catch (e) {}

    setActiveAlert(null)
  }

  if (!activeAlert) return null

  const typeStyles = {
    cancel: {
      bg: 'bg-danger/10 border-danger/30 text-danger',
      icon: XCircle,
      badge: 'bg-danger text-white',
    },
    diversion: {
      bg: 'bg-warning/15 border-warning/30 text-ink',
      icon: AlertTriangle,
      badge: 'bg-warning text-ink',
    },
    delay: {
      bg: 'bg-warning/15 border-warning/30 text-ink',
      icon: Clock,
      badge: 'bg-warning text-ink',
    },
    info: {
      bg: 'bg-cobalt-tint/60 border-cobalt/30 text-ink',
      icon: Info,
      badge: 'bg-cobalt text-white',
    },
  }[activeAlert.type] || {
    bg: 'bg-cobalt-tint/60 border-cobalt/30 text-ink',
    icon: Info,
    badge: 'bg-cobalt text-white',
  }

  const Icon = typeStyles.icon

  return (
    <div
      className={`p-3.5 rounded-card border shadow-soft flex items-start justify-between gap-3 transition-all ${typeStyles.bg}`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-ink leading-tight truncate">
              {activeAlert.title}
            </span>
            <span
              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${typeStyles.badge}`}
            >
              {activeAlert.type}
            </span>
          </div>

          {activeAlert.body && (
            <p className="text-[11px] text-text-secondary leading-snug mt-1 line-clamp-2">
              {activeAlert.body}
            </p>
          )}

          <Link
            to="/alerts"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cobalt hover:underline mt-1.5"
          >
            <span>View alert details</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="text-text-secondary hover:text-ink p-1 rounded-full transition shrink-0"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
