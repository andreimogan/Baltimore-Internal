import maplibregl from 'maplibre-gl'

const SOURCE_KIND_CONFIG = [{ kind: 'calls311', color: '#3b82f6' }]

const KIND_META = {
  calls311: {
    accent: '#3b82f6',
    title: '311 Service Requests',
    desc: 'Council district with the highest open 311 request volume for the enabled service types as of the selected date.',
  },
}

const sourceId = (kind) => `district-insights-${kind}`
const fillId = (kind) => `district-insights-${kind}-fill`
const lineId = (kind) => `district-insights-${kind}-line`
const labelId = (kind) => `district-insights-${kind}-label`

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

const HOVER_SOURCE = 'district-insights-hover'
const HOVER_FILL_LAYER = 'district-insights-hover-fill'
const HOVER_LINE_LAYER = 'district-insights-hover-line'

const BALTIMORE_DISTRICT_POPUP_PLACEMENT = {}
const DEFAULT_PLACEMENT = { anchor: 'bottom', offset: [0, -10] }

const _store = new WeakMap()

function getStore(map) {
  if (!_store.has(map)) {
    _store.set(map, {
      popupsByDistrict: new Map(),
      hoveredDistrict: null,
      leaveTimer: null,
      listenersAdded: false,
      geojson: null,
      idProperty: 'AREA_NAME',
    })
  }
  return _store.get(map)
}

function clearAllPopups(store) {
  for (const p of store.popupsByDistrict.values()) {
    try {
      p.popup.remove()
    } catch {
      // ignore
    }
  }
  store.popupsByDistrict.clear()
  store.hoveredDistrict = null
}

function getDistrictId(feature, idProperty) {
  return String(feature?.properties?.[idProperty] ?? '').trim()
}

function summaryHtml(districtId, entries, councilMember) {
  const pills = entries
    .map(({ kind, label }) => {
      const { accent } = KIND_META[kind] || {}
      return `
      <div style="display:flex;align-items:center;gap:5px;margin-top:4px">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${accent};flex-shrink:0"></span>
        <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.85);white-space:nowrap">${label}</span>
      </div>
    `
    })
    .join('')

  const memberLine = councilMember
    ? `<div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px">${councilMember}</div>`
    : ''

  return `
    <div style="padding:8px 11px;min-width:150px;max-width:220px;line-height:1.4">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.50);letter-spacing:0.04em;text-transform:uppercase;margin-bottom:1px">District ${districtId}</div>
      ${memberLine}
      ${pills}
    </div>
  `
}

function detailHtml(districtId, entries, councilMember) {
  const rows = entries
    .map(({ kind, label }) => {
      const { accent, title, desc } = KIND_META[kind] || {}
      return `
      <div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.08)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${accent};flex-shrink:0"></span>
          <span style="font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${accent}">${title}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.95);margin-bottom:3px;line-height:1.2">${label}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.55);line-height:1.35">${desc}</div>
      </div>
    `
    })
    .join('')

  const memberLine = councilMember
    ? `<div style="font-size:10px;color:rgba(255,255,255,0.40);margin-bottom:4px">${councilMember}</div>`
    : ''

  return `
    <div style="padding:10px 12px;min-width:210px;max-width:270px;line-height:1.4">
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);margin-bottom:1px">District ${districtId}</div>
      ${memberLine}
      <div style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.35);letter-spacing:0.03em;text-transform:uppercase;margin-bottom:2px">District Insights</div>
      ${rows}
    </div>
  `
}

function featureCentroid(feature) {
  const coords = []
  const walk = (c) => {
    if (!c) return
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      coords.push(c)
      return
    }
    if (Array.isArray(c)) c.forEach(walk)
  }
  walk(feature?.geometry?.coordinates)
  if (!coords.length) return null
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]
}

export function ensureCouncilDistrictHighlightLayers(map, beforeId) {
  if (!map) return

  if (!map.getSource(HOVER_SOURCE)) {
    map.addSource(HOVER_SOURCE, { type: 'geojson', data: EMPTY_FC })
  }
  if (!map.getLayer(HOVER_FILL_LAYER)) {
    map.addLayer(
      {
        id: HOVER_FILL_LAYER,
        type: 'fill',
        source: HOVER_SOURCE,
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.08 },
        layout: { visibility: 'visible' },
      },
      beforeId
    )
  }
  if (!map.getLayer(HOVER_LINE_LAYER)) {
    map.addLayer(
      {
        id: HOVER_LINE_LAYER,
        type: 'line',
        source: HOVER_SOURCE,
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-opacity': 0.9,
        },
        layout: { visibility: 'visible' },
      },
      beforeId
    )
  }

  for (const { kind, color } of SOURCE_KIND_CONFIG) {
    if (!map.getSource(sourceId(kind))) {
      map.addSource(sourceId(kind), { type: 'geojson', data: EMPTY_FC })
    }
    if (!map.getLayer(fillId(kind))) {
      map.addLayer(
        {
          id: fillId(kind),
          type: 'fill',
          source: sourceId(kind),
          paint: { 'fill-color': color, 'fill-opacity': 0.18 },
          layout: { visibility: 'none' },
        },
        beforeId
      )
    }
    if (!map.getLayer(lineId(kind))) {
      map.addLayer(
        {
          id: lineId(kind),
          type: 'line',
          source: sourceId(kind),
          paint: { 'line-color': color, 'line-width': 2.4, 'line-opacity': 0.95 },
          layout: { visibility: 'none' },
        },
        beforeId
      )
    }
    if (!map.getLayer(labelId(kind))) {
      map.addLayer(
        {
          id: labelId(kind),
          type: 'symbol',
          source: sourceId(kind),
          layout: { visibility: 'none', 'text-field': ['get', 'label'] },
          paint: { 'text-color': '#ffffff' },
        },
        beforeId
      )
    }
  }
}

