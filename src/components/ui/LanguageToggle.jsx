import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import SegmentedControl from './SegmentedControl'

export default function LanguageToggle({ className = '' }) {
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
    <SegmentedControl
      options={[
        { key: 'en', label: 'EN' },
        { key: 'kn', label: 'ಕನ್ನಡ' },
      ]}
      value={currentLang}
      onChange={handleSelect}
      className={className}
      ariaLabel="Language selection"
    />
  )
}
