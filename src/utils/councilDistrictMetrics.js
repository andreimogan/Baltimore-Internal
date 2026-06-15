import { applyBaltimore311MapFilters } from './baltimore311MapFilters'
import { calculateBoundary311Density } from './neighborhoodDensity'

export function format311DistrictLabel(count) {
  if (!Number.isFinite(count) || count <= 0) return ''
  if (count >= 1000) return `~${(count / 1000).toFixed(1)}k open 311`
  return `~${Math.round(count)} open 311`
}

/** Map/tooltip label — includes zero-count districts when highlighted. */
export function format311DistrictLabelForMap(count) {
  if (!Number.isFinite(count) || count <= 0) return '0 open 311'
  return format311DistrictLabel(count)
}

export function isDistrictShownOnMap(districtId, baltimoreDistrictsAll, baltimoreDistrictHidden) {
  if (!baltimoreDistrictsAll) return false
  return baltimoreDistrictHidden[String(districtId)] !== true
}

function buildDistrictInsights(districtsGeoJSON, densityMap, idProperty) {
  const councilById = new Map()
  for (const f of districtsGeoJSON.features) {
    const id = String(f.properties?.[idProperty] ?? '').trim()
    if (id) councilById.set(id, f.properties?.CNTCT_NME || '')
  }

  return [...councilById.keys()]
    .map((districtId) => {
      const count = densityMap[districtId] ?? 0
      return {
        districtId,
        count,
        label: format311DistrictLabelForMap(count),
        councilMember: councilById.get(districtId) || '',
      }
    })
    .sort((a, b) => b.count - a.count)
}

function computeDensityMap({
  districtsGeoJSON,
  requests311GeoJSON,
  baltimore311Types,
  hideClosed,
  selectedDate,
  idProperty,
}) {
  if (!districtsGeoJSON?.features?.length) {
    return {}
  }

  const filtered = requests311GeoJSON?.features?.length
    ? applyBaltimore311MapFilters(
        requests311GeoJSON,
        baltimore311Types,
        hideClosed,
        selectedDate
      )
    : { type: 'FeatureCollection', features: [] }

  return calculateBoundary311Density(districtsGeoJSON, filtered, false, idProperty)
}

/**
 * All council districts with open 311 counts (as-of selectedDate), including zero-count districts.
 * @returns {Array<{ districtId: string, count: number, label: string, councilMember: string }>}
 */
export function computeAllDistrictInsightsBy311({
  districtsGeoJSON,
  requests311GeoJSON,
  baltimore311Types,
  hideClosed,
  selectedDate,
  idProperty = 'AREA_NAME',
}) {
  if (!districtsGeoJSON?.features?.length) {
    return []
  }

  const densityMap = computeDensityMap({
    districtsGeoJSON,
    requests311GeoJSON,
    baltimore311Types,
    hideClosed,
    selectedDate,
    idProperty,
  })

  return buildDistrictInsights(districtsGeoJSON, densityMap, idProperty)
}

/**
 * Top council districts by open 311 volume.
 * @returns {Array<{ districtId: string, count: number, label: string, councilMember: string }>}
 */
export function computeTopDistrictsBy311({
  districtsGeoJSON,
  requests311GeoJSON,
  baltimore311Types,
  hideClosed,
  selectedDate,
  topN = 2,
  idProperty = 'AREA_NAME',
}) {
  return computeAllDistrictInsightsBy311({
    districtsGeoJSON,
    requests311GeoJSON,
    baltimore311Types,
    hideClosed,
    selectedDate,
    idProperty,
  })
    .filter((d) => d.count > 0)
    .slice(0, topN)
}
