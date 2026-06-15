/**
 * Registry of UI themes selectable via the TopNav "..." settings menu.
 * Only one theme can be active at a time.
 *
 * @typedef {Object} UiThemeOption
 * @property {string} id - Unique theme key used in context, storage, and data-ui-theme
 * @property {string} label - Display name in the settings menu
 * @property {string} [description] - Optional helper text
 * @property {boolean} available - Whether the theme can be selected
 */

/** @type {UiThemeOption[]} */
export const UI_THEME_OPTIONS = [
  {
    id: 'silicon',
    label: 'Silicon',
    description: 'Dark Sand cockpit (default)',
    available: true,
  },
  {
    id: 'baltimore-light',
    label: 'Baltimore Light',
    description: 'Official Baltimore City light palette',
    available: true,
  },
  {
    id: 'baltimore-dark',
    label: 'Baltimore Dark',
    description: 'Official Baltimore City dark palette',
    available: true,
  },
]

export const DEFAULT_UI_THEME = 'silicon'

export function isUiThemeAvailable(id) {
  const option = UI_THEME_OPTIONS.find((theme) => theme.id === id)
  return option?.available === true
}
