import { motion } from 'framer-motion'
import { ArrowRight, Clock, IndianRupee } from 'lucide-react'
import RouteBadge from './RouteBadge'
import SegmentBar from './SegmentBar'

export default function Ticket({ result, onClick, index = 0 }) {
  if (!result) return null

  const isDirect = result.type === 'direct'
  const firstLeg = result.legs[0]
  const secondLeg = result.legs[1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="relative flex bg-surface rounded-card border border-line shadow-soft hover:border-cobalt hover:shadow-float transition cursor-pointer overflow-hidden group select-none text-left"
    >
      {/* Main Ticket Section */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          {/* Header badges and timing */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <RouteBadge code={firstLeg?.route?.code} color={firstLeg?.route?.color} size="sm" />
              {secondLeg && (
                <>
                  <span className="text-[11px] font-bold text-text-secondary">&rarr;</span>
                  <RouteBadge code={secondLeg?.route?.code} color={secondLeg?.route?.color} size="sm" />
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-ink">
              <Clock className="w-3.5 h-3.5 text-cobalt" />
              <span>{result.totalMinutes} min</span>
            </div>
          </div>

          {/* Route summary */}
          <p className="text-xs font-semibold text-ink mb-1 truncate">
            {result.summary}
          </p>

          {/* Next bus info */}
          <p className="text-[11px] text-text-secondary">
            Next bus in <strong className="text-ink font-semibold">{result.nextBusMin} min</strong>
          </p>
        </div>

        {/* Segment bar */}
        <div className="mt-3">
          <SegmentBar legs={result.legs} totalMinutes={result.totalMinutes} />
        </div>
      </div>

      {/* Dashed Stub Divider with Top/Bottom Notch */}
      <div className="relative flex flex-col items-center justify-center py-2 px-1">
        {/* Top notch */}
        <div className="absolute -top-3 w-6 h-6 bg-page rounded-full border border-line" />
        {/* Dashed vertical line */}
        <div className="h-full border-r-2 border-dashed border-line" />
        {/* Bottom notch */}
        <div className="absolute -bottom-3 w-6 h-6 bg-page rounded-full border border-line" />
      </div>

      {/* Ticket Stub (Fare & CTA) */}
      <div className="w-24 bg-page/40 p-3 flex flex-col items-center justify-between text-center shrink-0">
        <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">
          Fare
        </span>
        <div className="my-auto">
          <div className="text-lg font-extrabold text-ink flex items-center justify-center font-heading">
            <span className="text-xs mr-0.5">₹</span>
            <span>{result.totalFare}</span>
          </div>
          <span className="text-[10px] text-text-secondary block">
            {isDirect ? 'Direct' : '1 Transfer'}
          </span>
        </div>
        <div className="w-7 h-7 rounded-full bg-cobalt text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  )
}
