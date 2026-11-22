import React from 'react'
import { create } from 'zustand'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import i18n from '@/i18n'

function humanizeKey(key) {
  if (!key) return 'Notice'
  const lastPart = key.includes('.') ? key.split('.').pop() : key
  return lastPart
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function resolveToastMessage(msgOrKey, params = {}) {
  if (!msgOrKey || typeof msgOrKey !== 'string' || msgOrKey.trim() === '') {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[Toast] Empty toast message or key provided')
    }
    return 'Notification'
  }

  // If it's a dotted translation key (e.g. "toast.trip_saved")
  if (/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i.test(msgOrKey)) {
    if (i18n.exists(msgOrKey)) {
      const translated = i18n.t(msgOrKey, params)
      if (translated && translated !== msgOrKey) return translated
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn(`[Toast] Missing translation key: "${msgOrKey}"`)
    }
    return humanizeKey(msgOrKey)
  }

  return msgOrKey
}

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (input, legacyType = 'info') => {
    let message = ''
    let description = ''
    let type = legacyType
    let duration = 4000
    let action = null

    if (typeof input === 'string') {
      message = input
      type = legacyType || 'info'
    } else if (input && typeof input === 'object') {
      message = input.message || input.title || input.key || ''
      description = input.description || ''
      type = input.type || legacyType || 'info'
      duration = input.duration ?? (type === 'error' ? 6000 : 4000)
      action = input.action || null
    }

    const resolvedTitle = resolveToastMessage(message, input?.params)
    const resolvedDesc = description ? resolveToastMessage(description, input?.params) : ''

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const newToast = {
      id,
      title: resolvedTitle,
      description: resolvedDesc,
      type: ['success', 'error', 'info', 'warning'].includes(type) ? type : 'info',
      action,
      duration,
    }

    // Keep max 2 visible toasts (drop oldest)
    set((state) => {
      const existing = state.toasts.slice(-1)
      return { toasts: [...existing, newToast] }
    })

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clearAll: () => {
    set({ toasts: [] })
  },
}))

// High-level declarative toast API per Phase 5.10
export const toast = {
  success: (msgOrKey, opts = {}) =>
    useToastStore.getState().addToast({ message: msgOrKey, type: 'success', ...opts }),
  error: (msgOrKey, opts = {}) =>
    useToastStore.getState().addToast({ message: msgOrKey, type: 'error', duration: 6000, ...opts }),
  info: (msgOrKey, opts = {}) =>
    useToastStore.getState().addToast({ message: msgOrKey, type: 'info', ...opts }),
  warning: (msgOrKey, opts = {}) =>
    useToastStore.getState().addToast({ message: msgOrKey, type: 'warning', ...opts }),
}

const borderColors = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  info: 'var(--brand)',
  warning: 'var(--amber)',
}

const icons = {
  success: <CheckCircle2 className="w-5 h-5 shrink-0 text-success" />,
  error: <AlertCircle className="w-5 h-5 shrink-0 text-danger" />,
  info: <Info className="w-5 h-5 shrink-0 text-brand" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0 text-amber" />,
}

export function ToastContainer({ toasts: propToasts } = {}) {
  const storeToasts = useToastStore((state) => state.toasts)
  const toasts = propToasts || (typeof window === 'undefined' ? useToastStore.getState().toasts : storeToasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed z-50 pointer-events-none flex flex-col gap-2 max-w-sm w-[92%] sm:w-full bottom-20 left-1/2 -translate-x-1/2 md:bottom-auto md:top-16 md:right-6 md:left-auto md:translate-x-0"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            aria-live="polite"
            drag="x"
            dragConstraints={{ left: 0, right: 100 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 50 || info.offset.x < -50) {
                removeToast(t.id)
              }
            }}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className="pointer-events-auto min-h-[48px] bg-surface text-text rounded-[16px] border border-line p-3.5 flex items-center justify-between gap-3 select-none"
            style={{
              boxShadow: 'var(--shadow-float)',
              borderLeftWidth: '4px',
              borderLeftColor: borderColors[t.type] || borderColors.info,
            }}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {icons[t.type] || icons.info}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-heading font-bold text-text leading-tight">
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-[11px] text-muted leading-snug mt-0.5">
                    {t.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick?.()
                    removeToast(t.id)
                  }}
                  className="px-2.5 py-1 rounded-pill bg-brand text-white text-[11px] font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-muted hover:text-text transition p-1 cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
