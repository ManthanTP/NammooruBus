import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, Lock, AlertCircle, KeyRound, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'

const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 60 * 1000

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [secretKey, setSecretKey] = useState('')
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
    <div className="min-h-screen bg-page flex flex-col justify-between p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-input bg-ink text-white flex items-center justify-center shadow-soft">
            <ShieldAlert className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-ink leading-tight">{t('app.name')}</h1>
            <p className="text-xs text-text-secondary">{t('auth.admin_login_title')}</p>
          </div>
        </div>
        <LanguageToggle />
      </header>

      <main className="w-full max-w-sm mx-auto my-8">
        <div className="bg-surface p-6 rounded-card border border-line shadow-soft">
          <div className="flex items-center gap-2 text-ink mb-2">
            <Lock className="w-5 h-5 text-cobalt" />
            <h2 className="text-lg font-bold">{t('auth.admin_login_title')}</h2>
          </div>
          <p className="text-xs text-text-secondary mb-6">
            Authorized transport administrators only.
          </p>

          {isLocked && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('auth.admin_locked_out', { seconds: remainingSeconds })}</span>
            </div>
          )}

          {errorMessage && !isLocked && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                {t('auth.email_label')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                required
                disabled={isLocked}
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                {t('auth.password_label')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                required
                disabled={isLocked}
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-text-secondary" />
                <span>{t('auth.admin_secret_label')}</span>
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={t('auth.admin_secret_placeholder')}
                required
                disabled={isLocked}
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLocked || loading}
              className="w-full py-3 bg-ink text-white text-sm font-semibold rounded-input shadow-soft hover:bg-opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
            >
              {loading ? t('common.loading') : isLocked ? `Locked (${remainingSeconds}s)` : t('auth.login_action')}
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center text-xs text-text-secondary py-2">
        Nammooru Bus &bull; Protected System
      </footer>
    </div>
  )
}
