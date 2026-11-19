import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogOut, ArrowLeft, MessageSquare, HelpCircle, Shield, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/components/ui/Toast'
import LanguageToggle from '@/components/ui/LanguageToggle'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, signOut, updateLang } = useAuthStore()
  const { addToast } = useToastStore()

  const [fullName, setFullName] = useState(profile?.full_name || '')

  const handleLogout = async () => {
    await signOut()
    addToast({ message: 'Logged out successfully', type: 'info' })
    navigate('/')
  }

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <span className="font-extrabold text-xs font-heading">{t('nav.profile')}</span>
        <div className="w-10" />
      </div>

      {/* User Info Card */}
      <div className="p-4 bg-surface rounded-card border border-line shadow-soft flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center font-bold text-lg">
          <User className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-ink truncate font-heading">
            {profile?.full_name || user?.email?.split('@')[0] || 'Guest User'}
          </h3>
          <p className="text-xs text-text-secondary truncate">{user?.email || 'Not logged in'}</p>
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-page border border-line rounded-pill">
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
            className="py-2.5 flex items-center justify-between text-cobalt hover:underline transition"
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Go to Driver Portal</span>
            </span>
            <span>&rarr;</span>
          </Link>
        )}
      </div>

      {/* Authentication Action */}
      <div className="pt-2">
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-danger/10 text-danger border border-danger/20 font-bold text-xs rounded-input hover:bg-danger hover:text-white transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('common.logout')}</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="w-full py-2.5 bg-cobalt text-white font-bold text-xs rounded-input shadow-soft hover:opacity-95 transition flex items-center justify-center gap-1.5"
          >
            <span>{t('auth.login')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
