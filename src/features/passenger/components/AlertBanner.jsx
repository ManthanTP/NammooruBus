import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * AlertBanner — latest alert as an amber-100 banner card with a bell icon.
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

      let dismissed = []
      try {
        dismissed = JSON.parse(localStorage.getItem('nb_dismissed_alerts') || '[]')
      } catch (e) {}

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

    const channel = supabase
      .channel('home_alert_banner_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchNewestAlert()
      )
      .subscribe()

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

  return (
    <div
      className="p-4 rounded-[20px] bg-amber-100 border border-amber-500/30 text-ink-950 flex items-start justify-between gap-3 shadow-soft transition-all"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-navy-900 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-navy-900" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-heading text-ink-950 leading-tight">
              {activeAlert.title}
            </span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-navy-900 text-amber-500 tracking-wider">
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
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cobalt-500 hover:underline mt-2"
          >
            <span>View alert details</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted hover:text-ink-950 p-1 rounded-full transition shrink-0"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
