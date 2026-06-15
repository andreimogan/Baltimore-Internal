import {
  Bell,
  Layers,
  ClipboardList,
} from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'
import ActionTabsBar from './ActionTabsBar'
import UiSettingsMenu from './UiSettingsMenu'

const sandLogo = '/sand-logo.png'

export default function NavRight() {
  const {
    toggleCopilot,
    toggleLayers,
    layersVisible,
    currentView,
    setCurrentView,
  } = usePanelContext()

  const controlStyle = {
    background: 'var(--ui-nav-control-bg)',
    borderColor: 'var(--ui-nav-control-border)',
    color: 'var(--ui-nav-fg)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  }

  return (
    <div className="flex items-center gap-4 shrink-0">

      {/* Button Group: Layers / Bell */}
      <div className="flex items-center h-9">
        <button
          className="flex items-center justify-center w-9 h-9 border transition-colors"
          style={{
            ...controlStyle,
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            background: layersVisible ? 'var(--ui-nav-control-hover-bg)' : 'var(--ui-nav-control-bg)',
          }}
          title="Map Layers"
          onClick={toggleLayers}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ui-nav-control-hover-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = layersVisible ? 'var(--ui-nav-control-hover-bg)' : 'var(--ui-nav-control-bg)' }}
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          className="flex items-center justify-center w-9 h-9 border transition-colors"
          style={{ ...controlStyle, borderLeftWidth: 0, borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}
          title="Notifications"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ui-nav-control-hover-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ui-nav-control-bg)' }}
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <ActionTabsBar />

      <button
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors rounded-[8px] text-sm h-9 px-3 border"
        style={{
          ...controlStyle,
          background: currentView === 'work-orders' ? 'var(--ui-control-active-bg)' : 'var(--ui-nav-control-bg)',
          color: currentView === 'work-orders' ? 'var(--ui-control-active-fg)' : 'var(--ui-nav-fg)',
        }}
        title="Work Orders"
        onClick={() => setCurrentView('work-orders')}
        onMouseEnter={(e) => {
          if (currentView !== 'work-orders') e.currentTarget.style.background = 'var(--ui-nav-control-hover-bg)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentView === 'work-orders' ? 'var(--ui-control-active-bg)' : 'var(--ui-nav-control-bg)'
        }}
      >
        <ClipboardList className="w-4 h-4" aria-hidden="true" />
        Work Orders
      </button>

      <UiSettingsMenu />

      <button
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors rounded-[8px] text-sm h-9 px-4"
        style={{
          background: 'var(--ui-cta-bg)',
          color: 'var(--ui-cta-fg)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
        title="Water OS Copilot"
        onClick={toggleCopilot}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ui-cta-hover-bg)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ui-cta-bg)' }}
      >
        <span className="w-4 h-4 block shrink-0 overflow-hidden" aria-hidden="true">
          <img
            src={sandLogo}
            alt=""
            className="w-full h-full object-contain"
          />
        </span>
        Ask SIA
      </button>

    </div>
  )
}
