import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleBackAction, registerOverlayLayer } from '../backHandler'
import { App } from '@capacitor/app'
import { toast } from '@/components/ui/Toast'

vi.mock('@capacitor/app', () => ({
  App: {
    exitApp: vi.fn(),
    minimizeApp: vi.fn(),
    addListener: vi.fn(),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  },
}))

vi.mock('@/components/ui/Toast', () => ({
  toast: {
    info: vi.fn(),
  },
}))

describe('Central Back Button Handler (Phase 6)', () => {
  let mockNavigate

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate = vi.fn()
  })

  it('1. Closes topmost overlay layer if registered', () => {
    const closeOverlay = vi.fn()
    const unregister = registerOverlayLayer(closeOverlay)

    const res = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/explore' },
    })

    expect(res).toBe('closed_overlay')
    expect(closeOverlay).toHaveBeenCalled()
    unregister()
  })

  it('2. Minimizes app during active driver trip', () => {
    const res = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/driver/trip' },
      hasActiveTrip: true,
    })

    expect(res).toBe('minimized_driver_trip')
    expect(App.minimizeApp).toHaveBeenCalled()
  })

  it('3. Navigates previous slide in welcome carousel', () => {
    const onPrev = vi.fn()
    const res = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/welcome' },
      welcomeSlide: 1,
      onWelcomePrevSlide: onPrev,
    })

    expect(res).toBe('welcome_prev_slide')
    expect(onPrev).toHaveBeenCalled()
  })

  it('4. Returns from secondary tab (e.g. /live) to /explore', () => {
    const res = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/live' },
    })

    expect(res).toBe('back_to_explore')
    expect(mockNavigate).toHaveBeenCalledWith('/explore')
  })

  it('5. Shows "Press back again to exit" on first press on /explore and exits on second press', () => {
    const res1 = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/explore' },
    })
    expect(res1).toBe('confirm_exit_shown')
    expect(toast.info).toHaveBeenCalledWith('Press back again to exit')

    // Second press immediately after
    const res2 = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/explore' },
    })
    expect(res2).toBe('exit_app')
    expect(App.exitApp).toHaveBeenCalled()
  })

  it('6. Returns from driver sub-pages to /driver', () => {
    const res = handleBackAction({
      navigate: mockNavigate,
      location: { pathname: '/driver/history' },
    })
    expect(res).toBe('back_to_driver_root')
    expect(mockNavigate).toHaveBeenCalledWith('/driver')
  })
})
