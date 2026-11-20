import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogOut, ArrowLeft, MessageSquare, HelpCircle, Shield, KeyRound, AlertCircle, CheckCircle2, Bus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { useToastStore } from '@/components/ui/Toast'
import LanguageToggle from '@/components/ui/LanguageToggle'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, signOut, claimDriverRole } = useAuthStore()
  const { routes, initData } = useDataStore()
  const { addToast } = useToastStore()

  const [driverKey, setDriverKey] = useState('')
  const [busRegNo, setBusRegNo] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState(null)

  useEffect(() => {
    initData()
  }, [initData])

  useEffect(() => {
    if (routes && routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id)
    }
  }, [routes, selectedRouteId])

  const handleLogout = async () => {
    await signOut()
    addToast('Logged out successfully', 'info')
    navigate('/')
  }

  const handleClaimDriver = async (e) => {
    e.preventDefault()
    if (!driverKey.trim()) {
      setClaimError('Please enter driver secret key')
      return
    }
    if (!busRegNo.trim()) {
      setClaimError('Please enter bus registration number')
      return
    }

    const submittedKey = driverKey
    const submittedBus = busRegNo.trim().toUpperCase()
    const submittedRoute = selectedRouteId
    setDriverKey('')
    setClaimLoading(true)
    setClaimError(null)

    const { status, error } = await claimDriverRole(submittedKey, submittedBus, submittedRoute)
    setClaimLoading(false)

    if (status === 'ok') {
      addToast('Driver role unlocked! Redirecting...', 'success')
      navigate('/driver')
    } else if (status === 'invalid') {
      setClaimError('Invalid driver key.')
    } else if (status === 'locked') {
      setClaimError('Too many wrong keys. Try again in 15 minutes.')
    } else if (status === 'not_configured') {
      setClaimError('Driver sign-up is not set up yet. Ask the admin.')
    } else if (status === 'bus_taken') {
      setClaimError('Bus is already assigned to another driver. Contact admin.')
    } else if (status === 'bus_required') {
      setClaimError('Please enter your bus registration number.')
    } else {
      setClaimError(error || 'Failed to verify driver key.')
    }
  }

  const isPassenger = !profile?.role || profile.role === 'passenger'

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-xs font-heading">{t('nav.profile')}</span>
        <div className="w-10" />
      </div>

      {/* User Info Card */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center font-bold text-lg shrink-0">
          <User className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-ink truncate font-heading">
            {profile?.full_name || user?.email?.split('@')[0] || 'Guest User'}
          </h3>
          <p className="text-xs text-text-secondary truncate">{user?.email || 'Not logged in'}</p>
          <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-page border border-line rounded-pill">
            Role: {profile?.role || 'passenger'}
          </span>
        </div>
      </div>

      {/* Language Preference */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-ink block">{t('auth.preferred_lang_label')}</span>
          <span className="text-[11px] text-text-secondary">App interface language</span>
        </div>
        <LanguageToggle />
      </div>

      {/* Become a Driver Section (Part D.3: Only for Passengers) */}
      {isPassenger && user && (
        <div className="p-4 bg-surface rounded-card border border-line shadow-soft space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cobalt" />
            <h4 className="text-xs font-bold text-ink font-heading">Become a Driver</h4>
          </div>
          <p className="text-xs text-text-secondary">
            If you are a transit driver, enter your depot secret key to unlock the Driver tracking portal.
          </p>

          {claimError && (
            <div className="p-2.5 bg-danger/10 border border-danger/30 rounded-input text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}

          <form onSubmit={handleClaimDriver} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-ink">
                Driver Secret Key <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                value={driverKey}
                onChange={(e) => setDriverKey(e.target.value)}
                placeholder="Driver secret key..."
                required
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs text-ink focus:outline-none focus:border-cobalt font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-ink">
                Bus Registration Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={busRegNo}
                onChange={(e) => setBusRegNo(e.target.value.toUpperCase())}
                placeholder="e.g. KA25 F 1234"
                required
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-mono font-bold uppercase text-ink focus:outline-none focus:border-cobalt"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-ink">
                Assigned Route
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full px-3 py-2 bg-page border border-line rounded-input text-xs font-bold text-ink focus:outline-none focus:border-cobalt"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Route {r.code} - {r.name_en}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={claimLoading}
              className="w-full py-2.5 bg-cobalt text-white text-xs font-bold rounded-pill shadow-xs hover:opacity-95 disabled:opacity-50 transition"
            >
              {claimLoading ? 'Verifying & Linking Bus...' : 'Unlock Driver Portal'}
            </button>
          </form>
        </div>
      )}

      {/* Quick Links */}
      <div className="p-3 bg-surface rounded-card border border-line shadow-soft divide-y divide-line text-xs font-semibold">
        <Link
          to="/complaints"
          className="py-2.5 flex items-center justify-between text-ink hover:text-cobalt transition"
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-text-secondary" />
            <span>{t('nav.complaints')}</span>
          </span>
          <span className="text-text-secondary">&rarr;</span>
        </Link>

        <Link
          to="/help"
          className="py-2.5 flex items-center justify-between text-ink hover:text-cobalt transition"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-text-secondary" />
            <span>{t('nav.help')}</span>
          </span>
          <span className="text-text-secondary">&rarr;</span>
        </Link>

        {profile?.role === 'driver' && (
          <Link
            to="/driver"
            className="py-2.5 flex items-center justify-between text-cobalt hover:underline transition font-bold"
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Go to Driver Portal</span>
            </span>
            <span>&rarr;</span>
          </Link>
        )}
      </div>

      {/* Logout Button */}
      {user && (
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 bg-surface hover:bg-danger/10 border border-line hover:border-danger/30 text-danger text-xs font-bold rounded-card shadow-soft transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('auth.logout')}</span>
        </button>
      )}
    </div>
  )
}
