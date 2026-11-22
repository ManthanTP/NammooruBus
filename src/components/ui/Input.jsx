import { useState, useId } from 'react'

/**
 * Input — 56px height, rounded-[12px], bg-sky-50, 2px cobalt focus ring,
 * floating label that moves up when focused or filled.
 */
export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = ' ',
  error,
  icon: Icon,
  className = '',
  ...rest
}) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const filled = value !== undefined && value !== ''
  const lifted = focused || filled

  return (
    <div className={`relative w-full ${className}`}>
      {/* Left icon */}
      {Icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <Icon className="w-4 h-4" />
        </span>
      )}

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`peer w-full h-14 bg-sky-50 rounded-[12px] border-2 px-4 pt-5 pb-2 text-sm text-ink-950 placeholder-transparent transition-all duration-150 outline-none
          ${Icon ? 'pl-9' : 'pl-4'}
          ${focused ? 'border-cobalt-500' : error ? 'border-danger' : 'border-line'}
        `}
        style={{
          '--tw-ring-color': 'var(--cobalt-500)',
        }}
        {...rest}
      />

      {/* Floating label */}
      {label && (
        <label
          htmlFor={id}
          className={`absolute left-4 pointer-events-none font-medium transition-all duration-150 ${
            Icon ? 'left-9' : 'left-4'
          } ${
            lifted
              ? 'top-1.5 text-[10px] text-cobalt-500'
              : 'top-1/2 -translate-y-1/2 text-sm text-muted'
          }`}
        >
          {label}
        </label>
      )}

      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger pl-1">
          {error}
        </p>
      )}
    </div>
  )
}
