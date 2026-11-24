import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getReadAlertIds, markAlertAsRead } from '@/lib/alertsStorage'

/**
 * AlertBanner — Top live service banner card for active, unread alerts.
 * Fully WCAG and theme compliant across Light, Dark, and Blue modes.
 */
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

      const readIds = getReadAlertIds()

      const candidate = (data || []).find((a) => {
        if (readIds.includes(a.id)) return false
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

    const channel = supabase
      .channel('home_alert_banner_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchNewestAlert()
      )
      .subscribe()

    const handleLocalUpdate = () => fetchNewestAlert()
    window.addEventListener('nb_alerts_updated', handleLocalUpdate)
    const interval = setInterval(fetchNewestAlert, 30000)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('nb_alerts_updated', handleLocalUpdate)
      clearInterval(interval)
    }
  }, [])

  const handleDismiss = (e) => {
    e.stopPropagation()
    if (!activeAlert) return
    markAlertAsRead(activeAlert.id)
    setActiveAlert(null)
  }

  const handleOpenAlert = () => {
    if (activeAlert) {
      markAlertAsRead(activeAlert.id)
    }
  }

  if (!activeAlert) return null

  return (
    <div
      role="alert"
      className="p-3.5 sm:p-4 rounded-[18px] bg-surface border-2 border-amber-500/50 text-text flex items-start justify-between gap-3 shadow-soft transition-all"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-heading text-text leading-tight">
              {activeAlert.title}
            </span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 tracking-wider">
              {activeAlert.type || 'Notice'}
            </span>
          </div>

          {activeAlert.body && (
            <p className="text-xs text-muted leading-snug mt-1 line-clamp-2">
              {activeAlert.body}
            </p>
          )}

          <Link
            to="/alerts"
            onClick={handleOpenAlert}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline mt-2"
          >
            <span>View alert details</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted hover:text-text p-1 rounded-full transition shrink-0"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
