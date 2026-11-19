/**
 * Signature LED dot-matrix route badge per PRD section 12.
 * Uses DotGothic16 font with amber LED on dark night background.
 */
export default function RouteBadge({ code, color, size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded-[4px] min-w-[28px]',
    sm: 'text-xs px-2 py-0.5 rounded-[5px] min-w-[34px]',
    md: 'text-sm px-2.5 py-1 rounded-[6px] min-w-[42px]',
    lg: 'text-base px-3 py-1.5 rounded-[8px] min-w-[52px]',
  }

  return (
    <span
      className={`font-led inline-flex items-center justify-center font-bold tracking-widest uppercase select-none transition-transform ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
      style={{
        backgroundColor: 'var(--color-led-bg)',
        color: 'var(--color-led-amber)',
        border: color ? `1.5px solid ${color}` : '1.5px solid rgba(255, 194, 74, 0.3)',
        boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(10, 15, 36, 0.25)',
        textShadow: '0 0 4px rgba(255, 194, 74, 0.65)',
      }}
    >
      {code}
    </span>
  )
}
