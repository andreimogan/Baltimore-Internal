/**
 * Registry of basemap styles selectable via the TopNav "..." settings menu.
 * Only one basemap can be active at a time.
 *
 * Two kinds of basemap exist:
 *  - Built-in MapTiler styles (this list), referenced by their MapTiler style id.
 *  - User-published custom styles (designed in MapTiler Customize), stored as full
 *    style.json URLs in localStorage — see utils/basemapStorage.js.
 *
 * @typedef {Object} BasemapOption
 * @property {string} id - Unique key used in context and storage
 * @property {string} label - Display name in the settings menu
 * @property {string} [description] - Optional helper text
 * @property {string} styleId - MapTiler style id used to build the style.json URL
 */

// MapTiler API key (shared by the map and this config). The key is intentionally
// embedded in the client bundle — normal for browser map apps; restrict it by
// HTTP referrer in the MapTiler dashboard for public deployments.
export const MAPTILER_API_KEY = 'X1kjwlVN29N1UZItdixx'

/** @type {BasemapOption[]} */
export const BASEMAP_OPTIONS = [
  {
    id: 'streets-v2-dark',
    label: 'Streets Dark',
    description: 'Dark street basemap (default)',
    styleId: 'streets-v2-dark',
  },
  {
    id: 'streets-v2',
    label: 'Streets',
    description: 'Standard light street basemap',
    styleId: 'streets-v2',
  },
  {
    id: 'dataviz',
    label: 'Dataviz Light',
    description: 'Neutral light background for data overlays',
    styleId: 'dataviz',
  },
  {
    id: 'dataviz-dark',
    label: 'Dataviz Dark',
    description: 'Neutral dark background for data overlays',
    styleId: 'dataviz-dark',
  },
  {
    id: 'basic-v2',
    label: 'Basic',
    description: 'Minimal, low-detail basemap',
    styleId: 'basic-v2',
  },
  {
    id: 'bright-v2',
    label: 'Bright',
    description: 'High-contrast bright basemap',
    styleId: 'bright-v2',
  },
  {
    id: 'topo-v2',
    label: 'Topo',
    description: 'Topographic basemap with terrain',
    styleId: 'topo-v2',
  },
  {
    id: 'winter-v2',
    label: 'Winter',
    description: 'Muted cold-tone basemap',
    styleId: 'winter-v2',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Bathymetry-focused basemap',
    styleId: 'ocean',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Aerial/satellite imagery',
    styleId: 'satellite',
  },
]

export const DEFAULT_BASEMAP_ID = 'streets-v2-dark'

/** Build a MapTiler hosted style.json URL from a style id. */
export function buildMaptilerStyleUrl(styleId, apiKey = MAPTILER_API_KEY) {
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`
}

export function isBuiltInBasemap(id) {
  return BASEMAP_OPTIONS.some((option) => option.id === id)
}

/** True if a string looks like a MapTiler published style.json URL. */
export function isValidCustomStyleUrl(url) {
  return (
    typeof url === 'string' &&
    /^https:\/\/api\.maptiler\.com\/maps\/[^/]+\/style\.json/.test(url.trim())
  )
}
