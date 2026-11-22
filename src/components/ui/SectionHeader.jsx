/**
 * SectionHeader — standard heading for screen sections.
 */
export default function SectionHeader({
  title,
  count,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between py-1 ${className}`}>
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-bold text-base text-ink-950">
          {title}
        </h3>
        {count !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-sky-100 text-cobalt-500">
            {count}
          </span>
        )}
      </div>

      {actionText && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-bold text-cobalt-500 hover:text-cobalt-600 active:scale-95 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}
