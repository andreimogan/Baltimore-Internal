import {
  DEFAULT_BASEMAP_ID,
  isBuiltInBasemap,
  isValidCustomStyleUrl,
} from '../config/basemapSettings'

const STORAGE_KEY = 'baltimore-ic-basemap'

/**
 * @typedef {Object} CustomBasemap
 * @property {string} id - Unique key (e.g. 'custom-<n>')
 * @property {string} label - Display name
 * @property {string} url - MapTiler style.json URL
 *
 * @typedef {Object} BasemapState
 * @property {string} selectedId
 * @property {CustomBasemap[]} customStyles
 */

const DEFAULT_STATE = { selectedId: DEFAULT_BASEMAP_ID, customStyles: [] }

function sanitizeCustomStyles(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter(
      (entry) =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.label === 'string' &&
        entry.label.trim() !== '' &&
        isValidCustomStyleUrl(entry.url)
    )
    .map((entry) => ({ id: entry.id, label: entry.label.trim(), url: entry.url.trim() }))
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE }
  const customStyles = sanitizeCustomStyles(raw.customStyles)
  const knownId =
    isBuiltInBasemap(raw.selectedId) || customStyles.some((s) => s.id === raw.selectedId)
  return {
    selectedId: knownId ? raw.selectedId : DEFAULT_BASEMAP_ID,
    customStyles,
  }
}

export function loadBasemap() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { ...DEFAULT_STATE }
    return sanitizeState(JSON.parse(saved))
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function persistBasemap(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)))
  } catch {
    /* ignore quota / serialization errors */
  }
}
