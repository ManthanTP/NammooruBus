import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare,
  Star,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  LogIn,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { useToastStore } from '@/components/ui/Toast'
import RouteBadge from '@/components/ui/RouteBadge'
import EmptyState from '@/components/ui/EmptyState'

const CATEGORY_KEYS = [
  { value: 'delay', key: 'complaints.cat_delay' },
  { value: 'behaviour', key: 'complaints.cat_behaviour' },
  { value: 'cleanliness', key: 'complaints.cat_cleanliness' },
  { value: 'safety', key: 'complaints.cat_safety' },
  { value: 'other', key: 'complaints.cat_other' },
]

export default function ComplaintsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { routes } = useDataStore()
  const { addToast } = useToastStore()

  // Form State
  const [routeId, setRouteId] = useState('')
  const [category, setCategory] = useState('delay')
  const [rating, setRating] = useState(3)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // List State
  const [myComplaints, setMyComplaints] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  const fetchMyComplaints = async () => {
    if (!user) return
    setLoadingList(true)
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          routes (code, name_en, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyComplaints(data || [])
    } catch (err) {
      console.warn('Error fetching complaints:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchMyComplaints()
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!user) {
      setFormError(t('complaints.login_required_desc'))
      return
    }

    const trimmed = message.trim()
    if (trimmed.length < 5) {
      setFormError('Message must be at least 5 characters long.')
      return
    }
    if (trimmed.length > 1000) {
      setFormError('Message cannot exceed 1000 characters.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('complaints').insert({
        user_id: user.id,
        route_id: routeId || null,
        category,
        rating,
        message: trimmed,
        status: 'open',
      })

      if (error) throw error

      addToast({ message: 'Complaint registered successfully.', type: 'success' })
      setMessage('')
      setRouteId('')
      setRating(3)
      setCategory('delay')
      fetchMyComplaints()
    } catch (err) {
      setFormError(err.message)
      addToast({ message: `Submission failed: ${err.message}`, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/15 text-success">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('complaints.status_resolved')}</span>
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning">
            <Clock className="w-3 h-3" />
            <span>{t('complaints.status_in_progress')}</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-danger/15 text-danger">
            <AlertCircle className="w-3 h-3" />
            <span>{t('complaints.status_open')}</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-ink font-heading flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cobalt" />
          {t('complaints.title')}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {t('complaints.sub')}
        </p>
      </div>

      {/* Guest Login Banner */}
      {!user ? (
        <div className="p-5 bg-surface rounded-card border border-line shadow-soft space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-input bg-cobalt-tint text-cobalt flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                {t('complaints.login_required_title')}
              </h3>
              <p className="text-xs text-text-secondary">
                {t('complaints.login_required_desc')}
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="w-full py-2.5 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft flex items-center justify-center gap-2 hover:bg-cobalt/90 transition"
          >
            <span>{t('auth.login')}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* Complaint Submission Form */
        <div className="bg-surface rounded-card border border-line p-5 shadow-soft space-y-4">
          <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
            {t('complaints.submit_title')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-input text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Route Selector (Optional) */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {t('complaints.route_label')}
              </label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt"
              >
                <option value="">{t('complaints.route_placeholder')}</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Route {r.code} - {r.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {t('complaints.category_label')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORY_KEYS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`py-2 px-2.5 rounded-input text-xs font-semibold border transition text-left ${
                      category === cat.value
                        ? 'bg-cobalt-tint border-cobalt text-cobalt font-bold shadow-xs'
                        : 'bg-page border-line text-ink hover:border-text-secondary'
                    }`}
                  >
                    {t(cat.key)}
                  </button>
                ))}
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {t('complaints.rating_label')}
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                    title={`${star} star`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating
                          ? 'fill-warning text-warning'
                          : 'text-line hover:text-warning'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-text-secondary font-mono ml-2">
                  ({rating} / 5)
                </span>
              </div>
            </div>

            {/* Message Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-ink">
                  {t('complaints.message_label')} <span className="text-danger">*</span>
                </label>
                <span className="text-[10px] text-text-secondary font-mono">
                  {message.length} / 1000
                </span>
              </div>
              <textarea
                rows={4}
                required
                minLength={5}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('complaints.message_placeholder')}
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || message.trim().length < 5}
              className="w-full py-3 bg-cobalt text-white rounded-input text-xs font-bold shadow-soft flex items-center justify-center gap-2 hover:bg-cobalt/90 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? t('complaints.submitting') : t('complaints.submit_btn')}</span>
            </button>
          </form>
        </div>
      )}

      {/* "My Complaints" Section */}
      {user && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
              {t('complaints.my_complaints')} ({myComplaints.length})
            </h3>
            <button
              type="button"
              onClick={fetchMyComplaints}
              className="text-text-secondary hover:text-ink p-1 rounded transition"
              title="Refresh my complaints"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {myComplaints.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-line rounded-card shadow-soft text-xs text-text-secondary">
              {t('complaints.no_complaints')}
            </div>
          ) : (
            <div className="space-y-3">
              {myComplaints.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface rounded-card border border-line p-4 shadow-soft space-y-3"
                >
                  {/* Top line: Category, Route, Status */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-bold text-xs text-cobalt bg-cobalt-tint px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      {item.routes && (
                        <div className="flex items-center gap-1">
                          <RouteBadge
                            code={item.routes.code}
                            color={item.routes.color}
                            size="sm"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 text-warning text-xs">
                        {Array.from({ length: item.rating || 0 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-warning text-warning" />
                        ))}
                      </div>
                    </div>

                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  {/* Passenger Message */}
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    "{item.message}"
                  </p>

                  {/* Submission date */}
                  <div className="text-[10px] text-text-secondary font-mono">
                    Submitted on {new Date(item.created_at).toLocaleString()}
                  </div>

                  {/* Admin Reply Box */}
                  {item.admin_reply && (
                    <div className="p-3 bg-cobalt-tint/30 border border-cobalt/20 rounded-input space-y-1">
                      <span className="text-[11px] font-bold text-cobalt block">
                        {t('complaints.admin_reply_title')}
                      </span>
                      <p className="text-xs text-ink leading-relaxed">
                        {item.admin_reply}
                      </p>
                      {item.updated_at && (
                        <span className="text-[10px] text-text-secondary block font-mono">
                          Responded on {new Date(item.updated_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
