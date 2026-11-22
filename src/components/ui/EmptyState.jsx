/**
 * EmptyState — road illustration with SVG, title, description, action button.
 */
export default function EmptyState({
  title,
  description,
  action,  // { label: string, onClick: fn }
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {/* Road illustration */}
      <div
        className="mb-5 flex items-center justify-center rounded-full bg-sky-100"
        style={{ width: 80, height: 80 }}
      >
        <svg width="52" height="32" viewBox="0 0 52 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* Road surface */}
          <rect width="52" height="32" rx="4" fill="#D9E2F7" />
          {/* Road body */}
          <rect y="8" width="52" height="16" fill="white" />
          {/* Dashed amber centre line */}
          <rect x="4" y="15" width="10" height="2" rx="1" fill="#FFB400" />
          <rect x="21" y="15" width="10" height="2" rx="1" fill="#FFB400" />
          <rect x="38" y="15" width="10" height="2" rx="1" fill="#FFB400" />
          {/* Road markings (edge lines) */}
          <line x1="0" y1="8.5" x2="52" y2="8.5" stroke="#D9E2F7" strokeWidth="1" />
          <line x1="0" y1="23.5" x2="52" y2="23.5" stroke="#D9E2F7" strokeWidth="1" />
        </svg>
      </div>

      <h3 className="text-base font-bold text-ink-950 mb-1">{title}</h3>

      {description && (
        <p className="text-xs text-muted max-w-xs mb-4">{description}</p>
      )}

      {action?.label && action?.onClick && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center justify-center h-10 px-5 rounded-[9999px] text-xs font-semibold text-white transition-all active:scale-[0.98]"
          style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-soft)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
