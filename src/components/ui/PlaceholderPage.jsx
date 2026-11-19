import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, ArrowLeft } from 'lucide-react'
import LanguageToggle from './LanguageToggle'

export default function PlaceholderPage({ title, path, role = 'passenger' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-page flex flex-col justify-between p-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>
        <LanguageToggle />
      </header>

      <main className="w-full max-w-sm mx-auto text-center my-auto">
        <div className="bg-surface p-8 rounded-card border border-line shadow-soft">
          <div className="w-14 h-14 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-cobalt-tint text-cobalt rounded-pill mb-2">
            {role}
          </span>
          <h2 className="text-xl font-bold text-ink mb-1">{title}</h2>
          <code className="text-xs text-text-secondary block mb-4 bg-page py-1 px-2 rounded-input border border-line">
            {path}
          </code>
          <p className="text-sm text-text-secondary">
            {t('common.coming_soon')}
          </p>
        </div>
      </main>

      <footer className="text-center text-xs text-text-secondary py-2">
        {t('app.name')} &bull; {t('app.tagline')}
      </footer>
    </div>
  )
}
