import { motion } from 'framer-motion'
import { ArrowLeftRight, Clock, IndianRupee } from 'lucide-react'
import RouteBadge from './RouteBadge'

/**
 * Ticket — perforated ticket card matching Section 6:
 * - White card, radius 20, soft shadow, perforated edge (two notches + dashed divider)
 * - Left: route badge(s)
 * - Centre: big total minutes in Outfit 800 and "Next bus in N min"
 * - Right: fare
 * - Transfer shown as two badges with a small swap icon
 * - Best option has an amber "Best" ribbon
 */
export default function Ticket({ result, onClick, index = 0 }) {
  if (!result) return null

  const isBest = index === 0
  const isTransfer = result.type === 'transfer' || result.legs?.length > 1
  const firstLeg = result.legs?.[0]
  const secondLeg = result.legs?.[1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.18 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="relative bg-surface rounded-[20px] border border-line overflow-hidden transition-all duration-150 hover:border-brand cursor-pointer active:scale-[0.98] select-none text-left"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* "Best" amber ribbon badge */}
      {isBest && (
        <div
          className="absolute top-0 right-0 bg-amber-500 on-amber font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-bl-[10px] shadow-xs z-10"
          style={{ color: 'var(--on-amber)' }}
        >
          Best
        </div>
      )}

      {/* Main card body */}
      <div className="p-3.5 flex items-center justify-between gap-2.5">
        {/* Left: Route Badge(s) */}
        <div className="shrink-0 flex items-center gap-1.5">
          <RouteBadge code={firstLeg?.route?.code || 'BUS'} size="sm" />
          {isTransfer && secondLeg && (
            <>
              <ArrowLeftRight className="w-3.5 h-3.5 text-muted" />
              <RouteBadge code={secondLeg?.route?.code || 'BUS'} size="sm" />
            </>
          )}
        </div>

        {/* Centre: Big total minutes in Outfit 800 & Next bus in N min */}
        <div className="flex-1 min-w-0 text-center">
          <div className="font-heading font-extrabold text-xl text-ink-950 leading-tight">
            {result.totalMinutes} <span className="text-xs font-semibold text-muted">min</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-muted font-medium mt-0.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Next in {result.nextBusMin ?? 5} min</span>
          </div>
        </div>

        {/* Right: Fare */}
        <div className="text-right shrink-0 pr-1 max-w-[130px]">
          {result.totalFare != null ? (
            <div>
              <div className="font-heading font-extrabold text-base sm:text-lg text-ink-950 leading-tight flex items-center justify-end">
                <span className="text-xs text-muted mr-0.5">₹</span>
                <span>{result.totalFare}</span>
              </div>
              {isTransfer && result.fareBreakdown ? (
                <span className="text-[10px] font-semibold text-muted block truncate">
                  ({result.fareBreakdown})
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-muted block">
                  Direct
                </span>
              )}
            </div>
          ) : (
            <div>
              <span className="text-[11px] font-bold text-muted block leading-tight">
                Fare unavailable
              </span>
              <span className="text-[10px] font-semibold text-muted block">
                {isTransfer ? '1 transfer' : 'Direct'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Perforated edge divider with side notches */}
      <div className="relative flex items-center my-0 px-2">
        <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-sky-50 border-r border-line" />
        <div className="w-full border-t border-dashed border-line" />
        <div className="absolute -right-2.5 w-5 h-5 rounded-full bg-sky-50 border-l border-line" />
      </div>

      {/* Bottom strip: summary & board stop */}
      <div className="px-3.5 py-2 bg-sky-50/60 flex items-center justify-between text-xs text-muted">
        <span className="font-semibold text-ink-950 truncate max-w-[220px]">
          {result.summary || (firstLeg?.from?.name ? `From ${firstLeg.from.name}` : 'Tap for route stops')}
        </span>
        <span className="text-[11px] font-bold text-cobalt-500 shrink-0">
          Details &rarr;
        </span>
      </div>
    </motion.div>
  )
}
