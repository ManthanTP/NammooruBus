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
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation key: "${key}" for lng: ${lngs}`)
      }
    },
  })

export default i18n
