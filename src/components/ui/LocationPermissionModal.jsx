import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, X } from 'lucide-react'
import Button from './Button'
import { GeolocationService } from '@/lib/location'

export default function LocationPermissionModal({ isOpen, onClose, onPermissionGranted }) {
  const { t, i18n } = useTranslation()

  if (!isOpen) return null

  const handleAllow = async () => {
    const granted = await GeolocationService.requestPermission()
    if (granted) {
      onPermissionGranted?.()
    }
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 bg-surface border border-line text-text w-full max-w-sm rounded-[28px] p-6 shadow-2xl space-y-4 pb-safe-bottom"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center shadow-xs">
              <Navigation className="w-6 h-6" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-muted hover:text-text active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-heading font-extrabold text-lg text-text">
              {i18n.language === 'kn' ? 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ' : 'Find buses near you'}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {i18n.language === 'kn'
                ? 'ಹತ್ತಿರದ ಬಸ್ ನಿಲ್ದಾಣಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು, ನಡಿಗೆಯ ದೂರ ತಿಳಿಯಲು ಹಾಗೂ ಬರುವ ಬಸ್ ದೂರವನ್ನು ಅಂದಾಜಿಸಲು ಸ್ಥಳ ಅನುಮತಿ ಅಗತ್ಯವಿದೆ.'
                : 'Nammooru Bus uses your location in the foreground to find nearby stops, calculate walking directions, and show your distance to approaching buses.'}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleAllow}
              className="w-full h-12 rounded-full font-heading font-bold shadow-soft"
            >
              {i18n.language === 'kn' ? 'ಸ್ಥಳ ಅನುಮತಿಸಿ' : 'Allow Location'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-muted hover:text-text font-bold"
            >
              {i18n.language === 'kn' ? 'ನಂತರ' : 'Not now'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
