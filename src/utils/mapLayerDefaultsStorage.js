const STORAGE_KEY = 'baltimore-ic-saved-map-layers'

const VALID_311_STYLES = new Set(['default', 'cluster', 'heatmap'])

export const BUILT_IN_MAP_LAYER_DEFAULTS = {
  baltimore311Visible: true,
  baltimore311Style: 'default',
  baltimore311Clustered: false,
  baltimore311HideClosed: true,
  baltimore311Types: {},
  baltimoreNeighborhoodsAll: false,
  baltimoreNeighborhoodImpactUi: false,
  baltimoreNeighborhoodHidden: {},
  baltimoreDistrictsAll: true,
  baltimoreDistrictHidden: {},
  districtInsightsEnabled: false,
  stormAdvisoryNeighborhoodsVisible: false,
}

function isBooleanRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((v) => typeof v === 'boolean')
}

function sanitizeBooleanRecord(value) {
  if (!isBooleanRecord(value)) return {}
  return { ...value }
}

function sanitizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null

  const style = VALID_311_STYLES.has(raw.baltimore311Style)
    ? raw.baltimore311Style
    : BUILT_IN_MAP_LAYER_DEFAULTS.baltimore311Style

  const snapshot = {
    baltimore311Visible:
      typeof raw.baltimore311Visible === 'boolean'
        ? raw.baltimore311Visible
        : BUILT_IN_MAP_LAYER_DEFAULTS.baltimore311Visible,
    baltimore311Style: style,
    baltimore311Clustered:
      typeof raw.baltimore311Clustered === 'boolean'
        ? raw.baltimore311Clustered
        : style === 'cluster',
    baltimore311HideClosed:
      typeof raw.baltimore311HideClosed === 'boolean'
        ? raw.baltimore311HideClosed
        : BUILT_IN_MAP_LAYER_DEFAULTS.baltimore311HideClosed,
    baltimore311Types: sanitizeBooleanRecord(raw.baltimore311Types),
    baltimoreNeighborhoodsAll:
      typeof raw.baltimoreNeighborhoodsAll === 'boolean'
        ? raw.baltimoreNeighborhoodsAll
        : BUILT_IN_MAP_LAYER_DEFAULTS.baltimoreNeighborhoodsAll,
    baltimoreNeighborhoodImpactUi:
      typeof raw.baltimoreNeighborhoodImpactUi === 'boolean'
        ? raw.baltimoreNeighborhoodImpactUi
        : BUILT_IN_MAP_LAYER_DEFAULTS.baltimoreNeighborhoodImpactUi,
    baltimoreNeighborhoodHidden: sanitizeBooleanRecord(raw.baltimoreNeighborhoodHidden),
    baltimoreDistrictsAll:
      typeof raw.baltimoreDistrictsAll === 'boolean'
        ? raw.baltimoreDistrictsAll
        : BUILT_IN_MAP_LAYER_DEFAULTS.baltimoreDistrictsAll,
    baltimoreDistrictHidden: sanitizeBooleanRecord(raw.baltimoreDistrictHidden),
    districtInsightsEnabled:
      typeof raw.districtInsightsEnabled === 'boolean'
        ? raw.districtInsightsEnabled
        : BUILT_IN_MAP_LAYER_DEFAULTS.districtInsightsEnabled,
    stormAdvisoryNeighborhoodsVisible:
      typeof raw.stormAdvisoryNeighborhoodsVisible === 'boolean'
        ? raw.stormAdvisoryNeighborhoodsVisible
        : BUILT_IN_MAP_LAYER_DEFAULTS.stormAdvisoryNeighborhoodsVisible,
  }

  if (snapshot.baltimore311Style === 'cluster') {
    snapshot.baltimore311Clustered = true
  } else if (snapshot.baltimore311Style !== 'cluster') {
    snapshot.baltimore311Clustered = false
  }

  return snapshot
}

export function loadSavedMapLayerDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return sanitizeSnapshot(parsed)
  } catch {
    return null
  }
}

export function getInitialMapLayerState() {
  const saved = loadSavedMapLayerDefaults()
  if (!saved) {
    return { ...BUILT_IN_MAP_LAYER_DEFAULTS }
  }

  return {
    ...BUILT_IN_MAP_LAYER_DEFAULTS,
    ...saved,
    baltimore311Types: { ...saved.baltimore311Types },
    baltimoreNeighborhoodHidden: { ...saved.baltimoreNeighborhoodHidden },
    baltimoreDistrictHidden: { ...saved.baltimoreDistrictHidden },
  }
}

export function buildDefaultMapLayerSnapshot(state) {
  if (!state || typeof state !== 'object') return null
  return sanitizeSnapshot(state)
}

export function saveMapLayerDefaults(snapshot) {
  const sanitized = sanitizeSnapshot(snapshot)
  if (!sanitized) return false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized))
    return true
  } catch {
    return false
  }
}
