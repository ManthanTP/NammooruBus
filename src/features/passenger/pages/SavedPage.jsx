import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, Trash2, ArrowRight, LogIn, User } from 'lucide-react'
import { useSavedStore } from '@/store/savedStore'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { localName } from '@/lib/formatters'
import LanguageToggle from '@/components/ui/LanguageToggle'
import EmptyState from '@/components/ui/EmptyState'

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
    navigate(`/results?from=${trip.from_stop}&to=${trip.to_stop}`)
  }

  const handleRemove = (e, tripId) => {
    e.stopPropagation()
    removeTrip(tripId, user)
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-cobalt" />
          <h2 className="text-sm font-extrabold text-ink font-heading">
            {t('passenger.saved_trips_title')}
          </h2>
        </div>
        <span className="text-xs font-bold text-text-secondary">
          {savedTrips.length} saved
        </span>
      </div>

      {/* Guest vs Logged in Status Banner */}
      {!user ? (
        <div className="p-3 bg-cobalt-tint/60 border border-cobalt/20 rounded-card flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-ink">Guest Mode</p>
            <p className="text-[11px] text-text-secondary">Sign in to sync your saved trips across devices.</p>
          </div>
          <Link
            to="/login"
            className="px-3 py-1.5 bg-cobalt text-white font-bold rounded-pill shadow-xs hover:opacity-95 transition"
          >
            {t('auth.login')}
          </Link>
        </div>
      ) : (
        <div className="p-3 bg-surface border border-line rounded-card flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cobalt" />
            <span className="font-semibold text-ink truncate">{user.email}</span>
          </div>
          <span className="text-[10px] bg-success/10 text-success font-bold px-2 py-0.5 rounded-pill">
            Cloud Synced
          </span>
        </div>
      )}

      {/* Saved Trips List with Exit Animation */}
      {savedTrips.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence>
            {savedTrips.map((trip) => {
              const fromStopObj = stops.find((s) => s.id === trip.from_stop) || trip.fromStop
              const toStopObj = stops.find((s) => s.id === trip.to_stop) || trip.toStop

              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleRunSearch(trip)}
                  role="button"
                  tabIndex={0}
                  className="p-3.5 bg-surface rounded-card border border-line shadow-soft hover:border-cobalt transition cursor-pointer flex items-center justify-between group text-left"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink truncate">
                      <span className="truncate">{fromStopObj ? localName(fromStopObj, i18n.language) : 'Stop A'}</span>
                      <span className="text-text-secondary font-normal">&rarr;</span>
                      <span className="truncate">{toStopObj ? localName(toStopObj, i18n.language) : 'Stop B'}</span>
                    </div>
                    {trip.routeSummary && (
                      <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                        {trip.routeSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, trip.id)}
                      className="p-1.5 rounded-full text-text-secondary hover:text-danger hover:bg-danger/10 transition"
                      title="Remove saved trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-page flex items-center justify-center text-text-secondary group-hover:bg-cobalt group-hover:text-white transition">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title={t('passenger.no_saved')}
          description="Save frequently used journeys to quickly find bus schedules with one tap."
          actionLabel={t('passenger.find_buses')}
          onAction={() => navigate('/search')}
        />
      )}

      {/* Language Quick Setting */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex items-center justify-between">
        <span className="text-xs font-bold text-ink">{t('common.switch_lang')}</span>
        <LanguageToggle />
      </div>
    </div>
  )
}
