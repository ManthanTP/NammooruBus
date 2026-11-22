import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import i18n from '@/i18n'
import { useToastStore, toast, ToastContainer, resolveToastMessage } from '@/components/ui/Toast'
import enData from '@/i18n/locales/en.json'
import knData from '@/i18n/locales/kn.json'

function extractVisibleText(html) {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
  text = text.replace(/<[^>]+>/g, ' ')
  return text.replace(/\s+/g, ' ').trim()
}

describe('Phase 5.10: Toast System and i18n Parity', () => {
  beforeEach(() => {
    useToastStore.getState().clearAll()
  })

  it('contains all required toast keys in en.json and kn.json with non-empty strings', () => {
    const requiredKeys = [
      'trip_saved',
      'trip_removed',
      'trip_already_saved',
      'login_required',
      'sign_in',
      'link_copied',
      'journey_copied',
      'journey_shared',
      'location_denied',
      'location_found',
      'offline',
      'online',
      'report_sent',
      'report_rate_limit',
      'complaint_sent',
      'profile_updated',
      'password_reset_sent',
      'driver_key_invalid',
      'driver_unlocked',
      'trip_started',
      'trip_ended',
      'bus_not_found',
      'bus_assigned',
      'network_error',
      'retry',
      'logged_out',
      'admin_saved',
      'admin_deleted',
      'admin_failed',
    ]

    for (const key of requiredKeys) {
      expect(enData.toast?.[key], `en.json missing toast.${key}`).toBeDefined()
      expect(typeof enData.toast[key]).toBe('string')
      expect(enData.toast[key].trim().length).toBeGreaterThan(0)

      expect(knData.toast?.[key], `kn.json missing toast.${key}`).toBeDefined()
      expect(typeof knData.toast[key]).toBe('string')
      expect(knData.toast[key].trim().length).toBeGreaterThan(0)
    }
  })

  it('renders every toast key through ToastContainer without empty text in English', async () => {
    await i18n.changeLanguage('en')

    const toastKeys = Object.keys(enData.toast || {})
    expect(toastKeys.length).toBeGreaterThan(0)

    for (const key of toastKeys) {
      useToastStore.getState().clearAll()
      toast.success(`toast.${key}`, { count: 5 })

      const html = renderToString(<ToastContainer />)
      const text = extractVisibleText(html)

      expect(text.length, `Visible text for toast.${key} must not be empty`).toBeGreaterThan(0)
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('null')
    }
  })

  it('renders every toast key through ToastContainer without empty text in Kannada', async () => {
    await i18n.changeLanguage('kn')

    const toastKeys = Object.keys(knData.toast || {})
    expect(toastKeys.length).toBeGreaterThan(0)

    for (const key of toastKeys) {
      useToastStore.getState().clearAll()
      toast.info(`toast.${key}`, { count: 5 })

      const html = renderToString(<ToastContainer />)
      const text = extractVisibleText(html)

      expect(text.length, `Visible text in KN for toast.${key} must not be empty`).toBeGreaterThan(0)
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('null')
    }
  })

  it('never returns an empty string or throws when an unknown key or empty input is provided', () => {
    const unknownFallback = resolveToastMessage('toast.some_missing_test_key')
    expect(unknownFallback).toBe('Some Missing Test Key')

    const emptyFallback = resolveToastMessage('')
    expect(emptyFallback).toBe('Notification')

    const nullFallback = resolveToastMessage(null)
    expect(nullFallback).toBe('Notification')
  })

  it('supports action buttons on toasts', async () => {
    await i18n.changeLanguage('en')
    useToastStore.getState().clearAll()

    toast.info('toast.login_required', {
      action: {
        label: 'Sign in',
        onClick: () => {},
      },
    })
    const html = renderToString(<ToastContainer />)
    expect(html).toContain('Sign in')
    expect(html).toContain('Sign in to save trips')
  })
})
