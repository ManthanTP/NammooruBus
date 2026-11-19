/**
 * Helper to get the localized name of a stop, route, or place.
 * Falls back to name_en if the selected language text is missing.
 *
 * @param {Object} row - Object containing name_en and optionally name_kn
 * @param {string} lang - 'en' | 'kn'
 * @returns {string}
 */
export function localName(row, lang = 'en') {
  if (!row) return ''
  if (lang === 'kn' && row.name_kn && row.name_kn.trim() !== '') {
    return row.name_kn
  }
  return row.name_en || ''
}
