export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-surface rounded-card border border-line ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-cobalt-tint text-cobalt flex items-center justify-center mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-text-secondary max-w-xs mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-cobalt text-white text-xs font-semibold rounded-input shadow-soft hover:opacity-95 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
