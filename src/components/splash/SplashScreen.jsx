import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDataStore } from '@/store/dataStore'
import { hideNativeSplash, hapticTick, setStatusBarTheme } from '@/lib/platform'

/**
 * SplashScreen — Phase 6 Animated In-App Launch
 * 2.2s total sequence, skippable by tap after 1.0s, reduced-motion fallback (0.8s static).
 * Pure white background in all three themes with matching status bar.
 */
export default function SplashScreen({ onFinish }) {
  const prefersReduced = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const [stage, setStage] = useState(0) // 0: init, 1: logo, 2: road & bus, 3: wordmark, 4: ready to exit
  const [fontsReady, setFontsReady] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const startTimeRef = useRef(Date.now())
  const finishedRef = useRef(false)

  // Native status bar & splash handover
  useEffect(() => {
    setStatusBarTheme('light', true)
    hideNativeSplash()
  }, [])

  // Check fonts ready
  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsReady(true)).catch(() => setFontsReady(true))
    } else {
      setFontsReady(true)
    }
  }, [])

  // Check dataStore ready
  useEffect(() => {
    const checkData = () => {
      const state = useDataStore.getState()
      if (!state.loading) {
        setDataReady(true)
        return true
      }
      return false
    }

    if (!checkData()) {
      const interval = setInterval(() => {
        if (checkData()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [])

  // Stage timeline sequence
  useEffect(() => {
    if (prefersReduced) {
      const timer = setTimeout(() => {
        dismissSplash()
      }, 800)
      return () => clearTimeout(timer)
    }

    const t1 = setTimeout(() => setStage(1), 200) // 0.2s: logo pop
    const t2 = setTimeout(() => setStage(2), 600) // 0.6s: road & bus
    const tHaptic = setTimeout(() => hapticTick(), 1100) // 1.1s: pin lands with haptic
    const t3 = setTimeout(() => setStage(3), 1200) // 1.2s: wordmark & tagline
    const t4 = setTimeout(() => setStage(4), 1800) // 1.8s: prepare exit

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(tHaptic)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [prefersReduced])

  // Coordinate completion
  const dismissSplash = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setVisible(false)
    setTimeout(() => {
      onFinish?.()
    }, 350)
  }

  useEffect(() => {
    if (prefersReduced) return

    const minElapsed = () => Date.now() - startTimeRef.current >= 2000
    const allReady = fontsReady && dataReady

    if (allReady && minElapsed() && stage >= 4) {
      dismissSplash()
    } else if (stage >= 4) {
      const remaining = Math.max(100, 2200 - (Date.now() - startTimeRef.current))
      const timer = setTimeout(dismissSplash, remaining)
      return () => clearTimeout(timer)
    }

    // Hard ceiling: 3200ms
    const maxTimer = setTimeout(dismissSplash, 3200)
    return () => clearTimeout(maxTimer)
  }, [fontsReady, dataReady, stage, prefersReduced])

  // Handle tap to skip after 1.0s
  const handleTap = () => {
    if (Date.now() - startTimeRef.current >= 1000) {
      dismissSplash()
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onClick={handleTap}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-white select-none overflow-hidden cursor-pointer"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* 0.0s: Soft cobalt and navy rounded "N" slabs slide in from corners */}
          <motion.div
            initial={prefersReduced ? { opacity: 0.08 } : { x: -80, y: -80, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 0.08 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute -top-12 -left-12 w-64 h-64 rounded-[56px] pointer-events-none transform rotate-12"
            style={{ backgroundColor: '#0040FF' }}
          />
          <motion.div
            initial={prefersReduced ? { opacity: 0.08 } : { x: 80, y: 80, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 0.08 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute -bottom-16 -right-16 w-72 h-72 rounded-[64px] pointer-events-none transform -rotate-12"
            style={{ backgroundColor: '#00136E' }}
          />

          {/* Center Branding Container */}
          <div className="relative z-10 flex flex-col items-center max-w-[320px] w-full">
            {/* 0.2s: Logo Mark spring pop-in */}
            <motion.div
              initial={prefersReduced ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
              animate={stage >= 1 || prefersReduced ? { scale: 1, opacity: 1 } : {}}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] bg-white flex items-center justify-center shadow-float p-3 relative"
            >
              <img
                src="/brand/logo-mark.png"
                alt="Nammooru Bus"
                className="w-full h-full object-contain"
                decoding="sync"
              />
            </motion.div>

            {/* 0.6s: Road Ribbon + Moving Bus + Dropping Amber Pin */}
            {!prefersReduced ? (
              <div className="relative mt-7 w-56 h-10 flex items-center justify-center overflow-visible">
                {/* SVG Road Ribbon with dashed center line */}
                <svg className="w-full h-4 overflow-visible" viewBox="0 0 220 16" fill="none">
                  {/* Road Base */}
                  <path
                    d="M 10 8 L 210 8"
                    stroke="#E4ECFF"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Road Dashed Line drawing left to right */}
                  <motion.path
                    d="M 16 8 L 204 8"
                    stroke="#0040FF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="8 8"
                    initial={{ pathLength: 0 }}
                    animate={stage >= 2 ? { pathLength: 1 } : {}}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />
                </svg>

                {/* Traveling Bus Graphic */}
                {stage >= 2 && (
                  <motion.div
                    initial={{ left: '8%' }}
                    animate={{ left: '84%' }}
                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0040FF] shadow-soft flex items-center justify-center z-10"
                  >
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="3" width="16" height="15" rx="3" />
                      <circle cx="8" cy="15" r="1.5" fill="#FFB400" />
                      <circle cx="16" cy="15" r="1.5" fill="#FFB400" />
                      <rect x="6" y="5" width="12" height="5" rx="1" fill="#FFFFFF" />
                    </svg>
                  </motion.div>
                )}

                {/* Amber Pin dropping at destination with bounce */}
                {stage >= 2 && (
                  <motion.div
                    initial={{ y: -24, opacity: 0, scale: 0.4 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 500, damping: 18 }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFB400] shadow-[0_0_10px_#FFB400] border-2 border-white"
                  />
                )}
              </div>
            ) : (
              <div className="w-32 h-1 bg-cobalt-500/20 rounded-full my-4" />
            )}

            {/* 1.2s: Wordmark "Nammooru" + "Bus" rising */}
            <div className="mt-5 text-center">
              <motion.div
                initial={prefersReduced ? { opacity: 1 } : { y: 16, opacity: 0 }}
                animate={stage >= 3 || prefersReduced ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight leading-none text-[#050F45]"
              >
                <span>Nammooru </span>
                <span className="text-[#0040FF]">Bus</span>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
                animate={stage >= 3 || prefersReduced ? { opacity: 1 } : {}}
                transition={{ delay: prefersReduced ? 0 : 0.2, duration: 0.4 }}
                className="text-xs sm:text-sm font-semibold tracking-wide text-[#5B6591] mt-2 font-body"
              >
                Our town. Our bus. • Hubballi-Dharwad
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
