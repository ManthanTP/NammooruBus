import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Download, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { hapticTick, openExternalUrl, isNative } from '@/lib/platform'
import { dismissUpdateReminder } from '@/lib/versionCheck'
import { App } from '@capacitor/app'

export default function UpdateModal({ isOpen, updateInfo, onClose }) {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'kn' ? 'kn' : 'en'

  useEffect(() => {
    if (!isOpen) return

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !updateInfo?.latest) return null

  const { latest, installed, isRequired, releaseNotes } = updateInfo
  const currentLangNotes = releaseNotes?.[lang] || releaseNotes?.en || []
  const displayNotes = Array.isArray(currentLangNotes) ? currentLangNotes.slice(0, 6) : []

  const handleUpdateNow = () => {
    hapticTick()
    // Open system browser to download page or direct APK URL
    const targetUrl = latest.downloadPage
      ? `https://nammoorubus.vercel.app${latest.downloadPage}`
      : (latest.apkUrl?.startsWith('http') ? latest.apkUrl : `https://nammoorubus.vercel.app${latest.apkUrl}`)
    
    openExternalUrl(targetUrl)
  }

  const handleRemindLater = () => {
    if (isRequired) return
    hapticTick()
    dismissUpdateReminder()
    onClose?.()
  }

  const handleOverlayClick = () => {
    if (isRequired) {
      // Required update cannot be dismissed by clicking outside
      return
    }
    handleRemindLater()
  }

  const handleSeeDetails = () => {
    hapticTick()
    openExternalUrl(`https://nammoorubus.vercel.app${latest.whatsNewPage || '/whats-new'}`)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Bottom Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg bg-surface text-text rounded-t-[32px] sm:rounded-[32px] border border-line shadow-float p-6 overflow-hidden z-10"
          style={{
            paddingBottom: 'max(24px, calc(16px + var(--safe-bottom)))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-white border border-line p-1 shadow-xs flex items-center justify-center shrink-0">
                <img src="/brand/logo-mark.png" alt="Nammooru Bus" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-lg text-text">
                    {lang === 'kn' ? 'ಹೊಸ ಆವೃತ್ತಿ ಲಭ್ಯವಿದೆ' : 'Update available'}
                  </h3>
                  {isRequired && (
                    <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-extrabold uppercase">
                      Required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-muted bg-surface-2 px-2 py-0.5 rounded-pill border border-line">
                    v{installed?.versionName || '1.0.0'} &rarr; v{latest.versionName}
                  </span>
                  {latest.apkSize && (
                    <span className="text-[11px] font-semibold text-muted">
                      • {latest.apkSize}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* What's New Section */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>{lang === 'kn' ? 'ಹೊಸತೇನಿದೆ?' : "What's new"}</span>
              </span>
              <button
                type="button"
                onClick={handleSeeDetails}
                className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{lang === 'kn' ? 'ವಿವರಗಳನ್ನು ನೋಡಿ' : 'See full details'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-[16px] bg-surface-2 p-3.5 border border-line space-y-2">
              {displayNotes.length > 0 ? (
                displayNotes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-text leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
                    <span>{note}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted">
                  {lang === 'kn' ? 'ಕಾರ್ಯಕ್ಷಮತೆ ಸುಧಾರಣೆಗಳು ಮತ್ತು ದೋಷ ಪರಿಹಾರಗಳು.' : 'Performance improvements and bug fixes.'}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="lg"
              onClick={handleUpdateNow}
              className="w-full h-13 rounded-full font-heading font-extrabold text-sm shadow-soft flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'kn' ? 'ಈಗಲೇ ನವೀಕರಿಸಿ (Update now)' : 'Update now'}</span>
            </Button>

            {!isRequired && (
              <button
                type="button"
                onClick={handleRemindLater}
                className="w-full py-2.5 text-xs font-bold text-muted hover:text-text transition text-center cursor-pointer"
              >
                {lang === 'kn' ? 'ನಂತರ ನೆನಪಿಸಿ' : 'Remind me later'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
