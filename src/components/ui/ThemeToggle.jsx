import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Laptop, Check } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export default function ThemeToggle({ className = '', align = 'right' }) {
  const { theme, resolvedTheme, setTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const options = [
    {
      key: 'light',
      label: 'Light',
      swatchBg: '#FFFFFF',
      swatchBorder: '#D9E2F7',
      icon: Sun,
    },
    {
      key: 'dark',
      label: 'Dark',
      swatchBg: '#0A0B10',
      swatchBorder: '#2A2F42',
      icon: Moon,
    },
    {
      key: 'blue',
      label: 'Blue',
      swatchBg: '#050B2E',
      swatchBorder: '#22308A',
      icon: Moon,
    },
    {
      key: 'system',
      label: 'System',
      isSystem: true,
      icon: Laptop,
    },
  ]

  const CurrentIcon =
    theme === 'system'
      ? Laptop
      : resolvedTheme === 'dark'
        ? Moon
        : resolvedTheme === 'blue'
          ? Moon
          : Sun

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition active:scale-95 shrink-0 ${className}`}
        title={`Theme: ${theme} (resolved: ${resolvedTheme})`}
        aria-label="Theme settings"
        aria-expanded={open}
      >
        <CurrentIcon className="w-5 h-5 text-muted hover:text-text" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Theme options"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-48 bg-surface rounded-[20px] p-2 border border-line shadow-float z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
            Choose Theme
          </div>
          {options.map((opt) => {
            const isSelected = theme === opt.key
            const Icon = opt.icon
            return (
              <button
                key={opt.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(opt.key)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[14px] text-xs font-bold transition select-none ${isSelected
                  ? 'bg-surface-2 text-brand'
                  : 'text-text hover:bg-surface-2/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  {opt.isSystem ? (
                    <div className="w-4 h-4 rounded-full border border-line overflow-hidden flex shrink-0">
                      <span className="w-1/2 h-full bg-white" />
                      <span className="w-1/2 h-full bg-[#0A0B10]" />
                    </div>
                  ) : (
                    <span
                      className="w-4 h-4 rounded-full border shrink-0 shadow-xs"
                      style={{
                        backgroundColor: opt.swatchBg,
                        borderColor: opt.swatchBorder,
                      }}
                    />
                  )}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
