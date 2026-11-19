export default function Skeleton({ className = '', variant = 'rect' }) {
  const variantStyles = {
    rect: 'rounded-input',
    circle: 'rounded-full',
    card: 'rounded-card h-28',
    text: 'rounded-md h-4 w-3/4',
  }[variant] || 'rounded-input'

  return (
    <div
      className={`animate-pulse bg-line/60 ${variantStyles} ${className}`}
      aria-hidden="true"
    />
  )
}
