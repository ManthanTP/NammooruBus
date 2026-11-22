/**
 * StatTile — stat card with value in Outfit 800, label in muted text,
 * and optional icon. Can be rendered as standard white card or gradient highlight.
 */
export default function StatTile({
  label,
  value,
  subvalue,
  icon: Icon,
  variant = 'default', // 'default' (white) | 'gradient' | 'highlight'
  className = '',
}) {
  if (variant === 'gradient') {
    return (
      <div
        className={`rounded-[20px] p-4 on-brand flex flex-col justify-between shadow-soft ${className}`}
        style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
      >
        <div className="flex items-center justify-between mb-2" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          <span className="text-xs font-semibold">{label}</span>
          {Icon && <Icon className="w-4 h-4 text-amber-500" style={{ color: 'var(--amber)' }} />}
        </div>
        <div>
          <div className="font-heading font-extrabold text-2xl leading-tight" style={{ color: 'var(--on-brand)' }}>
            {value}
          </div>
          {subvalue && (
            <span className="text-[11px] font-medium block mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              {subvalue}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-surface rounded-[20px] p-4 border border-line flex flex-col justify-between ${className}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="flex items-center justify-between text-muted mb-2">
        <span className="text-xs font-semibold">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-cobalt-500" />}
      </div>
      <div>
        <div className="font-heading font-extrabold text-2xl text-ink-950 leading-tight">
          {value}
        </div>
        {subvalue && (
          <span className="text-[11px] text-muted font-medium block mt-0.5">
            {subvalue}
          </span>
        )}
      </div>
    </div>
  )
}
