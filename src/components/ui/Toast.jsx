import { create } from 'zustand'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: ({ message, type = 'info', duration = 3000 }) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6)
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Left-border accent colour per toast type */
const borderColors = {
  success: 'var(--color-success)',   // green
  error: 'var(--color-danger)',      // red
  info: 'var(--cobalt-500)',         // cobalt-500
  warning: 'var(--amber-500)',       // amber
}

const icons = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-success)' }} />,
  error:   <AlertCircle  className="w-4 h-4 shrink-0" style={{ color: 'var(--color-danger)' }} />,
  info:    <Info         className="w-4 h-4 shrink-0" style={{ color: 'var(--cobalt-500)' }} />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--amber-500)' }} />,
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 bg-white text-ink-950 text-xs font-semibold rounded-[12px] overflow-hidden"
            style={{
              boxShadow: 'var(--shadow-float)',
              borderLeft: `4px solid ${borderColors[toast.type] ?? borderColors.info}`,
            }}
          >
            <div className="flex items-center gap-2">
              {icons[toast.type] ?? icons.info}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-ink-950 transition p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
