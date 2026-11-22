import { useState } from 'react'

/**
 * Button — variants: primary | secondary | ghost | danger | icon-only
 * sizes: sm (36px) | md (48px) | lg (56px)
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
    'inline-flex items-center justify-center gap-2 font-semibold rounded-[9999px] transition-all duration-150 active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

  const sizes = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-12 px-5 text-sm',
    lg: 'h-14 px-6 text-base',
  }

  const variants = {
    primary: '',
    secondary: 'bg-white border-2 border-cobalt-500 text-cobalt-500 hover:bg-sky-50',
    ghost: 'bg-transparent text-cobalt-500 hover:bg-sky-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    'icon-only': 'bg-transparent text-cobalt-500 hover:bg-sky-100',
  }

  const primaryStyle =
    variant === 'primary'
      ? { background: 'var(--gradient-brand)', color: '#fff' }
      : {}

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
      style={primaryStyle}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
