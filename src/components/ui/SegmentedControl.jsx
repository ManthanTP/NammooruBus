import { useId } from 'react'
import { motion, LayoutGroup } from 'framer-motion'

/**
 * SegmentedControl — Phase 5.10 unified control
 * Active segment: signature gradient background (cobalt to royal) with WHITE text and subtle shadow.
 * Inactive: transparent with muted text.
 * Container: surface-2 with line border.
 * Min height: 44px for accessible touch targets & 4.5:1 contrast.
 */
export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  ariaLabel = 'Segmented navigation',
}) {
  const groupId = useId()

  return (
    <LayoutGroup id={groupId}>
      <div
        role="group"
        aria-label={ariaLabel}
        className={`min-h-[44px] p-1 bg-surface-2 rounded-full border border-line flex items-center gap-1 select-none transition-colors ${className}`}
      >
        {options.map((opt) => {
          const isActive = value === opt.key
          const Icon = opt.icon

          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opt.key)}
              className={`min-h-[36px] flex-1 relative flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-heading font-bold transition-colors cursor-pointer select-none active:scale-[0.98] ${
                isActive
                  ? 'text-white'
                  : 'text-muted hover:text-text'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={`${groupId}-activeSegment`}
                  className="absolute inset-0 rounded-full shadow-xs -z-10"
                  style={{ background: 'var(--gradient-brand)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-muted'}`} />}
              <span className="truncate">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
