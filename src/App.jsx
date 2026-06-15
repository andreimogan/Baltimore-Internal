import TopNav from './components/TopNav'
import MapView from './components/MapView'
import SuccessNotifications from './components/notifications/SuccessNotifications'
import LeftNav from './components/LeftNav'
import WorkOrdersPage from './components/WorkOrdersPage'
import ForecastingPanel from './components/ForecastingPanel'
import WeatherAccordion from './components/WeatherAccordion'
import MapBootstrapOverlay from './components/MapBootstrapOverlay'
import {
  WaterOSCopilotPanel,
  ManageMapLayersPanel,
} from './components/panels'
import { PanelProvider, usePanelContext } from './contexts/PanelContext'
import { generatePotholeForecasts } from './utils/performanceAnalytics'
import { useEffect } from 'react'

function AppContent() {
  const { 
    currentView, 
    mapBootstrapReady,
    baltimore311Data, 
    selectedDate, 
    setPotholeForecasts,
    uiTheme,
  } = usePanelContext()

  useEffect(() => {
    document.documentElement.dataset.uiTheme = uiTheme
  }, [uiTheme])
  
  // Generate pothole forecasts whenever data changes
  useEffect(() => {
    if (baltimore311Data) {
      const forecasts = generatePotholeForecasts(selectedDate, baltimore311Data)
      setPotholeForecasts(forecasts)
    } else {
      setPotholeForecasts(null)
    }
  }, [baltimore311Data, selectedDate, setPotholeForecasts])

  return (
    <>
      <MapBootstrapOverlay visible={currentView === 'map' && !mapBootstrapReady} />
      <TopNav />
      <LeftNav />
      
      <main
        className="relative flex-1 min-h-[calc(100vh-var(--nav-height))] bg-[var(--content-bg)]"
        aria-label="Main content"
      >
        {/* Map View */}
        {currentView === 'map' && (
          <MapView />
        )}

        {/* Work Orders Page */}
        {currentView === 'work-orders' && (
          <WorkOrdersPage />
        )}

        {/* Common components */}
        <SuccessNotifications />
        <WeatherAccordion />
        <WaterOSCopilotPanel />
        <ManageMapLayersPanel />
        
        <ForecastingPanel />
      </main>
    </>
  )
}

function App() {
  return (
    <PanelProvider>
      <AppContent />
    </PanelProvider>
  )
}

export default App
