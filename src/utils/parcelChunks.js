// Helpers for the on-demand parcel chunk layer. The parcel dataset (~238k
// polygons) is pre-split into per-boundary GeoJSON chunks by
// scripts/build-parcel-chunks.py; the slug here MUST match slugify() there.

/** Neighborhood Name -> filename-safe slug. Keep identical to the Python slugify. */
export function slugifyNeighborhood(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Stable cache/identity key for an enabled boundary chunk. */
export function parcelChunkKey(kind, key) {
  return `${kind}:${key}`
}

/** Public URL for a parcel chunk. kind: 'neighborhood' | 'district' | 'precinct'. */
export function parcelChunkUrl(kind, key) {
  const fileKey = kind === 'neighborhood' ? slugifyNeighborhood(key) : key
  return `/data/parcels/${kind}/${encodeURIComponent(fileKey)}.geojson`
}

/** Public URL for a building-footprint chunk. Same scheme as parcels. */
export function buildingChunkUrl(kind, key) {
  const fileKey = kind === 'neighborhood' ? slugifyNeighborhood(key) : key
  return `/data/buildings/${kind}/${encodeURIComponent(fileKey)}.geojson`
}
