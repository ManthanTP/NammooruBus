import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * SplashScreen — full-bleed signature gradient, white logo mark in center,
 * white wordmark, and road animation with traveling amber dot.
 * Fades into the app after 1.2s.
 */
export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        onFinish?.()
      }, 300)
    }, prefersReduced ? 300 : 1200)

    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-white select-none pointer-events-none"
          style={{ background: 'var(--gradient-brand)' }}
        >
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 rounded-[28px] bg-white/10 backdrop-blur-md p-4 flex items-center justify-center shadow-float mb-4 border border-white/20">
              <img
                src="/brand/logo-mark-transparent.png"
                alt="Nammooru Bus"
                className="w-16 h-16 object-contain filter drop-shadow-md"
              />
            </div>

            {/* Wordmark in white */}
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-white flex items-center gap-1.5">
              <span>Nammooru</span>
              <span className="text-amber-500">Bus</span>
            </h1>
            <p className="text-xs text-white/70 font-medium tracking-wide mt-1">
              Our town. Our bus.
            </p>
          </motion.div>

          {/* Road animation below logo */}
          <div className="relative mt-10 w-48 h-3 rounded-full overflow-hidden bg-white/20">
            {/* Dashed line */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #FFFFFF 0px, #FFFFFF 12px, transparent 12px, transparent 20px)',
              }}
            />
            {/* Amber dot bus travelling along the road */}
            <motion.div
              initial={{ left: '0%' }}
              animate={{ left: '90%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#FFB400]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
