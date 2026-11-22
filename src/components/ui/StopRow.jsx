import { MapPin } from 'lucide-react'

/**
 * StopRow — single stop item on a route or nearby list.
 */
export default function StopRow({
  stop,
  index,
  isTerminal = false,
  isPassed = false,
  eta,
  distance,
  onClick,
  className = '',
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex items-center gap-3.5 py-3 px-3 rounded-[12px] transition ${
        onClick ? 'hover:bg-sky-50 cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Node Dot / Pin */}
      <div className="relative flex items-center justify-center shrink-0 w-6 h-6">
        {isTerminal ? (
          <div className="w-5 h-5 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center shadow-xs">
            <MapPin className="w-3 h-3 fill-current" />
          </div>
        ) : (
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 bg-white ${
              isPassed ? 'border-muted/50' : 'border-cobalt-500'
            }`}
          />
        )}
      </div>

      {/* Stop Name & Secondary Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            isPassed ? 'text-muted line-through' : 'text-ink-950'
          }`}
        >
          {stop.name || stop.name_en || 'Stop'}
        </p>
        {(stop.name_kn || distance) && (
          <p className="text-xs text-muted truncate">
            {stop.name_kn} {distance && `• ${distance}`}
          </p>
        )}
      </div>

      {/* ETA / Headway badge */}
      {eta && (
        <span className="text-xs font-bold text-cobalt-500 bg-sky-100 px-2 py-0.5 rounded-pill shrink-0">
          {eta}
        </span>
      )}
    </div>
  )
}
