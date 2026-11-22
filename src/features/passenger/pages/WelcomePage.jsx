import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, MapPin, Compass, Bookmark, Share2, Globe2, Radio, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { appStorage } from '@/lib/storage'
import { hapticTick } from '@/lib/platform'

export default function WelcomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)

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
          {/* Mock Map Background Grid */}
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, #0040FF 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
          
          {/* Top route badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="px-3 py-1 bg-brand text-white rounded-pill text-xs font-heading font-extrabold shadow-xs">
              Route 12 • CBT Dharwad
            </span>
            <span className="text-[11px] font-bold text-success flex items-center gap-1.5 bg-success/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live 4m away
            </span>
          </div>

          {/* Animated Road & Bus Marker */}
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

          {/* Bottom user You dot */}
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
          {/* Ticket Sample 1 */}
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

          {/* Ticket Sample 2 */}
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

  const handleNext = () => {
    hapticTick()
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    hapticTick()
    navigate('/get-started')
  }

  const slide = slides[currentSlide]

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between font-body select-none">
      {/* Top Header with Road Ribbon & Skip Button */}
      <div
        className="pt-safe-top pb-6 px-6 relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
      >
        {/* Soft corner slabs */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-[48px] bg-white/10 pointer-events-none transform rotate-12" />
        <div className="absolute -bottom-12 -right-12 w-52 h-52 rounded-[52px] bg-white/5 pointer-events-none transform -rotate-12" />

        <div className="flex items-center justify-between relative z-10 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-white p-0.5 shadow-xs flex items-center justify-center">
              <img src="/brand/logo-mark.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-heading font-extrabold text-base tracking-tight" style={{ color: 'var(--on-brand)' }}>
              Nammooru <span className="text-amber-400">Bus</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition cursor-pointer"
              style={{ color: 'var(--on-brand)' }}
            >
              {t('common.skip', 'Skip')}
            </button>
          </div>
        </div>

        {/* Slide Counter Badge */}
        <div className="mt-6 flex items-center gap-2 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20" style={{ color: 'var(--on-brand)' }}>
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Main Slide Carousel Area */}
      <div className="flex-1 max-w-md w-full mx-auto px-6 py-6 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-center space-y-6"
          >
            {/* Visual illustration */}
            {slide.illustration}

            {/* Slide Title and Description */}
            <div className="space-y-2">
              <h2 className="font-heading font-extrabold text-2xl text-text leading-tight">
                {slide.title}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {slide.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Navigation & Morphing Dots */}
        <div className="pt-6 space-y-5">
          {/* Morphing Dots Indicator */}
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

          {/* Action Button: Next or Let's Go */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="w-full h-14 rounded-full text-base font-heading font-extrabold shadow-float flex items-center justify-center gap-2"
          >
            <span>{currentSlide === slides.length - 1 ? (i18n.language === 'kn' ? "ಪ್ರಾರಂಭಿಸಿ (Let's go)" : "Let's go") : (i18n.language === 'kn' ? 'ಮುಂದೆ' : 'Next')}</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
