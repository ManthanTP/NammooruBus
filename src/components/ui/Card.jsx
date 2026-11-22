/**
 * Card — white card, 20px radius, shadow-soft, no border.
 */
export default function Card({ children, className = '', padding = 'p-5' }) {
  return (
    <div
      className={`bg-surface rounded-[20px] border border-line ${padding} ${className}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {children}
    </div>
  )
}
