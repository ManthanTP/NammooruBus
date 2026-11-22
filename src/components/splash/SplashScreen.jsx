import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDataStore } from '@/store/dataStore'

/**
 * SplashScreen — Phase 5.8
 * - Background is pure WHITE in both light and dark themes
 * - Full color logo (/brand/logo-full.png) ~280px wide with width/height & decoding="sync"
 * - Two soft rounded cobalt slabs at 8% opacity in corners
 * - Light rounded bar with dashed cobalt line and moving amber dot
 * - Waits for: logo loaded + document.fonts.ready + dataStore ready
 * - Min duration: 900ms, max duration: 3000ms, then fades out
 * - Fallback: text "Nammooru Bus" in Outfit 800
 */
export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const startTimeRef = useRef(Date.now())

  // 1. Check fonts ready
  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsReady(true)).catch(() => setFontsReady(true))
    } else {
      setFontsReady(true)
    }
  }, [])

  // 2. Check dataStore ready
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

  // 3. Coordinate minimum 900ms and maximum 3000ms unmount
  useEffect(() => {
    let unmountTimer
    const minElapsed = () => Date.now() - startTimeRef.current >= 900
    const allReady = (imageLoaded || imageError) && fontsReady && dataReady

    const dismissSplash = () => {
      setVisible(false)
      setTimeout(() => {
        onFinish?.()
      }, 350)
    }

    if (allReady && minElapsed()) {
      dismissSplash()
    } else if (allReady) {
      const remainingMin = Math.max(0, 900 - (Date.now() - startTimeRef.current))
      unmountTimer = setTimeout(dismissSplash, remainingMin)
    }

    // Hard ceiling: max 3000ms
    const maxTimer = setTimeout(dismissSplash, 3000)

    return () => {
      if (unmountTimer) clearTimeout(unmountTimer)
      clearTimeout(maxTimer)
    }
  }, [imageLoaded, imageError, fontsReady, dataReady, onFinish])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-white select-none pointer-events-none overflow-hidden"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* Two very soft rounded cobalt slabs at 8% opacity in corners */}
          <div
            className="absolute -top-16 -left-16 w-56 h-56 rounded-[52px] pointer-events-none transform rotate-12"
            style={{ backgroundColor: 'rgba(0, 64, 255, 0.08)' }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-64 h-64 rounded-[64px] pointer-events-none transform -rotate-12"
            style={{ backgroundColor: 'rgba(0, 64, 255, 0.08)' }}
          />

          {/* Centered Logo */}
          <div className="relative z-10 flex flex-col items-center max-w-[280px] w-full">
            {!imageError ? (
              <img
                src="/brand/logo-full.png"
                alt="Nammooru Bus"
                width={280}
                height={95}
                decoding="sync"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className="w-full max-w-[280px] h-auto object-contain transition-opacity duration-300"
                style={{ opacity: imageLoaded ? 1 : 0.01 }}
              />
            ) : (
              <div className="text-center font-heading font-extrabold text-3xl tracking-tight text-[#050F45]">
                <span>Nammooru </span>
                <span className="text-[#0040FF]">Bus</span>
                <p className="text-xs text-[#5B6591] font-medium tracking-wide mt-1">
                  Our town. Our bus.
                </p>
              </div>
            )}

            {/* Road Loader: light rounded bar with dashed cobalt line and moving amber dot */}
            <div className="relative mt-10 w-48 h-3 rounded-full overflow-hidden bg-[#E4ECFF]">
              {/* Dashed cobalt line */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #0040FF 0px, #0040FF 10px, transparent 10px, transparent 18px)',
                }}
              />
              {/* Amber dot bus travelling along the road */}
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: '90%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#FFB400] shadow-[0_0_8px_#FFB400]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
