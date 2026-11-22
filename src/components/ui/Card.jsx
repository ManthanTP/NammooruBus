/**
 * Card — white card, 20px radius, shadow-soft, no border.
 */
export default function Card({ children, className = '', padding = 'p-5' }) {
  return (
    <div
      className={`bg-white rounded-[20px] ${padding} ${className}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {children}
    </div>
  )
}
