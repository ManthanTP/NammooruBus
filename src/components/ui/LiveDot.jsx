/**
 * LiveDot — amber pulsing dot indicating live/real-time data.
 */
export default function LiveDot({ className = '' }) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60" />
      <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-amber-500" />
    </span>
  )
}
