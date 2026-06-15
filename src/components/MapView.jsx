import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { APP_CITY } from '../constants/region'
import { usePanelContext } from '../contexts/PanelContext'
import HeatmapLegend from './HeatmapLegend'
import {
  calculateNeighborhood311Density,
  calculateBoundary311Density,
  getNeighborhoodColorExpression,
  getBoundaryColorExpression,
  getNeighborhoodBorderExpression,
  getBoundaryBorderExpression,
  getNeighborhoodFillOpacityExpression,
  getNeighborhoodBorderWidthExpression,
  getNeighborhoodBorderLineColorExpression,
  getBoundaryBorderLineColorExpression,
} from '../utils/neighborhoodDensity'
import { getEffectiveViewPreset } from '../utils/mapViewDefaults'
import { applyBaltimore311MapFilters } from '../utils/baltimore311MapFilters'
import { filter311ByVisibleBoundaries } from '../utils/baltimore311SpatialFilter'
import {
  ensureCouncilDistrictHighlightLayers,
  applyCouncilDistrictHighlightLayers,
} from '../utils/councilDistrictHighlightLayers'
import { computeAllDistrictInsightsBy311, isDistrictShownOnMap } from '../utils/councilDistrictMetrics'
import {
  getImpactedNeighborhoodTooltipModels,
  getStormAdvisoryTooltipModels,
} from '../utils/neighborhoodStats'
import {
  buildStormAdvisoryDensityMap,
  STORM_ADVISORY_NEIGHBORHOOD_COUNTS,
} from '../data/stormAdvisoryNeighborhoods'
import NeighborhoodStatsCard from './NeighborhoodStatsCard'

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY ?? ''

const MAP_STYLE_URL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`

const ZOOM_PERCENT_CONFIG = { minZoom: 8, maxZoom: 18, maxPercent: 200 }
/** Below this zoom %, neighborhood impact tooltips use existing hide-all behavior (see getTooltipVariant). */
const TOOLTIP_AUTO_CLOSE_PERCENT = 60

const clampZoom = (value, min, max) => Math.min(max, Math.max(min, value))
const zoomToPercent = (zoom) => {
  const { minZoom, maxZoom, maxPercent } = ZOOM_PERCENT_CONFIG
  const ratio = (zoom - minZoom) / Math.max(0.0001, maxZoom - minZoom)
  return Math.round(clampZoom(ratio, 0, 1) * maxPercent)
}

function createZoomPercentControl({ minZoom = 8, maxZoom = 18, maxPercent = 200 } = {}) {
  let map = null
  let container = null
  let percentLabel = null

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const zoomToPercent = (zoom) => {
    const ratio = (zoom - minZoom) / Math.max(0.0001, (maxZoom - minZoom))
    return Math.round(clamp(ratio, 0, 1) * maxPercent)
  }
  const percentToZoom = (percent) => {
    const ratio = clamp(percent, 0, maxPercent) / maxPercent
    return minZoom + ratio * (maxZoom - minZoom)
  }

  const syncPercentFromMap = () => {
    if (!map || !percentLabel) return
    percentLabel.textContent = `${zoomToPercent(map.getZoom())}%`
  }

  return {
    onAdd(nextMap) {
      map = nextMap
      container = document.createElement('div')
      container.className = 'maplibregl-ctrl custom-zoom-control'

      const makeButton = (label, ariaLabel, onClick, extraClass = '') => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = `custom-zoom-control__btn ${extraClass}`.trim()
        button.setAttribute('aria-label', ariaLabel)
        button.textContent = label
        button.addEventListener('click', onClick)
        return button
      }

      const zoomButton = document.createElement('button')
      zoomButton.type = 'button'
      zoomButton.className = 'custom-zoom-control__value-wrap'
      zoomButton.setAttribute('aria-label', 'Set zoom percent')

      percentLabel = document.createElement('span')
      percentLabel.className = 'custom-zoom-control__label'
      percentLabel.textContent = `${zoomToPercent(map.getZoom())}%`

      const setPercent = (value) => {
        if (!map) return
        const parsed = Number(value)
        if (Number.isNaN(parsed)) {
          syncPercentFromMap()
          return
        }
        const clampedPercent = clamp(Math.round(parsed), 0, maxPercent)
        map.easeTo({ zoom: percentToZoom(clampedPercent) })
      }

      zoomButton.addEventListener('click', () => {
        const currentPercent = zoomToPercent(map.getZoom())
        const raw = window.prompt('Set zoom percent (0-200)', String(currentPercent))
        if (raw === null) return
        setPercent(raw)
      })

      const zoomOutButton = makeButton('−', 'Zoom out', () => map?.easeTo({ zoom: map.getZoom() - 1 }))
      const zoomInButton = makeButton('+', 'Zoom in', () => map?.easeTo({ zoom: map.getZoom() + 1 }))

      zoomButton.appendChild(percentLabel)

      container.appendChild(zoomButton)
      container.appendChild(zoomOutButton)
      container.appendChild(zoomInButton)

      map.on('zoom', syncPercentFromMap)
      return container
    },
    onRemove() {
      if (map) {
        map.off('zoom', syncPercentFromMap)
      }
      if (container?.parentNode) {
        container.parentNode.removeChild(container)
      }
      map = null
      container = null
      percentLabel = null
    },
  }
}

// ArcGIS Feature Service URL pattern for Baltimore 311 by year
// Now accepts an optional endDate parameter to filter on the server side
const get311ServiceUrl = (year, endDate = null) => {
  let whereClause = '1%3D1' // Default: where 1=1 (all records)
  
  if (endDate) {
    // Filter on server side using ArcGIS DATE syntax
    // This ensures we only fetch relevant records instead of filtering client-side
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    // Format: DATE 'YYYY-MM-DD HH:MM:SS'
    const yyyy = endOfDay.getFullYear()
    const mm = String(endOfDay.getMonth() + 1).padStart(2, '0')
    const dd = String(endOfDay.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd} 23:59:59`
    
    // URL encode: CreatedDate <= DATE 'YYYY-MM-DD 23:59:59'
    whereClause = `CreatedDate+%3C%3D+DATE+'${dateStr}'`
  }
  
  return `https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/311_Customer_Service_Requests_${year}/FeatureServer/0/query` +
    `?where=${whereClause}&outFields=SRType,Agency,SRStatus,CreatedDate,CloseDate,Address,Neighborhood` +
    `&f=geojson&resultRecordCount=15000`
}

