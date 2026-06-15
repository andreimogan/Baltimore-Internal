/**
 * Registry of UI elements that can be toggled via the TopNav "..." settings menu.
 * Add entries here as you define hideable UI elements.
 *
 * @typedef {Object} UiVisibilitySetting
 * @property {string} id - Unique key used in context and consuming components
 * @property {string} label - Display name in the settings menu
 * @property {string} [description] - Optional helper text
 * @property {boolean} [defaultVisible=true] - Initial visibility when no saved preference exists
 */

/** @type {UiVisibilitySetting[]} */
export const UI_VISIBILITY_SETTINGS = [
  {
    id: 'situationalAdvisoryBar',
    label: 'Severe Weather Alert',
    description: 'Situational advisory banner on the map',
    defaultVisible: true,
  },
  {
    id: 'weatherPanel',
    label: 'Weather Information Panel',
    description: 'Weather, 311 requests, and intervention panel',
    defaultVisible: true,
  },
]

export function buildDefaultUiVisibility(settings = UI_VISIBILITY_SETTINGS) {
  return settings.reduce((acc, setting) => {
    acc[setting.id] = setting.defaultVisible !== false
    return acc
  }, {})
}

export function isUiVisible(uiVisibility, id, defaultVisible = true) {
  if (Object.prototype.hasOwnProperty.call(uiVisibility, id)) {
    return uiVisibility[id]
  }
  return defaultVisible
}
