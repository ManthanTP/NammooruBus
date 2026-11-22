import { ArrowRight, ArrowLeftRight, Clock, IndianRupee } from 'lucide-react'
import RouteBadge from './RouteBadge'

/**
 * TicketCard — signature ticket-style card with perforated edge,
 * notches on both sides, dashed divider, LED route badges,
 * Outfit 800 duration, and optional amber "Best" ribbon.
 */
export default function TicketCard({
  route,
  routes = [],
  durationMinutes,
  nextBusMinutes,
  fare,
  isBest = false,
  isTransfer = false,
  transferRoute,
  fromName,
  toName,
  onClick,
  className = '',
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`relative bg-white rounded-[20px] border border-line overflow-hidden transition-all duration-150 hover:border-cobalt-500 cursor-pointer active:scale-[0.99] ${className}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* "Best" amber ribbon badge */}
      {isBest && (
        <div className="absolute top-0 right-0 bg-amber-500 text-navy-900 font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-[12px] shadow-xs z-10">
          Best Option
        </div>
      )}

      {/* Top half: route badges, duration, fare */}
      <div className="p-4 flex items-center justify-between gap-3">
        {/* Left: Route Badge(s) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isTransfer && transferRoute ? (
            <div className="flex items-center gap-1">
              <RouteBadge code={route?.route_number || route?.code || 'BUS'} size="sm" />
              <ArrowLeftRight className="w-3.5 h-3.5 text-muted" />
              <RouteBadge code={transferRoute?.route_number || transferRoute?.code || 'BUS'} size="sm" />
            </div>
          ) : (
            <RouteBadge code={route?.route_number || route?.code || 'BUS'} size="md" />
          )}
        </div>

        {/* Centre: Big total minutes & next bus */}
        <div className="flex-1 text-center min-w-0">
          <div className="font-heading font-extrabold text-lg text-ink-950 leading-none">
            {durationMinutes ? `${durationMinutes} min` : '--'}
          </div>
          {nextBusMinutes !== undefined && (
            <span className="text-[11px] font-semibold text-muted flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Next in {nextBusMinutes}m</span>
            </span>
          )}
        </div>

        {/* Right: Fare */}
        <div className="text-right shrink-0">
          <div className="font-heading font-extrabold text-base text-ink-950 flex items-center justify-end">
            <span className="text-xs mr-0.5 text-muted">₹</span>
            <span>{fare ?? '--'}</span>
          </div>
          <span className="text-[10px] font-semibold text-muted block">Direct</span>
        </div>
      </div>

      {/* Perforated divider with two circular side notches */}
      <div className="relative flex items-center my-0 px-3">
        {/* Left notch */}
        <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-sky-50 border-r border-line" />
        {/* Dashed line */}
        <div className="w-full border-t-2 border-dashed border-line" />
        {/* Right notch */}
        <div className="absolute -right-2.5 w-5 h-5 rounded-full bg-sky-50 border-l border-line" />
      </div>

      {/* Bottom half: terminal stops & indicator */}
      <div className="px-4 py-2.5 bg-sky-50/50 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-ink-950 truncate max-w-[120px]">{fromName || 'Origin'}</span>
          <ArrowRight className="w-3 h-3 text-muted shrink-0" />
          <span className="font-semibold text-ink-950 truncate max-w-[120px]">{toName || 'Destination'}</span>
        </div>
        <span className="text-[11px] font-bold text-cobalt-500 hover:underline shrink-0">
          View details &rarr;
        </span>
      </div>
    </div>
  )
}
