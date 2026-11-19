import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const { user, profile, updateLang } = useAuthStore()
  const currentLang = i18n.language === 'kn' ? 'kn' : 'en'

  const handleSelect = async (lang) => {
    if (lang === currentLang) return
    await i18n.changeLanguage(lang)
    localStorage.setItem('nb_lang', lang)
    if (user && profile) {
      updateLang(lang)
    }
  }

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="relative flex items-center p-1 bg-surface border border-line rounded-pill shadow-soft"
    >
      <button
        type="button"
        onClick={() => handleSelect('en')}
        className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-pill transition-colors ${
          currentLang === 'en' ? 'text-white' : 'text-text-secondary hover:text-ink'
        }`}
      >
        {currentLang === 'en' && (
          <motion.div
            layoutId="langPill"
            className="absolute inset-0 bg-cobalt rounded-pill -z-10"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        EN
      </button>

      <button
        type="button"
        onClick={() => handleSelect('kn')}
        className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-pill transition-colors font-kannada ${
          currentLang === 'kn' ? 'text-white' : 'text-text-secondary hover:text-ink'
        }`}
      >
        {currentLang === 'kn' && (
          <motion.div
            layoutId="langPill"
            className="absolute inset-0 bg-cobalt rounded-pill -z-10"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        ಕನ್ನಡ
      </button>
    </div>
  )
}
