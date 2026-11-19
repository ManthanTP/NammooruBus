import { Users } from 'lucide-react'

export default function CrowdMeter({ level, className = '' }) {
  if (!level) return null

  const config = {
    empty: {
      bars: 1,
      label: 'Seats free',
      color: 'bg-success',
      textClass: 'text-success',
    },
    moderate: {
      bars: 2,
      label: 'Filling up',
      color: 'bg-warning',
      textClass: 'text-warning',
    },
    full: {
      bars: 3,
      label: 'Packed',
      color: 'bg-danger',
      textClass: 'text-danger',
    },
  }[level]

  if (!config) return null

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-page border border-line ${className}`}>
      <Users className="w-3.5 h-3.5 text-text-secondary" />
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((barIndex) => (
          <span
            key={barIndex}
            className={`w-1.5 h-3 rounded-xs ${
              barIndex <= config.bars ? config.color : 'bg-line'
            }`}
          />
        ))}
      </div>
      <span className={`text-[11px] font-bold ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  )
}
