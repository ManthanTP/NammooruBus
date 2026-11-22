import { create } from 'zustand'
import { appStorage } from '@/lib/storage'
import { setStatusBarTheme } from '@/lib/platform'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system'
  const saved = appStorage.getItem('nb-theme')
  if (saved === 'dark' || saved === 'blue' || saved === 'light') {
    return saved
  }
  return 'system'
}

function resolveTheme(theme) {
  if (theme === 'dark') return 'dark'
  if (theme === 'blue') return 'blue'
  if (theme === 'light') return 'light'
  // System mode maps to dark or light based on OS
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return 'light'
  const resolved = resolveTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)

  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const color = resolved === 'dark' ? '#0A0B10' : (resolved === 'blue' ? '#050B2E' : '#0040FF')
    meta.setAttribute('content', color)
  }

  // Update native status bar
  setStatusBarTheme(resolved)

  return resolved
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  resolvedTheme: resolveTheme(getInitialTheme()),

  setTheme: (newTheme) => {
    appStorage.setItem('nb-theme', newTheme)
    const resolved = applyTheme(newTheme)
    set({ theme: newTheme, resolvedTheme: resolved })
  },

  toggleTheme: () => {
    // Cycles Light -> Dark -> Blue -> Light
    const current = get().resolvedTheme
    const next = current === 'light' ? 'dark' : (current === 'dark' ? 'blue' : 'light')
    get().setTheme(next)
  },

  initTheme: () => {
    const saved = getInitialTheme()
    const resolved = applyTheme(saved)
    set({ theme: saved, resolvedTheme: resolved })

    // Listen for OS preference changes when in 'system' mode
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => {
        if (get().theme === 'system') {
          const res = applyTheme('system')
          set({ resolvedTheme: res })
        }
      }
      media.addEventListener?.('change', listener)
    }
  },
}))
