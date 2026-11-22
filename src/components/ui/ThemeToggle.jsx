import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

/**
 * ThemeToggle — 44px touch target icon button to toggle light/dark theme.
 */
export default function ThemeToggle({ className = '' }) {
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink-950 hover:bg-sky-100 transition active:scale-95 shrink-0 ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20" />
      ) : (
        <Moon className="w-5 h-5 text-muted hover:text-ink-950" />
      )}
    </button>
  )
}
