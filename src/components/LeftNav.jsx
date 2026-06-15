import { Map, ClipboardList, ChevronLeft } from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'

const sandLogo = '/sand-logo.png'

export default function LeftNav() {
  const { currentView, setCurrentView } = usePanelContext()

  const navItems = [
    {
      id: 'map',
      icon: Map,
      label: 'Map View',
    },
    {
      id: 'work-orders',
      icon: ClipboardList,
      label: 'Work Orders',
    },
  ]

  const buttonBaseStyle = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: 'none',
    position: 'relative',
  }

  return (
    <div 
      className="fixed z-40 flex flex-col border rounded-lg"
      style={{
        background: 'var(--ui-nav-bg)',
        color: 'var(--ui-nav-fg)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--ui-nav-border)',
        boxShadow: 'var(--ui-shadow)',
        left: '16px',
        top: '80px',
        bottom: '16px',
        width: '48px',
        padding: '8px',
      }}
    >
      <div className="flex flex-col gap-2 items-center pb-2">
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'var(--ui-brand-btn-bg)',
            padding: '10px',
          }}
          title="Home"
        >
          <img
            src={sandLogo}
            alt="Sand"
            style={{
              width: '16px',
              height: '16px',
              objectFit: 'contain',
            }}
          />
        </button>
        
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'transparent',
            width: '16px',
            height: '16px',
            color: 'var(--ui-nav-fg-muted)',
          }}
          title="Collapse sidebar"
        >
          <ChevronLeft size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-1 items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              title={item.label}
              style={{
                ...buttonBaseStyle,
                backgroundColor: isActive ? 'var(--ui-control-active-bg)' : 'transparent',
                color: isActive ? 'var(--ui-control-active-fg)' : 'var(--ui-nav-fg-muted)',
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
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--ui-nav-fg-muted)'
                }
              }}
            >
              <Icon size={16} />
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center pt-2 border-t" style={{ borderColor: 'var(--ui-nav-border)' }}>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'var(--ui-brand-btn-bg)',
          }}
          title="User Profile"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ui-brand-btn-hover-bg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ui-brand-btn-bg)'
          }}
        >
          <div 
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'var(--ui-brand-btn-fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 600,
              color: 'var(--ui-brand-btn-bg)',
            }}
          >
            U
          </div>
        </button>
      </div>
    </div>
  )
}
