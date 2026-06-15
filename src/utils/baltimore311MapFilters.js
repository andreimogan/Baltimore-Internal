/**
 * Same 311 feature pipeline as MapView uses for `baltimore-311-flat`:
 * SR type toggles, then hide-closed using CloseDate vs selected date.
 * Keeps density / critical-tier math aligned outside the map.
 */
export function applyBaltimore311MapFilters(geojson, baltimore311Types, baltimore311HideClosed, selectedDate) {
  if (!geojson || geojson.type !== 'FeatureCollection') {
    return { type: 'FeatureCollection', features: [] }
  }

  const filterByTypes = (g) => {
    const enabledTypes = Object.keys(baltimore311Types || {}).filter((t) => baltimore311Types[t])
    if (Object.keys(baltimore311Types || {}).length === 0) {
      return g
    }
    if (enabledTypes.length === 0) {
      return { type: 'FeatureCollection', features: [] }
    }
    return {
      ...g,
      features: g.features.filter((f) => enabledTypes.includes(f.properties?.SRType)),
    }
  }

  const filterByClosed = (g) => {
    if (!baltimore311HideClosed) return g

    const asOfDate = new Date(selectedDate)
    asOfDate.setHours(23, 59, 59, 999)
    const asOfTime = asOfDate.getTime()

    return {
      ...g,
      features: g.features.filter((f) => {
        const closeTime = f.properties?.CloseDate
        return !closeTime || closeTime > asOfTime
      }),
    }
  }

  return filterByClosed(filterByTypes(geojson))
}
