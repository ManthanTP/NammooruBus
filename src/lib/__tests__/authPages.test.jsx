import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/features/passenger/pages/LoginPage'
import RegisterPage from '@/features/passenger/pages/RegisterPage'

function extractVisibleText(html) {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim()
}

function findRawTranslationKeys(text) {
  // Matches raw keys like auth.login_btn, common.from, settings.theme, etc.
  // Must have lowercase namespace and key name separated by dot
  const matches = text.match(/\b[a-z][a-z0-9_]*\.[a-z0-9_]+(?:\.[a-z0-9_]+)*\b/g) || []
  // Filter out any valid domain names or filenames (e.g. logo-full.png or example.com)
  return matches.filter(m => !m.endsWith('.png') && !m.endsWith('.svg') && !m.endsWith('.com') && !m.endsWith('.js'))
}

describe('Phase 5.9: Auth Pages i18n and Parity Verification', () => {
  beforeEach(async () => {
    useAuthStore.setState({ loading: false, user: null, session: null })
    await i18n.changeLanguage('en')
  })

  describe('LoginPage', () => {
    it('renders in English without raw keys and with standard labels', async () => {
      await i18n.changeLanguage('en')
      const html = renderToString(
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      )

      const text = extractVisibleText(html)
      const rawKeys = findRawTranslationKeys(text)
      expect(rawKeys).toEqual([])

      // Title
      expect(text).toContain('Log in')
      // Primary button
      expect(text).toContain('Sign in')
      // Bottom prompt and secondary button
      expect(text).toContain('New to Nammooru Bus?')
      expect(text).toContain('Create account')
    })

    it('renders in Kannada without raw keys and with standard labels', async () => {
      await i18n.changeLanguage('kn')
      const html = renderToString(
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      )

      const text = extractVisibleText(html)
      const rawKeys = findRawTranslationKeys(text)
      expect(rawKeys).toEqual([])

      // Title
      expect(text).toContain('ಲಾಗಿನ್')
      // Primary button
      expect(text).toContain('ಸೈನ್ ಇನ್')
      // Bottom prompt and secondary button
      expect(text).toContain('ಖಾತೆ ತೆರೆಯಿರಿ')
      expect(text).toContain('ನಮ್ಮೂರು ಬಸ್‌ಗೆ ಹೊಸಬರೇ?')
    })
  })

  describe('RegisterPage', () => {
    it('renders in English without raw keys and with standard labels', async () => {
      await i18n.changeLanguage('en')
      const html = renderToString(
        <MemoryRouter initialEntries={['/register']}>
          <RegisterPage />
        </MemoryRouter>
      )

      const text = extractVisibleText(html)
      const rawKeys = findRawTranslationKeys(text)
      expect(rawKeys).toEqual([])

      // Title
      expect(text).toContain('Create account')
      // Primary button
      expect(text).toContain('Sign up')
      // Bottom prompt and secondary button
      expect(text).toContain('Already have an account?')
      expect(text).toContain('Sign in')
    })

    it('renders in Kannada without raw keys and with standard labels', async () => {
      await i18n.changeLanguage('kn')
      const html = renderToString(
        <MemoryRouter initialEntries={['/register']}>
          <RegisterPage />
        </MemoryRouter>
      )

      const text = extractVisibleText(html)
      const rawKeys = findRawTranslationKeys(text)
      expect(rawKeys).toEqual([])

      // Title
      expect(text).toContain('ಖಾತೆ ತೆರೆಯಿರಿ')
      // Primary button
      expect(text).toContain('ಸೈನ್ ಅಪ್')
      // Bottom prompt and secondary button
      expect(text).toContain('ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?')
      expect(text).toContain('ಸೈನ್ ಇನ್')
    })
  })
})
