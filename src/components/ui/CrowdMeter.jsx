import { Users } from 'lucide-react'

/**
 * CrowdMeter — crowd pill (Empty / Moderate / Full with 3-bar icon).
 */
export default function CrowdMeter({ level = 1, className = '' }) {
  const normLevel =
    level === 'full' || level === 3 || level === '3'
      ? 'full'
      : level === 'moderate' || level === 2 || level === '2'
        ? 'moderate'
        : 'empty'

  const config = {
    empty: {
      bars: 1,
      label: 'Seats free',
      color: 'bg-cobalt-500',
      textClass: 'text-cobalt-500',
    },
    moderate: {
      bars: 2,
      label: 'Filling up',
      color: 'bg-amber-500',
      textClass: 'text-amber-600',
    },
    full: {
      bars: 3,
      label: 'Packed',
      color: 'bg-danger',
      textClass: 'text-danger',
    },
  }[normLevel]

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-sky-50 border border-line ${className}`}>
      <Users className="w-3.5 h-3.5 text-muted" />
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((barIndex) => (
          <span
            key={barIndex}
            className={`w-1.5 h-2.5 rounded-full ${barIndex <= config.bars ? config.color : 'bg-line'
              }`}
          />
        ))}
      </div>
      <span className={`text-[10.5px] font-bold ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  )
}
