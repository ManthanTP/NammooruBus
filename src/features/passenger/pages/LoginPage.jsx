import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'
import RoadRibbon from '@/components/ui/RoadRibbon'
import AuthSwitch from '@/components/ui/AuthSwitch'

function formatAuthError(error) {
  if (!error) return null
  const msg = typeof error === 'string' ? error : (error.message || '')
  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials') || lower.includes('wrong password')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (lower.includes('already registered') || lower.includes('already in use') || lower.includes('already exists')) {
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
  return msg || 'Invalid email or password'
}

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setFormError(null)

    if (!email || !password) {
      setFormError('Please enter both email and password.')
      return
    }

    setSubmitting(true)
    try {
      const { profile, error } = await signIn(email, password)

      if (error) {
        setFormError(formatAuthError(error))
        setSubmitting(false)
        return
      }

      if (profile?.role === 'admin') {
        navigate('/12345678/admin/dashboard')
      } else if (profile?.role === 'driver') {
        navigate('/driver')
      } else {
        navigate('/explore')
      }
    } catch (err) {
      setFormError(formatAuthError(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between font-body text-ink-950 transition-colors">
      {/* 1. Top Half: Signature Gradient with logo-full on white plate */}
      <div
        className="pt-10 pb-16 px-6 on-brand flex flex-col items-center justify-center relative overflow-hidden shrink-0"
        style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
      >
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>

        {/* White rounded plate with logo-full */}
        <div
          className="rounded-[20px] p-4 shadow-float mb-4 flex items-center justify-center max-w-[200px]"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <img
            src="/brand/logo-full.png"
            alt="Nammooru Bus"
            className="w-36 h-auto object-contain"
          />
        </div>

        <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight">
          {t('auth.login')}
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
              {t('auth.login')}
            </h2>
            <p className="text-xs text-muted">
              Access your saved trips and personalized alerts
            </p>
          </div>

          {formError && (
            <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-[16px] text-xs text-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.email_label')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                required
                disabled={submitting}
                className="w-full h-14 px-4 bg-sky-50 dark:bg-surface-2 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-ink-950 font-heading">
                  {t('auth.password_label')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-brand hover:underline"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
            </div>

            {/* Primary button: 52px height, full width, gradient background */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[52px] rounded-full on-brand font-heading font-bold text-sm tracking-tight flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-soft disabled:opacity-60 cursor-pointer mt-2"
              style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{submitting ? t('auth.signing_in') : t('auth.login_btn')}</span>
            </button>
          </form>

          {/* Unified Bottom Block */}
          <AuthSwitch mode="login" />
        </div>
      </main>
    </div>
  )
}
