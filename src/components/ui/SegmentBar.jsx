import { Footprints, Bus, ArrowRight } from 'lucide-react'

export default function SegmentBar({ legs = [], totalMinutes }) {
  if (!legs || legs.length === 0) return null

  return (
    <div className="w-full flex items-center gap-1.5 py-1">
      {/* Initial walk */}
      <div className="flex items-center gap-1 text-[11px] font-medium text-text-secondary shrink-0">
        <Footprints className="w-3.5 h-3.5 text-text-secondary" />
        <span>3m</span>
      </div>

      <ArrowRight className="w-3 h-3 text-line shrink-0" />

      {/* Legs */}
      {legs.map((leg, idx) => {
        const routeColor = leg.route?.color || 'var(--color-cobalt)'
        return (
          <div key={idx} className="flex-1 flex items-center gap-1.5 min-w-0">
            {/* Bus segment */}
            <div
              className="flex-1 h-6 rounded-pill px-2 flex items-center justify-between text-white text-[11px] font-bold shadow-xs truncate"
              style={{ backgroundColor: routeColor }}
              title={`${leg.route?.code} (${leg.durationMin} min)`}
            >
              <span className="flex items-center gap-1 truncate">
                <Bus className="w-3 h-3 shrink-0" />
                <span className="truncate">{leg.route?.code}</span>
              </span>
              <span className="text-[10px] opacity-90 ml-1 shrink-0">{leg.durationMin}m</span>
            </div>

            {/* If transfer between legs */}
            {idx < legs.length - 1 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-warning shrink-0 px-1 bg-warning/10 rounded-pill">
                <span>6m transfer</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
