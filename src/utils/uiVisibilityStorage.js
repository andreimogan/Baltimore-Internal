import {
  UI_VISIBILITY_SETTINGS,
  buildDefaultUiVisibility,
} from '../config/uiVisibilitySettings'

const STORAGE_KEY = 'baltimore-ic-ui-visibility'

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadSavedUiVisibility(settings = UI_VISIBILITY_SETTINGS) {
  const defaults = buildDefaultUiVisibility(settings)
  const saved = readStorage()
  const validIds = new Set(settings.map((setting) => setting.id))

  const merged = { ...defaults }
  for (const [id, value] of Object.entries(saved)) {
    if (validIds.has(id) && typeof value === 'boolean') {
      merged[id] = value
    }
  }

  return merged
}

export function persistUiVisibility(state) {
  if (!state || typeof state !== 'object') return

  const validIds = new Set(UI_VISIBILITY_SETTINGS.map((setting) => setting.id))
  const toSave = {}

  for (const [id, value] of Object.entries(state)) {
    if (validIds.has(id) && typeof value === 'boolean') {
      toSave[id] = value
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
}
