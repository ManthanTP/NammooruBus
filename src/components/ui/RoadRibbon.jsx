import { motion, useReducedMotion } from 'framer-motion'

/**
 * RoadRibbon — Phase 5.8 & 5.13
 * Smooth curved road ribbon, 56px high, placed at the bottom of hero blocks.
 * - Road shape: fill white at 14% opacity
 * - Dashed center line: white at 60%, stroke 2, dasharray 10 10, round caps
 * - Optional animated draw with traveling amber dot
 */
export default function RoadRibbon({ className = '', animated = false }) {
  const prefersReduced = useReducedMotion()
  const isAnimated = animated && !prefersReduced

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-14 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Road Ribbon shape (14% white) */}
        <path
          d="M0 20 C 300 48, 600 8, 900 36 C 1050 48, 1150 16, 1200 24 L 1200 56 L 0 56 Z"
          fill="#FFFFFF"
          fillOpacity="0.14"
        />

        {/* Dashed Center Line (60% white, stroke 2, dasharray 10 10, round caps) */}
        {isAnimated ? (
          <motion.path
            d="M0 38 C 300 56, 600 28, 900 46 C 1050 54, 1150 36, 1200 40"
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeDasharray="10 10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        ) : (
          <path
            d="M0 38 C 300 56, 600 28, 900 46 C 1050 54, 1150 36, 1200 40"
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeDasharray="10 10"
            strokeLinecap="round"
          />
        )}

        {/* Amber traveling dot on the road */}
        {isAnimated && (
          <motion.circle
            r="4"
            fill="#FFB400"
            initial={{ cx: 0, cy: 38, opacity: 0 }}
            animate={{
              cx: [0, 300, 600, 900, 1050, 1200],
              cy: [38, 56, 28, 46, 54, 40],
              opacity: [0, 1, 1, 1, 1, 0],
            }}
            transition={{
              duration: 2.5,
              ease: 'easeInOut',
              delay: 0.6,
              repeat: Infinity,
              repeatDelay: 30,
            }}
          />
        )}
      </svg>
    </div>
  )
}
