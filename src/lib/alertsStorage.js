const STORAGE_KEY = 'nb_read_alerts'

/**
 * Returns list of alert IDs marked as read or dismissed by the user.
 */
export function getReadAlertIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

/**
 * Marks a single alert as read/viewed.
 */
export function markAlertAsRead(id) {
  if (!id) return
  try {
    const current = getReadAlertIds()
    if (!current.includes(id)) {
      current.push(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
      window.dispatchEvent(new Event('nb_alerts_updated'))
    }
  } catch (err) {
    console.warn('Error marking alert as read:', err)
  }
}

/**
 * Marks multiple alerts as read.
 */
export function markAllAlertsAsRead(ids = []) {
  try {
    const current = new Set(getReadAlertIds())
    ids.forEach((id) => {
      if (id) current.add(id)
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)))
    window.dispatchEvent(new Event('nb_alerts_updated'))
  } catch (err) {
    console.warn('Error marking all alerts as read:', err)
  }
}

/**
 * Checks if a specific alert has been read.
 */
export function isAlertRead(id) {
  if (!id) return false
  return getReadAlertIds().includes(id)
}
