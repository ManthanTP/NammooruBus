import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * AuthSwitch — unified bottom block for Login and Register pages.
 * Displays a thin divider with 'or', prompt question, and a 48px full-width outlined button.
 */
export default function AuthSwitch({ mode = 'login' }) {
  const { t } = useTranslation()

  const isLogin = mode === 'login'
  const question = isLogin
    ? (t('auth.new_to_app') || 'New to Nammooru Bus?')
    : (t('auth.already_have_account') || 'Already have an account?')

  const to = isLogin ? '/register' : '/login'
  const actionLabel = isLogin
    ? (t('auth.register') || 'Create account')
    : (t('auth.sign_in') || 'Sign in')

  return (
    <div className="w-full space-y-3 pt-1">
      {/* Thin divider with 'or' */}
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-3 text-muted font-medium">
            {t('common.or') || 'or'}
          </span>
        </div>
      </div>

      {/* Question text */}
      <div className="text-center">
        <p className="text-xs font-medium text-muted">
          {question}
        </p>
      </div>

      {/* Outlined secondary button: 48px, rounded full, 2px brand border, brand text */}
      <Link
        to={to}
        className="w-full h-12 rounded-full border-2 border-brand text-brand hover:bg-surface-2 text-sm font-heading font-bold flex items-center justify-center transition active:scale-[0.98] shadow-xs"
      >
        <span>{actionLabel}</span>
      </Link>
    </div>
  )
}
