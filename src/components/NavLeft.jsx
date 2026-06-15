import { Calendar, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePanelContext } from '../contexts/PanelContext'

const BALTIMORE = {
  label: 'Baltimore, MD',
  title: 'Baltimore City Intelligence Center',
  subtitle: "Mayor's Decision Cockpit",
  logo: '/baltimore-logo.svg',
}

export default function NavLeft() {
  const { selectedDate, setSelectedDate, selectedYear, setSelectedYear } = usePanelContext()
  const [dateOpen, setDateOpen] = useState(false)

  useEffect(() => {
    const year = selectedDate.getFullYear()
    if (year !== selectedYear) {
      setSelectedYear(year)
    }
  }, [selectedDate, selectedYear, setSelectedYear])

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value)
    setSelectedDate(newDate)
    setDateOpen(false)
  }

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatInputDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  const controlStyle = {
    color: 'var(--ui-nav-fg)',
    background: 'var(--ui-nav-control-bg)',
    borderColor: 'var(--ui-nav-control-border)',
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2 px-2 shrink-0">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: 'var(--ui-surface-muted)' }}
        >
          <img src={BALTIMORE.logo} alt="" className="w-4 h-4 object-contain" />
        </div>
        <div className="leading-none">
          <p className="text-sm font-semibold" style={{ color: 'var(--ui-nav-fg)' }}>{BALTIMORE.title}</p>
          <p className="text-xs" style={{ color: 'var(--ui-nav-fg-muted)' }}>
            {BALTIMORE.subtitle}
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-2 h-9 px-3 rounded-[8px] text-sm border shrink-0"
        style={{ ...controlStyle, cursor: 'default' }}
        title="Coverage area"
      >
        <span className="font-normal">{BALTIMORE.label}</span>
      </div>

      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-2 h-9 px-3 rounded-[8px] text-sm transition-colors border"
          style={controlStyle}
          title="Select date"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ui-nav-control-hover-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ui-nav-control-bg)' }}
          onClick={() => setDateOpen(!dateOpen)}
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <span className="font-normal">{formatDisplayDate(selectedDate)}</span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ transform: dateOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          />
        </button>
        {dateOpen && (
          <div
            className="absolute mt-1 rounded-[8px] border shadow-lg z-50 overflow-hidden p-3"
            style={{
              borderColor: 'var(--ui-border)',
              background: 'var(--ui-surface)',
              boxShadow: 'var(--ui-dropdown-shadow)',
            }}
          >
            <input
              type="date"
              min="2023-01-01"
              max="2025-12-31"
              value={formatInputDate(selectedDate)}
              onChange={handleDateChange}
              className="px-3 py-2 text-sm rounded-md border"
              style={{
                backgroundColor: 'var(--ui-surface-muted)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text-primary)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
