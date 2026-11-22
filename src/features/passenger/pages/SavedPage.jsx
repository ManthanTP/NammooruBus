import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, Trash2, ArrowRight, User } from 'lucide-react'
import { useSavedStore } from '@/store/savedStore'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { localName } from '@/lib/formatters'
import LanguageToggle from '@/components/ui/LanguageToggle'
import EmptyState from '@/components/ui/EmptyState'
import RouteBadge from '@/components/ui/RouteBadge'
import Button from '@/components/ui/Button'

export default function SavedPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { stops } = useDataStore()
  const { savedTrips, removeTrip, initSaved } = useSavedStore()

  useEffect(() => {
    initSaved(user)
  }, [user, initSaved])

  const handleRunSearch = (trip) => {
    navigate(`/journey?from=${trip.from_stop}&to=${trip.to_stop}&r=${encodeURIComponent(trip.route_key || '')}`)
  }

  const handleRemove = (e, tripId) => {
    e.stopPropagation()
    removeTrip(tripId, user)
  }

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h1 className="font-heading font-extrabold text-xl text-ink-950">
            {t('passenger.saved_trips_title') || 'Saved Trips'}
          </h1>
        </div>
        <span className="text-xs font-bold text-cobalt-500 bg-sky-100 px-2.5 py-0.5 rounded-full">
          {savedTrips.length} saved
        </span>
      </div>

      {/* 2. Guest Mode or Logged In Card */}
      {!user ? (
        <div
          className="p-4 rounded-[20px] text-white flex items-center justify-between gap-3 shadow-soft"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <div>
            <p className="font-bold font-heading text-sm text-white">Guest Mode</p>
            <p className="text-xs text-white/80 mt-0.5">Log in to sync your saved trips across all devices.</p>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 bg-white text-cobalt-500 text-xs font-bold rounded-full shadow-xs hover:bg-sky-50 transition shrink-0 active:scale-95"
          >
            {t('auth.sign_in') || 'Sign in'}
          </Link>
        </div>
      ) : (
        <div className="p-3.5 bg-white border border-line rounded-[20px] shadow-soft flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-sky-100 text-cobalt-500 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <span className="font-semibold text-ink-950 truncate">{user.email}</span>
          </div>
          <span className="text-[10px] bg-amber-100 text-navy-900 font-extrabold px-2.5 py-0.5 rounded-full shrink-0">
            Cloud Synced
          </span>
        </div>
      )}

      {/* 3. Saved Trips Ticket Cards List */}
      {savedTrips.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {savedTrips.map((trip) => {
              const fromStopObj = stops.find((s) => s.id === trip.from_stop) || trip.fromStop
              const toStopObj = stops.find((s) => s.id === trip.to_stop) || trip.toStop
              const routeCodes = (trip.route_key || '').split('+').filter(Boolean)

              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => handleRunSearch(trip)}
                  role="button"
                  tabIndex={0}
                  className="relative bg-white rounded-[20px] border border-line overflow-hidden shadow-soft hover:border-cobalt-500 transition-all cursor-pointer select-none text-left active:scale-[0.99]"
                >
                  {/* Top section: stops and route badge */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold font-heading text-ink-950 truncate">
                        <span className="truncate">{fromStopObj ? localName(fromStopObj, i18n.language) : 'Origin'}</span>
                        <span className="text-amber-500 font-bold">&rarr;</span>
                        <span className="truncate">{toStopObj ? localName(toStopObj, i18n.language) : 'Destination'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {routeCodes.map((code) => (
                          <RouteBadge key={code} code={code} size="xs" />
                        ))}
                        {trip.routeSummary && (
                          <span className="text-xs text-muted truncate">
                            &bull; {trip.routeSummary}
                          </span>
                        )}
                      </div>
                    </div>

                    <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                  </div>

                  {/* Perforated dashed divider */}
                  <div className="relative flex items-center px-2">
                    <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-sky-50 border-r border-line" />
                    <div className="w-full border-t border-dashed border-line" />
                    <div className="absolute -right-2.5 w-5 h-5 rounded-full bg-sky-50 border-l border-line" />
                  </div>

                  {/* Bottom section: action buttons */}
                  <div className="px-4 py-2.5 bg-sky-50/50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, trip.id)}
                      className="p-1.5 rounded-full text-muted hover:text-danger hover:bg-danger/10 transition"
                      title="Remove saved trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunSearch(trip)}
                      className="px-3.5 py-1.5 bg-cobalt-500 text-white rounded-full text-xs font-bold transition flex items-center gap-1 shadow-xs hover:bg-cobalt-600 active:scale-95"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          title={t('passenger.no_saved') || 'No saved trips yet'}
          description="Save a trip from any result to quickly plan your regular journey with one tap."
          action={{
            label: t('passenger.find_buses') || 'Find buses',
            onClick: () => navigate('/search'),
          }}
        />
      )}
    </div>
  )
}
