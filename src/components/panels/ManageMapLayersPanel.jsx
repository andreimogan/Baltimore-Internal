import { useState, useEffect, useMemo } from 'react'
import {
  GripVertical,
  RefreshCw,
  Settings,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Minus,
} from 'lucide-react'
import { usePanelContext } from '../../contexts/PanelContext'
import { useDraggable } from '../../hooks/useDraggable'
import { BUCKET_DEFINITIONS, groupTypesByBucket } from '../../utils/311TypeBuckets'
import { loadSavedMapLayerDefaults } from '../../utils/mapLayerDefaultsStorage'
import { calculateNeighborhood311Density, calculateBoundary311Density } from '../../utils/neighborhoodDensity'

const baltimoreCategories = [
  {
    id: 'requests',
    name: '311 Service Requests',
    layers: 'dynamic', // Will be populated from fetched data
  },
  {
    id: 'parcels',
    name: 'Parcels',
    layers: [], // Custom content (on-demand parcels filtered by enabled boundaries)
  },
  {
    id: 'buildings',
    name: 'Buildings Footprint',
    layers: [], // Custom content (on-demand building footprints filtered by enabled boundaries)
  },
  {
    id: 'vacant',
    name: 'Vacant Building Notice',
    layers: [], // Custom content (vacant-notice points filtered by enabled boundaries)
  },
  {
    id: 'usecases',
    name: 'Use Cases',
    layers: [], // Custom content (risk/decision use-case toggles, e.g. Public Safety)
  },
]

