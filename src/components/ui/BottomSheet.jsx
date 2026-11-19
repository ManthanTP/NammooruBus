import { useState, useRef, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

// Snap heights as percentages of window height
const SNAPS = [0.30, 0.56, 0.86]

export default function BottomSheet({ children, initialSnap = 1 }) {
  const controls = useAnimation()
  const sheetRef = useRef(null)
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap)
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800)

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate pixel height for each snap
  const snapHeights = SNAPS.map((fraction) => Math.round(windowHeight * fraction))

  useEffect(() => {
    controls.start({
      height: snapHeights[currentSnapIndex],
      transition: { type: 'spring', damping: 30, stiffness: 350 },
    })
  }, [currentSnapIndex, windowHeight, controls])

  const handleDragEnd = (_event, info) => {
    const currentHeight = sheetRef.current ? sheetRef.current.offsetHeight : snapHeights[currentSnapIndex]
    const projectedHeight = currentHeight - info.velocity.y * 0.15

    // Find closest snap height
    let closestIndex = 0
    let minDiff = Infinity
    snapHeights.forEach((h, idx) => {
      const diff = Math.abs(h - projectedHeight)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = idx
      }
    })

    setCurrentSnapIndex(closestIndex)
  }

  return (
    <motion.div
      ref={sheetRef}
      animate={controls}
      initial={{ height: snapHeights[initialSnap] }}
      className="fixed bottom-0 left-0 right-0 z-20 bg-surface rounded-t-sheet border-t border-line shadow-float flex flex-col will-change-transform overflow-hidden"
      style={{
        boxShadow: '0 -8px 30px rgba(14, 20, 51, 0.12)',
      }}
    >
      {/* Draggable header / grab handle */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="w-10 h-1.5 bg-line rounded-pill hover:bg-text-secondary/40 transition-colors" />
      </motion.div>

      {/* Sheet Content with scroll and bottom padding for the floating tab bar */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 overscroll-contain">
        {children}
      </div>
    </motion.div>
  )
}
