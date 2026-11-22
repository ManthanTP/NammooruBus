import { useId } from 'react'
import { motion, LayoutGroup } from 'framer-motion'

/**
 * SegmentedControl — Phase 5.11 unified control
 * Active option: signature gradient background + color var(--on-brand) + font-weight 700 + soft shadow.
 * Inactive option: transparent + color var(--muted).
 * Container: var(--surface-2) with border border-line.
 * Min height: 44px for accessible touch targets & high contrast.
 * The active state is set on the button itself and the label/icon with position: relative and z-10 above the sliding indicator.
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
        className={`relative min-h-[44px] p-1 bg-surface-2 rounded-full border border-line flex items-center gap-1 select-none transition-colors ${className}`}
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
              className={`min-h-[36px] flex-1 relative flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-heading font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${isActive
                ? 'on-brand shadow-soft'
                : 'text-muted hover:text-text'
                }`}
              style={{
                background: isActive ? 'var(--gradient-brand)' : 'transparent',
                color: isActive ? 'var(--on-brand)' : 'var(--muted)',
                fontWeight: isActive ? 700 : 600,
                boxShadow: isActive ? 'var(--shadow-soft)' : 'none',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId={`${groupId}-activeSegment`}
                  className="absolute inset-0 rounded-full shadow-soft pointer-events-none z-0"
                  style={{ background: 'var(--gradient-brand)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {Icon && (
                <Icon
                  className="w-3.5 h-3.5 shrink-0 relative z-10"
                  style={{ color: isActive ? 'var(--on-brand)' : 'var(--muted)' }}
                />
              )}
              <span
                className="truncate relative z-10"
                style={{
                  color: isActive ? 'var(--on-brand)' : 'var(--muted)',
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