export default function ManageMapLayersPanel() {
  const {
    layersVisible,
    toggleLayers,
    baltimoreNeighborhoodsData,
    setBaltimoreNeighborhoodsData,
    baltimoreNeighborhoodsAll,
    setBaltimoreNeighborhoodsAll,
    baltimoreNeighborhoodImpactUi,
    setBaltimoreNeighborhoodImpactUi,
    baltimoreNeighborhoodHidden,
    setBaltimoreNeighborhoodHidden,
    baltimoreDistrictsData,
    baltimoreDistrictsAll,
    setBaltimoreDistrictsAll,
    baltimoreDistrictHidden,
    setBaltimoreDistrictHidden,
    districtInsightsEnabled,
    setDistrictInsightsEnabled,
    baltimoreWardPrecinctsData,
    baltimoreWardPrecinctsAll,
    setBaltimoreWardPrecinctsAll,
    baltimoreWardPrecinctHidden,
    setBaltimoreWardPrecinctHidden,
    baltimoreParcelsEnabled,
    setBaltimoreParcelsEnabled,
    baltimoreParcelNeighborhoodEnabled,
    setBaltimoreParcelNeighborhoodEnabled,
    baltimoreParcelDistrictEnabled,
    setBaltimoreParcelDistrictEnabled,
    baltimoreParcelPrecinctEnabled,
    setBaltimoreParcelPrecinctEnabled,
    baltimoreBuildingsEnabled,
    setBaltimoreBuildingsEnabled,
    baltimoreBuildingNeighborhoodEnabled,
    setBaltimoreBuildingNeighborhoodEnabled,
    baltimoreBuildingDistrictEnabled,
    setBaltimoreBuildingDistrictEnabled,
    baltimoreBuildingPrecinctEnabled,
    setBaltimoreBuildingPrecinctEnabled,
    baltimoreVbnEnabled,
    setBaltimoreVbnEnabled,
    baltimoreVbnNeighborhoodEnabled,
    setBaltimoreVbnNeighborhoodEnabled,
    baltimoreVbnDistrictEnabled,
    setBaltimoreVbnDistrictEnabled,
    baltimoreVbnPrecinctEnabled,
    setBaltimoreVbnPrecinctEnabled,
    baltimorePublicSafetyEnabled,
    setBaltimorePublicSafetyEnabled,
    selectedYear,
    selectedDate,
    mapLibreColors,
    setMapLibreColors,
    baltimore311Visible,
    setBaltimore311Visible,
    baltimore311Style,
    setBaltimore311Style,
    baltimore311Clustered,
    setBaltimore311Clustered,
    baltimore311HideClosed,
    setBaltimore311HideClosed,
    baltimore311Types,
    setBaltimore311Types,
    baltimore311Data,
    baltimore311DataYear,
  } = usePanelContext()

  const PANEL_WIDTH = 320
  const RIGHT_MARGIN = 24
  const TOP_OFFSET = 80
  const BOTTOM_MARGIN = 16

  const getRightAlignedPosition = () => ({
    x: typeof window !== 'undefined' ? window.innerWidth - PANEL_WIDTH - RIGHT_MARGIN : 0,
    y: TOP_OFFSET,
  })

  const { position, setPosition, isDragging, dragRef, handleMouseDown } = useDraggable(getRightAlignedPosition())

  useEffect(() => {
    if (!layersVisible) return

    const alignRight = () => {
      setPosition({ x: window.innerWidth - PANEL_WIDTH - RIGHT_MARGIN, y: TOP_OFFSET })
    }

    alignRight()
    window.addEventListener('resize', alignRight)
    return () => window.removeEventListener('resize', alignRight)
  }, [layersVisible, setPosition])

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({ requests: true, parcels: false, buildings: false, vacant: false, usecases: false })
  const [expandedBuckets, setExpandedBuckets] = useState({}) // Track which 311 buckets are expanded
  const [basemapStyleOpen, setBasemapStyleOpen] = useState(false)
  const [expandedHoodSections, setExpandedHoodSections] = useState({
    showNeighborhoods: false,
    showDistricts: false,
    showPrecincts: false,
    showParcelNeighborhoods: false,
    showParcelDistricts: false,
    showParcelPrecincts: false,
    showBuildingNeighborhoods: false,
    showBuildingDistricts: false,
    showBuildingPrecincts: false,
    showVacantNeighborhoods: false,
    showVacantDistricts: false,
    showVacantPrecincts: false,
  })
  const [expandedPrecinctGroups, setExpandedPrecinctGroups] = useState({})
  const [expandedParcelPrecinctGroups, setExpandedParcelPrecinctGroups] = useState({})
  const [expandedBuildingPrecinctGroups, setExpandedBuildingPrecinctGroups] = useState({})
  const [expandedVacantPrecinctGroups, setExpandedVacantPrecinctGroups] = useState({})
  const [layerStates, setLayerStates] = useState({
    'baltimore-311-cluster': baltimore311Clustered,
  })

  // Extract unique 311 types from fetched data and initialize their states
  useEffect(() => {
    if (!baltimore311Data) return
    // Data is already filtered by date from the API, no need to re-filter
    const uniqueTypes = [...new Set(
      baltimore311Data.features
        .filter((f) => {
          const srType = f?.properties?.SRType
          const hasValidPoint =
            f?.geometry?.type === 'Point' &&
            Array.isArray(f?.geometry?.coordinates) &&
            f.geometry.coordinates.length >= 2
          
          return srType && hasValidPoint
        })
        .map(f => f.properties.SRType)
    )].sort()
    
    // Initialize types from data, merging session state then saved defaults
    const savedTypes = loadSavedMapLayerDefaults()?.baltimore311Types ?? {}
    setBaltimore311Types((prev) => {
      const typesObj = {}
      uniqueTypes.forEach((t) => {
        if (typeof prev[t] === 'boolean') {
          typesObj[t] = prev[t]
        } else if (typeof savedTypes[t] === 'boolean') {
          typesObj[t] = savedTypes[t]
        } else {
          typesObj[t] = true
        }
      })
      return typesObj
    })

    // Auto-expand first bucket
    const grouped = groupTypesByBucket(uniqueTypes)
    const firstBucket = Object.keys(grouped)[0]
    if (firstBucket) setExpandedBuckets({ [firstBucket]: true })
  }, [baltimore311Data, selectedDate, setBaltimore311Types])

  const densityMapForPanel = useMemo(() => {
    if (!baltimoreNeighborhoodsData?.features?.length || !baltimore311Data?.features?.length) {
      return {}
    }
    const enabledTypes = Object.keys(baltimore311Types).filter((t) => baltimore311Types[t])
    const filtered311Data = {
      type: 'FeatureCollection',
      features: baltimore311Data.features.filter((f) => {
        const srType = f?.properties?.SRType
        return srType && enabledTypes.includes(srType)
      }),
    }
    return calculateNeighborhood311Density(baltimoreNeighborhoodsData, filtered311Data, baltimore311HideClosed)
  }, [baltimoreNeighborhoodsData, baltimore311Data, baltimore311Types, baltimore311HideClosed])

  const densityMapForDistricts = useMemo(() => {
    if (!baltimoreDistrictsData?.features?.length || !baltimore311Data?.features?.length) {
      return {}
    }
    const enabledTypes = Object.keys(baltimore311Types).filter((t) => baltimore311Types[t])
    const filtered311Data = {
      type: 'FeatureCollection',
      features: baltimore311Data.features.filter((f) => {
        const srType = f?.properties?.SRType
        return srType && enabledTypes.includes(srType)
      }),
    }
    return calculateBoundary311Density(
      baltimoreDistrictsData,
      filtered311Data,
      baltimore311HideClosed,
      'AREA_NAME'
    )
  }, [baltimoreDistrictsData, baltimore311Data, baltimore311Types, baltimore311HideClosed])

  const densityMapForPrecincts = useMemo(() => {
    if (!baltimoreWardPrecinctsData?.features?.length || !baltimore311Data?.features?.length) {
      return {}
    }
    const enabledTypes = Object.keys(baltimore311Types).filter((t) => baltimore311Types[t])
    const filtered311Data = {
      type: 'FeatureCollection',
      features: baltimore311Data.features.filter((f) => {
        const srType = f?.properties?.SRType
        return srType && enabledTypes.includes(srType)
      }),
    }
    return calculateBoundary311Density(
      baltimoreWardPrecinctsData,
      filtered311Data,
      baltimore311HideClosed,
      'VDTST12'
    )
  }, [baltimoreWardPrecinctsData, baltimore311Data, baltimore311Types, baltimore311HideClosed])

  // Precincts grouped by their parent council district (COUNCIL_DI), each sorted by precinct id.
  const precinctsByDistrict = useMemo(() => {
    if (!baltimoreWardPrecinctsData?.features?.length) return []
    const groups = new Map()
    baltimoreWardPrecinctsData.features.forEach((f) => {
      const districtId = String(f.properties?.COUNCIL_DI ?? '').trim()
      const precinctId = String(f.properties?.VDTST12 ?? '').trim()
      if (!districtId || !precinctId) return
      if (!groups.has(districtId)) groups.set(districtId, [])
      groups.get(districtId).push({ id: precinctId })
    })
    return Array.from(groups.entries())
      .map(([districtId, precincts]) => ({
        districtId,
        precincts: precincts.sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => Number(a.districtId) - Number(b.districtId))
  }, [baltimoreWardPrecinctsData])

  const totalPrecinctCount = useMemo(
    () => precinctsByDistrict.reduce((sum, g) => sum + g.precincts.length, 0),
    [precinctsByDistrict]
  )

  const allNeighborhoodNames = useMemo(() => {
    if (!baltimoreNeighborhoodsData?.features?.length) return []
    return baltimoreNeighborhoodsData.features
      .map((f) => f.properties?.Name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [baltimoreNeighborhoodsData])

  const allDistrictEntries = useMemo(() => {
    if (!baltimoreDistrictsData?.features?.length) return []
    return baltimoreDistrictsData.features
      .map((f) => ({
        id: String(f.properties?.AREA_NAME ?? ''),
        councilMember: f.properties?.CNTCT_NME || '',
      }))
      .filter((d) => d.id)
      .sort((a, b) => Number(a.id) - Number(b.id))
  }, [baltimoreDistrictsData])

  if (!layersVisible) return null

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleBucket = (bucketId) => {
    setExpandedBuckets(prev => ({ ...prev, [bucketId]: !prev[bucketId] }))
  }

  const toggleBucketTypes = (bucketId, types) => {
    const allOn = types.every(t => baltimore311Types[t])
    const newState = !allOn // If all on, turn all off; otherwise turn all on
    const updates = {}
    types.forEach(t => { updates[t] = newState })
    setBaltimore311Types(prev => ({ ...prev, ...updates }))
  }

  const toggleAll311Types = () => {
    const allTypes = Object.keys(baltimore311Types)
    const allOn = allTypes.every(t => baltimore311Types[t])
    const newState = !allOn // If all on, turn all off; otherwise turn all on
    const updates = {}
    allTypes.forEach(t => { updates[t] = newState })
    setBaltimore311Types(prev => ({ ...prev, ...updates }))
  }

  const getGlobalToggleState = () => {
    const allTypes = Object.keys(baltimore311Types)
    if (allTypes.length === 0) return 'off'
    const onCount = allTypes.filter(t => baltimore311Types[t]).length
    if (onCount === 0) return 'off'
    if (onCount === allTypes.length) return 'on'
    return 'mixed'
  }

  const getBucketToggleState = (types) => {
    const onCount = types.filter(t => baltimore311Types[t]).length
    if (onCount === 0) return 'off'
    if (onCount === types.length) return 'on'
    return 'mixed'
  }

  // Check if at least one 311 type is enabled
  const hasAny311TypeEnabled = Object.values(baltimore311Types).some(v => v === true)

  /** Selected on map when not explicitly hidden (`true`). `false` = forced visible in solo edge cases. */
  const isNeighborhoodShownOnMap = (name) => baltimoreNeighborhoodHidden[name] !== true

  const toggleNeighborhoodHidden = (name) => {
    setBaltimoreNeighborhoodHidden((prev) => {
      const next = { ...prev }
      const v = prev[name]
      if (v === true) next[name] = false
      else if (v === false) next[name] = true
      else next[name] = true
      return next
    })
    setBaltimoreNeighborhoodsAll(true)
  }

  /** Select-all / deselect-all / partial — full list (278). */
  const getAllNeighborhoodsBulkState = () => {
    if (!baltimoreNeighborhoodsAll) return 'off'
    if (!allNeighborhoodNames.length) return 'off'
    let onCount = 0
    for (const n of allNeighborhoodNames) {
      if (baltimoreNeighborhoodHidden[n] !== true) onCount++
    }
    if (onCount === 0) return 'off'
    if (onCount === allNeighborhoodNames.length) return 'on'
    return 'mixed'
  }

  const handleShowAllNeighborhoodsBulkToggle = () => {
    if (!hasAny311TypeEnabled || !allNeighborhoodNames.length) return
    const state = getAllNeighborhoodsBulkState()
    setBaltimoreNeighborhoodsAll(true)
    if (state === 'on') {
      setBaltimoreNeighborhoodHidden((prev) => {
        const next = { ...prev }
        allNeighborhoodNames.forEach((n) => {
          next[n] = true
        })
        return next
      })
    } else {
      setBaltimoreNeighborhoodHidden((prev) => {
        const next = { ...prev }
        allNeighborhoodNames.forEach((n) => {
          delete next[n]
        })
        return next
      })
    }
  }

  const isDistrictShownOnMap = (id) => baltimoreDistrictHidden[id] !== true

  const toggleDistrictHidden = (id) => {
    setBaltimoreDistrictHidden((prev) => {
      const next = { ...prev }
      const v = prev[id]
      if (v === true) next[id] = false
      else if (v === false) next[id] = true
      else next[id] = true
      return next
    })
    setBaltimoreDistrictsAll(true)
  }

  const getAllDistrictsBulkState = () => {
    if (!allDistrictEntries.length) return 'off'
    let onCount = 0
    for (const d of allDistrictEntries) {
      if (baltimoreDistrictHidden[d.id] !== true) onCount++
    }
    if (onCount === 0) return 'off'
    if (onCount === allDistrictEntries.length) return 'on'
    return 'mixed'
  }

  const handleShowAllDistrictsBulkToggle = () => {
    if (!hasAny311TypeEnabled || !allDistrictEntries.length) return
    const state = getAllDistrictsBulkState()
    setBaltimoreDistrictsAll(true)
    if (state === 'on') {
      setBaltimoreDistrictHidden((prev) => {
        const next = { ...prev }
        allDistrictEntries.forEach((d) => {
          next[d.id] = true
        })
        return next
      })
    } else {
      setBaltimoreDistrictHidden((prev) => {
        const next = { ...prev }
        allDistrictEntries.forEach((d) => {
          delete next[d.id]
        })
        return next
      })
    }
  }

  const isPrecinctShownOnMap = (id) => baltimoreWardPrecinctHidden[id] !== true

  const togglePrecinctHidden = (id) => {
    setBaltimoreWardPrecinctHidden((prev) => {
      const next = { ...prev }
      next[id] = prev[id] === true ? false : true
      return next
    })
    setBaltimoreWardPrecinctsAll(true)
  }

  const getPrecinctGroupBulkState = (precincts) => {
    if (!precincts.length) return 'off'
    let onCount = 0
    for (const p of precincts) {
      if (baltimoreWardPrecinctHidden[p.id] !== true) onCount++
    }
    if (onCount === 0) return 'off'
    if (onCount === precincts.length) return 'on'
    return 'mixed'
  }

  const togglePrecinctGroup = (precincts) => {
    const hideAll = getPrecinctGroupBulkState(precincts) !== 'off'
    setBaltimoreWardPrecinctHidden((prev) => {
      const next = { ...prev }
      precincts.forEach((p) => {
        if (hideAll) next[p.id] = true
        else delete next[p.id]
      })
      return next
    })
    setBaltimoreWardPrecinctsAll(true)
  }

  // --- Parcels: opt-in (key -> true) toggles. Enabling any also turns on the master. ---
  const toggleParcelKey = (setter, key) => {
    setter((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
    setBaltimoreParcelsEnabled(true)
  }
  const toggleParcelNeighborhood = (name) =>
    toggleParcelKey(setBaltimoreParcelNeighborhoodEnabled, name)
  const toggleParcelDistrict = (id) => toggleParcelKey(setBaltimoreParcelDistrictEnabled, id)
  const toggleParcelPrecinct = (id) => toggleParcelKey(setBaltimoreParcelPrecinctEnabled, id)

  const getParcelPrecinctGroupState = (precincts) => {
    if (!precincts.length) return 'off'
    let on = 0
    for (const p of precincts) if (baltimoreParcelPrecinctEnabled[p.id]) on++
    if (on === 0) return 'off'
    if (on === precincts.length) return 'on'
    return 'mixed'
  }
  const toggleParcelPrecinctGroup = (precincts) => {
    const enableAll = getParcelPrecinctGroupState(precincts) !== 'on'
    setBaltimoreParcelPrecinctEnabled((prev) => {
      const next = { ...prev }
      precincts.forEach((p) => {
        if (enableAll) next[p.id] = true
        else delete next[p.id]
      })
      return next
    })
    setBaltimoreParcelsEnabled(true)
  }

  // --- Buildings: same opt-in toggles as parcels, against the building records. ---
  const toggleBuildingKey = (setter, key) => {
    setter((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
    setBaltimoreBuildingsEnabled(true)
  }
  const toggleBuildingNeighborhood = (name) =>
    toggleBuildingKey(setBaltimoreBuildingNeighborhoodEnabled, name)
  const toggleBuildingDistrict = (id) => toggleBuildingKey(setBaltimoreBuildingDistrictEnabled, id)
  const toggleBuildingPrecinct = (id) => toggleBuildingKey(setBaltimoreBuildingPrecinctEnabled, id)

  const getBuildingPrecinctGroupState = (precincts) => {
    if (!precincts.length) return 'off'
    let on = 0
    for (const p of precincts) if (baltimoreBuildingPrecinctEnabled[p.id]) on++
    if (on === 0) return 'off'
    if (on === precincts.length) return 'on'
    return 'mixed'
  }
  const toggleBuildingPrecinctGroup = (precincts) => {
    const enableAll = getBuildingPrecinctGroupState(precincts) !== 'on'
    setBaltimoreBuildingPrecinctEnabled((prev) => {
      const next = { ...prev }
      precincts.forEach((p) => {
        if (enableAll) next[p.id] = true
        else delete next[p.id]
      })
      return next
    })
    setBaltimoreBuildingsEnabled(true)
  }

  // --- Vacant Building Notices: same opt-in toggles, against the VBN records. ---
  const toggleVacantKey = (setter, key) => {
    setter((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
    setBaltimoreVbnEnabled(true)
  }
  const toggleVacantNeighborhood = (name) => toggleVacantKey(setBaltimoreVbnNeighborhoodEnabled, name)
  const toggleVacantDistrict = (id) => toggleVacantKey(setBaltimoreVbnDistrictEnabled, id)
  const toggleVacantPrecinct = (id) => toggleVacantKey(setBaltimoreVbnPrecinctEnabled, id)

  const getVacantPrecinctGroupState = (precincts) => {
    if (!precincts.length) return 'off'
    let on = 0
    for (const p of precincts) if (baltimoreVbnPrecinctEnabled[p.id]) on++
    if (on === 0) return 'off'
    if (on === precincts.length) return 'on'
    return 'mixed'
  }
  const toggleVacantPrecinctGroup = (precincts) => {
    const enableAll = getVacantPrecinctGroupState(precincts) !== 'on'
    setBaltimoreVbnPrecinctEnabled((prev) => {
      const next = { ...prev }
      precincts.forEach((p) => {
        if (enableAll) next[p.id] = true
        else delete next[p.id]
      })
      return next
    })
    setBaltimoreVbnEnabled(true)
  }

  const getBucketRequestCount = (types) => {
    if (!baltimore311Data) return 0
    // Data is already filtered by date from the API, no need to re-filter
    return baltimore311Data.features.filter((f) => {
      const srType = f?.properties?.SRType
      const isEnabledType = types.includes(srType)
      const hasValidPoint =
        f?.geometry?.type === 'Point' &&
        Array.isArray(f?.geometry?.coordinates) &&
        f.geometry.coordinates.length >= 2
      
      return isEnabledType && hasValidPoint
    }).length
  }

  const toggleLayer = (layerId) => {
    const newState = !layerStates[layerId]
    setLayerStates(prev => ({ ...prev, [layerId]: newState }))
  }

  const handleBasemapStyleSelect = (style) => {
    setBaltimore311Style(style)
    // Update old baltimore311Clustered for backward compatibility
    setBaltimore311Clustered(style === 'cluster')
    setLayerStates(prev => ({ ...prev, 'baltimore-311-cluster': style === 'cluster' }))
    setBasemapStyleOpen(false)
  }

  const toggle311Type = (typeName) => {
    setBaltimore311Types(prev => ({ ...prev, [typeName]: !prev[typeName] }))
  }

  // Build dynamic Baltimore 311 layers from data (grouped by bucket)
  const baltimoreCategoriesWithBuckets = baltimoreCategories.map(cat => {
    if (cat.layers === 'dynamic') {
      const types = Object.keys(baltimore311Types).sort()
      const bucketGroups = groupTypesByBucket(types)
      
      const bucketLayers = Object.entries(bucketGroups).map(([bucketId, bucketTypes]) => {
        const bucketDef = BUCKET_DEFINITIONS[bucketId] || { id: bucketId, name: bucketId === 'other' ? 'Other / Unknown' : bucketId }
        return {
          id: `bucket-${bucketId}`,
          name: bucketDef.name,
          isBucket: true,
          bucketId,
          types: bucketTypes,
        }
      })
      
      return { ...cat, layers: bucketLayers }
    }
    
    return cat
  })

  const activeCategories = baltimoreCategoriesWithBuckets

  // Enhanced search: search in bucket names AND individual type names
  const filteredCategories = activeCategories.map(cat => {
    if (!searchQuery) {
      return { ...cat, layers: cat.layers }
    }
    
    const query = searchQuery.toLowerCase()
    
    return {
      ...cat,
      layers: cat.layers
        .map(layer => {
          // For buckets, check if bucket name matches OR any of its types match
          if (layer.isBucket) {
            const bucketNameMatches = layer.name.toLowerCase().includes(query)
            const matchingTypes = layer.types.filter(t => t.toLowerCase().includes(query))
            
            // If bucket name matches, include all types
            if (bucketNameMatches) {
              return layer
            }
            
            // If any types match, return bucket with only matching types
            if (matchingTypes.length > 0) {
              return {
                ...layer,
                types: matchingTypes,
                isFiltered: true // Mark as filtered so we can auto-expand it
              }
            }
            
            // No match
            return null
          }
          
          // For regular layers, simple name match
          return layer.name.toLowerCase().includes(query) ? layer : null
        })
        .filter(Boolean) // Remove nulls
    }
  })

  // ---- Parcels accordion render helpers ----
  const parcelSwitch = (on, onClick, label, size = 'sm') => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors ${size === 'lg' ? 'h-5 w-9 scale-85' : 'h-4 w-8'}`}
      style={{ backgroundColor: on ? 'var(--ui-accent-muted)' : 'var(--ui-control-border)' }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <span
        className={`pointer-events-none absolute left-0.5 top-0.5 rounded-full bg-white shadow transition-transform ${size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'}`}
        style={{ transform: on ? (size === 'lg' ? 'translateX(16px)' : 'translateX(14px)') : 'translateX(0)' }}
      />
    </button>
  )

  const parcelSubHeader = (sectionKey, title, count) => {
    const open = expandedHoodSections[sectionKey]
    return (
      <div
        role="button"
        tabIndex={0}
        className="rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
        style={{ borderColor: 'var(--ui-border)' }}
        onClick={() => setExpandedHoodSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
      >
        <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
          {open ? <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" /> : <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />}
        </div>
        <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>{title}</span>
        <span className="text-[10px] opacity-50 shrink-0">({count})</span>
      </div>
    )
  }

  const parcelItemRow = (label, on, onToggle) => (
    <div
      className="rounded-md border px-2 py-1 flex items-center justify-between gap-2"
      style={{ borderColor: on ? 'var(--ui-status-info-border)' : 'var(--ui-border)', backgroundColor: on ? 'var(--ui-status-info-bg)' : 'transparent' }}
    >
      <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
      {parcelSwitch(on, onToggle, `Toggle parcels for ${label}`)}
    </div>
  )

  const totalParcelPrecincts = precinctsByDistrict.reduce((s, g) => s + g.precincts.length, 0)

  return (
    <div
      className="rounded-xl border fixed shadow-xl overflow-hidden flex flex-col z-30"
      role="region"
      aria-label="Map Layers"
      style={{
        top: `${TOP_OFFSET}px`,
        bottom: `${BOTTOM_MARGIN}px`,
        left: `${position.x}px`,
        width: '320px',
        backgroundColor: 'var(--ui-surface)',
        borderColor: 'var(--ui-border)',
        color: 'var(--ui-text-primary)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="p-3 flex items-center justify-between select-none border-b shrink-0"
        style={{
          borderColor: 'var(--ui-border)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-4 h-4 shrink-0" style={{ color: 'var(--ui-text-muted)' }} aria-hidden="true" />
          <span className="shrink-0">
            <svg className="w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--ui-text-primary)' }}>
              Manage Map Layers
            </h2>
            <p className="text-xs opacity-70" style={{ color: 'var(--ui-text-muted)' }}>
              Click categories to expand
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-7 w-7"
            style={{ color: 'var(--ui-text-secondary)' }}
            title="Reload layer settings"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ui-text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ui-text-secondary)'}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="relative">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-7 w-7"
              style={{ color: basemapStyleOpen ? 'var(--ui-text-primary)' : 'var(--ui-text-secondary)' }}
              title="Basemap settings"
              onClick={() => setBasemapStyleOpen(!basemapStyleOpen)}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ui-text-primary)'}
              onMouseLeave={(e) => !basemapStyleOpen && (e.currentTarget.style.color = 'var(--ui-text-secondary)')}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
            {basemapStyleOpen && (
              <div
                className="absolute right-0 mt-1 w-48 rounded-[8px] border shadow-lg z-50 overflow-hidden"
                style={{ borderColor: 'var(--ui-border)', background: 'var(--ui-surface)' }}
              >
                <div className="p-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>
                    Basemap Style
                  </div>
                  <button
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center justify-between transition-colors"
                    style={{
                      color: 'var(--ui-text-secondary)',
                      backgroundColor: baltimore311Style === 'default' ? 'var(--ui-control-active-bg)' : 'transparent',
                    }}
                    onClick={() => handleBasemapStyleSelect('default')}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'default' ? 'var(--ui-control-active-bg)' : 'var(--ui-surface-muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'default' ? 'var(--ui-control-active-bg)' : 'transparent' }}
                  >
                    <span>Default View</span>
                    {baltimore311Style === 'default' && (
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ui-control-active-fg)' }}>Active</span>
                    )}
                  </button>
                  <button
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center justify-between transition-colors"
                    style={{
                      color: 'var(--ui-text-secondary)',
                      backgroundColor: baltimore311Style === 'cluster' ? 'var(--ui-control-active-bg)' : 'transparent',
                    }}
                    onClick={() => handleBasemapStyleSelect('cluster')}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'cluster' ? 'var(--ui-control-active-bg)' : 'var(--ui-surface-muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'cluster' ? 'var(--ui-control-active-bg)' : 'transparent' }}
                  >
                    <span>Cluster View</span>
                    {baltimore311Style === 'cluster' && (
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ui-control-active-fg)' }}>Active</span>
                    )}
                  </button>
                  <button
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center justify-between transition-colors"
                    style={{
                      color: 'var(--ui-text-secondary)',
                      backgroundColor: baltimore311Style === 'heatmap' ? 'var(--ui-control-active-bg)' : 'transparent',
                    }}
                    onClick={() => handleBasemapStyleSelect('heatmap')}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'heatmap' ? 'var(--ui-control-active-bg)' : 'var(--ui-surface-muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'heatmap' ? 'var(--ui-control-active-bg)' : 'transparent' }}
                  >
                    <span>Heatmap</span>
                    {baltimore311Style === 'heatmap' && (
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ui-control-active-fg)' }}>Active</span>
                    )}
                  </button>

                </div>
              </div>
            )}
          </div>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-7 w-7"
            style={{ color: 'var(--ui-text-secondary)' }}
            title="Close"
            onClick={toggleLayers}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ui-text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ui-text-secondary)'}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden min-h-0">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: 'var(--ui-text-muted)' }} aria-hidden="true" />
          <input
            className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors pl-8 focus-visible:outline-none focus-visible:ring-1"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text-primary)',
            }}
            placeholder="Search layers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date notice (Baltimore only) */}
        <div
            className="text-xs px-2 py-1.5 rounded-md"
            style={{
              background: 'var(--ui-status-warning-bg)',
              color: 'var(--ui-status-warning-text)',
              border: '1px solid var(--ui-status-warning-border)',
            }}
          >
            {baltimore311DataYear === selectedYear ? (
              <>
                Showing data as of <strong>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                {Object.keys(baltimore311Types).length > 0 && ` · ${Object.keys(baltimore311Types).length} types available`}
                {Object.keys(baltimore311Types).length === 0 && ' · No data available'}
              </>
            ) : (
              <>Loading data for {selectedYear}...</>
            )}
          </div>

        {/* Categories */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 min-h-0">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <div
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border min-h-[36px] sticky top-0 z-10"
                style={{
                  borderColor: 'var(--ui-border)',
                  backgroundColor: 'var(--ui-layer-header-bg)',
                  backdropFilter: 'saturate(180%) blur(4px)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-layer-header-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-layer-header-bg)'}
              >
                {/* Left: expand/collapse */}
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                    {expandedCategories[category.id]
                      ? <ChevronDown className="w-3 h-3" aria-hidden="true" />
                      : <ChevronRight className="w-3 h-3" aria-hidden="true" />}
                  </div>
                  <span className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-primary)' }}>
                    {category.name}
                  </span>
                </div>
                
                {/* Right: Hide Closed toggle (only for 311 Service Requests) */}
                {category.id === 'requests' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px]" style={{ color: 'var(--ui-text-muted)' }}>Hide Closed</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={baltimore311HideClosed}
                      onClick={(e) => {
                        e.stopPropagation()
                        setBaltimore311HideClosed(!baltimore311HideClosed)
                      }}
                      className="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      style={{
                        backgroundColor: baltimore311HideClosed ? 'var(--ui-layer-311-toggle-on)' : 'var(--ui-control-border)',
                      }}
                    >
                      <span
                        className="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                        style={{
                          transform: baltimore311HideClosed ? 'translateX(12px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                  </div>
                )}
              </div>

              {expandedCategories[category.id] && category.layers.length > 0 && (
                <div className="space-y-1.5 mt-2 ml-4">
                  {/* Global 311 toggle (only for Baltimore 311 Service Requests) */}
                  {category.id === 'requests' && Object.keys(baltimore311Types).length > 0 && (
                    <div
                      className="rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 transition-colors mb-3"
                      style={{
                        borderColor: 'var(--ui-layer-311-border)',
                        backgroundColor: 'var(--ui-layer-311-bg)',
                      }}
                    >
                      <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--ui-text-primary)' }}>
                        Show All 311 Requests
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={getGlobalToggleState() !== 'off'}
                        aria-label="Toggle all 311 requests"
                        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                        style={{ backgroundColor: getGlobalToggleState() === 'off' ? 'var(--ui-control-border)' : 'var(--ui-layer-311-toggle-on)' }}
                        onClick={toggleAll311Types}
                      >
                        {getGlobalToggleState() === 'mixed' ? (
                          <Minus className="w-3 h-3 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                        ) : (
                          <span
                            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: getGlobalToggleState() === 'on' ? 'translateX(16px)' : 'translateX(0)' }}
                          />
                        )}
                      </button>
                    </div>
                  )}

                  {category.layers.map((layer) => {
                    // Bucket rendering (nested accordion with toggle-all)
                    if (layer.isBucket) {
                      const bucketState = getBucketToggleState(layer.types)
                      const requestCount = getBucketRequestCount(layer.types)
                      // Auto-expand bucket if it's filtered (search resulted in type matches)
                      const isExpanded = expandedBuckets[layer.bucketId] || layer.isFiltered
                      
                      return (
                        <div key={layer.id} className="space-y-1">
                          {/* Bucket header */}
                          <div
                            className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors"
                            style={{
                              borderColor: bucketState === 'off' ? 'var(--ui-border)' : 'var(--ui-layer-311-border)',
                              backgroundColor: bucketState === 'off' ? 'var(--ui-layer-row-inactive-bg)' : 'var(--ui-layer-311-active-bg)',
                            }}
                          >
                            {/* Left: expand/collapse */}
                            <div
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() => toggleBucket(layer.bucketId)}
                            >
                              <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                              </div>
                              <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                {layer.name}
                              </span>
                              <span className="text-[10px] opacity-50">({requestCount})</span>
                            </div>
                            
                            {/* Right: toggle all in bucket */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={bucketState === 'on'}
                              aria-label={`Toggle all ${layer.name}`}
                              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                              style={{ backgroundColor: bucketState === 'off' ? 'var(--ui-control-border)' : 'var(--ui-layer-311-toggle-on)' }}
                              onClick={(e) => { e.stopPropagation(); toggleBucketTypes(layer.bucketId, layer.types) }}
                            >
                              {bucketState === 'mixed' ? (
                                <Minus className="w-3 h-3 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                              ) : (
                                <span
                                  className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                  style={{ transform: bucketState === 'on' ? 'translateX(16px)' : 'translateX(0)' }}
                                />
                              )}
                            </button>
                          </div>

                          {/* Bucket types (nested) */}
                          {isExpanded && (
                            <div className="space-y-1 ml-3">
                              {layer.types.map((typeName) => {
                                const isOn = baltimore311Types[typeName]
                                return (
                                  <div
                                    key={typeName}
                                    className="rounded-md border transition-colors px-2 py-1.5 flex items-center justify-between gap-2"
                                    style={{
                                      borderColor: isOn ? 'var(--ui-layer-311-border)' : 'var(--ui-border)',
                                      backgroundColor: isOn ? 'var(--ui-layer-311-active-bg)' : 'transparent',
                                    }}
                                  >
                                    <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                      {typeName}
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isOn}
                                      aria-label={`Toggle ${typeName}`}
                                      className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                      style={{ backgroundColor: isOn ? 'var(--ui-layer-311-toggle-on)' : 'var(--ui-control-border)' }}
                                      onClick={() => toggle311Type(typeName)}
                                    >
                                      <span
                                        className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                                        style={{ transform: isOn ? 'translateX(14px)' : 'translateX(0)' }}
                                      />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Regular layer rendering (STL layers)
                    return (
                      <div
                        key={layer.id}
                        className="rounded-lg border transition-colors px-2.5 py-2 flex items-center justify-between gap-2"
                        style={{
                          borderColor: layerStates[layer.id] ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                          backgroundColor: layerStates[layer.id] ? 'var(--ui-control-active-bg)' : 'var(--ui-layer-row-inactive-bg)',
                        }}
                      >
                        <span className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-primary)' }}>
                          {layer.name}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={layerStates[layer.id] || false}
                          aria-label={`Toggle ${layer.name}`}
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                          style={{ backgroundColor: layerStates[layer.id] ? 'var(--ui-control-active-bg)' : 'var(--ui-border)' }}
                          onClick={() => toggleLayer(layer.id)}
                        >
                          <span
                            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: layerStates[layer.id] ? 'translateX(16px)' : 'translateX(0)' }}
                          />
                        </button>
                      </div>
                    )
                  })}

                  {/* Neighborhood Boundaries (only for Baltimore 311 Service Requests, after all buckets) */}
                  {category.id === 'requests' && Object.keys(baltimore311Types).length > 0 && (
                    <>
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--ui-border)' }}>
                        <div className="text-[11px] font-semibold mb-2 opacity-60" style={{ color: 'var(--ui-text-secondary)' }}>
                          NEIGHBORHOOD BOUNDARIES
                        </div>

                        {/* Show neighborhoods — accordion + per-neighborhood visibility */}
                        <div className="space-y-1 mb-2">
                          <div
                            className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors"
                            style={{
                              borderColor:
                                getAllNeighborhoodsBulkState() === 'off'
                                  ? 'var(--ui-border)'
                                  : 'var(--ui-status-info-border)',
                              backgroundColor:
                                getAllNeighborhoodsBulkState() === 'off'
                                  ? 'transparent'
                                  : 'var(--ui-status-info-bg)',
                              opacity: hasAny311TypeEnabled ? 1 : 0.4,
                            }}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                setExpandedHoodSections((prev) => ({
                                  ...prev,
                                  showNeighborhoods: !prev.showNeighborhoods,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setExpandedHoodSections((prev) => ({
                                    ...prev,
                                    showNeighborhoods: !prev.showNeighborhoods,
                                  }))
                                }
                              }}
                            >
                              <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                {expandedHoodSections.showNeighborhoods ? (
                                  <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />
                                ) : (
                                  <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                                )}
                              </div>
                              <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                Show neighborhoods
                              </span>
                              <span className="text-[10px] opacity-50 shrink-0">({allNeighborhoodNames.length})</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={getAllNeighborhoodsBulkState() === 'on'}
                              aria-label="Select all or none for all neighborhoods"
                              disabled={!hasAny311TypeEnabled}
                              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                              style={{
                                backgroundColor:
                                  getAllNeighborhoodsBulkState() === 'off'
                                    ? 'var(--ui-control-border)'
                                    : 'var(--ui-accent-muted)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShowAllNeighborhoodsBulkToggle()
                              }}
                            >
                              {getAllNeighborhoodsBulkState() === 'mixed' ? (
                                <Minus className="w-3 h-3 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
                              ) : (
                                <span
                                  className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                  style={{
                                    transform:
                                      getAllNeighborhoodsBulkState() === 'on' ? 'translateX(16px)' : 'translateX(0)',
                                  }}
                                />
                              )}
                            </button>
                          </div>

                          {expandedHoodSections.showNeighborhoods && (
                            <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                              {allNeighborhoodNames.length === 0 ? (
                                <p className="text-[11px] px-2 py-1.5 rounded-md" style={{ color: 'var(--ui-text-muted)' }}>
                                  Loading neighborhood boundaries…
                                </p>
                              ) : (
                                allNeighborhoodNames.map((hoodName) => {
                                  const shown = isNeighborhoodShownOnMap(hoodName)
                                  const openCount = densityMapForPanel[hoodName] ?? 0
                                  return (
                                    <div
                                      key={`all-${hoodName}`}
                                      className="rounded-md border transition-colors px-2 py-1.5 flex items-center justify-between gap-2"
                                      style={{
                                        borderColor: shown ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                                        backgroundColor: shown ? 'var(--ui-status-info-bg)' : 'transparent',
                                      }}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[11px] font-medium leading-tight block truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                          {hoodName}
                                        </span>
                                        {openCount > 0 ? (
                                          <span className="text-[10px] opacity-50">{openCount} open</span>
                                        ) : (
                                          <span className="text-[10px] opacity-40">No open requests</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={shown}
                                        aria-label={`Toggle ${hoodName} on map`}
                                        disabled={!hasAny311TypeEnabled}
                                        className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                        style={{ backgroundColor: shown ? 'var(--ui-accent-muted)' : 'var(--ui-control-border)' }}
                                        onClick={() => hasAny311TypeEnabled && toggleNeighborhoodHidden(hoodName)}
                                      >
                                        <span
                                          className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                                          style={{ transform: shown ? 'translateX(14px)' : 'translateX(0)' }}
                                        />
                                      </button>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>

                        <label
                          className="flex items-start gap-2.5 rounded-lg border px-2.5 py-2 mt-3 cursor-pointer transition-colors"
                          style={{
                            borderColor: baltimoreNeighborhoodImpactUi ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                            backgroundColor: baltimoreNeighborhoodImpactUi ? 'var(--ui-status-info-bg)' : 'transparent',
                            opacity: hasAny311TypeEnabled ? 1 : 0.4,
                          }}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border cursor-pointer"
                            style={{ accentColor: 'var(--ui-accent-muted)' }}
                            checked={baltimoreNeighborhoodImpactUi}
                            disabled={!hasAny311TypeEnabled}
                            onChange={(e) => setBaltimoreNeighborhoodImpactUi(e.target.checked)}
                            aria-label="Show neighborhood impact cards and interactive map tips"
                          />
                          <span className="text-[11px] leading-snug" style={{ color: 'var(--ui-text-secondary)' }}>
                            Show impact cards & map tips (hover, neighborhood stats on the map)
                          </span>
                        </label>
                      </div>

                      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--ui-border)' }}>
                        <div className="text-[11px] font-semibold mb-2 opacity-60" style={{ color: 'var(--ui-text-secondary)' }}>
                          DISTRICT BOUNDARIES
                        </div>

                        <div className="space-y-1">
                          <label
                            className="flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors"
                            style={{
                              borderColor: districtInsightsEnabled
                                ? 'var(--ui-status-info-border)'
                                : 'var(--ui-border)',
                              backgroundColor: districtInsightsEnabled
                                ? 'var(--ui-status-info-bg)'
                                : 'transparent',
                              opacity: hasAny311TypeEnabled ? 1 : 0.4,
                            }}
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 shrink-0 rounded border cursor-pointer"
                              style={{ accentColor: 'var(--ui-accent-muted)' }}
                              checked={districtInsightsEnabled}
                              disabled={!hasAny311TypeEnabled}
                              onChange={(e) => {
                                if (hasAny311TypeEnabled) {
                                  setDistrictInsightsEnabled(e.target.checked)
                                }
                              }}
                              aria-label="Show district insights for visible districts"
                            />
                            <span
                              className="text-[12px] font-medium leading-tight truncate"
                              style={{ color: 'var(--ui-text-secondary)' }}
                            >
                              District Insights
                            </span>
                          </label>

                          <div
                            className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors"
                            style={{
                              borderColor:
                                getAllDistrictsBulkState() === 'off'
                                  ? 'var(--ui-border)'
                                  : 'var(--ui-status-info-border)',
                              backgroundColor:
                                getAllDistrictsBulkState() === 'off'
                                  ? 'transparent'
                                  : 'var(--ui-status-info-bg)',
                              opacity: hasAny311TypeEnabled ? 1 : 0.4,
                            }}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                setExpandedHoodSections((prev) => ({
                                  ...prev,
                                  showDistricts: !prev.showDistricts,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setExpandedHoodSections((prev) => ({
                                    ...prev,
                                    showDistricts: !prev.showDistricts,
                                  }))
                                }
                              }}
                            >
                              <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                {expandedHoodSections.showDistricts ? (
                                  <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />
                                ) : (
                                  <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                                )}
                              </div>
                              <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                Show districts
                              </span>
                              <span className="text-[10px] opacity-50 shrink-0">({allDistrictEntries.length})</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={getAllDistrictsBulkState() === 'on'}
                              aria-label="Select all or none for all council districts"
                              disabled={!hasAny311TypeEnabled}
                              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                              style={{
                                backgroundColor:
                                  getAllDistrictsBulkState() === 'off'
                                    ? 'var(--ui-control-border)'
                                    : 'var(--ui-accent-muted)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShowAllDistrictsBulkToggle()
                              }}
                            >
                              {getAllDistrictsBulkState() === 'mixed' ? (
                                <Minus className="w-3 h-3 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
                              ) : (
                                <span
                                  className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                  style={{
                                    transform:
                                      getAllDistrictsBulkState() === 'on' ? 'translateX(16px)' : 'translateX(0)',
                                  }}
                                />
                              )}
                            </button>
                          </div>

                          {expandedHoodSections.showDistricts && (
                            <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                              {allDistrictEntries.length === 0 ? (
                                <p className="text-[11px] px-2 py-1.5 rounded-md" style={{ color: 'var(--ui-text-muted)' }}>
                                  Loading council district boundaries…
                                </p>
                              ) : (
                                allDistrictEntries.map((district) => {
                                  const shown = isDistrictShownOnMap(district.id)
                                  const openCount = densityMapForDistricts[district.id] ?? 0
                                  return (
                                    <div
                                      key={`district-${district.id}`}
                                      className="rounded-md border transition-colors px-2 py-1.5 flex items-center justify-between gap-2"
                                      style={{
                                        borderColor: shown ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                                        backgroundColor: shown ? 'var(--ui-status-info-bg)' : 'transparent',
                                      }}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[11px] font-medium leading-tight block truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                          District {district.id}
                                          {district.councilMember ? (
                                            <span className="font-normal" style={{ color: 'var(--ui-text-muted)' }}>
                                              {' '}
                                              — {district.councilMember}
                                            </span>
                                          ) : null}
                                        </span>
                                        {openCount > 0 ? (
                                          <span className="text-[10px] opacity-50">{openCount} open</span>
                                        ) : (
                                          <span className="text-[10px] opacity-40">No open requests</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={shown}
                                        aria-label={`Toggle District ${district.id} on map`}
                                        disabled={!hasAny311TypeEnabled}
                                        className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                        style={{ backgroundColor: shown ? 'var(--ui-accent-muted)' : 'var(--ui-control-border)' }}
                                        onClick={() => hasAny311TypeEnabled && toggleDistrictHidden(district.id)}
                                      >
                                        <span
                                          className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                                          style={{ transform: shown ? 'translateX(14px)' : 'translateX(0)' }}
                                        />
                                      </button>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--ui-border)' }}>
                        <div className="text-[11px] font-semibold mb-2 opacity-60" style={{ color: 'var(--ui-text-secondary)' }}>
                          WARD PRECINCTS
                        </div>

                        <div className="space-y-1">
                          <div
                            className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors"
                            style={{
                              borderColor: baltimoreWardPrecinctsAll ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                              backgroundColor: baltimoreWardPrecinctsAll ? 'var(--ui-status-info-bg)' : 'transparent',
                            }}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                setExpandedHoodSections((prev) => ({ ...prev, showPrecincts: !prev.showPrecincts }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setExpandedHoodSections((prev) => ({ ...prev, showPrecincts: !prev.showPrecincts }))
                                }
                              }}
                            >
                              <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                {expandedHoodSections.showPrecincts ? (
                                  <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />
                                ) : (
                                  <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                                )}
                              </div>
                              <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                Show precincts
                              </span>
                              <span className="text-[10px] opacity-50 shrink-0">({totalPrecinctCount})</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={baltimoreWardPrecinctsAll}
                              aria-label="Show all ward precincts on map"
                              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                              style={{
                                backgroundColor: baltimoreWardPrecinctsAll ? 'var(--ui-accent-muted)' : 'var(--ui-control-border)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setBaltimoreWardPrecinctsAll((prev) => !prev)
                              }}
                            >
                              <span
                                className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                style={{ transform: baltimoreWardPrecinctsAll ? 'translateX(16px)' : 'translateX(0)' }}
                              />
                            </button>
                          </div>

                          {expandedHoodSections.showPrecincts && (
                            <div className="space-y-1 ml-3 max-h-64 overflow-y-auto pr-0.5">
                              {precinctsByDistrict.length === 0 ? (
                                <p className="text-[11px] px-2 py-1.5 rounded-md" style={{ color: 'var(--ui-text-muted)' }}>
                                  Loading ward-precinct boundaries…
                                </p>
                              ) : (
                                precinctsByDistrict.map((group) => {
                                  const groupOpen = expandedPrecinctGroups[group.districtId] === true
                                  const bulkState = getPrecinctGroupBulkState(group.precincts)
                                  return (
                                    <div key={`precinct-group-${group.districtId}`}>
                                      <div
                                        className="rounded-md border px-2 py-1.5 flex items-center justify-between gap-2 transition-colors"
                                        style={{
                                          borderColor: bulkState === 'off' ? 'var(--ui-border)' : 'var(--ui-status-info-border)',
                                          backgroundColor: bulkState === 'off' ? 'transparent' : 'var(--ui-status-info-bg)',
                                        }}
                                      >
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                                          onClick={() =>
                                            setExpandedPrecinctGroups((prev) => ({
                                              ...prev,
                                              [group.districtId]: !prev[group.districtId],
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault()
                                              setExpandedPrecinctGroups((prev) => ({
                                                ...prev,
                                                [group.districtId]: !prev[group.districtId],
                                              }))
                                            }
                                          }}
                                        >
                                          <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                            {groupOpen ? (
                                              <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />
                                            ) : (
                                              <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                                            )}
                                          </div>
                                          <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                            District {group.districtId}
                                          </span>
                                          <span className="text-[10px] opacity-50 shrink-0">({group.precincts.length})</span>
                                        </div>
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={bulkState === 'on'}
                                          aria-label={`Toggle all precincts in District ${group.districtId}`}
                                          className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                          style={{ backgroundColor: bulkState === 'off' ? 'var(--ui-control-border)' : 'var(--ui-accent-muted)' }}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            togglePrecinctGroup(group.precincts)
                                          }}
                                        >
                                          {bulkState === 'mixed' ? (
                                            <Minus className="w-2.5 h-2.5 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
                                          ) : (
                                            <span
                                              className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                                              style={{ transform: bulkState === 'on' ? 'translateX(14px)' : 'translateX(0)' }}
                                            />
                                          )}
                                        </button>
                                      </div>

                                      {groupOpen && (
                                        <div className="space-y-1 ml-3 mt-1">
                                          {group.precincts.map((precinct) => {
                                            const shown = isPrecinctShownOnMap(precinct.id)
                                            const openCount = densityMapForPrecincts[precinct.id] ?? 0
                                            return (
                                              <div
                                                key={`precinct-${precinct.id}`}
                                                className="rounded-md border transition-colors px-2 py-1 flex items-center justify-between gap-2"
                                                style={{
                                                  borderColor: shown ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                                                  backgroundColor: shown ? 'var(--ui-status-info-bg)' : 'transparent',
                                                }}
                                              >
                                                <div className="min-w-0 flex-1">
                                                  <span className="text-[11px] font-medium leading-tight block truncate" style={{ color: 'var(--ui-text-secondary)' }}>
                                                    Precinct {precinct.id}
                                                  </span>
                                                  {openCount > 0 ? (
                                                    <span className="text-[10px] opacity-50">{openCount} open</span>
                                                  ) : null}
                                                </div>
                                                <button
                                                  type="button"
                                                  role="switch"
                                                  aria-checked={shown}
                                                  aria-label={`Toggle Precinct ${precinct.id} on map`}
                                                  className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                                  style={{ backgroundColor: shown ? 'var(--ui-accent-muted)' : 'var(--ui-control-border)' }}
                                                  onClick={() => togglePrecinctHidden(precinct.id)}
                                                >
                                                  <span
                                                    className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                                                    style={{ transform: shown ? 'translateX(14px)' : 'translateX(0)' }}
                                                  />
                                                </button>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {expandedCategories[category.id] && category.id === 'parcels' && (
                <div className="space-y-1.5 mt-2 ml-4">
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--ui-text-muted)' }}>
                    Parcels load only for the neighborhoods, districts, or precincts you enable below.
                  </p>

                  {/* Master toggle */}
                  <div
                    className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2"
                    style={{
                      borderColor: baltimoreParcelsEnabled ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                      backgroundColor: baltimoreParcelsEnabled ? 'var(--ui-status-info-bg)' : 'transparent',
                    }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Show parcels</span>
                    {parcelSwitch(baltimoreParcelsEnabled, () => setBaltimoreParcelsEnabled((p) => !p), 'Show parcels', 'lg')}
                  </div>

                  {/* By neighborhood */}
                  <div className="space-y-1">
                    {parcelSubHeader('showParcelNeighborhoods', 'By neighborhood', allNeighborhoodNames.length)}
                    {expandedHoodSections.showParcelNeighborhoods && (
                      <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                        {allNeighborhoodNames.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading neighborhoods…</p>
                        ) : (
                          allNeighborhoodNames.map((name) => (
                            <div key={`pn-${name}`}>
                              {parcelItemRow(name, !!baltimoreParcelNeighborhoodEnabled[name], () => toggleParcelNeighborhood(name))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* By district */}
                  <div className="space-y-1">
                    {parcelSubHeader('showParcelDistricts', 'By district', allDistrictEntries.length)}
                    {expandedHoodSections.showParcelDistricts && (
                      <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                        {allDistrictEntries.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading districts…</p>
                        ) : (
                          allDistrictEntries.map((d) => (
                            <div key={`pd-${d.id}`}>
                              {parcelItemRow(`District ${d.id}`, !!baltimoreParcelDistrictEnabled[d.id], () => toggleParcelDistrict(d.id))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* By precinct (grouped by district) */}
                  <div className="space-y-1">
                    {parcelSubHeader('showParcelPrecincts', 'By precinct', totalParcelPrecincts)}
                    {expandedHoodSections.showParcelPrecincts && (
                      <div className="space-y-1 ml-3 max-h-64 overflow-y-auto pr-0.5">
                        {precinctsByDistrict.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading precincts…</p>
                        ) : (
                          precinctsByDistrict.map((group) => {
                            const open = expandedParcelPrecinctGroups[group.districtId] === true
                            const gs = getParcelPrecinctGroupState(group.precincts)
                            return (
                              <div key={`pp-${group.districtId}`}>
                                <div
                                  className="rounded-md border px-2 py-1.5 flex items-center justify-between gap-2"
                                  style={{
                                    borderColor: gs === 'off' ? 'var(--ui-border)' : 'var(--ui-status-info-border)',
                                    backgroundColor: gs === 'off' ? 'transparent' : 'var(--ui-status-info-bg)',
                                  }}
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() =>
                                      setExpandedParcelPrecinctGroups((prev) => ({ ...prev, [group.districtId]: !prev[group.districtId] }))
                                    }
                                  >
                                    <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                      {open ? <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" /> : <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />}
                                    </div>
                                    <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>District {group.districtId}</span>
                                    <span className="text-[10px] opacity-50 shrink-0">({group.precincts.length})</span>
                                  </div>
                                  {gs === 'mixed' ? (
                                    <button
                                      type="button"
                                      aria-label={`Toggle parcels for District ${group.districtId} precincts`}
                                      onClick={(e) => { e.stopPropagation(); toggleParcelPrecinctGroup(group.precincts) }}
                                      className="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full cursor-pointer"
                                      style={{ backgroundColor: 'var(--ui-accent-muted)' }}
                                    >
                                      <Minus className="w-2.5 h-2.5 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
                                    </button>
                                  ) : (
                                    parcelSwitch(gs === 'on', () => toggleParcelPrecinctGroup(group.precincts), `Toggle parcels for District ${group.districtId} precincts`)
                                  )}
                                </div>
                                {open && (
                                  <div className="space-y-1 ml-3 mt-1">
                                    {group.precincts.map((p) => (
                                      <div key={`ppx-${p.id}`}>
                                        {parcelItemRow(`Precinct ${p.id}`, !!baltimoreParcelPrecinctEnabled[p.id], () => toggleParcelPrecinct(p.id))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedCategories[category.id] && category.id === 'buildings' && (
                <div className="space-y-1.5 mt-2 ml-4">
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--ui-text-muted)' }}>
                    Building footprints load only for the neighborhoods, districts, or precincts you enable below.
                  </p>

                  {/* Master toggle */}
                  <div
                    className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2"
                    style={{
                      borderColor: baltimoreBuildingsEnabled ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                      backgroundColor: baltimoreBuildingsEnabled ? 'var(--ui-status-info-bg)' : 'transparent',
                    }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Show buildings</span>
                    {parcelSwitch(baltimoreBuildingsEnabled, () => setBaltimoreBuildingsEnabled((p) => !p), 'Show building footprints', 'lg')}
                  </div>

                  {/* By neighborhood */}
                  <div className="space-y-1">
                    {parcelSubHeader('showBuildingNeighborhoods', 'By neighborhood', allNeighborhoodNames.length)}
                    {expandedHoodSections.showBuildingNeighborhoods && (
                      <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                        {allNeighborhoodNames.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading neighborhoods…</p>
                        ) : (
                          allNeighborhoodNames.map((name) => (
                            <div key={`bn-${name}`}>
                              {parcelItemRow(name, !!baltimoreBuildingNeighborhoodEnabled[name], () => toggleBuildingNeighborhood(name))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* By district */}
                  <div className="space-y-1">
                    {parcelSubHeader('showBuildingDistricts', 'By district', allDistrictEntries.length)}
                    {expandedHoodSections.showBuildingDistricts && (
                      <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                        {allDistrictEntries.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading districts…</p>
                        ) : (
                          allDistrictEntries.map((d) => (
                            <div key={`bd-${d.id}`}>
                              {parcelItemRow(`District ${d.id}`, !!baltimoreBuildingDistrictEnabled[d.id], () => toggleBuildingDistrict(d.id))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* By precinct (grouped by district) */}
                  <div className="space-y-1">
                    {parcelSubHeader('showBuildingPrecincts', 'By precinct', totalParcelPrecincts)}
                    {expandedHoodSections.showBuildingPrecincts && (
                      <div className="space-y-1 ml-3 max-h-64 overflow-y-auto pr-0.5">
                        {precinctsByDistrict.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading precincts…</p>
                        ) : (
                          precinctsByDistrict.map((group) => {
                            const open = expandedBuildingPrecinctGroups[group.districtId] === true
                            const gs = getBuildingPrecinctGroupState(group.precincts)
                            return (
                              <div key={`bp-${group.districtId}`}>
                                <div
                                  className="rounded-md border px-2 py-1.5 flex items-center justify-between gap-2"
                                  style={{
                                    borderColor: gs === 'off' ? 'var(--ui-border)' : 'var(--ui-status-info-border)',
                                    backgroundColor: gs === 'off' ? 'transparent' : 'var(--ui-status-info-bg)',
                                  }}
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() =>
                                      setExpandedBuildingPrecinctGroups((prev) => ({ ...prev, [group.districtId]: !prev[group.districtId] }))
                                    }
                                  >
                                    <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                      {open ? <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" /> : <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />}
                                    </div>
                                    <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>District {group.districtId}</span>
                                    <span className="text-[10px] opacity-50 shrink-0">({group.precincts.length})</span>
                                  </div>
                                  {gs === 'mixed' ? (
                                    <button
                                      type="button"
                                      aria-label={`Toggle buildings for District ${group.districtId} precincts`}
                                      onClick={(e) => { e.stopPropagation(); toggleBuildingPrecinctGroup(group.precincts) }}
                                      className="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full cursor-pointer"
                                      style={{ backgroundColor: 'var(--ui-accent-muted)' }}
                                    >
                                      <Minus className="w-2.5 h-2.5 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
                                    </button>
                                  ) : (
                                    parcelSwitch(gs === 'on', () => toggleBuildingPrecinctGroup(group.precincts), `Toggle buildings for District ${group.districtId} precincts`)
                                  )}
                                </div>
                                {open && (
                                  <div className="space-y-1 ml-3 mt-1">
                                    {group.precincts.map((p) => (
                                      <div key={`bpx-${p.id}`}>
                                        {parcelItemRow(`Precinct ${p.id}`, !!baltimoreBuildingPrecinctEnabled[p.id], () => toggleBuildingPrecinct(p.id))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedCategories[category.id] && category.id === 'vacant' && (
                <div className="space-y-1.5 mt-2 ml-4">
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--ui-text-muted)' }}>
                    Open vacant building notices load only for the neighborhoods, districts, or precincts you enable below.
                  </p>

                  {/* Master toggle */}
                  <div
                    className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2"
                    style={{
                      borderColor: baltimoreVbnEnabled ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                      backgroundColor: baltimoreVbnEnabled ? 'var(--ui-status-info-bg)' : 'transparent',
                    }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Show vacant notices</span>
                    {parcelSwitch(baltimoreVbnEnabled, () => setBaltimoreVbnEnabled((p) => !p), 'Show vacant building notices', 'lg')}
                  </div>

                  {/* By neighborhood */}
                  <div className="space-y-1">
                    {parcelSubHeader('showVacantNeighborhoods', 'By neighborhood', allNeighborhoodNames.length)}
                    {expandedHoodSections.showVacantNeighborhoods && (
                      <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                        {allNeighborhoodNames.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading neighborhoods…</p>
                        ) : (
                          allNeighborhoodNames.map((name) => (
                            <div key={`vn-${name}`}>
                              {parcelItemRow(name, !!baltimoreVbnNeighborhoodEnabled[name], () => toggleVacantNeighborhood(name))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* By district */}
                  <div className="space-y-1">
                    {parcelSubHeader('showVacantDistricts', 'By district', allDistrictEntries.length)}
                    {expandedHoodSections.showVacantDistricts && (
                      <div className="space-y-1 ml-3 max-h-52 overflow-y-auto pr-0.5">
                        {allDistrictEntries.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading districts…</p>
                        ) : (
                          allDistrictEntries.map((d) => (
                            <div key={`vd-${d.id}`}>
                              {parcelItemRow(`District ${d.id}`, !!baltimoreVbnDistrictEnabled[d.id], () => toggleVacantDistrict(d.id))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* By precinct (grouped by district) */}
                  <div className="space-y-1">
                    {parcelSubHeader('showVacantPrecincts', 'By precinct', totalParcelPrecincts)}
                    {expandedHoodSections.showVacantPrecincts && (
                      <div className="space-y-1 ml-3 max-h-64 overflow-y-auto pr-0.5">
                        {precinctsByDistrict.length === 0 ? (
                          <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--ui-text-muted)' }}>Loading precincts…</p>
                        ) : (
                          precinctsByDistrict.map((group) => {
                            const open = expandedVacantPrecinctGroups[group.districtId] === true
                            const gs = getVacantPrecinctGroupState(group.precincts)
                            return (
                              <div key={`vp-${group.districtId}`}>
                                <div
                                  className="rounded-md border px-2 py-1.5 flex items-center justify-between gap-2"
                                  style={{
                                    borderColor: gs === 'off' ? 'var(--ui-border)' : 'var(--ui-status-info-border)',
                                    backgroundColor: gs === 'off' ? 'transparent' : 'var(--ui-status-info-bg)',
                                  }}
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() =>
                                      setExpandedVacantPrecinctGroups((prev) => ({ ...prev, [group.districtId]: !prev[group.districtId] }))
                                    }
                                  >
                                    <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                                      {open ? <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" /> : <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />}
                                    </div>
                                    <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--ui-text-secondary)' }}>District {group.districtId}</span>
                                    <span className="text-[10px] opacity-50 shrink-0">({group.precincts.length})</span>
                                  </div>
                                  {gs === 'mixed' ? (
                                    <button
                                      type="button"
                                      aria-label={`Toggle vacant notices for District ${group.districtId} precincts`}
                                      onClick={(e) => { e.stopPropagation(); toggleVacantPrecinctGroup(group.precincts) }}
                                      className="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full cursor-pointer"
                                      style={{ backgroundColor: 'var(--ui-accent-muted)' }}
                                    >
                                      <Minus className="w-2.5 h-2.5 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
                                    </button>
                                  ) : (
                                    parcelSwitch(gs === 'on', () => toggleVacantPrecinctGroup(group.precincts), `Toggle vacant notices for District ${group.districtId} precincts`)
                                  )}
                                </div>
                                {open && (
                                  <div className="space-y-1 ml-3 mt-1">
                                    {group.precincts.map((p) => (
                                      <div key={`vpx-${p.id}`}>
                                        {parcelItemRow(`Precinct ${p.id}`, !!baltimoreVbnPrecinctEnabled[p.id], () => toggleVacantPrecinct(p.id))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedCategories[category.id] && category.id === 'usecases' && (
                <div className="space-y-2 mt-2 ml-4">
                  {/* Public Safety toggle */}
                  <div
                    className="rounded-lg border px-2.5 py-2"
                    style={{
                      borderColor: baltimorePublicSafetyEnabled ? 'var(--ui-status-info-border)' : 'var(--ui-border)',
                      backgroundColor: baltimorePublicSafetyEnabled ? 'var(--ui-status-info-bg)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--ui-text-primary)' }}>Public Safety</div>
                        <div className="text-[10px] leading-snug" style={{ color: 'var(--ui-text-muted)' }}>Vacant building risk — footprints colored by risk score</div>
                      </div>
                      {parcelSwitch(baltimorePublicSafetyEnabled, () => setBaltimorePublicSafetyEnabled((p) => !p), 'Show vacant building risk', 'lg')}
                    </div>

                    {baltimorePublicSafetyEnabled && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--ui-border)' }}>
                        {/* Risk legend */}
                        <div className="text-[10px] font-semibold opacity-60 mb-1" style={{ color: 'var(--ui-text-secondary)' }}>RISK</div>
                        <div className="flex items-center gap-1">
                          <span className="h-2 flex-1 rounded-l" style={{ background: '#22c55e' }} />
                          <span className="h-2 flex-1" style={{ background: '#eab308' }} />
                          <span className="h-2 flex-1" style={{ background: '#f97316' }} />
                          <span className="h-2 flex-1 rounded-r" style={{ background: '#dc2626' }} />
                        </div>
                        <div className="flex justify-between text-[9px] mt-0.5 opacity-60" style={{ color: 'var(--ui-text-muted)' }}>
                          <span>Low</span><span>Moderate</span><span>High</span><span>Severe</span>
                        </div>
                        <p className="text-[10px] leading-snug mt-2 opacity-70" style={{ color: 'var(--ui-text-muted)' }}>
                          Score blends vacancy duration, nearby nuisance 311, absentee ownership, condition, vacancy clustering &amp; market weakness. Click a building for the breakdown. Crime, fire, citations &amp; tax-delinquency are future inputs (no data yet).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedCategories[category.id] && category.layers.length === 0 && category.id !== 'parcels' && category.id !== 'buildings' && category.id !== 'vacant' && category.id !== 'usecases' && (
                <p className="text-xs px-4 py-2 ml-4" style={{ color: 'var(--ui-text-muted)' }}>
                  No layers available yet.
                </p>
              )}
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
