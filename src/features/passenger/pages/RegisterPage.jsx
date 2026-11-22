import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, KeyRound, Bus, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import LanguageToggle from '@/components/ui/LanguageToggle'
import Button from '@/components/ui/Button'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, claimDriverRole, loading } = useAuthStore()
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

    const submittedKey = driverKey
    const submittedBus = busRegNo.trim().toUpperCase()
    const submittedRoute = selectedRouteId
    setDriverKey('')

    const { data, error } = await signUp(email, password, fullName, preferredLang)

    if (error) {
      setFormError(error.message || t('auth.register_failed'))
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
        return
      } else if (status === 'locked') {
        setFormError('Too many wrong keys. Try again in 15 minutes.')
        return
      } else if (status === 'not_configured') {
        setFormError('Driver sign-up is not set up yet. Ask the admin.')
        return
      } else if (status === 'bus_taken') {
        setFormError('This bus is already assigned to another driver. Please contact admin.')
        return
      } else if (status === 'bus_required') {
        setFormError('Please enter your bus registration number.')
        return
      } else if (status === 'login_required') {
        setFormError('Account created. Please log in and claim driver role on your profile.')
        return
      }
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col justify-between">
      {/* 1. Top Half: Signature Gradient with logo-full */}
      <div
        className="pt-8 pb-14 px-6 text-white flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>

        <div className="bg-white rounded-[20px] p-3.5 shadow-float mb-3 flex items-center justify-center max-w-[180px]">
          <img
            src="/brand/logo-full.png"
            alt="Nammooru Bus"
            className="w-32 h-auto object-contain"
          />
        </div>

        <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight">
          Join Nammooru Bus
        </h1>
        <p className="text-xs text-white/75 font-medium mt-0.5">
          {t('app.tagline') || 'Our town. Our bus.'}
        </p>

        <div className="absolute bottom-0 left-0 right-0 h-2.5 road-ribbon opacity-80" />
      </div>

      {/* 2. Bottom Half: White Sheet Form */}
      <main className="flex-1 w-full max-w-md mx-auto -mt-8 relative z-10 px-4 pb-8">
        <div className="bg-white p-6 rounded-[28px] border border-line shadow-soft space-y-4">
          {formError && (
            <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-[16px] text-xs text-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {noticeMessage && (
            <div className="p-3.5 bg-amber-100 border border-amber-500/30 rounded-[16px] text-xs text-navy-900 font-medium">
              {noticeMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.name_label') || 'Full Name'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Basavaraj"
                required
                className="w-full h-12 px-4 bg-sky-50 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.email_label') || 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full h-12 px-4 bg-sky-50 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.password_label') || 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full h-12 px-4 pr-11 bg-sky-50 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink-950"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Account Role Selector / Driver Switch */}
            <div className="pt-1">
              <div className="flex items-center justify-between p-1 bg-sky-50 rounded-full border border-line">
                <button
                  type="button"
                  onClick={() => setIsDriver(false)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                    !isDriver
                      ? 'bg-cobalt-500 text-white shadow-xs'
                      : 'text-muted hover:text-ink-950'
                  }`}
                >
                  Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setIsDriver(true)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isDriver
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
                  <div className="p-3 bg-amber-100/60 rounded-[16px] border border-amber-500/30 text-xs text-navy-900 font-medium flex items-start gap-2">
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
                      className="w-full h-11 px-4 bg-sky-50 border border-line rounded-[12px] text-xs font-mono text-ink-950 focus:outline-none focus:border-cobalt-500"
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
                      className="w-full h-11 px-4 bg-sky-50 border border-line rounded-[12px] text-xs font-mono font-bold text-ink-950 uppercase focus:outline-none focus:border-cobalt-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-950 mb-1 font-heading">
                      Assigned Route
                    </label>
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="w-full h-11 px-3 bg-sky-50 border border-line rounded-[12px] text-xs font-bold text-ink-950 focus:outline-none focus:border-cobalt-500"
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

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full h-12 text-sm font-bold font-heading tracking-tight mt-2"
            >
              <span>{t('auth.register_btn') || 'Create Account'}</span>
            </Button>
          </form>

          <div className="text-center pt-2">
            <span className="text-xs text-muted">Already have an account? </span>
            <Link
              to="/login"
              className="text-xs font-bold text-cobalt-500 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
