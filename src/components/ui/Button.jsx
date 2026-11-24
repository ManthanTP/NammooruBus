/**
 * Button — variants: primary | secondary | ghost | danger | icon-only
 * sizes: sm (36px) | md (48px) | lg (56px)
 * Text colors are strictly defined per variant, never inherited.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-heading font-bold rounded-[9999px] transition-all duration-150 active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer'

  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-12 px-5 text-sm',
    lg: 'h-14 px-6 text-base',
  }

  const variants = {
    primary: 'on-brand shadow-soft hover:opacity-95',
    secondary: 'bg-surface border-2 border-brand text-brand hover:bg-surface-2',
    outline: 'bg-surface border border-line text-text hover:bg-surface-2',
    ghost: 'bg-transparent text-brand hover:bg-surface-2',
    danger: 'text-white hover:opacity-90',
    'icon-only': 'bg-transparent text-brand hover:bg-surface-2 p-2',
  }

  const getVariantStyle = () => {
    if (variant === 'primary') {
      return { background: 'var(--gradient-brand)', color: 'var(--on-brand)' }
    }
    if (variant === 'danger') {
      return { backgroundColor: '#C92A2A', color: '#FFFFFF' }
    }
    return {}
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
      style={getVariantStyle()}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
