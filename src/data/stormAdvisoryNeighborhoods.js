/**
 * Hardcoded “possible impact” neighborhood names (Baltimore GP_Boundaries `Name` values)
 * and synthetic counts so existing density color tiers (gray → yellow → orange → red) apply.
 */
export const STORM_ADVISORY_NEIGHBORHOOD_COUNTS = {
  Downtown: 100,
  'Sandtown-Winchester': 94,
  'Cherry Hill': 88,
  'East Baltimore Midway': 72,
  'Central Park Heights': 65,
  Canton: 55,
  'Federal Hill': 50,
  'Fells Point': 38,
  'Patterson Park': 28,
  Waverly: 20,
}

/**
 * Full name → count map: every known neighborhood gets 0 except listed advisories.
 * @param {import('geojson').FeatureCollection} neighborhoodsGeoJSON
 * @returns {Record<string, number>}
 */
export function buildStormAdvisoryDensityMap(neighborhoodsGeoJSON) {
  const out = {}
  if (!neighborhoodsGeoJSON?.features) return out
  for (const f of neighborhoodsGeoJSON.features) {
    const name = f.properties?.Name
    if (name) out[name] = 0
  }
  for (const [name, count] of Object.entries(STORM_ADVISORY_NEIGHBORHOOD_COUNTS)) {
    if (Object.prototype.hasOwnProperty.call(out, name)) {
      out[name] = count
    }
  }
  return out
}
