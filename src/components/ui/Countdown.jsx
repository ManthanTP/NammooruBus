import { motion, AnimatePresence } from 'framer-motion'

export default function Countdown({ value, unit = 'min', label = '', className = '' }) {
  const displayVal = value !== null && value !== undefined ? String(value) : '--'

  return (
    <div className={`inline-flex items-baseline gap-1 ${className}`}>
      {label && <span className="text-xs text-text-secondary mr-1">{label}</span>}
      <div className="relative inline-flex overflow-hidden h-7">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayVal}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="font-bold text-xl text-ink font-heading"
          >
            {displayVal}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-xs font-semibold text-text-secondary">{unit}</span>
    </div>
  )
}
