import { createContext, useContext, useRef, useState } from 'react'
import { sendChatMessage } from '../services/openai-chat'
import { loadSavedUiVisibility, persistUiVisibility } from '../utils/uiVisibilityStorage'
import { loadUiTheme, persistUiTheme } from '../utils/uiThemeStorage'
import { isUiThemeAvailable } from '../config/uiThemeSettings'
import { APP_CITY } from '../constants/region'
import { saveMapView } from '../utils/mapViewDefaults'
import {
  buildDefaultMapLayerSnapshot,
  getInitialMapLayerState,
  saveMapLayerDefaults,
} from '../utils/mapLayerDefaultsStorage'
const PanelContext = createContext()

export const usePanelContext = () => {
  const context = useContext(PanelContext)
  if (!context) {
    throw new Error('usePanelContext must be used within PanelProvider')
  }
  return context
}

export const PanelProvider = ({ children }) => {
  const initialMapLayers = getInitialMapLayerState()

  // Panel visibility
  const [copilotVisible, setCopilotVisible] = useState(false)
  const [layersVisible, setLayersVisible] = useState(false)

  // Navigation state
  const [currentView, setCurrentView] = useState('map') // 'map' | 'work-orders'

  // TopNav UI visibility toggles (see uiVisibilitySettings.js)
  const [uiVisibility, setUiVisibility] = useState(loadSavedUiVisibility)

  // UI theme: silicon (default dark) | baltimore-light
  const [uiTheme, setUiTheme] = useState(loadUiTheme)
  /** Once true (map session), overlay does not block — reset when map engine changes inside MapView. */
  const [mapBootstrapReady, setMapBootstrapReady] = useState(false)
  const [mapFocusRequest, setMapFocusRequest] = useState(null)
  const [mapPopupRequest, setMapPopupRequest] = useState(null)
  const mapCameraReaderRef = useRef(null)
  const [mapCameraReady, setMapCameraReady] = useState(false)

  // Copilot / AI chat state
  const [activeTab, setActiveTab] = useState('chat')
  const [chatMessages, setChatMessages] = useState([])
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Success notifications
  const [successNotifications, setSuccessNotifications] = useState([])

  const addSuccessNotification = (message) => {
    const notification = { id: Date.now(), message, timestamp: new Date() }
    setSuccessNotifications(prev => [...prev, notification])
  }

  const removeSuccessNotification = (id) => {
    setSuccessNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Map engine-specific color scheme for 311 layers
  const [mapLibreColors, setMapLibreColors] = useState({
    pointColor: '#f97316',           // Orange for individual points
    clusterSmall: '#f97316',         // Orange for clusters <50
    clusterMedium: '#ef4444',        // Red for clusters 50-200
    clusterLarge: '#b91c1c',         // Dark red for clusters >200
  })
  
  // Date selection (full date for filtering 311 data and calculating 30-day metrics)
  const [selectedDate, setSelectedDate] = useState(new Date('2025-05-09')) // Default to May 9th, 2025
  const [selectedYear, setSelectedYear] = useState(2025) // Updated to match default date

  // Map layer visibility
  const [baltimoreNeighborhoodsData, setBaltimoreNeighborhoodsData] = useState(null) // Store fetched neighborhood GeoJSON
  /** When true, neighborhood boundary layer uses the full list + per-hood visibility. When false, only hoods explicitly left on (`hidden === false`) show (after bulk hide + pick). */
  const [baltimoreNeighborhoodsAll, setBaltimoreNeighborhoodsAll] = useState(
    initialMapLayers.baltimoreNeighborhoodsAll
  )
  /** Floating stats cards, polygon hover/click → tooltips — not the boundary list. */
  const [baltimoreNeighborhoodImpactUi, setBaltimoreNeighborhoodImpactUi] = useState(
    initialMapLayers.baltimoreNeighborhoodImpactUi
  )
  /** Neighborhood `Name` → true when hidden from map (per Manage Map Layers toggles). */
  const [baltimoreNeighborhoodHidden, setBaltimoreNeighborhoodHidden] = useState(
    initialMapLayers.baltimoreNeighborhoodHidden
  )
  const [baltimoreDistrictsData, setBaltimoreDistrictsData] = useState(null)
  const [baltimoreDistrictsAll, setBaltimoreDistrictsAll] = useState(initialMapLayers.baltimoreDistrictsAll)
  /** Council district `AREA_NAME` → true when hidden from map. */
  const [baltimoreDistrictHidden, setBaltimoreDistrictHidden] = useState(
    initialMapLayers.baltimoreDistrictHidden
  )
  /** Top-district 311 highlight overlay with persistent hover-expand tooltips. */
  const [districtInsightsEnabled, setDistrictInsightsEnabled] = useState(
    initialMapLayers.districtInsightsEnabled
  )
  /** When true, neighborhood choropleth uses hardcoded storm-advisory risk instead of 311 density. */
  const [stormAdvisoryNeighborhoodsVisible, setStormAdvisoryNeighborhoodsVisible] = useState(
    initialMapLayers.stormAdvisoryNeighborhoodsVisible
  )
  const [baltimore311Visible, setBaltimore311Visible] = useState(initialMapLayers.baltimore311Visible)
  const [baltimore311Style, setBaltimore311Style] = useState(initialMapLayers.baltimore311Style)
  const [baltimore311Clustered, setBaltimore311Clustered] = useState(initialMapLayers.baltimore311Clustered)
  const [baltimore311HideClosed, setBaltimore311HideClosed] = useState(initialMapLayers.baltimore311HideClosed)
  const [baltimore311Types, setBaltimore311Types] = useState(initialMapLayers.baltimore311Types)
  const [baltimore311Data, setBaltimore311Data] = useState(null) // Full GeoJSON for the selected year
  const [baltimore311DataYear, setBaltimore311DataYear] = useState(null) // Track which year this data represents
  
  // Heatmap configuration
  const [heatmapConfig, setHeatmapConfig] = useState({
    weight: 1,
    intensityMin: 1,
    intensityMax: 3,
    radiusMin: 2,
    radiusMax: 20,
    opacity: 1,
  })

  // Intelligence tab
  const [intelligenceItems, setIntelligenceItems] = useState([])
  const [hasUnreadIntelligence, setHasUnreadIntelligence] = useState(false)

  // Action panel (Forecasting)
  const [activeActionTab, setActiveActionTab] = useState(null) // 'forecasting' | null
  const [actionTabAnchor, setActionTabAnchor] = useState(null) // viewport rect for active action button
  
  // Forecasting data
  const [potholeForecasts, setPotholeForecasts] = useState(null) // Pothole forecast data

  // Work orders (imported/adapted from leakage prototype patterns)
  const [workOrders, setWorkOrders] = useState([])

  const addIntelligenceItem = (item) => {
    setIntelligenceItems(prev => [...prev, { ...item, id: Date.now(), timestamp: new Date() }])
    setHasUnreadIntelligence(true)
  }

  const clearIntelligenceNotification = () => setHasUnreadIntelligence(false)

  const createWorkOrder = (workOrderData) => {
    const uniqueSuffix = Math.random().toString(36).slice(2, 7).toUpperCase()
    const newWorkOrder = {
      id: `WO-${Date.now()}-${uniqueSuffix}`,
      status: 'New',
      priority: 'Medium',
      createdAt: new Date().toISOString(),
      ...workOrderData,
    }
    setWorkOrders((prev) => [newWorkOrder, ...prev])
    return newWorkOrder
  }

  const requestMapFocus = ({ lng, lat, zoom = 15 }) => {
    if (typeof lng !== 'number' || typeof lat !== 'number') return
    setMapFocusRequest({ lng, lat, zoom, timestamp: Date.now() })
  }

  const requestMapPopup = ({ lng, lat, properties }) => {
    if (typeof lng !== 'number' || typeof lat !== 'number') return
    setMapPopupRequest({ lng, lat, properties: properties || {}, timestamp: Date.now() })
  }

  const registerMapCameraReader = (reader) => {
    mapCameraReaderRef.current = reader
    setMapCameraReady(typeof reader === 'function')
  }

  const saveCurrentMapViewAsDefault = () => {
    const reader = mapCameraReaderRef.current
    if (typeof reader !== 'function') return false

    const view = reader()
    if (!view) return false

    const saved = saveMapView(APP_CITY, 'maplibre', view)
    if (saved) {
      addSuccessNotification('Default map view saved')
    }
    return saved
  }

  const saveCurrentMapLayersAsDefault = () => {
    const snapshot = buildDefaultMapLayerSnapshot({
      baltimore311Visible,
      baltimore311Style,
      baltimore311Clustered,
      baltimore311HideClosed,
      baltimore311Types,
      baltimoreNeighborhoodsAll,
      baltimoreNeighborhoodImpactUi,
      baltimoreNeighborhoodHidden,
      baltimoreDistrictsAll,
      baltimoreDistrictHidden,
      districtInsightsEnabled,
      stormAdvisoryNeighborhoodsVisible,
    })
    const saved = saveMapLayerDefaults(snapshot)
    if (saved) {
      addSuccessNotification('Default map layers saved')
    }
    return saved
  }

  // Panel toggles
  const toggleCopilot = () => setCopilotVisible(prev => !prev)
  const toggleLayers = () => setLayersVisible(prev => !prev)

  const toggleUiVisibility = (id) => {
    setUiVisibility((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      persistUiVisibility(next)
      return next
    })
  }

  const setUiElementVisible = (id, visible) => {
    setUiVisibility((prev) => {
      const next = { ...prev, [id]: visible }
      persistUiVisibility(next)
      return next
    })
  }

  const selectUiTheme = (themeId) => {
    if (!isUiThemeAvailable(themeId) || uiTheme === themeId) return
    setUiTheme(themeId)
    persistUiTheme(themeId)
  }

  // AI chat actions
  const clearChat = () => setChatMessages([])

  const deleteMessage = (messageId) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== messageId))
  }

  const sendUserMessage = async (messageText) => {
    if (!messageText.trim()) return

    setAiError(null)

    const userMessage = {
      id: Date.now(),
      type: 'user-message',
      message: messageText.trim(),
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, userMessage])
    setIsAiResponding(true)

    try {
      const allMessages = [...chatMessages, userMessage]
      const aiResponse = await sendChatMessage(allMessages, {})

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai-message',
        message: aiResponse,
        timestamp: new Date(),
      }
      setChatMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI Chat Error:', error)
      setAiError(error.message || 'Failed to get AI response. Please try again.')
    } finally {
      setIsAiResponding(false)
    }
  }

  const value = {
    // Panel visibility
    copilotVisible,
    setCopilotVisible,
    toggleCopilot,
    layersVisible,
    setLayersVisible,
    toggleLayers,
    // Navigation
    currentView,
    setCurrentView,
    uiVisibility,
    setUiVisibility,
    toggleUiVisibility,
    setUiElementVisible,
    uiTheme,
    selectUiTheme,
    mapBootstrapReady,
    setMapBootstrapReady,
    mapFocusRequest,
    setMapFocusRequest,
    requestMapFocus,
    mapPopupRequest,
    setMapPopupRequest,
    requestMapPopup,
    mapCameraReady,
    registerMapCameraReader,
    saveCurrentMapViewAsDefault,
    saveCurrentMapLayersAsDefault,

    // Date & Year
    selectedDate,
    setSelectedDate,
    selectedYear,
    setSelectedYear,

    // Map layers
    baltimoreNeighborhoodsData,
    setBaltimoreNeighborhoodsData,
    baltimoreNeighborhoodsAll,
    setBaltimoreNeighborhoodsAll,
    baltimoreNeighborhoodImpactUi,
    setBaltimoreNeighborhoodImpactUi,
    baltimoreNeighborhoodHidden,
    setBaltimoreNeighborhoodHidden,
    baltimoreDistrictsData,
    setBaltimoreDistrictsData,
    baltimoreDistrictsAll,
    setBaltimoreDistrictsAll,
    baltimoreDistrictHidden,
    setBaltimoreDistrictHidden,
    districtInsightsEnabled,
    setDistrictInsightsEnabled,
    stormAdvisoryNeighborhoodsVisible,
    setStormAdvisoryNeighborhoodsVisible,
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
    setBaltimore311Data,
    baltimore311DataYear,
    setBaltimore311DataYear,
    
    // Map colors
    mapLibreColors,
    setMapLibreColors,
    
    heatmapConfig,
    setHeatmapConfig,

    // AI chat
    activeTab,
    setActiveTab,
    chatMessages,
    setChatMessages,
    clearChat,
    deleteMessage,
    sendUserMessage,
    isAiResponding,
    setIsAiResponding,
    aiError,
    setAiError,

    // Intelligence
    intelligenceItems,
    addIntelligenceItem,
    hasUnreadIntelligence,
    clearIntelligenceNotification,

    // Action panel
    activeActionTab,
    setActiveActionTab,
    actionTabAnchor,
    setActionTabAnchor,
    
    // Forecasting
    potholeForecasts,
    setPotholeForecasts,

    // Work orders
    workOrders,
    setWorkOrders,
    createWorkOrder,

    // Notifications
    successNotifications,
    addSuccessNotification,
    removeSuccessNotification,
  }

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
}
