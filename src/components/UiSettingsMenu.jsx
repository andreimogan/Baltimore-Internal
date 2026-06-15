import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'
import { UI_VISIBILITY_SETTINGS } from '../config/uiVisibilitySettings'
import { UI_THEME_OPTIONS } from '../config/uiThemeSettings'

const controlStyle = {
  background: 'var(--ui-nav-control-bg)',
  borderColor: 'var(--ui-nav-control-border)',
  color: 'var(--ui-nav-fg)',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
}

function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onChange}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: checked ? 'var(--ui-accent)' : 'var(--ui-control-border)',
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export default function UiSettingsMenu() {
  const {
    uiVisibility,
    toggleUiVisibility,
    uiTheme,
    selectUiTheme,
    currentView,
    mapCameraReady,
    saveCurrentMapViewAsDefault,
    saveCurrentMapLayersAsDefault,
  } = usePanelContext()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const canSaveDefaultView = currentView === 'map' && mapCameraReady
  const canSaveDefaultLayers = currentView === 'map'

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSaveDefaultView = () => {
    if (!canSaveDefaultView) return
    const saved = saveCurrentMapViewAsDefault()
    if (saved) setOpen(false)
  }

  const handleSaveDefaultLayers = () => {
    if (!canSaveDefaultLayers) return
    const saved = saveCurrentMapLayersAsDefault()
    if (saved) setOpen(false)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-9 h-9 font-medium transition-colors rounded-[8px] border"
        style={{
          ...controlStyle,
          background: open ? 'var(--ui-nav-control-hover-bg)' : controlStyle.background,
        }}
        title="UI settings"
        aria-label="UI settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--ui-nav-control-hover-bg)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = open ? 'var(--ui-nav-control-hover-bg)' : 'var(--ui-nav-control-bg)'
        }}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="UI settings"
          className="absolute right-0 mt-2 w-72 rounded-[8px] border shadow-lg z-[60] overflow-hidden"
          style={{
            borderColor: 'var(--ui-border)',
            background: 'var(--ui-surface)',
            boxShadow: 'var(--ui-dropdown-shadow)',
          }}
        >
          <div
            className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide"
            style={{ borderColor: 'var(--ui-border-subtle)', color: 'var(--ui-text-muted)' }}
          >
            UI Settings
          </div>

          <div className="py-1 border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
            <div
              className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ui-text-muted)' }}
            >
              UI
            </div>
            <ul>
              {UI_THEME_OPTIONS.map((theme) => {
                const selected = uiTheme === theme.id

                return (
                  <li key={theme.id}>
                    <div
                      role="menuitemradio"
                      aria-checked={selected}
                      aria-disabled={!theme.available}
                      className={`flex items-start justify-between gap-3 px-3 py-2.5 ${theme.available ? '' : 'opacity-40'}`}
                      onMouseEnter={(e) => {
                        if (theme.available) e.currentTarget.style.background = 'var(--ui-surface-muted)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>
                          {theme.label}
                        </p>
                        {theme.description && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                            {theme.description}
                          </p>
                        )}
                      </div>
                      <ToggleSwitch
                        checked={selected}
                        disabled={!theme.available}
                        label={`Select ${theme.label} theme`}
                        onChange={() => selectUiTheme(theme.id)}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="py-1 border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
            <div
              className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ui-text-muted)' }}
            >
              Map
            </div>
            <button
              type="button"
              role="menuitem"
              disabled={!canSaveDefaultView}
              onClick={handleSaveDefaultView}
              className="w-full text-left px-3 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onMouseEnter={(e) => {
                if (canSaveDefaultView) e.currentTarget.style.background = 'var(--ui-surface-muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>Set View as Default</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                {canSaveDefaultView
                  ? 'Save current map position'
                  : 'Open the map view to save the current camera'}
              </p>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!canSaveDefaultLayers}
              onClick={handleSaveDefaultLayers}
              className="w-full text-left px-3 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onMouseEnter={(e) => {
                if (canSaveDefaultLayers) e.currentTarget.style.background = 'var(--ui-surface-muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>
                Set Map Layers as Default
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                {canSaveDefaultLayers
                  ? 'Save current layer visibility and toggles for next visit'
                  : 'Open the map view to save layer settings'}
              </p>
            </button>
          </div>

          {UI_VISIBILITY_SETTINGS.length > 0 && (
            <div className="py-1">
              <div
                className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--ui-text-muted)' }}
              >
                Overlays
              </div>
              <ul>
                {UI_VISIBILITY_SETTINGS.map((setting) => {
                  const visible = uiVisibility[setting.id] !== false

                  return (
                    <li key={setting.id}>
                      <div
                        role="menuitem"
                        className="flex items-start justify-between gap-3 px-3 py-2.5"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--ui-surface-muted)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>{setting.label}</p>
                          {setting.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                              {setting.description}
                            </p>
                          )}
                        </div>
                        <ToggleSwitch
                          checked={visible}
                          label={`Toggle ${setting.label}`}
                          onChange={() => toggleUiVisibility(setting.id)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
