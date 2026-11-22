import { MapPin, Footprints, Bus, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import RouteBadge from './RouteBadge'

/**
 * Stepper — vertical road-themed journey timeline.
 * Features a road rail (white road with dashed center line on sky-100 rail),
 * with custom node types: walk, board, transfer, arrive.
 */
export default function Stepper({ steps = [], className = '' }) {
  return (
    <div className={`relative pl-8 space-y-6 ${className}`}>
      {/* The Road Rail (vertical white road with dashed amber/white line on sky-100 base) */}
      <div className="absolute left-3 top-3 bottom-3 w-3 bg-sky-100 rounded-full overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, var(--cobalt-500) 0px, var(--cobalt-500) 6px, transparent 6px, transparent 12px)',
          }}
        />
      </div>

      {steps.map((step, idx) => {
        const isFirst = idx === 0
        const isLast = idx === steps.length - 1

        return (
          <div key={idx} className="relative">
            {/* Node Icon on Road Rail */}
            <div className="absolute -left-8 top-1.5 flex items-center justify-center">
              {step.type === 'walk' ? (
                <div className="w-6 h-6 rounded-full bg-white border-2 border-navy-900 text-navy-900 flex items-center justify-center shadow-xs">
                  <Footprints className="w-3 h-3" />
                </div>
              ) : step.type === 'transfer' ? (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center shadow-xs">
                  <ArrowLeftRight className="w-3 h-3" />
                </div>
              ) : isLast ? (
                <div className="w-7 h-7 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center shadow-xs">
                  <MapPin className="w-4 h-4 fill-current" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-white border-2 border-cobalt-500 text-cobalt-500 flex items-center justify-center shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-cobalt-500" />
                </div>
              )}
            </div>

            {/* Step Content Card */}
            <div
              className="bg-white rounded-[16px] p-4 border border-line"
              style={{ boxShadow: 'var(--shadow-soft)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {step.route && (
                      <RouteBadge
                        code={step.route.route_number || step.route.code}
                        size="xs"
                      />
                    )}
                    <h4 className="font-heading font-bold text-sm text-ink-950">
                      {step.title}
                    </h4>
                  </div>
                  {step.subtitle && (
                    <p className="text-xs text-muted font-medium">
                      {step.subtitle}
                    </p>
                  )}
                </div>

                {step.time && (
                  <span className="text-xs font-semibold text-cobalt-500 shrink-0">
                    {step.time}
                  </span>
                )}
              </div>

              {step.details && (
                <div className="mt-2 pt-2 border-t border-line text-xs text-muted flex items-center justify-between">
                  <span>{step.details}</span>
                  {step.fare && (
                    <span className="font-bold text-ink-950">₹{step.fare}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
