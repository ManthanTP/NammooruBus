import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, Lock, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'
import Button from '@/components/ui/Button'
import RoadRibbon from '@/components/ui/RoadRibbon'

const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 60 * 1000

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(() => {
    return parseInt(sessionStorage.getItem('nb_admin_attempts') || '0', 10)
  })
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    return parseInt(sessionStorage.getItem('nb_admin_lockout') || '0', 10)
  })
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // Countdown timer for lockout
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      if (lockoutUntil > now) {
        setRemainingSeconds(Math.ceil((lockoutUntil - now) / 1000))
      } else {
        setRemainingSeconds(0)
        if (lockoutUntil > 0) {
          setLockoutUntil(0)
          setAttempts(0)
          sessionStorage.removeItem('nb_admin_lockout')
          sessionStorage.removeItem('nb_admin_attempts')
        }
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [lockoutUntil])

  const handleFailedAttempt = () => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)
    sessionStorage.setItem('nb_admin_attempts', newAttempts.toString())

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS
      setLockoutUntil(lockUntil)
      sessionStorage.setItem('nb_admin_lockout', lockUntil.toString())
      setErrorMessage(t('auth.admin_locked_out', { seconds: 60 }))
    } else {
      setErrorMessage(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage(null)

    if (remainingSeconds > 0) {
      return
    }

    const expectedSecret = import.meta.env.VITE_ADMIN_SECRET_KEY || 'nammooru-admin-secret-2026'
    if (secretKey.trim() !== expectedSecret.trim()) {
      handleFailedAttempt()
      return
    }

    setLoading(true)
    const { profile, error } = await signIn(email, password)
    setLoading(false)

    if (error || !profile) {
      handleFailedAttempt()
      return
    }

    if (profile.role !== 'admin') {
      handleFailedAttempt()
      return
    }

    // Reset lockout counters on success
    sessionStorage.removeItem('nb_admin_attempts')
    sessionStorage.removeItem('nb_admin_lockout')

    navigate('/12345678/admin/dashboard')
  }

  const isLocked = remainingSeconds > 0

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col justify-between">
      {/* 1. Top Section: Signature Gradient with Logo on White Plate */}
      <div
        className="pt-10 pb-16 px-6 text-white flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>

        {/* White rounded plate with logo-full */}
        <div className="bg-white rounded-[20px] p-4 shadow-float mb-4 flex items-center justify-center max-w-[200px]">
          <img
            src="/brand/logo-full.png"
            alt="Nammooru Bus"
            className="w-36 h-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-white/15 rounded-pill text-xs font-bold mb-1">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Central Administration Control</span>
        </div>
        <p className="text-xs text-white/75 font-medium">
          Authorized transit administrators only
        </p>

        {/* Road ribbon at bottom of top section */}
        <RoadRibbon />
      </div>

      {/* 2. Bottom Section: White Sheet Form */}
      <main className="flex-1 w-full max-w-md mx-auto -mt-8 relative z-10 px-4 pb-8">
        <div className="bg-white p-6 rounded-[28px] border border-line shadow-soft space-y-4">
          <div className="space-y-1">
            <h2 className="font-heading font-extrabold text-xl text-ink-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cobalt-500" />
              <span>Admin Sign In</span>
            </h2>
            <p className="text-xs text-muted">
              Enter your administrative credentials and security key
            </p>
          </div>

          {isLocked && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('auth.admin_locked_out', { seconds: remainingSeconds })}</span>
            </div>
          )}

          {errorMessage && !isLocked && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1">
                {t('auth.email_label')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                required
                disabled={isLocked}
                className="w-full h-12 px-3.5 bg-sky-50 border border-line rounded-input text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 focus:bg-white transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1">
                {t('auth.password_label')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  required
                  disabled={isLocked}
                  className="w-full h-12 px-3.5 pr-11 bg-sky-50 border border-line rounded-input text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 focus:bg-white transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-950 transition p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-muted" />
                <span>{t('auth.admin_secret_label')}</span>
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={t('auth.admin_secret_placeholder')}
                required
                disabled={isLocked}
                className="w-full h-12 px-3.5 bg-sky-50 border border-line rounded-input text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 focus:bg-white transition disabled:opacity-50"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLocked || loading}
              className="w-full mt-2"
            >
              {loading ? t('common.loading') : isLocked ? `Locked (${remainingSeconds}s)` : t('auth.login_action')}
            </Button>
          </form>
        </div>
      </main>

      <footer className="text-center text-xs text-muted py-3">
        Nammooru Bus &bull; Protected System
      </footer>
    </div>
  )
}
