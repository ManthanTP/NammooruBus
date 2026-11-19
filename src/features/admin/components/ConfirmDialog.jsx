import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  const variantStyles = {
    danger: 'bg-danger text-white hover:opacity-90',
    warning: 'bg-warning text-ink hover:opacity-90',
    primary: 'bg-cobalt text-white hover:opacity-90',
  }[variant] || 'bg-danger text-white'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm bg-surface rounded-card border border-line p-6 shadow-float space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-ink font-heading">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-text-secondary hover:text-ink p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">{message}</p>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-page border border-line text-xs font-bold text-ink rounded-input hover:border-text-secondary transition"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-2.5 text-xs font-bold rounded-input shadow-soft transition ${variantStyles}`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
