import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bus, AlertCircle, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, claimDriverRole, loading } = useAuthStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [preferredLang, setPreferredLang] = useState('en')
  const [isDriver, setIsDriver] = useState(false)
  const [driverKey, setDriverKey] = useState('')
  const [formError, setFormError] = useState(null)
  const [noticeMessage, setNoticeMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setNoticeMessage(null)

    if (password.length < 8) {
      setFormError(t('auth.password_hint'))
      return
    }

    if (isDriver && !driverKey.trim()) {
      setFormError('Please enter your driver secret key')
      return
    }

    const submittedKey = driverKey
    // Clear key field from state immediately (Part D.2.c: Never log or display the key. Clear the field after submit.)
    setDriverKey('')

    const { data, error } = await signUp(email, password, fullName, preferredLang)

    if (error) {
      setFormError(error.message || t('auth.register_failed'))
      return
    }

    // If driver toggle was selected, claim driver role via RPC
    if (isDriver) {
      const { status } = await claimDriverRole(submittedKey)

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
      } else if (status === 'login_required') {
        setFormError('Account created. Please log in and claim driver role on your profile.')
        return
      }
    }

    navigate('/')
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
          <h2 className="text-xl font-bold text-ink mb-1">{t('auth.register')}</h2>
          <p className="text-sm text-text-secondary mb-6">{t('app.tagline')}</p>

          {formError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-input text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {noticeMessage && (
            <div className="mb-4 p-3 bg-warning/15 border border-warning/30 rounded-input text-xs text-ink space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="font-medium text-[11px] leading-snug">{noticeMessage.text}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  to="/profile"
                  className="px-3 py-1 bg-cobalt text-white font-bold rounded-pill text-[11px] inline-block shadow-xs"
                >
                  Go to Profile
                </Link>
                <Link
                  to="/"
                  className="px-3 py-1 bg-page border border-line text-text-secondary font-bold rounded-pill text-[11px] inline-block"
                >
                  Continue as passenger
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                {t('auth.name_label')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.name_placeholder')}
                required
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
              />
            </div>

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
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
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
                placeholder={t('auth.password_placeholder')}
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt"
              />
              <p className="text-[11px] text-text-secondary mt-1">{t('auth.password_hint')}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                {t('auth.preferred_lang_label')}
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-page border border-line rounded-input text-sm text-ink focus:outline-none focus:border-cobalt"
              >
                <option value="en">English (EN)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            {/* Driver Role Toggle (Part D.1) */}
            <div className="pt-2 border-t border-line">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDriver}
                  onChange={(e) => setIsDriver(e.target.checked)}
                  className="w-4 h-4 rounded text-cobalt focus:ring-cobalt cursor-pointer"
                />
                <span className="text-xs font-bold text-ink">I am a driver</span>
              </label>

              {/* Driver Secret Key Input (Only visible when toggle is ON) */}
              {isDriver && (
                <div className="mt-3 p-3 bg-page rounded-input border border-line space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <KeyRound className="w-3.5 h-3.5 text-cobalt" />
                    <span>Driver Secret Key</span>
                  </div>
                  <input
                    type="password"
                    value={driverKey}
                    onChange={(e) => setDriverKey(e.target.value)}
                    placeholder="Enter driver registration secret..."
                    required={isDriver}
                    className="w-full px-3 py-2 bg-surface border border-line rounded-input text-sm text-ink placeholder:text-text-secondary focus:outline-none focus:border-cobalt font-mono"
                  />
                  <p className="text-[10px] text-text-secondary">
                    Obtain this secret key from your depot manager or bus administrator.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cobalt text-white text-sm font-semibold rounded-input shadow-soft hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition"
            >
              {loading ? t('common.loading') : isDriver ? 'Register as Driver' : t('auth.register_action')}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-center">
            <p className="text-xs text-text-secondary">
              {t('auth.already_have_account')}{' '}
              <Link to="/login" className="text-cobalt font-semibold hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/"
            className="text-xs font-semibold text-text-secondary hover:text-ink transition inline-flex items-center gap-1"
          >
            {t('common.continue_as_guest')} &rarr;
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-text-secondary py-2">
        &copy; {new Date().getFullYear()} {t('app.name')}
      </footer>
    </div>
  )
}
