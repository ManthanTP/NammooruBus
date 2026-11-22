import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import kn from './locales/kn.json'

const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem('nb_lang') || 'en') : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kn: { translation: kn },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key) => {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn(`[i18n] Missing translation key: "${key}" for languages: ${Array.isArray(lngs) ? lngs.join(', ') : lngs}`)
      }
    },
    parseMissingKeyHandler: (key) => {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn(`[i18n] Missing translation fallback triggered for key: "${key}"`)
      }
      // Never show raw key in production: format last part with spaces and capitalization
      const lastPart = (key && key.includes('.')) ? key.split('.').pop() : key
      return (lastPart || '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    },
  })

export default i18n