export default function MapView() {
  const { 
    mapLibreColors,
    baltimoreNeighborhoodsData,
    setBaltimoreNeighborhoodsData,
    baltimoreNeighborhoodImpactUi,
    baltimoreNeighborhoodsAll,
    baltimoreNeighborhoodHidden,
    baltimoreDistrictsData,
    setBaltimoreDistrictsData,
    baltimoreDistrictsAll,
    baltimoreDistrictHidden,
    districtInsightsEnabled,
    baltimore311Visible, 
    baltimore311Style, 
    baltimore311Clustered, 
    baltimore311HideClosed,
    baltimore311Types, 
    selectedYear, 
    selectedDate, 
    setBaltimore311Data, 
    setBaltimore311DataYear, 
    mapFocusRequest,
    mapPopupRequest,
    heatmapConfig,
    stormAdvisoryNeighborhoodsVisible,
    baltimore311Data,
    setMapBootstrapReady,
    registerMapCameraReader,
  } = usePanelContext()
  const mapContainer = useRef(null)
  const map = useRef(null)
  const mapLib = useRef(null) // maplibregl reference for popups/markers
  // Card markers only: { card, name, neighborhood, renderCard, cardDiv, lngLat }
  const neighborhoodMarkers = useRef([])
  const impactedDensityMapRef = useRef({})
  const minimizedCardsRef = useRef({})
  /** Snapshot of minimizedCards taken when crossing below threshold zoom %; restored when crossing back up. */
  const preLowZoomMinimizedRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  /** Current zoom percent (zoomToPercent); drives neighborhood tooltip layout variants without new map subscriptions. */
  const [mapZoomPercent, setMapZoomPercent] = useState(100)
  const mapZoomPercentRef = useRef(mapZoomPercent)
  mapZoomPercentRef.current = mapZoomPercent
  const [minimizedCards, setMinimizedCards] = useState({}) // Track which cards are minimized by neighborhood name
  /** Last-interacted neighborhood tooltip name — that marker renders above overlapping siblings. */
  const [foregroundNeighborhoodTooltip, setForegroundNeighborhoodTooltip] = useState(null)
  const foregroundNeighborhoodTooltipRef = useRef(null)
  // Cache fetched 311 GeoJSON per year+date combination to avoid redundant requests
  // Key format: "YYYY-MM-DD" for specific dates, or "YYYY" for year-end
  const baltimore311Cache = useRef({})
  /** Cleared when map bootstrap overlay is dismissed — one cycle per map engine session. */
  const mapBootstrapFinalizedRef = useRef(false)

  useEffect(() => {
    mapBootstrapFinalizedRef.current = false
    setMapBootstrapReady(false)
  }, [setMapBootstrapReady])

  useEffect(() => {
    minimizedCardsRef.current = minimizedCards
  }, [minimizedCards])

  const applyNeighborhoodTooltipStackOrder = (topName) => {
    neighborhoodMarkers.current.forEach(({ card, name }) => {
      try {
        const el = card?.getElement?.()
        if (!el) return
        el.style.zIndex = topName === name ? '100' : '10'
      } catch {
        /* ignore */
      }
    })
  }

  useEffect(() => {
    foregroundNeighborhoodTooltipRef.current = foregroundNeighborhoodTooltip
    applyNeighborhoodTooltipStackOrder(foregroundNeighborhoodTooltip)
  }, [foregroundNeighborhoodTooltip])

  /** Tooltip open = selected: match hover fill + brighter border via feature-state. */
  const syncNeighborhoodSelectionFeatureState = () => {
    if (!map.current?.getSource('baltimore-neighborhoods')) return
    const cards = minimizedCardsRef.current
    neighborhoodMarkers.current.forEach(({ name, neighborhood }) => {
      if (!neighborhood) return
      const defaultMinimized = neighborhood.color !== 'red'
      const isMinimized = cards[name] !== undefined ? cards[name] : defaultMinimized
      try {
        map.current.setFeatureState(
          { source: 'baltimore-neighborhoods', id: name },
          { selected: !isMinimized }
        )
      } catch {
        /* ignore */
      }
    })
  }

  const create311PopupHtml = (properties = {}) => {
    const { SRType, Address, SRStatus, CreatedDate, CloseDate, Agency, Neighborhood } = properties
    const asOfDate = new Date(selectedDate)
    asOfDate.setHours(23, 59, 59, 999)
    const asOfTime = asOfDate.getTime()

    let historicalStatus = 'Open'
    if (CloseDate && CloseDate <= asOfTime) {
      historicalStatus = 'Closed'
    }

    return `
      <div style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.9);min-width:200px">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">311 Service Request</div>
        <div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:6px;line-height:1.3">${SRType || 'Service Request'}</div>
        ${Address ? `
          <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:2px">${Address}${Neighborhood ? `<span style="color:rgba(255,255,255,0.35)"> · ${Neighborhood}</span>` : ''}</div>
        ` : ''}
        ${Agency ? `
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:6px">${Agency}</div>
        ` : ''}
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
          <span style="
            display:inline-flex;align-items:center;gap:4px;
            padding:2px 8px;border-radius:5px;font-size:11px;font-weight:500;
            background:${historicalStatus === 'Open' ? 'rgba(249,115,22,0.15)' : 'rgba(127,190,72,0.15)'};
            color:${historicalStatus === 'Open' ? '#fb923c' : '#86efac'};
            border:1px solid ${historicalStatus === 'Open' ? 'rgba(249,115,22,0.35)' : 'rgba(127,190,72,0.35)'};
          ">
            <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>
            ${historicalStatus}
          </span>
        </div>
      </div>
    `
  }

  /** Fallback camera if no preset (Baltimore) */
  const cityFallback = { center: [-76.6122, 39.2904], zoom: 11 }

  const getActiveColors = () => mapLibreColors

  // Initialize map (MapLibre + MapTiler)
  useEffect(() => {
    const initMap = () => {
      if (map.current) return

      const preset = getEffectiveViewPreset(APP_CITY, 'maplibre')
      const cfg = cityFallback

      mapLib.current = maplibregl

      const center = preset?.center || cfg.center
      const zoom = preset?.zoom || cfg.zoom
      const pitch = preset?.pitch ?? 0
      const bearing = preset?.bearing ?? 0

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE_URL,
        center,
        zoom,
        pitch,
        bearing,
        minZoom: 8,
        maxZoom: 18,
        attributionControl: true,
        customAttribution: 'Neighborhood boundaries · Baltimore City data',
      })

      map.current.addControl(
        createZoomPercentControl({ minZoom: 8, maxZoom: 18, maxPercent: 200 }),
        'bottom-right'
      )

      map.current.on('load', () => {
      // Find first symbol layer in the style (for proper layer ordering)
      const layers = map.current.getStyle().layers
      let firstSymbolId
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id
          break
        }
      }

      // Helper function to force paint properties (override Mapbox style defaults)
      const forcePaintProperty = (layerId, property, value) => {
        if (map.current.getLayer(layerId)) {
          map.current.setPaintProperty(layerId, property, value)
        }
      }

      // Baltimore council district boundaries (local GeoJSON)
      map.current.addSource('baltimore-districts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'AREA_NAME',
      })

      map.current.addLayer({
        id: 'baltimore-districts-fill',
        type: 'fill',
        source: 'baltimore-districts',
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.12)',
          'fill-opacity': getNeighborhoodFillOpacityExpression(false),
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'baltimore-districts-border',
        type: 'line',
        source: 'baltimore-districts',
        paint: {
          'line-color': getBoundaryBorderLineColorExpression({}, 'AREA_NAME', false),
          'line-width': getNeighborhoodBorderWidthExpression(false),
          'line-opacity': 0.85,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'baltimore-districts-labels',
        type: 'symbol',
        source: 'baltimore-districts',
        layout: {
          'text-field': ['concat', 'D', ['get', 'AREA_NAME']],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-max-width': 8,
          visibility: 'none',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2.5,
          'text-opacity': 0.9,
        },
      }, firstSymbolId)

      ensureCouncilDistrictHighlightLayers(map.current, firstSymbolId)

      // Baltimore neighborhood boundaries (loaded from server - no optimization)
      map.current.addSource('baltimore-neighborhoods', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'Name',
      })

      map.current.addLayer({
        id: 'baltimore-neighborhoods-fill',
        type: 'fill',
        source: 'baltimore-neighborhoods',
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.12)',
          'fill-opacity': getNeighborhoodFillOpacityExpression(),
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'baltimore-neighborhoods-border',
        type: 'line',
        source: 'baltimore-neighborhoods',
        paint: {
          'line-color': getNeighborhoodBorderLineColorExpression({}),
          'line-width': getNeighborhoodBorderWidthExpression(),
          'line-opacity': 0.9,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'baltimore-neighborhoods-labels',
        type: 'symbol',
        source: 'baltimore-neighborhoods',
        layout: {
          'text-field': ['get', 'Name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-max-width': 8,
          'visibility': 'none',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2.5,
          'text-opacity': 0.95,
        },
      }, firstSymbolId)

      // Baltimore 311 — source A: clustered
      map.current.addSource('baltimore-311-clustered', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      // Baltimore 311 — source B: flat (all individual points)
      map.current.addSource('baltimore-311-flat', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Cluster circles
      const colors = getActiveColors()
      map.current.addLayer({
        id: 'baltimore-311-clusters',
        type: 'circle',
        source: 'baltimore-311-clustered',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            colors.clusterSmall, 50, colors.clusterMedium, 200, colors.clusterLarge,
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            18, 50, 26, 200, 34,
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Cluster count labels
      map.current.addLayer({
        id: 'baltimore-311-cluster-count',
        type: 'symbol',
        source: 'baltimore-311-clustered',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'visibility': 'none',
        },
        paint: { 
          'text-color': '#ffffff',
          'text-opacity': 1,
        },
      }, firstSymbolId)

      // Unclustered points (from clustered source — points outside any cluster)
      map.current.addLayer({
        id: 'baltimore-311-unclustered',
        type: 'circle',
        source: 'baltimore-311-clustered',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 5,
          'circle-color': colors.pointColor,
          'circle-opacity': 0.9,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Flat points (from non-clustered source — all points individually)
      map.current.addLayer({
        id: 'baltimore-311-points',
        type: 'circle',
        source: 'baltimore-311-flat',
        paint: {
          'circle-radius': 4,
          'circle-color': colors.pointColor,
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Heatmap layer (density visualization)
      map.current.addLayer({
        id: 'baltimore-311-heatmap',
        type: 'heatmap',
        source: 'baltimore-311-flat',
        maxzoom: 15,
        paint: {
          'heatmap-weight': heatmapConfig.weight,
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, heatmapConfig.intensityMin,
            15, heatmapConfig.intensityMax,
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(255,255,255,0)',
            0.2, 'rgba(150,100,180,0.6)',
            0.4, 'rgba(180,80,140,0.7)',
            0.6, 'rgba(220,50,80,0.8)',
            0.8, 'rgba(240,100,50,0.9)',
            1, 'rgba(255,220,50,1)',
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, heatmapConfig.radiusMin,
            15, heatmapConfig.radiusMax,
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, heatmapConfig.opacity,
            15, 0,
          ],
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Heatmap circle layer (shows individual points at high zoom)
      map.current.addLayer({
        id: 'baltimore-311-heatmap-points',
        type: 'circle',
        source: 'baltimore-311-flat',
        minzoom: 14,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            14, 2,
            16, 4,
          ],
          'circle-color': colors.pointColor,
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            15, 0.8,
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Click cluster → zoom to expand
      map.current.on('click', 'baltimore-311-clusters', async (e) => {
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['baltimore-311-clusters'] })
        if (!features.length) return
        const clusterId = features[0].properties.cluster_id
        const zoom = await map.current.getSource('baltimore-311-clustered').getClusterExpansionZoom(clusterId)
        map.current.easeTo({ center: features[0].geometry.coordinates, zoom })
      })

      // Shared popup for unclustered + flat point clicks
      const showPointPopup = (e) => {
        const feature = e.features[0]
        const coords = feature.geometry.coordinates.slice()
        const properties = feature.properties || {}
        
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360
        }
        new mapLib.current.Popup({ closeButton: true, maxWidth: '280px', className: 'popup-311' })
          .setLngLat(coords)
          .setHTML(create311PopupHtml(properties))
          .addTo(map.current)
      }
      map.current.on('click', 'baltimore-311-unclustered', showPointPopup)
      map.current.on('click', 'baltimore-311-points', showPointPopup)
      map.current.on('click', 'baltimore-311-heatmap-points', showPointPopup)

      // Pointer cursor on hover
      ;['baltimore-311-clusters', 'baltimore-311-unclustered', 'baltimore-311-points', 'baltimore-311-heatmap-points'].forEach((id) => {
        map.current.on('mouseenter', id, () => { map.current.getCanvas().style.cursor = 'pointer' })
        map.current.on('mouseleave', id, () => { map.current.getCanvas().style.cursor = '' })
      })

      // FORCE PAINT PROPERTIES (override any Mapbox style defaults)
      // This ensures our custom colors are preserved regardless of the basemap style
      setTimeout(() => {
        const colors = getActiveColors()
        
        // 311 Clusters
        forcePaintProperty('baltimore-311-clusters', 'circle-color', [
          'step', ['get', 'point_count'],
          colors.clusterSmall, 50, colors.clusterMedium, 200, colors.clusterLarge,
        ])
        forcePaintProperty('baltimore-311-clusters', 'circle-stroke-color', 'rgba(255,255,255,0.25)')
        forcePaintProperty('baltimore-311-clusters', 'circle-opacity', 0.85)
        
        // 311 Unclustered points
        forcePaintProperty('baltimore-311-unclustered', 'circle-color', colors.pointColor)
        forcePaintProperty('baltimore-311-unclustered', 'circle-stroke-color', 'rgba(255,255,255,0.4)')
        forcePaintProperty('baltimore-311-unclustered', 'circle-opacity', 0.9)
        
        // 311 Flat points
        forcePaintProperty('baltimore-311-points', 'circle-color', colors.pointColor)
        forcePaintProperty('baltimore-311-points', 'circle-stroke-color', 'rgba(255,255,255,0.25)')
        forcePaintProperty('baltimore-311-points', 'circle-opacity', 0.8)
        
        // 311 Heatmap points
        forcePaintProperty('baltimore-311-heatmap-points', 'circle-color', colors.pointColor)
        forcePaintProperty('baltimore-311-heatmap-points', 'circle-stroke-color', 'rgba(255,255,255,0.25)')
        
        // Cluster labels
        forcePaintProperty('baltimore-311-cluster-count', 'text-color', '#ffffff')
      }, 100)

      setMapLoaded(true)
    })
  }

  initMap()

  return () => {
    if (map.current) {
      map.current.remove()
      map.current = null
    }
  }
}, [])

  useEffect(() => {
    if (!mapLoaded) {
      registerMapCameraReader(null)
      return
    }

    registerMapCameraReader(() => {
      if (!map.current) return null
      const center = map.current.getCenter()
      return {
        center: [center.lng, center.lat],
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing(),
      }
    })

    return () => registerMapCameraReader(null)
  }, [mapLoaded, registerMapCameraReader])

  // Focus requests from other views (e.g. Work Orders "Go To Map")
  useEffect(() => {
    if (!map.current || !mapLoaded || !mapFocusRequest) return
    const { lng, lat, zoom } = mapFocusRequest
    if (typeof lng !== 'number' || typeof lat !== 'number') return

    map.current.flyTo({
      center: [lng, lat],
      zoom: zoom || Math.max(map.current.getZoom(), 14),
      duration: 1200,
      essential: true,
    })
  }, [mapFocusRequest, mapLoaded])

  // Popup requests from other views (e.g. Work Orders "Go To Map")
  useEffect(() => {
    if (!map.current || !mapLoaded || !mapPopupRequest || !mapLib.current) return
    const { lng, lat, properties } = mapPopupRequest
    if (typeof lng !== 'number' || typeof lat !== 'number') return

    const openPopup = () => {
      new mapLib.current.Popup({ closeButton: true, maxWidth: '280px', className: 'popup-311' })
        .setLngLat([lng, lat])
        .setHTML(create311PopupHtml(properties || {}))
        .addTo(map.current)
    }

    // Small delay lets map transition start/complete for better UX
    const timer = setTimeout(openPopup, 350)
    return () => clearTimeout(timer)
  }, [mapPopupRequest, mapLoaded, selectedDate])

  // Update 311 layer colors in real-time when color settings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    
    const colors = getActiveColors()
    
    // Update cluster colors
    if (map.current.getLayer('baltimore-311-clusters')) {
      map.current.setPaintProperty('baltimore-311-clusters', 'circle-color', [
        'step', ['get', 'point_count'],
        colors.clusterSmall, 50, colors.clusterMedium, 200, colors.clusterLarge,
      ])
    }
    
    // Update unclustered point colors
    if (map.current.getLayer('baltimore-311-unclustered')) {
      map.current.setPaintProperty('baltimore-311-unclustered', 'circle-color', colors.pointColor)
    }
    
    // Update flat point colors
    if (map.current.getLayer('baltimore-311-points')) {
      map.current.setPaintProperty('baltimore-311-points', 'circle-color', colors.pointColor)
    }
    
    // Update heatmap point colors
    if (map.current.getLayer('baltimore-311-heatmap-points')) {
      map.current.setPaintProperty('baltimore-311-heatmap-points', 'circle-color', colors.pointColor)
    }
  }, [mapLibreColors, mapLoaded]) // Re-run when colors change

  // Baltimore neighborhoods - fetch full data from ArcGIS server (no optimization)
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getSource('baltimore-neighborhoods')) return

    // Fetch full, unoptimized neighborhood data from ArcGIS
    const neighborhoodsUrl = 'https://services1.arcgis.com/mVFRs7NF4iFitgbY/arcgis/rest/services/GP_Boundaries/FeatureServer/1/query?where=1%3D1&outFields=Name&f=geojson'
    
    fetch(neighborhoodsUrl)
      .then(r => r.json())
      .then(geojson => {
        if (map.current && map.current.getSource('baltimore-neighborhoods')) {
          // Store in context for panel to build individual toggles
          setBaltimoreNeighborhoodsData(geojson)
          
          // Set the full data initially (filtering will happen in separate effect)
          map.current.getSource('baltimore-neighborhoods').setData(geojson)
        }
      })
      .catch(err => {
        console.warn('Baltimore neighborhoods fetch failed:', err)
        setBaltimoreNeighborhoodsData({ type: 'FeatureCollection', features: [] })
      })
  }, [mapLoaded, setBaltimoreNeighborhoodsData])

  // Baltimore council districts — load from local static GeoJSON
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getSource('baltimore-districts')) return

    fetch('/data/baltimore-council-districts.geojson')
      .then((res) => res.json())
      .then((geojson) => {
        if (map.current && map.current.getSource('baltimore-districts')) {
          setBaltimoreDistrictsData(geojson)
          map.current.getSource('baltimore-districts').setData(geojson)
        }
      })
      .catch((err) => {
        console.warn('Baltimore council districts fetch failed:', err)
        setBaltimoreDistrictsData({ type: 'FeatureCollection', features: [] })
      })
  }, [mapLoaded, setBaltimoreDistrictsData])

  // Baltimore districts — filter and color-code by 311 density (no impact cards)
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getLayer('baltimore-districts-fill')) return
    if (!baltimoreDistrictsData) return

    const enabledTypes = Object.keys(baltimore311Types).filter((t) => baltimore311Types[t])
    if (enabledTypes.length === 0) {
      map.current.setLayoutProperty('baltimore-districts-fill', 'visibility', 'none')
      map.current.setLayoutProperty('baltimore-districts-border', 'visibility', 'none')
      map.current.setLayoutProperty('baltimore-districts-labels', 'visibility', 'none')
      return
    }

    const baltimore311Data = map.current.getSource('baltimore-311-flat')?._data
    let densityMap = {}

    if (baltimore311Data?.features) {
      const filtered311Data = {
        type: 'FeatureCollection',
        features: baltimore311Data.features.filter((f) => {
          const srType = f?.properties?.SRType
          return srType && enabledTypes.includes(srType)
        }),
      }
      densityMap = calculateBoundary311Density(
        baltimoreDistrictsData,
        filtered311Data,
        baltimore311HideClosed,
        'AREA_NAME'
      )
    }

    let filteredData = { type: 'FeatureCollection', features: [] }
    if (baltimoreDistrictsAll) {
      filteredData.features = baltimoreDistrictsData.features
    }

    filteredData.features = filteredData.features.filter((f) => {
      const id = f.properties?.AREA_NAME
      return id != null && !baltimoreDistrictHidden[String(id)]
    })

    map.current.getSource('baltimore-districts').setData(filteredData)

    map.current.setPaintProperty(
      'baltimore-districts-fill',
      'fill-color',
      getBoundaryColorExpression(densityMap, 'AREA_NAME')
    )
    map.current.setPaintProperty(
      'baltimore-districts-border',
      'line-color',
      getBoundaryBorderLineColorExpression(densityMap, 'AREA_NAME', false)
    )

    const shouldShow = baltimoreDistrictsAll && filteredData.features.length > 0
    const visibility = shouldShow ? 'visible' : 'none'
    map.current.setLayoutProperty('baltimore-districts-fill', 'visibility', visibility)
    map.current.setLayoutProperty('baltimore-districts-border', 'visibility', visibility)
    map.current.setLayoutProperty('baltimore-districts-labels', 'visibility', visibility)
  }, [
    baltimoreDistrictsAll,
    baltimoreDistrictHidden,
    baltimoreDistrictsData,
    mapLoaded,
    baltimore311Types,
    baltimore311HideClosed,
    selectedYear,
    selectedDate,
    baltimore311Data,
  ])

  // District Insights — per-district 311 highlights + persistent hover-expand tooltips
  useEffect(() => {
    if (!map.current || !mapLoaded || !baltimoreDistrictsData) return

    const enabledTypes = Object.keys(baltimore311Types).filter((t) => baltimore311Types[t])
    const allInsights =
      districtInsightsEnabled && enabledTypes.length && baltimore311Data
        ? computeAllDistrictInsightsBy311({
            districtsGeoJSON: baltimoreDistrictsData,
            requests311GeoJSON: baltimore311Data,
            baltimore311Types,
            hideClosed: baltimore311HideClosed,
            selectedDate,
          })
        : []

    const highlights = districtInsightsEnabled && baltimoreDistrictsAll
      ? allInsights.filter((d) =>
          isDistrictShownOnMap(d.districtId, baltimoreDistrictsAll, baltimoreDistrictHidden)
        )
      : []

    applyCouncilDistrictHighlightLayers(map.current, {
      geojson: baltimoreDistrictsData,
      highlights,
      enabled: districtInsightsEnabled && highlights.length > 0,
      idProperty: 'AREA_NAME',
    })
  }, [
    mapLoaded,
    baltimoreDistrictsData,
    baltimore311Data,
    baltimore311Types,
    baltimore311HideClosed,
    selectedDate,
    districtInsightsEnabled,
    baltimoreDistrictsAll,
    baltimoreDistrictHidden,
  ])

  // Baltimore neighborhoods - filter and color-code by 311 density (or storm-advisory mock)
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getLayer('baltimore-neighborhoods-fill')) return
    if (!baltimoreNeighborhoodsData) return

    const baltimore311Data = map.current.getSource('baltimore-311-flat')?._data

    let densityMap = {}
    if (stormAdvisoryNeighborhoodsVisible) {
      densityMap = buildStormAdvisoryDensityMap(baltimoreNeighborhoodsData)
    } else if (baltimore311Data && baltimore311Data.features) {
      const enabledTypes = Object.keys(baltimore311Types).filter(t => baltimore311Types[t])
      const filtered311Data = {
        type: 'FeatureCollection',
        features: baltimore311Data.features.filter(f => {
          const srType = f?.properties?.SRType
          return srType && enabledTypes.includes(srType)
        })
      }
      densityMap = calculateNeighborhood311Density(
        baltimoreNeighborhoodsData,
        filtered311Data,
        baltimore311HideClosed
      )
    }

    impactedDensityMapRef.current = densityMap

    let filteredData = { type: 'FeatureCollection', features: [] }

    if (baltimoreNeighborhoodsAll) {
      filteredData.features = baltimoreNeighborhoodsData.features
    }

    filteredData.features = filteredData.features.filter((f) => {
      const name = f.properties?.Name
      return name && !baltimoreNeighborhoodHidden[name]
    })

    if (stormAdvisoryNeighborhoodsVisible) {
      const advisoryNames = new Set(Object.keys(STORM_ADVISORY_NEIGHBORHOOD_COUNTS))
      filteredData.features = filteredData.features.filter((f) =>
        advisoryNames.has(f.properties?.Name)
      )
    }

    // Clear tooltip/hover selection state before swapping data — avoids white “selected” borders from 311 UI.
    if (
      stormAdvisoryNeighborhoodsVisible &&
      baltimoreNeighborhoodsData?.features?.length &&
      map.current.getSource('baltimore-neighborhoods')
    ) {
      for (const f of baltimoreNeighborhoodsData.features) {
        const id = f.properties?.Name
        if (!id) continue
        try {
          map.current.setFeatureState(
            { source: 'baltimore-neighborhoods', id },
            { hover: false, selected: false }
          )
        } catch {
          /* feature may not be in current tile set */
        }
      }
    }

    map.current.getSource('baltimore-neighborhoods').setData(filteredData)

    // Interactive borders when storm tooltips or 311 impact cards are active.
    const neighborhoodInteractionForPaint =
      stormAdvisoryNeighborhoodsVisible || baltimoreNeighborhoodImpactUi
    map.current.setPaintProperty('baltimore-neighborhoods-fill', 'fill-color', getNeighborhoodColorExpression(densityMap))
    map.current.setPaintProperty(
      'baltimore-neighborhoods-fill',
      'fill-opacity',
      getNeighborhoodFillOpacityExpression(neighborhoodInteractionForPaint)
    )
    map.current.setPaintProperty(
      'baltimore-neighborhoods-border',
      'line-color',
      getNeighborhoodBorderLineColorExpression(densityMap, neighborhoodInteractionForPaint)
    )
    map.current.setPaintProperty(
      'baltimore-neighborhoods-border',
      'line-width',
      getNeighborhoodBorderWidthExpression(neighborhoodInteractionForPaint)
    )

    if (!baltimoreNeighborhoodImpactUi && !stormAdvisoryNeighborhoodsVisible && baltimoreNeighborhoodsData?.features?.length) {
      for (const f of baltimoreNeighborhoodsData.features) {
        const id = f.properties?.Name
        if (!id) continue
        try {
          map.current.setFeatureState(
            { source: 'baltimore-neighborhoods', id },
            { hover: false, selected: false }
          )
        } catch {
          /* feature may not be loaded yet */
        }
      }
    }
    
    const shouldShow = baltimoreNeighborhoodsAll || stormAdvisoryNeighborhoodsVisible
    const visibility = shouldShow ? 'visible' : 'none'
    map.current.setLayoutProperty('baltimore-neighborhoods-fill', 'visibility', visibility)
    map.current.setLayoutProperty('baltimore-neighborhoods-border', 'visibility', visibility)
    map.current.setLayoutProperty('baltimore-neighborhoods-labels', 'visibility', visibility)
  }, [
    baltimoreNeighborhoodImpactUi,
    baltimoreNeighborhoodsAll,
    baltimoreNeighborhoodHidden,
    baltimoreNeighborhoodsData,
    mapLoaded,
    baltimore311Types,
    baltimore311HideClosed,
    selectedYear,
    selectedDate,
    stormAdvisoryNeighborhoodsVisible,
  ])

  // Baltimore neighborhoods — floating stats cards for every impacted neighborhood (no pins)
  useEffect(() => {
    if (!map.current || !mapLoaded || !mapLib.current) return

    let impactedModels = []

    if (stormAdvisoryNeighborhoodsVisible) {
      if (!baltimoreNeighborhoodsData) return
      const densityMap = buildStormAdvisoryDensityMap(baltimoreNeighborhoodsData)
      impactedDensityMapRef.current = densityMap
      impactedModels = getStormAdvisoryTooltipModels(densityMap, baltimoreNeighborhoodsData).filter(
        (model) => !baltimoreNeighborhoodHidden[model.name]
      )
    } else {
      if (!baltimoreNeighborhoodImpactUi) {
        neighborhoodMarkers.current.forEach(({ card }) => {
          card?.remove()
        })
        neighborhoodMarkers.current = []
        setMinimizedCards({})
        impactedDensityMapRef.current = {}
        return
      }
      if (!baltimoreNeighborhoodsData) return

      const baltimore311Data = map.current.getSource('baltimore-311-flat')?._data
      if (!baltimore311Data || !baltimore311Data.features) return

      const enabledTypes = Object.keys(baltimore311Types).filter((t) => baltimore311Types[t])
      const filtered311Data = {
        type: 'FeatureCollection',
        features: baltimore311Data.features.filter((f) => {
          const srType = f?.properties?.SRType
          return srType && enabledTypes.includes(srType)
        }),
      }
      const densityMap = calculateNeighborhood311Density(
        baltimoreNeighborhoodsData,
        filtered311Data,
        baltimore311HideClosed
      )
      impactedDensityMapRef.current = densityMap

      impactedModels = getImpactedNeighborhoodTooltipModels(
        densityMap,
        baltimoreNeighborhoodsData,
        baltimore311Data,
        { hideClosed: baltimore311HideClosed }
      ).filter((model) => !baltimoreNeighborhoodHidden[model.name])
    }

    neighborhoodMarkers.current.forEach(({ card }) => {
      card?.remove()
    })
    neighborhoodMarkers.current = []

    const isLowZoom = zoomToPercent(map.current.getZoom()) < TOOLTIP_AUTO_CLOSE_PERCENT

    impactedModels.forEach((neighborhood) => {
      if (!neighborhood.centroid) return

      const neighborhoodName = neighborhood.name
      const cardDiv = document.createElement('div')
      const cardRoot = createRoot(cardDiv)

      const renderCard = (isMinimized) => {
        cardRoot.render(
          <NeighborhoodStatsCard
            neighborhood={neighborhood}
            severity={neighborhood.color}
            isMinimized={isMinimized}
            zoomPercent={mapZoomPercentRef.current}
            tooltipMode={stormAdvisoryNeighborhoodsVisible ? 'storm' : '311'}
            onMinimize={() => {
              setMinimizedCards((prev) => ({
                ...prev,
                [neighborhoodName]: true,
              }))
            }}
            onBringToFront={() => setForegroundNeighborhoodTooltip(neighborhoodName)}
          />
        )
      }

      const defaultMinimized = neighborhood.color !== 'red'
      const isInitiallyMinimized = isLowZoom
        ? true
        : minimizedCards[neighborhoodName] !== undefined
          ? minimizedCards[neighborhoodName]
          : defaultMinimized

      renderCard(isInitiallyMinimized)

      const cardMarker = new mapLib.current.Marker({
        element: cardDiv,
        anchor: 'center',
        offset: [0, 0],
      })
        .setLngLat(neighborhood.centroid)
        .addTo(map.current)

      neighborhoodMarkers.current.push({
        card: cardMarker,
        name: neighborhoodName,
        neighborhood,
        renderCard,
        cardDiv,
        lngLat: neighborhood.centroid,
      })
    })

    applyNeighborhoodTooltipStackOrder(foregroundNeighborhoodTooltipRef.current)

    syncNeighborhoodSelectionFeatureState()

    return () => {
      neighborhoodMarkers.current.forEach(({ card }) => {
        card?.remove()
      })
      neighborhoodMarkers.current = []
    }
  }, [
    mapLoaded,
    baltimoreNeighborhoodImpactUi,
    stormAdvisoryNeighborhoodsVisible,
    baltimoreNeighborhoodHidden,
    baltimoreNeighborhoodsData,
    baltimore311Types,
    baltimore311HideClosed,
    selectedYear,
    selectedDate,
  ])

  // Baltimore only: block UI until 311 + neighborhoods are ready, then dismiss bootstrap overlay.
  useEffect(() => {
    const finalizeBootstrapOnce = () => {
      if (mapBootstrapFinalizedRef.current) return
      mapBootstrapFinalizedRef.current = true
      setMapBootstrapReady(true)
    }

    if (!map.current || !mapLoaded || !mapLib.current) return
    if (!baltimoreNeighborhoodsData) return
    if (baltimore311Data == null) return

    finalizeBootstrapOnce()
  }, [
    mapLoaded,
    baltimoreNeighborhoodsData,
    baltimore311Data,
    setMapBootstrapReady,
  ])

  // Re-render cards when minimized state or zoom-driven tooltip variant changes
  useEffect(() => {
    neighborhoodMarkers.current.forEach((m) => {
      if (!m.renderCard) return
      const defaultMinimized = m.neighborhood.color !== 'red'
      const isMinimized =
        minimizedCards[m.name] !== undefined ? minimizedCards[m.name] : defaultMinimized
      m.renderCard(isMinimized)
    })
    syncNeighborhoodSelectionFeatureState()
  }, [minimizedCards, mapZoomPercent])

  // Zoom: sync zoom % for tooltip variants; auto-close all tooltips below threshold; restore when zooming back up
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    let wasLowZoom = zoomToPercent(map.current.getZoom()) < TOOLTIP_AUTO_CLOSE_PERCENT

    const minimizeAll = () => {
      setMinimizedCards((prev) => {
        const next = { ...prev }
        neighborhoodMarkers.current.forEach(({ name }) => {
          next[name] = true
        })
        return next
      })
    }

    const restoreFromSnapshot = () => {
      const snap = preLowZoomMinimizedRef.current
      preLowZoomMinimizedRef.current = null
      if (!snap) return
      setMinimizedCards((prev) => {
        const next = { ...prev }
        neighborhoodMarkers.current.forEach(({ name }) => {
          if (Object.prototype.hasOwnProperty.call(snap, name)) {
            next[name] = snap[name]
          } else {
            delete next[name]
          }
        })
        return next
      })
    }

    const handleZoom = () => {
      const pct = zoomToPercent(map.current.getZoom())
      setMapZoomPercent(pct)
      const isLowZoom = pct < TOOLTIP_AUTO_CLOSE_PERCENT
      if (isLowZoom && !wasLowZoom) {
        preLowZoomMinimizedRef.current = { ...minimizedCardsRef.current }
        minimizeAll()
      } else if (!isLowZoom && wasLowZoom) {
        if (preLowZoomMinimizedRef.current) {
          restoreFromSnapshot()
        } else {
          // e.g. map never crossed from high → low in this session; use tier defaults (critical open)
          setMinimizedCards({})
        }
      }
      wasLowZoom = isLowZoom
    }

    handleZoom()

    map.current.on('zoom', handleZoom)

    return () => {
      map.current?.off('zoom', handleZoom)
    }
  }, [mapLoaded])

  // Polygon hover (highlight + pointer) and click to toggle tooltip — impacted neighborhoods only
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!baltimoreNeighborhoodImpactUi && !stormAdvisoryNeighborhoodsVisible) return

    const FILL_ID = 'baltimore-neighborhoods-fill'
    if (!map.current.getLayer(FILL_ID)) return

    let raf = null
    let lastHoverId = null

    const clearHover = () => {
      if (lastHoverId != null) {
        try {
          map.current.setFeatureState(
            { source: 'baltimore-neighborhoods', id: lastHoverId },
            { hover: false }
          )
        } catch {
          /* ignore */
        }
        lastHoverId = null
      }
    }

    const onMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const density = impactedDensityMapRef.current || {}
        const feats = map.current.queryRenderedFeatures(e.point, { layers: [FILL_ID] })
        const f = feats[0]
        const name = f?.properties?.Name
        const count = name ? density[name] || 0 : 0

        if (name && count > 0) {
          map.current.getCanvas().style.cursor = 'pointer'
          if (lastHoverId !== name) {
            clearHover()
            lastHoverId = name
            try {
              map.current.setFeatureState({ source: 'baltimore-neighborhoods', id: name }, { hover: true })
            } catch {
              /* ignore */
            }
          }
        } else {
          map.current.getCanvas().style.cursor = ''
          clearHover()
        }
      })
    }

    const onMouseLeave = () => {
      map.current.getCanvas().style.cursor = ''
      clearHover()
    }

    const onFillClick = (e) => {
      const f = e.features?.[0]
      const name = f?.properties?.Name
      if (!name) return
      const count = impactedDensityMapRef.current[name] || 0
      if (count <= 0) return

      const isLowZoom = zoomToPercent(map.current.getZoom()) < TOOLTIP_AUTO_CLOSE_PERCENT
      if (isLowZoom) {
        setMinimizedCards((prev) => {
          const next = { ...prev }
          neighborhoodMarkers.current.forEach(({ name: n }) => {
            next[n] = true
          })
          return next
        })
        return
      }

      setMinimizedCards((prev) => {
        const meta = neighborhoodMarkers.current.find((m) => m.name === name)
        const defaultMinimized = meta?.neighborhood?.color !== 'red'
        const isMinimized = prev[name] !== undefined ? prev[name] : defaultMinimized
        return { ...prev, [name]: !isMinimized }
      })
    }

    map.current.on('mousemove', onMove)
    map.current.on('mouseleave', onMouseLeave)
    map.current.on('click', FILL_ID, onFillClick)

    return () => {
      const m = map.current
      if (!m) return
      m.off('mousemove', onMove)
      m.off('mouseleave', onMouseLeave)
      m.off('click', FILL_ID, onFillClick)
      try {
        m.getCanvas().style.cursor = ''
      } catch {
        /* map may be removed */
      }
      clearHover()
    }
  }, [mapLoaded, baltimoreNeighborhoodImpactUi, stormAdvisoryNeighborhoodsVisible])

  // Baltimore 311 — auto-load and switch between styles
  useEffect(() => {
    console.log('🚀 311 effect triggered:', { 
      hasMap: !!map.current, 
      mapLoaded, 
      hasClusterLayer: map.current?.getLayer('baltimore-311-clusters') ? 'yes' : 'no'
    })
    
    if (!map.current || !mapLoaded) {
      console.log('⏸️ 311 effect: map not ready yet')
      return
    }
    if (!map.current.getLayer('baltimore-311-clusters')) {
      console.log('⏸️ 311 effect: cluster layer not found yet')
      return
    }

    const CLUSTER_LAYERS = ['baltimore-311-clusters', 'baltimore-311-cluster-count', 'baltimore-311-unclustered']
    const FLAT_LAYERS = ['baltimore-311-points']
    const HEATMAP_LAYERS = ['baltimore-311-heatmap', 'baltimore-311-heatmap-points']
    const ALL_311_LAYERS = [...CLUSTER_LAYERS, ...FLAT_LAYERS, ...HEATMAP_LAYERS]

    const applyVisibility = () => {
      // Hide all layers first
      ALL_311_LAYERS.forEach(id =>
        map.current.setLayoutProperty(id, 'visibility', 'none')
      )
      
      console.log('🔍 applyVisibility called:', { 
        baltimore311Visible,
        stormAdvisoryNeighborhoodsVisible,
        baltimore311Style, 
        typesCount: Object.keys(baltimore311Types).length 
      })

      // Storm advisory map — hide 311; focus on neighborhood choropleth only.
      if (stormAdvisoryNeighborhoodsVisible) {
        console.log('⛔ Storm advisory on — hiding 311 layers')
        return
      }
      
      // Only show layers if baltimore311Visible is true
      if (!baltimore311Visible) {
        console.log('❌ baltimore311Visible is false, not showing layers')
        return
      }
      
      // Show appropriate layers based on style
      if (baltimore311Style === 'cluster') {
        console.log('✅ Showing CLUSTER_LAYERS')
        CLUSTER_LAYERS.forEach(id =>
          map.current.setLayoutProperty(id, 'visibility', 'visible')
        )
      } else if (baltimore311Style === 'heatmap') {
        console.log('✅ Showing HEATMAP_LAYERS')
        HEATMAP_LAYERS.forEach(id =>
          map.current.setLayoutProperty(id, 'visibility', 'visible')
        )
      } else {
        // default
        console.log('✅ Showing FLAT_LAYERS (default style)')
        FLAT_LAYERS.forEach(id =>
          map.current.setLayoutProperty(id, 'visibility', 'visible')
        )
      }
    }

    // Generate cache key from selected date (YYYY-MM-DD format)
    const getCacheKey = () => {
      if (!selectedDate) return selectedYear.toString()
      const d = new Date(selectedDate)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    const applyAllFilters = (geojson) => {
      const typeFiltered = applyBaltimore311MapFilters(
        geojson,
        baltimore311Types,
        baltimore311HideClosed,
        selectedDate
      )
      return filter311ByVisibleBoundaries(typeFiltered, {
        districtsGeoJSON: baltimoreDistrictsData,
        baltimoreDistrictsAll,
        baltimoreDistrictHidden,
        neighborhoodsGeoJSON: baltimoreNeighborhoodsData,
        baltimoreNeighborhoodsAll,
        baltimoreNeighborhoodHidden,
      })
    }

    const cacheKey = getCacheKey()
    
    // Use cached data for this date
    if (baltimore311Cache.current[cacheKey]) {
      const fullData = baltimore311Cache.current[cacheKey]
      setBaltimore311Data(fullData)
      setBaltimore311DataYear(selectedYear)
      const filteredData = applyAllFilters(fullData)
      map.current.getSource('baltimore-311-clustered').setData(filteredData)
      map.current.getSource('baltimore-311-flat').setData(filteredData)
      applyVisibility()
      return
    }

    // Fetch for this date (with server-side date filtering)
    console.log('🌐 Fetching 311 data for', selectedYear, selectedDate, 'cache key:', cacheKey)
    fetch(get311ServiceUrl(selectedYear, selectedDate))
      .then((r) => {
        console.log('📡 311 fetch response received')
        return r.json()
      })
      .then((geojson) => {
        console.log('✅ 311 data parsed:', geojson.features?.length, 'features')
        baltimore311Cache.current[cacheKey] = geojson
        setBaltimore311Data(geojson)
        setBaltimore311DataYear(selectedYear)
        const filteredData = applyAllFilters(geojson)
        console.log('📊 Filtered data:', filteredData.features?.length, 'features after filters')
        if (map.current) {
          map.current.getSource('baltimore-311-clustered').setData(filteredData)
          map.current.getSource('baltimore-311-flat').setData(filteredData)
          applyVisibility()
        }
      })
      .catch((err) => {
        console.error('❌ 311 fetch failed:', err)
        const empty = { type: 'FeatureCollection', features: [] }
        setBaltimore311Data(empty)
        setBaltimore311DataYear(selectedYear)
        if (map.current) {
          map.current.getSource('baltimore-311-clustered')?.setData(empty)
          map.current.getSource('baltimore-311-flat')?.setData(empty)
        }
        ;[...CLUSTER_LAYERS, ...FLAT_LAYERS].forEach(id =>
          map.current?.setLayoutProperty(id, 'visibility', 'none')
        )
      })
  }, [
    selectedYear,
    selectedDate,
    baltimore311Style,
    baltimore311Visible,
    baltimore311HideClosed,
    baltimore311Types,
    mapLoaded,
    stormAdvisoryNeighborhoodsVisible,
    setBaltimore311Data,
    setBaltimore311DataYear,
    baltimoreDistrictsData,
    baltimoreDistrictsAll,
    baltimoreDistrictHidden,
    baltimoreNeighborhoodsData,
    baltimoreNeighborhoodsAll,
    baltimoreNeighborhoodHidden,
  ])

  // Update heatmap properties in real-time when config changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getLayer('baltimore-311-heatmap')) return

    // Update heatmap layer properties
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-weight', heatmapConfig.weight)
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-intensity', [
      'interpolate', ['linear'], ['zoom'],
      0, heatmapConfig.intensityMin,
      15, heatmapConfig.intensityMax,
    ])
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-radius', [
      'interpolate', ['linear'], ['zoom'],
      0, heatmapConfig.radiusMin,
      15, heatmapConfig.radiusMax,
    ])
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-opacity', [
      'interpolate', ['linear'], ['zoom'],
      14, heatmapConfig.opacity,
      15, 0,
    ])
  }, [heatmapConfig, mapLoaded])

  return (
    <>
      <div
        ref={mapContainer}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
      />
      {baltimore311Style === 'heatmap' && <HeatmapLegend />}
    </>
  )
}
