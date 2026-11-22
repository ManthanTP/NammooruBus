import { create } from 'zustand'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system'
  return localStorage.getItem('nb-theme') || 'system'
}

function resolveTheme(theme) {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
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
    meta.setAttribute('content', resolved === 'dark' ? '#050B2E' : '#0040FF')
  }

  // Capacitor StatusBar update if running in native app
  if (window.Capacitor?.Plugins?.StatusBar) {
    try {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: resolved === 'dark' ? 'DARK' : 'LIGHT',
      })
      window.Capacitor.Plugins.StatusBar.setBackgroundColor({
        color: resolved === 'dark' ? '#050B2E' : '#0040FF',
      })
    } catch (e) {
      // Ignore if unavailable
    }
  }

  return resolved
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  resolvedTheme: resolveTheme(getInitialTheme()),

  setTheme: (newTheme) => {
    localStorage.setItem('nb-theme', newTheme)
    const resolved = applyTheme(newTheme)
    set({ theme: newTheme, resolvedTheme: resolved })
  },

  toggleTheme: () => {
    const current = get().resolvedTheme
    const next = current === 'dark' ? 'light' : 'dark'
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
