import { DEFAULT_UI_THEME, isUiThemeAvailable } from '../config/uiThemeSettings'

const STORAGE_KEY = 'baltimore-ic-ui-theme'

const LEGACY_THEME_MAP = {
  sand: 'silicon',
  baltimore: 'baltimore-light',
}

function normalizeTheme(theme) {
  if (!theme) return DEFAULT_UI_THEME
  if (LEGACY_THEME_MAP[theme]) return LEGACY_THEME_MAP[theme]
  return isUiThemeAvailable(theme) ? theme : DEFAULT_UI_THEME
}

export function loadUiTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return normalizeTheme(saved)
  } catch {
    return DEFAULT_UI_THEME
  }
}

export function persistUiTheme(theme) {
  if (!isUiThemeAvailable(theme)) return
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore quota errors */
  }
}