function ensureHoverListeners(map) {
  const store = getStore(map)
  if (store.listenersAdded) return
  store.listenersAdded = true

  const setHoverHighlight = (districtId) => {
    const src = map.getSource(HOVER_SOURCE)
    if (!src) return
    if (!districtId || !store.geojson) {
      src.setData(EMPTY_FC)
      return
    }
    const feature = (store.geojson.features || []).find(
      (f) => getDistrictId(f, store.idProperty) === districtId
    )
    src.setData(
      feature ? { type: 'FeatureCollection', features: [feature] } : EMPTY_FC
    )
  }

  const onMove = (e) => {
    const f = e.features?.[0]
    if (!f) return
    const districtId = getDistrictId(f, store.idProperty)
    const entry = store.popupsByDistrict.get(districtId)
    if (!entry) return

    clearTimeout(store.leaveTimer)
    map.getCanvas().style.cursor = 'pointer'

    if (store.hoveredDistrict && store.hoveredDistrict !== districtId) {
      const prev = store.popupsByDistrict.get(store.hoveredDistrict)
      if (prev) {
        prev.popup.setHTML(
          summaryHtml(store.hoveredDistrict, prev.entries, prev.councilMember)
        )
      }
    }

    store.hoveredDistrict = districtId
    entry.popup.setHTML(detailHtml(districtId, entry.entries, entry.councilMember))
    setHoverHighlight(districtId)
  }

  const onLeave = () => {
    clearTimeout(store.leaveTimer)
    store.leaveTimer = setTimeout(() => {
      if (store.hoveredDistrict) {
        const entry = store.popupsByDistrict.get(store.hoveredDistrict)
        if (entry) {
          entry.popup.setHTML(
            summaryHtml(store.hoveredDistrict, entry.entries, entry.councilMember)
          )
        }
      }
      store.hoveredDistrict = null
      map.getCanvas().style.cursor = ''
      setHoverHighlight(null)
    }, 80)
  }

  for (const { kind } of SOURCE_KIND_CONFIG) {
    map.on('mousemove', fillId(kind), onMove)
    map.on('mouseleave', fillId(kind), onLeave)
  }
}

export function applyCouncilDistrictHighlightLayers(
  map,
  { geojson, highlights = [], enabled, idProperty = 'AREA_NAME' }
) {
  if (!map || !geojson) return
  const store = getStore(map)
  store.geojson = geojson
  store.idProperty = idProperty

  const highlightById = new Map(
    highlights.map((h) => [String(h.districtId).trim(), h])
  )

  const callsFC =
    enabled && highlightById.size
      ? {
          type: 'FeatureCollection',
          features: (geojson.features || [])
            .filter((f) => highlightById.has(getDistrictId(f, idProperty)))
            .map((f) => {
              const id = getDistrictId(f, idProperty)
              const h = highlightById.get(id)
              return {
                ...f,
                properties: { ...(f.properties || {}), label: h?.label ?? '' },
              }
            }),
        }
      : EMPTY_FC

  const kindOn = {
    calls311: enabled && callsFC.features.length > 0,
  }

  const src = map.getSource(sourceId('calls311'))
  if (src) src.setData(callsFC)
  const v = kindOn.calls311 ? 'visible' : 'none'
  if (map.getLayer(fillId('calls311'))) map.setLayoutProperty(fillId('calls311'), 'visibility', v)
  if (map.getLayer(lineId('calls311'))) map.setLayoutProperty(lineId('calls311'), 'visibility', v)
  if (map.getLayer(labelId('calls311'))) map.setLayoutProperty(labelId('calls311'), 'visibility', 'none')

  clearAllPopups(store)
  const hoverSrc = map.getSource(HOVER_SOURCE)
  if (hoverSrc) hoverSrc.setData(EMPTY_FC)
  if (!enabled || !kindOn.calls311) return

  const byDistrict = new Map()
  for (const f of callsFC.features) {
    const id = getDistrictId(f, idProperty)
    const h = highlightById.get(id)
    if (!byDistrict.has(id)) {
      byDistrict.set(id, {
        feature: f,
        entries: [{ kind: 'calls311', label: String(f.properties?.label ?? '') }],
        councilMember: h?.councilMember ?? '',
      })
    }
  }

  for (const [districtId, { feature, entries, councilMember }] of byDistrict) {
    const center = featureCentroid(feature)
    if (!center || !entries.length) continue

    const placement = BALTIMORE_DISTRICT_POPUP_PLACEMENT[districtId] || DEFAULT_PLACEMENT
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '280px',
      className: 'popup-311',
      anchor: placement.anchor,
      offset: placement.offset,
    })
      .setLngLat(center)
      .setHTML(summaryHtml(districtId, entries, councilMember))
      .addTo(map)

    store.popupsByDistrict.set(districtId, { popup, entries, councilMember })
  }

  ensureHoverListeners(map)
}
