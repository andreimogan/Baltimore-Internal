import { TrendingUp } from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'

const FORECASTING_TAB_ID = 'forecasting'

export default function ActionTabsBar() {
  const { activeActionTab, setActiveActionTab, setActionTabAnchor } = usePanelContext()
  const isActive = activeActionTab === FORECASTING_TAB_ID

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setActionTabAnchor({
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    })

    if (isActive) {
      setActiveActionTab(null)
    } else {
      setActiveActionTab(FORECASTING_TAB_ID)
    }
  }

  return (
    <div className="flex items-center h-9">
      <button
        type="button"
        onClick={handleClick}
        title="Forecasting"
        className="flex items-center justify-center transition-colors"
        style={{
          width: '36px',
          height: '36px',
          border: '1px solid var(--ui-nav-control-border)',
          borderRadius: '8px',
          backgroundColor: isActive ? 'var(--ui-control-active-bg)' : 'var(--ui-nav-control-bg)',
          color: isActive ? 'var(--ui-control-active-fg)' : 'var(--ui-nav-fg-muted)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--ui-nav-control-hover-bg)'
            e.currentTarget.style.color = 'var(--ui-nav-fg)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--ui-nav-control-bg)'
            e.currentTarget.style.color = 'var(--ui-nav-fg-muted)'
          }
        }}
      >
        <TrendingUp className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
