import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import LanguageToggle from '@/components/ui/LanguageToggle'
import RoadRibbon from '@/components/ui/RoadRibbon'
import AuthSwitch from '@/components/ui/AuthSwitch'

function formatAuthError(error) {
  if (!error) return null
  const msg = typeof error === 'string' ? error : (error.message || '')
  const lower = msg.toLowerCase()

  if (lower.includes('already registered') || lower.includes('already in use') || lower.includes('already exists') || lower.includes('user already registered')) {
    return 'An account with this email already exists. Please sign in.'
  }
  if (lower.includes('password') && (lower.includes('least') || lower.includes('short') || lower.includes('weak'))) {
    return 'Password must be at least 8 characters long.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes before trying again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network connection issue. Please check your internet connection.'
  }
  return msg || 'Registration failed. Please try again.'
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, claimDriverRole } = useAuthStore()
  const { routes, initData } = useDataStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [preferredLang, setPreferredLang] = useState('en')
  const [isDriver, setIsDriver] = useState(false)
  const [driverKey, setDriverKey] = useState('')
  const [busRegNo, setBusRegNo] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [formError, setFormError] = useState(null)
  const [noticeMessage, setNoticeMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    initData()
  }, [initData])

  useEffect(() => {
    if (routes && routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id)
    }
  }, [routes, selectedRouteId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setFormError(null)
    setNoticeMessage(null)

    if (password.length < 8) {
      setFormError(t('auth.password_hint') || 'Password must be at least 8 characters')
      return
    }

    if (isDriver) {
      if (!driverKey.trim()) {
        setFormError('Please enter your driver secret key')
        return
      }
      if (!busRegNo.trim()) {
        setFormError('Please enter your bus registration number (e.g. KA25 F 1234)')
        return
      }
    }

    setSubmitting(true)
    const submittedKey = driverKey
    const submittedBus = busRegNo.trim().toUpperCase()
    const submittedRoute = selectedRouteId
    setDriverKey('')

    try {
      const { error } = await signUp(email, password, fullName, preferredLang)

      if (error) {
        setFormError(formatAuthError(error))
        setSubmitting(false)
        return
      }

      if (isDriver) {
        const { status } = await claimDriverRole(submittedKey, submittedBus, submittedRoute)

        if (status === 'ok') {
          navigate('/driver')
          return
        } else if (status === 'invalid') {
          setNoticeMessage({
            type: 'warning',
            text: 'That driver key is not correct. Your account was created as a passenger. You can try the key again anytime on your Profile page.',
          })
          setSubmitting(false)
          return
        } else if (status === 'locked') {
          setFormError('Too many wrong keys. Try again in 15 minutes.')
          setSubmitting(false)
          return
        } else if (status === 'not_configured') {
          setFormError('Driver sign-up is not set up yet. Ask the admin.')
          setSubmitting(false)
          return
        } else if (status === 'bus_taken') {
          setFormError('This bus is already assigned to another driver. Please contact admin.')
          setSubmitting(false)
          return
        } else if (status === 'bus_required') {
          setFormError('Please enter your bus registration number.')
          setSubmitting(false)
          return
        } else if (status === 'login_required') {
          setFormError('Account created. Please log in and claim driver role on your profile.')
          setSubmitting(false)
          return
        }
      }

      navigate('/')
    } catch (err) {
      setFormError(formatAuthError(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between font-body text-ink-950 transition-colors">
      {/* 1. Top Half: Signature Gradient with logo-full */}
      <div
        className="pt-10 pb-16 px-6 text-white flex flex-col items-center justify-center relative overflow-hidden shrink-0"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-float mb-4 flex items-center justify-center max-w-[200px]">
          <img
            src="/brand/logo-full.png"
            alt="Nammooru Bus"
            className="w-36 h-auto object-contain"
          />
        </div>

        <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight">
          {t('auth.register')}
        </h1>
        <p className="text-xs text-white/75 font-medium mt-1">
          {t('app.tagline')}
        </p>

        {/* Road ribbon at bottom of top section */}
        <RoadRibbon />
      </div>

      {/* 2. Bottom Half: Form Card */}
      <main className="flex-1 w-full max-w-md mx-auto -mt-8 relative z-10 px-4 pb-8">
        <div className="bg-surface p-6 rounded-[28px] border border-line shadow-soft space-y-4">
          <div className="space-y-1">
            <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-ink-950">
              {t('auth.register')}
            </h2>
            <p className="text-xs text-muted">
              Create an account to track buses and plan your trips
            </p>
          </div>

          {formError && (
            <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-[16px] text-xs text-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {noticeMessage && (
            <div className="p-3.5 bg-amber-100 dark:bg-amber-950/50 border border-amber-500/30 rounded-[16px] text-xs text-navy-900 dark:text-amber-200 font-medium">
              {noticeMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.name_label')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.name_placeholder') || 'Basavaraj'}
                required
                disabled={submitting}
                className="w-full h-14 px-4 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.email_label')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder') || 'name@example.com'}
                required
                disabled={submitting}
                className="w-full h-14 px-4 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.password_label')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                  minLength={8}
                  disabled={submitting}
                  className="w-full h-14 px-4 pr-11 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink-950 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted mt-1">
                {t('auth.password_hint')}
              </p>
            </div>

            {/* Account Role Selector / Driver Switch */}
            <div className="pt-1">
              <div className="flex items-center justify-between p-1 bg-sky-50 dark:bg-surface-2 rounded-full border border-line">
                <button
                  type="button"
                  onClick={() => setIsDriver(false)}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${!isDriver
                    ? 'bg-cobalt-500 text-white shadow-xs'
                    : 'text-muted hover:text-ink-950'
                    }`}
                >
                  Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setIsDriver(true)}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${isDriver
                    ? 'bg-amber-500 text-navy-900 shadow-xs'
                    : 'text-muted hover:text-ink-950'
                    }`}
                >
                  Driver 🚌
                </button>
              </div>
            </div>

            {/* Smooth height-animated Driver Details fields */}
            <AnimatePresence>
              {isDriver && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="space-y-3 pt-2 overflow-hidden"
                >
                  <div className="p-3 bg-amber-100/60 dark:bg-amber-950/40 rounded-[16px] border border-amber-500/30 text-xs text-navy-900 dark:text-amber-200 font-medium flex items-start gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Enter your driver credentials assigned by the depot supervisor.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-950 mb-1 font-heading">
                      Driver Secret Key
                    </label>
                    <input
                      type="password"
                      value={driverKey}
                      onChange={(e) => setDriverKey(e.target.value)}
                      placeholder="Enter depot key"
                      required={isDriver}
                      disabled={submitting}
                      className="w-full h-12 px-4 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-xs font-mono text-ink-950 focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-950 mb-1 font-heading">
                      Bus Registration Number
                    </label>
                    <input
                      type="text"
                      value={busRegNo}
                      onChange={(e) => setBusRegNo(e.target.value.toUpperCase())}
                      placeholder="e.g. KA25 F 1234"
                      required={isDriver}
                      disabled={submitting}
                      className="w-full h-12 px-4 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-xs font-mono font-bold text-ink-950 uppercase focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-950 mb-1 font-heading">
                      Assigned Route
                    </label>
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      disabled={submitting}
                      className="w-full h-12 px-3 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-xs font-bold text-ink-950 focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
                    >
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          Route {r.code} - {r.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary button: 52px height, full width, gradient background */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[52px] rounded-full text-white font-heading font-bold text-sm tracking-tight flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-soft disabled:opacity-60 cursor-pointer mt-2"
              style={{ background: 'var(--gradient-brand)' }}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{submitting ? t('auth.creating_account') : t('auth.register_btn')}</span>
            </button>
          </form>

          {/* Unified Bottom Block */}
          <AuthSwitch mode="register" />
        </div>
      </main>
    </div>
  )
}
