import { isPointInPolygon } from './neighborhoodDensity'

const DISTRICT_ID_PROPERTY = 'AREA_NAME'
const NEIGHBORHOOD_ID_PROPERTY = 'Name'

/**
 * Visible boundary features when the layer is in subset mode.
 * Returns null when no spatial constraint should apply.
 */
export function getVisibleBoundaryFeatures(geojson, masterOn, hiddenMap, idProperty) {
  if (!masterOn || !geojson?.features?.length) return null

  const visible = geojson.features.filter((f) => {
    const id = f.properties?.[idProperty]
    return id != null && id !== '' && hiddenMap[String(id)] !== true
  })

  if (visible.length === 0 || visible.length === geojson.features.length) {
    return null
  }

  return visible
}

function pointInAnyPolygon(point, polygonFeatures) {
  for (const feature of polygonFeatures) {
    if (isPointInPolygon(point, feature.geometry)) {
      return true
    }
  }
  return false
}

/**
 * Restrict 311 point features to visible district/neighborhood selections.
 * Type/date filters should be applied before calling this.
 */
export function filter311ByVisibleBoundaries(geojson, options) {
  if (!geojson || geojson.type !== 'FeatureCollection') {
    return { type: 'FeatureCollection', features: [] }
  }

  const districtPolygons = getVisibleBoundaryFeatures(
    options.districtsGeoJSON,
    options.baltimoreDistrictsAll,
    options.baltimoreDistrictHidden ?? {},
    DISTRICT_ID_PROPERTY
  )

  const neighborhoodPolygons = getVisibleBoundaryFeatures(
    options.neighborhoodsGeoJSON,
    options.baltimoreNeighborhoodsAll,
    options.baltimoreNeighborhoodHidden ?? {},
    NEIGHBORHOOD_ID_PROPERTY
  )

  const useDistrict = Array.isArray(districtPolygons)
  const useNeighborhood = Array.isArray(neighborhoodPolygons)

  if (!useDistrict && !useNeighborhood) {
    return geojson
  }

  if (useDistrict && districtPolygons.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  if (useNeighborhood && neighborhoodPolygons.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  const features = geojson.features.filter((feature) => {
    if (!feature.geometry || feature.geometry.type !== 'Point') return false

    const [lng, lat] = feature.geometry.coordinates
    if (lng == null || lat == null) return false

    const point = [lng, lat]
    const inDistrict = !useDistrict || pointInAnyPolygon(point, districtPolygons)
    const inNeighborhood = !useNeighborhood || pointInAnyPolygon(point, neighborhoodPolygons)
    return inDistrict && inNeighborhood
  })

  return { type: 'FeatureCollection', features }
}
