import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bus, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { updatePassword, loading } = useAuthStore()

  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg(t('auth.password_hint'))
      return
    }

    const { error } = await updatePassword(password)
    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col justify-between p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-input bg-cobalt text-white flex items-center justify-center shadow-soft">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-ink leading-tight">{t('app.name')}</h1>
            <p className="text-xs text-text-secondary">{t('app.tagline')}</p>
          </div>
        </div>
        <LanguageToggle />
      </header>

      <main className="w-full max-w-sm mx-auto my-8">
        <div className="bg-surface p-6 rounded-card border border-line shadow-soft">
          <h2 className="text-xl font-bold text-ink mb-1">{t('auth.reset_password')}</h2>
          <p className="text-sm text-text-secondary mb-6">{t('app.tagline')}</p>

          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-ink mb-2">Password updated successfully!</p>
              <p className="text-xs text-text-secondary">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {t('auth.password_label')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
                />
                <p className="text-[11px] text-text-secondary mt-1">{t('auth.password_hint')}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cobalt text-white text-sm font-semibold rounded-input shadow-soft hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition"
              >
                {loading ? t('common.loading') : t('auth.update_password_action')}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-line text-center">
            <Link to="/login" className="text-xs text-cobalt font-semibold hover:underline">
              &larr; {t('auth.back_to_login')}
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-text-secondary py-2">
        &copy; {new Date().getFullYear()} {t('app.name')}
      </footer>
    </div>
  )
}
