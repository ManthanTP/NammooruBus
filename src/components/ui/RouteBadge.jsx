/**
 * RouteBadge — LED-style amber-on-navy badge using DotGothic16.
 * Sizes: xs | sm | md | lg
 */
export default function RouteBadge({ code, size = 'md', className = '' }) {
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={`font-led inline-flex items-center justify-center font-bold tracking-widest uppercase select-none ${sizes[size]} ${className}`}
      style={{
        backgroundColor: '#00136E',
        color: '#FFB400',
        borderRadius: '10px',
        border: '1.5px solid rgba(255,180,0,0.3)',
        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8)',
        textShadow: '0 0 6px rgba(255,180,0,0.8)',
      }}
    >
      {code}
    </span>
  )
}
