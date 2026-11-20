import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simulation of claim_driver_role database logic and store interaction
function simulateClaimDriverRole({
  userId,
  configuredKey,
  providedKey,
  attemptsRecord,
  profilesDb,
  driversDb,
}) {
  if (!userId) {
    return { status: 'login_required' }
  }

  if (!configuredKey || configuredKey.trim() === '') {
    return { status: 'not_configured' }
  }

  const now = Date.now()
  if (attemptsRecord && attemptsRecord.lockedUntil && attemptsRecord.lockedUntil > now) {
    return { status: 'locked' }
  }

  if (providedKey.trim() === configuredKey.trim()) {
    // Reset failed attempts
    if (attemptsRecord) {
      attemptsRecord.failedAttempts = 0
      attemptsRecord.lockedUntil = null
    }

    // Promote to driver
    const profile = profilesDb[userId] || { id: userId, role: 'passenger' }
    profile.role = 'driver'
    profilesDb[userId] = profile

    // Create or activate driver row
    driversDb[userId] = { id: userId, name: profile.full_name || 'Driver', is_active: true }

    return { status: 'ok' }
  } else {
    // Record failed attempt
    if (!attemptsRecord) {
      attemptsRecord = { failedAttempts: 1, lockedUntil: null }
    } else {
      attemptsRecord.failedAttempts += 1
      if (attemptsRecord.failedAttempts >= 5) {
        attemptsRecord.lockedUntil = now + 15 * 60 * 1000 // 15 min lock
        return { status: 'locked' }
      }
    }
    return { status: 'invalid' }
  }
}

describe('Part D: Driver Sign-up and Key Claim Verification', () => {
  let profilesDb
  let driversDb
  const testUserId = 'user-123'
  const CORRECT_DRIVER_KEY = 'secret-hubballi-depot-2026'

  beforeEach(() => {
    profilesDb = {
      [testUserId]: { id: testUserId, email: 'driver@test.in', full_name: 'Somu Naik', role: 'passenger' },
    }
    driversDb = {}
  })

  it('wrong key leaves role passenger and does not insert drivers row', () => {
    const attempts = { failedAttempts: 0, lockedUntil: null }
    const result = simulateClaimDriverRole({
      userId: testUserId,
      configuredKey: CORRECT_DRIVER_KEY,
      providedKey: 'wrong-key-123',
      attemptsRecord: attempts,
      profilesDb,
      driversDb,
    })

    expect(result.status).toBe('invalid')
    expect(profilesDb[testUserId].role).toBe('passenger')
    expect(driversDb[testUserId]).toBeUndefined()
  })

  it('correct key makes role driver and creates the drivers row', () => {
    const attempts = { failedAttempts: 0, lockedUntil: null }
    const result = simulateClaimDriverRole({
      userId: testUserId,
      configuredKey: CORRECT_DRIVER_KEY,
      providedKey: CORRECT_DRIVER_KEY,
      attemptsRecord: attempts,
      profilesDb,
      driversDb,
    })

    expect(result.status).toBe('ok')
    expect(profilesDb[testUserId].role).toBe('driver')
    expect(driversDb[testUserId]).toBeDefined()
    expect(driversDb[testUserId].is_active).toBe(true)
  })

  it('locks for 15 minutes after 5 wrong attempts', () => {
    const attempts = { failedAttempts: 4, lockedUntil: null }
    const result = simulateClaimDriverRole({
      userId: testUserId,
      configuredKey: CORRECT_DRIVER_KEY,
      providedKey: 'wrong-key-5',
      attemptsRecord: attempts,
      profilesDb,
      driversDb,
    })

    expect(result.status).toBe('locked')
    expect(profilesDb[testUserId].role).toBe('passenger')

    // Subsequent call while locked returns locked immediately
    const nextCall = simulateClaimDriverRole({
      userId: testUserId,
      configuredKey: CORRECT_DRIVER_KEY,
      providedKey: CORRECT_DRIVER_KEY, // even with right key, locked
      attemptsRecord: attempts,
      profilesDb,
      driversDb,
    })
    expect(nextCall.status).toBe('locked')
  })

  it('returns not_configured if admin has not set a driver key yet', () => {
    const result = simulateClaimDriverRole({
      userId: testUserId,
      configuredKey: '',
      providedKey: 'any-key',
      attemptsRecord: null,
      profilesDb,
      driversDb,
    })
    expect(result.status).toBe('not_configured')
  })
})
