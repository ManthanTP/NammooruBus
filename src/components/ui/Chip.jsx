/**
 * Chip — pill-shaped filter chip.
 * Default: bg-sky-100 text-ink-950
 * Active:  bg-cobalt-500 text-white
 */
export default function Chip({ label, active = false, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3.5 py-1.5 rounded-[9999px] text-xs font-semibold transition-all duration-150 active:scale-[0.97] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-1 ${
        active
          ? 'bg-cobalt-500 text-white'
          : 'bg-sky-100 text-ink-950 hover:bg-sky-100/80'
      } ${className}`}
    >
      {label}
    </button>
  )
}
