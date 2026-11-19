import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import RouteBadge from '@/components/ui/RouteBadge'

export default function DriverHistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const { data: dRow } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (dRow) {
          const { data } = await supabase
            .from('trips')
            .select('*, route:routes(*), bus:buses(*)')
            .eq('driver_id', dRow.id)
            .order('started_at', { ascending: false })
            .limit(20)

          setTrips(data || [])
        }
      } catch (e) {
        console.warn('Error fetching driver history:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  const calculateDuration = (started, ended) => {
    if (!started) return '--'
    const startMs = new Date(started).getTime()
    const endMs = ended ? new Date(ended).getTime() : Date.now()
    const mins = Math.max(1, Math.round((endMs - startMs) / (60 * 1000)))
    return `${mins} min`
  }

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => navigate('/driver')}
          className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="font-extrabold text-sm text-white font-heading">Trip History</span>
        <div className="w-10" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-2 pb-4">
          {trips.map((t) => (
            <div
              key={t.id}
              className="p-3.5 bg-[#121B3D] border border-white/10 rounded-card space-y-2 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RouteBadge code={t.route?.code} color={t.route?.color} size="sm" />
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {t.route?.name_en}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-pill capitalize ${
                    t.status === 'ended'
                      ? 'bg-white/10 text-white/70'
                      : t.status === 'delayed'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-success/20 text-success'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/60 pt-1 border-t border-white/5 font-mono">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(t.started_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {calculateDuration(t.started_at, t.ended_at)}
                </span>
                <span>Bus: {t.bus?.reg_no || 'BUS'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-[#121B3D] rounded-card border border-white/10 text-center text-xs text-white/60">
          No previous trips recorded for this driver account.
        </div>
      )}
    </div>
  )
}
