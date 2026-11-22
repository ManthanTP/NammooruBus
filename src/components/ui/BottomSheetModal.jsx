import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'

/**
 * BottomSheetModal — lightweight bottom modal for confirmation dialogs.
 */
export default function BottomSheetModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'primary', // 'primary' | 'danger'
  children,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-950/40 backdrop-blur-xs"
          />

          {/* Modal Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-md bg-white rounded-t-[28px] md:rounded-[28px] p-6 space-y-4 border border-line shadow-float"
          >
            {/* Grab handle on mobile */}
            <div className="w-10 h-1 bg-line rounded-full mx-auto md:hidden" />

            <div className="space-y-1">
              <h3 className="font-heading font-extrabold text-lg text-ink-950">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-muted">
                  {description}
                </p>
              )}
            </div>

            {children}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={onClose}
                className="flex-1 text-muted hover:text-ink-950"
              >
                {cancelLabel}
              </Button>
              <Button
                variant={confirmVariant}
                size="md"
                onClick={onConfirm}
                className="flex-1 font-bold"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
