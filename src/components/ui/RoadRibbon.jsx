/**
 * RoadRibbon — Phase 5.8
 * Smooth curved road ribbon, 56px high, placed at the bottom of hero blocks.
 * - Road shape: fill white at 14% opacity
 * - Dashed center line: white at 60%, stroke 2, dasharray 10 10, round caps
 * Used exclusively on Home and Login hero blocks.
 */
export default function RoadRibbon({ className = '' }) {
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
        <path
          d="M0 38 C 300 56, 600 28, 900 46 C 1050 54, 1150 36, 1200 40"
          stroke="#FFFFFF"
          strokeOpacity="0.6"
          strokeWidth="2"
          strokeDasharray="10 10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
