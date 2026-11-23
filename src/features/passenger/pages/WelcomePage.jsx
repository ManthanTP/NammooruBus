import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Radio, Compass, Bookmark, Share2, Globe2, Check, Sun, Moon, Laptop, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { appStorage } from '@/lib/storage'
import { hapticTick, setStatusBarTheme, isNative } from '@/lib/platform'
import { useThemeStore } from '@/store/themeStore'
import { App } from '@capacitor/app'

export default function WelcomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { theme, setTheme, resolvedTheme } = useThemeStore()

  // Read saved progress if app was closed mid-way
  const [step, setStep] = useState(() => {
    const saved = appStorage.getItem('nb_onboarding_step')
    if (saved === '2') return 2
    if (saved === '3') return 3
    return 1
  })

  const [currentSlide, setCurrentSlide] = useState(0)

  // Synchronize status bar color per step
  useEffect(() => {
    if (step === 1) {
      setStatusBarTheme('splash')
    } else if (step === 2) {
      setStatusBarTheme('brand')
    } else if (step === 3) {
      setStatusBarTheme(theme)
    }
  }, [step, theme])

  // Hardware Back Button listener
  useEffect(() => {
    window.__nbOnboardingBack = () => {
      if (step === 3) {
        setStep(2)
        setCurrentSlide(2)
        appStorage.setItem('nb_onboarding_step', '2')
        return true
      }
      if (step === 2) {
        if (currentSlide > 0) {
          setCurrentSlide((prev) => prev - 1)
          return true
        }
        setStep(1)
        appStorage.setItem('nb_onboarding_step', '1')
        return true
      }
      if (step === 1) {
        if (isNative()) {
          App.exitApp?.()
        }
        return true
      }
      return false
    }

    return () => {
      window.__nbOnboardingBack = null
    }
  }, [step, currentSlide])

  // -------------------------------------------------------------
  // STEP 1: CHOOSE LANGUAGE
  // -------------------------------------------------------------
  const handleSelectLanguage = (lang) => {
    hapticTick()
    i18n.changeLanguage(lang)
    appStorage.setItem('nb-lang', lang)
  }

  const handleLanguageContinue = () => {
    hapticTick()
    setStep(2)
    setCurrentSlide(0)
    appStorage.setItem('nb_onboarding_step', '2')
  }

  // -------------------------------------------------------------
  // STEP 2: THREE WALKTHROUGH SLIDES
  // -------------------------------------------------------------
  const slides = [
    {
      id: 0,
      title: i18n.language === 'kn' ? 'ನಿಮ್ಮ ಬಸ್ ಅನ್ನು ಲೈವ್ ಆಗಿ ನೋಡಿ' : 'See your bus live',
      subtitle:
        i18n.language === 'kn'
          ? 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡದ ನಿಖರ GPS ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು ನೈಜ ಸಮಯದ ಆಗಮನದ ಮಾಹಿತಿ.'
          : 'Live GPS location of NWKRTC & city buses with real-time ETA countdowns.',
      icon: Radio,
      illustration: (
        <div className="relative w-full h-44 sm:h-52 bg-surface-2 rounded-[24px] border border-line p-4 flex flex-col justify-between overflow-hidden shadow-soft">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, #0040FF 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
          
          <div className="relative z-10 flex items-center justify-between">
            <span className="px-3 py-1 bg-brand text-white rounded-pill text-xs font-heading font-extrabold shadow-xs">
              Route 12 • CBT Dharwad
            </span>
            <span className="text-[11px] font-bold text-success flex items-center gap-1.5 bg-success/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live 4m away
            </span>
          </div>

          <div className="relative z-10 my-auto py-2">
            <div className="w-full h-2.5 bg-line rounded-full relative overflow-visible">
              <motion.div
                animate={{ left: ['10%', '75%', '10%'] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                className="absolute -top-3 w-8 h-8 rounded-full bg-brand border-2 border-white shadow-float flex items-center justify-center text-white"
              >
                <Compass className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-1.5 font-bold text-text">
              <span className="w-3 h-3 rounded-full bg-[#0040FF] border-2 border-white shadow-xs" />
              <span>You (Station Rd)</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-text">Distance: 420m</span>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      title: i18n.language === 'kn' ? 'ಉತ್ತಮ ಮಾರ್ಗವನ್ನು ಯೋಜಿಸಿ' : 'Plan the best way',
      subtitle:
        i18n.language === 'kn'
          ? 'ನೇರ ಬಸ್‌ಗಳು ಮತ್ತು ತ್ವರಿತ ವರ್ಗಾವಣೆಗಳೊಂದಿಗೆ ದರಗಳು ಹಾಗೂ ವೇಳಾಪಟ್ಟಿಗಳನ್ನು ವೀಕ್ಷಿಸಿ.'
          : 'Direct and smart transfer routes across Hubballi-Dharwad with verified fare calculations.',
      icon: Compass,
      illustration: (
        <div className="relative w-full h-44 sm:h-52 bg-surface-2 rounded-[24px] border border-line p-4 flex flex-col justify-between overflow-hidden shadow-soft">
          <div className="p-3 bg-surface rounded-[16px] border border-line shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-navy-900 font-heading font-extrabold text-xs flex items-center justify-center shadow-xs">
                21
              </div>
              <div>
                <p className="text-xs font-bold text-text font-heading">HDMC Hubballi &rarr; Old Bus Stand</p>
                <p className="text-[10px] text-muted">Departs in 6 mins • 22 stops</p>
              </div>
            </div>
            <span className="font-heading font-extrabold text-xs text-text">₹18</span>
          </div>

          <div className="p-3 bg-surface rounded-[16px] border border-line shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-heading font-extrabold text-xs flex items-center justify-center shadow-xs">
                7A
              </div>
              <div>
                <p className="text-xs font-bold text-text font-heading">Dharwad BRTS &rarr; Railway Stn</p>
                <p className="text-[10px] text-muted">Direct Express • 14 mins</p>
              </div>
            </div>
            <span className="font-heading font-extrabold text-xs text-text">₹24</span>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: i18n.language === 'kn' ? 'ಉಳಿಸಿ, ಹಂಚಿಕೊಳ್ಳಿ ಮತ್ತು ಪ್ರಯಾಣಿಸಿ' : 'Save, share and travel smart',
      subtitle:
        i18n.language === 'kn'
          ? 'ಆಫ್‌ಲೈನ್ ವೇಳಾಪಟ್ಟಿಗಳು, SOS ತುರ್ತು ಹಂಚಿಕೆ, ಮತ್ತು ಕನ್ನಡ/ಇಂಗ್ಲಿಷ್ ಬೆಂಬಲ.'
          : 'Offline timetables, 1-tap journey sharing, SOS alert safety, and full Kannada support.',
      icon: Bookmark,
      illustration: (
        <div className="relative w-full h-44 sm:h-52 bg-surface-2 rounded-[24px] border border-line p-4 flex flex-col justify-center gap-3 overflow-hidden shadow-soft">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-surface rounded-[16px] border border-line shadow-xs flex items-center gap-2.5">
              <Bookmark className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-text font-heading">Saved Trips</p>
                <p className="text-[10px] text-muted">Offline ready</p>
              </div>
            </div>

            <div className="p-3 bg-surface rounded-[16px] border border-line shadow-xs flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-brand shrink-0" />
              <div>
                <p className="text-xs font-bold text-text font-heading">1-Tap Share</p>
                <p className="text-[10px] text-muted">Live ETA link</p>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-surface rounded-[16px] border border-line shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-muted" />
              <span className="text-xs font-bold text-text">ಕನ್ನಡ / English</span>
            </div>
            <span className="text-[10px] font-extrabold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
              Bilingual
            </span>
          </div>
        </div>
      ),
    },
  ]

  const handleNextSlide = () => {
    hapticTick()
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    } else {
      handleGoToSetup()
    }
  }

  const handleGoToSetup = () => {
    hapticTick()
    setStep(3)
    appStorage.setItem('nb_onboarding_step', '3')
  }

  // -------------------------------------------------------------
  // STEP 3: SET UP YOUR APP
  // -------------------------------------------------------------
  const handleCompleteSetup = () => {
    hapticTick()
    appStorage.setItem('nb_onboarding_step', '4')
    navigate('/get-started')
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between font-body select-none">
      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* STEP 1: CHOOSE LANGUAGE                                    */}
        {/* ========================================================= */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen w-full flex flex-col justify-between p-6 bg-gradient-to-b from-white via-sky-50 to-[#E4ECFF] text-navy-900"
          >
            {/* Top Logo */}
            <div className="pt-safe-top flex flex-col items-center text-center pt-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-[22px] bg-white border border-line shadow-float p-3 flex items-center justify-center mb-6"
              >
                <img src="/brand/logo-mark.png" alt="Nammooru Bus" className="w-full h-full object-contain" />
              </motion.div>

              <h1 className="font-heading font-extrabold text-2xl text-navy-900 leading-tight">
                Choose your language
              </h1>
              <p className="font-heading font-bold text-lg text-cobalt-600 mt-1">
                ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ
              </p>
              <p className="text-xs text-muted mt-2 max-w-xs">
                You can change this anytime later in profile settings.
              </p>
            </div>

            {/* Selectable Cards */}
            <div className="max-w-sm w-full mx-auto space-y-4 my-auto py-6">
              {/* English Card */}
              <button
                type="button"
                onClick={() => handleSelectLanguage('en')}
                className={`w-full p-5 rounded-[22px] border-2 transition-all flex items-center justify-between shadow-soft cursor-pointer ${
                  i18n.language !== 'kn'
                    ? 'bg-white border-[#0040FF] shadow-float ring-2 ring-[#0040FF]/20'
                    : 'bg-white/80 hover:bg-white border-line'
                }`}
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center font-heading font-extrabold text-base text-cobalt-600">
                    EN
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-navy-900">
                      English
                    </h3>
                    <p className="text-xs text-muted">Primary application language</p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                    i18n.language !== 'kn'
                      ? 'bg-[#0040FF] border-[#0040FF] text-white'
                      : 'border-line text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>

              {/* Kannada Card */}
              <button
                type="button"
                onClick={() => handleSelectLanguage('kn')}
                className={`w-full p-5 rounded-[22px] border-2 transition-all flex items-center justify-between shadow-soft cursor-pointer ${
                  i18n.language === 'kn'
                    ? 'bg-white border-[#0040FF] shadow-float ring-2 ring-[#0040FF]/20'
                    : 'bg-white/80 hover:bg-white border-line'
                }`}
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-heading font-extrabold text-base text-amber-700">
                    ಕ
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-navy-900">
                      ಕನ್ನಡ (Kannada)
                    </h3>
                    <p className="text-xs text-muted">ಸ್ಥಳೀಯ ಪ್ರಾದೇಶಿಕ ಭಾಷೆ</p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                    i18n.language === 'kn'
                      ? 'bg-[#0040FF] border-[#0040FF] text-white'
                      : 'border-line text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>
            </div>

            {/* Bottom Continue Button */}
            <div className="max-w-sm w-full mx-auto pb-safe-bottom">
              <Button
                variant="primary"
                size="lg"
                onClick={handleLanguageContinue}
                className="w-full h-14 rounded-full text-base font-heading font-extrabold shadow-float flex items-center justify-center gap-2"
              >
                <span>{i18n.language === 'kn' ? 'ಮುಂದುವರಿಸಿ (Continue)' : 'Continue'}</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: THREE WALKTHROUGH SLIDES                           */}
        {/* ========================================================= */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen w-full flex flex-col justify-between"
          >
            {/* Top Header */}
            <div
              className="pt-safe-top pb-6 px-6 relative overflow-hidden"
              style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
            >
              <div className="absolute -top-12 -left-12 w-48 h-48 rounded-[48px] bg-white/10 pointer-events-none transform rotate-12" />
              <div className="absolute -bottom-12 -right-12 w-52 h-52 rounded-[52px] bg-white/5 pointer-events-none transform -rotate-12" />

              <div className="flex items-center justify-between relative z-10 pt-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] bg-white p-0.5 shadow-xs flex items-center justify-center">
                    <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-heading font-extrabold text-base tracking-tight text-white">
                    Nammooru <span className="text-amber-400">Bus</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <LanguageToggle />
                  <button
                    type="button"
                    onClick={handleGoToSetup}
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition cursor-pointer text-white"
                  >
                    {t('common.skip', 'Skip')}
                  </button>
                </div>
              </div>

              {/* Counter Badge */}
              <div className="mt-5 flex items-center gap-2 relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  {currentSlide + 1} / {slides.length}
                </span>
              </div>
            </div>

            {/* Carousel Area */}
            <div className="flex-1 max-w-md w-full mx-auto px-6 py-6 flex flex-col justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slides[currentSlide].id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="flex-1 flex flex-col justify-center space-y-6"
                >
                  {slides[currentSlide].illustration}

                  <div className="space-y-2">
                    <h2 className="font-heading font-extrabold text-2xl text-text leading-tight">
                      {slides[currentSlide].title}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed">
                      {slides[currentSlide].subtitle}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom Controls */}
              <div className="pt-6 space-y-5 pb-safe-bottom">
                <div className="flex items-center justify-center gap-2">
                  {slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        hapticTick()
                        setCurrentSlide(idx)
                      }}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'w-8 bg-brand' : 'w-2.5 bg-line hover:bg-muted'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      hapticTick()
                      if (currentSlide > 0) {
                        setCurrentSlide((prev) => prev - 1)
                      } else {
                        setStep(1)
                      }
                    }}
                    className="w-14 h-14 rounded-full border border-line bg-surface hover:bg-surface-2 flex items-center justify-center text-text transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
                    aria-label="Previous"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleNextSlide}
                    className="flex-1 h-14 rounded-full text-base font-heading font-extrabold shadow-float flex items-center justify-center gap-2"
                  >
                    <span>
                      {currentSlide === slides.length - 1
                        ? (i18n.language === 'kn' ? 'ಮುಂದೆ (Next)' : 'Next')
                        : (i18n.language === 'kn' ? 'ಮುಂದೆ' : 'Next')}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: SET UP YOUR APP                                    */}
        {/* ========================================================= */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen w-full flex flex-col justify-between p-6 bg-bg text-text"
          >
            {/* Top Bar with Back Button */}
            <div className="pt-safe-top flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  hapticTick()
                  setStep(2)
                  setCurrentSlide(2)
                }}
                className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-text active:scale-95 transition shadow-xs cursor-pointer"
                title="Back to walkthrough"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted">
                  Personalize
                </span>
              </div>

              <div className="w-10" />
            </div>

            {/* Main Content */}
            <div className="max-w-md w-full mx-auto space-y-6 my-auto py-4">
              <div>
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-text">
                  {i18n.language === 'kn' ? 'ನಿಮ್ಮ ಆ್ಯಪ್ ಅನ್ನು ಹೊಂದಿಸಿ' : 'Set up your app'}
                </h1>
                <p className="text-xs text-muted mt-1">
                  {i18n.language === 'kn'
                    ? 'ನಿಮ್ಮ ನೆಚ್ಚಿನ ಭಾಷೆ ಮತ್ತು ಥೀಮ್ ಅನ್ನು ಈಗಲೇ ಆಯ್ಕೆಮಾಡಿ.'
                    : 'Choose your preferred language and display theme.'}
                </p>
              </div>

              {/* Section 1: Language */}
              <div className="p-4 bg-surface rounded-[22px] border border-line shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-brand" />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted">
                      {i18n.language === 'kn' ? 'ಭಾಷೆ (Language)' : 'Language'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-brand uppercase">
                    {i18n.language === 'kn' ? 'ಕನ್ನಡ' : 'English'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-surface-2 p-1 rounded-pill border border-line">
                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('en')}
                    className={`py-2 px-3 rounded-pill text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      i18n.language !== 'kn'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('kn')}
                    className={`py-2 px-3 rounded-pill text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      i18n.language === 'kn'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    <span>ಕನ್ನಡ</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Theme with 4 Preview Cards */}
              <div className="p-4 bg-surface rounded-[22px] border border-line shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted">
                    {i18n.language === 'kn' ? 'ಥೀಮ್ (Theme)' : 'Theme'}
                  </span>
                  <span className="text-[11px] font-bold text-brand capitalize">
                    {theme}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      key: 'light',
                      name: 'Light',
                      bgClass: 'bg-[#F2F6FF]',
                      cardClass: 'bg-white text-[#050F45] border-[#D9E2F7]',
                      barClass: 'bg-[#0040FF]',
                      icon: Sun,
                    },
                    {
                      key: 'dark',
                      name: 'Dark',
                      bgClass: 'bg-[#0A0B10]',
                      cardClass: 'bg-[#12141C] text-white border-[#2A2F42]',
                      barClass: 'bg-[#1A1D28]',
                      icon: Moon,
                    },
                    {
                      key: 'blue',
                      name: 'Blue',
                      bgClass: 'bg-[#050B2E]',
                      cardClass: 'bg-[#0B1450] text-white border-[#22308A]',
                      barClass: 'bg-[#101C66]',
                      icon: Moon,
                    },
                    {
                      key: 'system',
                      name: 'System',
                      isSys: true,
                      icon: Laptop,
                    },
                  ].map((tOption) => {
                    const isSelected = theme === tOption.key
                    const Icon = tOption.icon

                    return (
                      <button
                        key={tOption.key}
                        type="button"
                        onClick={() => {
                          hapticTick()
                          setTheme(tOption.key)
                        }}
                        className={`p-3 rounded-[18px] border-2 transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'border-brand bg-brand/5 shadow-soft ring-2 ring-brand/20'
                            : 'border-line bg-surface-2 hover:border-muted/40'
                        }`}
                      >
                        {/* Mini mockup illustration */}
                        <div className="w-full h-14 rounded-[10px] overflow-hidden border border-line/60 relative flex flex-col justify-between p-1.5 shadow-2xs">
                          {tOption.isSys ? (
                            <div className="w-full h-full bg-gradient-to-r from-[#F2F6FF] to-[#0A0B10] flex items-center justify-center">
                              <Laptop className="w-5 h-5 text-brand" />
                            </div>
                          ) : (
                            <div className={`w-full h-full ${tOption.bgClass} flex flex-col justify-between p-1`}>
                              <div className={`w-full h-2 rounded-[3px] ${tOption.barClass}`} />
                              <div className={`w-full h-5 rounded-[4px] border ${tOption.cardClass} flex items-center px-1`}>
                                <div className="w-2 h-2 rounded-full bg-brand" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Label & Active check mark */}
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-extrabold text-xs text-text flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-muted" />
                            <span>{tOption.name}</span>
                          </span>

                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? 'bg-brand border-brand text-white'
                                : 'border-line text-transparent'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="max-w-md w-full mx-auto pb-safe-bottom">
              <Button
                variant="primary"
                size="lg"
                onClick={handleCompleteSetup}
                className="w-full h-14 rounded-full text-base font-heading font-extrabold shadow-float flex items-center justify-center gap-2"
              >
                <span>{i18n.language === 'kn' ? "ಪ್ರಾರಂಭಿಸಿ (Let's go)" : "Let's go"}</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
