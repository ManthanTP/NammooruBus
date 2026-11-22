import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageToggle from '@/components/ui/LanguageToggle'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, loading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState(null)
  const [adminNotice, setAdminNotice] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setAdminNotice(false)

    if (!email || !password) {
      setFormError(t('auth.login_failed') || 'Please enter email and password')
      return
    }

    const { profile, error } = await signIn(email, password)

    if (error) {
      setFormError(error.message || t('auth.login_failed'))
      return
    }

    if (profile?.role === 'admin') {
      setAdminNotice(true)
    } else if (profile?.role === 'driver') {
      navigate('/driver')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col justify-between">
      {/* 1. Top Half: Signature Gradient with logo-full on white plate */}
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

        <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs text-white/75 font-medium mt-1">
          {t('app.tagline') || 'Our town. Our bus.'}
        </p>

        {/* Road ribbon at bottom of top section */}
        <div className="absolute bottom-0 left-0 right-0 h-2.5 road-ribbon opacity-80" />
      </div>

      {/* 2. Bottom Half: White Sheet Form */}
      <main className="flex-1 w-full max-w-md mx-auto -mt-8 relative z-10 px-4 pb-8">
        <div
          className="bg-white p-6 rounded-[28px] border border-line shadow-soft space-y-4"
        >
          <div className="space-y-1">
            <h2 className="font-heading font-extrabold text-xl text-ink-950">
              {t('auth.login') || 'Sign In'}
            </h2>
            <p className="text-xs text-muted">
              Access your saved trips and personalized alerts
            </p>
          </div>

          {adminNotice && (
            <div className="p-3.5 bg-amber-100 border border-amber-500/30 rounded-[16px] text-xs text-navy-900 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{t('auth.admin_login_notice') || 'Admin accounts must log in via the administrator portal.'}</span>
              </div>
              <Link
                to="/12345678/admin/login"
                className="text-xs font-bold text-cobalt-500 hover:underline flex items-center gap-1 self-end"
              >
                {t('auth.admin_portal_link') || 'Go to Admin Portal'} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {formError && (
            <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-[16px] text-xs text-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink-950 mb-1.5 font-heading">
                {t('auth.email_label') || 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder') || 'name@example.com'}
                required
                className="w-full h-12 px-4 bg-sky-50 border border-line rounded-[12px] text-sm text-ink-950 placeholder:text-muted focus:outline-none focus:border-cobalt-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-ink-950 font-heading">
                  {t('auth.password_label') || 'Password'}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-cobalt-500 hover:underline"
                >
                  {t('auth.forgot_password') || 'Forgot?'}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full h-12 text-sm font-bold font-heading tracking-tight mt-2"
            >
              <span>{t('auth.login_btn') || 'Sign In'}</span>
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-muted font-medium">or</span>
            </div>
          </div>

          {/* Create account button */}
          <Link
            to="/register"
            className="w-full h-12 rounded-full border-2 border-cobalt-500 text-cobalt-500 hover:bg-sky-50 text-xs font-bold flex items-center justify-center transition active:scale-98 font-heading"
          >
            <span>{t('auth.no_account') || 'Create an account'}</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
