import { ArrowUpDown, Search, MapPin, Navigation, Clock, Bookmark } from 'lucide-react'
import Button from './Button'
import Chip from './Chip'

/**
 * SearchCard — search box overlapping hero bottom edge.
 * From (cobalt dot), To (amber pin), swap button, primary gradient CTA button,
 * and quick filter chips ("Your location", "Recent", "Saved").
 */
export default function SearchCard({
  fromText = '',
  toText = '',
  onFromClick,
  onToClick,
  onSwap,
  onSubmit,
  onUseLocation,
  onRecentClick,
  onSavedClick,
  fromPlaceholder = 'Select starting stop...',
  toPlaceholder = 'Select destination stop...',
  submitLabel = 'Find buses',
  className = '',
}) {
  return (
    <div
      className={`bg-surface rounded-[20px] p-5 border border-line space-y-4 ${className}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="relative space-y-2">
        {/* FROM Input Box */}
        <div
          onClick={onFromClick}
          role="button"
          tabIndex={0}
          className="flex items-center gap-3 p-3.5 bg-surface-2 rounded-[12px] border border-line hover:border-brand transition cursor-pointer"
        >
          {/* Cobalt dot for From */}
          <span className="w-3 h-3 rounded-full bg-brand shrink-0 shadow-xs" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted block tracking-wider">
              From
            </span>
            <p className="text-sm font-semibold text-text truncate">
              {fromText || fromPlaceholder}
            </p>
          </div>
        </div>

        {/* Swap Button (Floating between inputs) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSwap?.()
            }}
            aria-label="Swap stops"
            className="w-8 h-8 rounded-full bg-surface border border-line shadow-xs text-brand flex items-center justify-center hover:border-brand active:scale-95 transition"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* TO Input Box */}
        <div
          onClick={onToClick}
          role="button"
          tabIndex={0}
          className="flex items-center gap-3 p-3.5 bg-surface-2 rounded-[12px] border border-line hover:border-brand transition cursor-pointer"
        >
          {/* Amber pin icon for To */}
          <MapPin className="w-4 h-4 text-amber shrink-0 fill-amber/20" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted block tracking-wider">
              To
            </span>
            <p className="text-sm font-semibold text-text truncate">
              {toText || toPlaceholder}
            </p>
          </div>
        </div>
      </div>

      {/* Find Buses Primary CTA Button */}
      <Button
        variant="primary"
        size="md"
        onClick={onSubmit}
        className="w-full h-12 text-sm font-bold tracking-tight font-heading"
      >
        <Search className="w-4 h-4" />
        <span>{submitLabel}</span>
      </Button>

      {/* Quick Action Chips Row */}
      <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
        {onUseLocation && (
          <button
            type="button"
            onClick={onUseLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface-2 hover:bg-surface-2/80 text-text text-xs font-semibold shrink-0 transition active:scale-95 border border-line/50"
          >
            <Navigation className="w-3.5 h-3.5 text-brand" />
            <span>Your location</span>
          </button>
        )}
        {onRecentClick && (
          <button
            type="button"
            onClick={onRecentClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface-2 hover:bg-surface-2/80 text-text text-xs font-semibold shrink-0 transition active:scale-95 border border-line/50"
          >
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>Recent</span>
          </button>
        )}
        {onSavedClick && (
          <button
            type="button"
            onClick={onSavedClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface-2 hover:bg-surface-2/80 text-text text-xs font-semibold shrink-0 transition active:scale-95 border border-line/50"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber" />
            <span>Saved</span>
          </button>
        )}
      </div>
    </div>
  )
}
