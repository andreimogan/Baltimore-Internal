// Calculate 311 service request density for boundary polygons (neighborhoods, council districts)

/**
 * Calculate open 311 requests within each boundary polygon.
 * @param {Object} boundariesGeoJSON - GeoJSON with polygon features
 * @param {Object} requests311GeoJSON - GeoJSON with 311 request points
 * @param {boolean} hideClosedRequests - Whether to exclude closed requests
 * @param {string} idProperty - Feature property used as boundary ID (e.g. Name, AREA_NAME)
 * @returns {Object} Map of boundary ID to open request count
 */
export function calculateBoundary311Density(
  boundariesGeoJSON,
  requests311GeoJSON,
  hideClosedRequests = false,
  idProperty = 'Name'
) {
  if (!boundariesGeoJSON || !requests311GeoJSON) {
    return {}
  }

  const densityMap = {}

  boundariesGeoJSON.features.forEach((feature) => {
    const id = feature.properties?.[idProperty]
    if (id != null && id !== '') {
      densityMap[String(id)] = 0
    }
  })

  requests311GeoJSON.features.forEach((request) => {
    if (!request.geometry || request.geometry.type !== 'Point') return
    if (hideClosedRequests && request.properties.StatusDate) return

    const [lng, lat] = request.geometry.coordinates
    if (!lng || !lat) return

    for (const feature of boundariesGeoJSON.features) {
      if (isPointInPolygon([lng, lat], feature.geometry)) {
        const id = feature.properties?.[idProperty]
        if (id != null && id !== '') {
          const key = String(id)
          densityMap[key] = (densityMap[key] || 0) + 1
        }
        break
      }
    }
  })

  return densityMap
}

export function calculateNeighborhood311Density(
  neighborhoodsGeoJSON,
  requests311GeoJSON,
  hideClosedRequests = false
) {
  return calculateBoundary311Density(
    neighborhoodsGeoJSON,
    requests311GeoJSON,
    hideClosedRequests,
    'Name'
  )
}

export function isPointInPolygon(point, geometry) {
  if (!geometry) return false

  if (geometry.type === 'Polygon') {
    return pointInPolygonRings(point, geometry.coordinates)
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((rings) => pointInPolygonRings(point, rings))
  }

  return false
}

function pointInPolygonRings(point, rings) {
  const [lng, lat] = point
  const outerRing = rings[0]

  if (!isPointInRing(lng, lat, outerRing)) {
    return false
  }

  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(lng, lat, rings[i])) {
      return false
    }
  }

  return true
}

function isPointInRing(lng, lat, ring) {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}

export function getDensityColor(count, maxCount) {
  if (count === 0 || maxCount === 0) {
    return 'rgba(156, 163, 175, 0.15)'
  }

  const ratio = count / maxCount

  if (ratio < 0.15) {
    return 'rgba(156, 163, 175, 0.3)'
  }
  if (ratio < 0.3) {
    return 'rgba(253, 224, 71, 0.4)'
  }
  if (ratio < 0.5) {
    return 'rgba(251, 191, 36, 0.5)'
  }
  if (ratio < 0.7) {
    return 'rgba(249, 115, 22, 0.6)'
  }
  return 'rgba(239, 68, 68, 0.7)'
}

export function getBoundaryColorExpression(densityMap, idProperty = 'Name') {
  if (!densityMap || Object.keys(densityMap).length === 0) {
    return 'rgba(59, 130, 246, 0.12)'
  }

  const maxCount = Math.max(...Object.values(densityMap), 1)
  const expression = ['match', ['get', idProperty]]

  Object.entries(densityMap).forEach(([id, count]) => {
    expression.push(id)
    expression.push(getDensityColor(count, maxCount))
  })

  expression.push('rgba(59, 130, 246, 0.12)')

  return expression
}

export function getNeighborhoodColorExpression(densityMap) {
  return getBoundaryColorExpression(densityMap, 'Name')
}

export function getBoundaryBorderExpression(densityMap, idProperty = 'Name') {
  if (!densityMap || Object.keys(densityMap).length === 0) {
    return 'rgb(59, 130, 246)'
  }

  const maxCount = Math.max(...Object.values(densityMap), 1)
  const expression = ['match', ['get', idProperty]]

  Object.entries(densityMap).forEach(([id, count]) => {
    const ratio = count / maxCount

    let borderColor
    if (count === 0 || ratio < 0.15) {
      borderColor = 'rgb(156, 163, 175)'
    } else if (ratio < 0.3) {
      borderColor = 'rgb(253, 224, 71)'
    } else if (ratio < 0.5) {
      borderColor = 'rgb(251, 191, 36)'
    } else if (ratio < 0.7) {
      borderColor = 'rgb(249, 115, 22)'
    } else {
      borderColor = 'rgb(239, 68, 68)'
    }

    expression.push(id)
    expression.push(borderColor)
  })

  expression.push('rgb(59, 130, 246)')

  return expression
}

export function getNeighborhoodBorderExpression(densityMap) {
  return getBoundaryBorderExpression(densityMap, 'Name')
}

export function getNeighborhoodFillOpacityExpression(interactionEnabled = true) {
  if (!interactionEnabled) return 0.62
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    0.88,
    ['case', ['boolean', ['feature-state', 'hover'], false], 0.88, 0.62],
  ]
}

export function getNeighborhoodBorderWidthExpression(interactionEnabled = true) {
  if (!interactionEnabled) return 1.5
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    3.5,
    ['case', ['boolean', ['feature-state', 'hover'], false], 2.75, 1.5],
  ]
}

export function getBoundaryBorderLineColorExpression(
  densityMap,
  idProperty = 'Name',
  interactionEnabled = true
) {
  const base = getBoundaryBorderExpression(densityMap, idProperty)
  if (!interactionEnabled) return base
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    '#f8fafc',
    base,
  ]
}

export function getNeighborhoodBorderLineColorExpression(densityMap, interactionEnabled = true) {
  return getBoundaryBorderLineColorExpression(densityMap, 'Name', interactionEnabled)
}
