// Neighborhood stats card component
import { X } from 'lucide-react'
import { getTooltipVariant } from '../utils/neighborhoodTooltipVariant'

/** Severity tiers for Full (≥100% zoom), Compact, and Micro — Critical / High / Moderate / Watch palettes. */
const SPEC_TIERS = {
  critical: {
    headerBg: '#7A2020',
    border: '#7A2020',
    labelColor: '#FCA5A5',
    dot: '#F87171',
    bg: '#1C0F0F',
    nameColor: '#FEE2E2',
    bodySubtext: '#F87171',
    bodyStat: '#FCA5A5',
    severityLabel: 'Critical',
    actionVerb: 'Intervention needed',
  },
  /** Orange map tier — amber tooltip chrome */
  high: {
    headerBg: '#92400E',
    border: '#92400E',
    labelColor: '#FBBF24',
    dot: '#F59E0B',
    bg: '#1A1308',
    nameColor: '#FFFBEB',
    bodySubtext: '#FBBF24',
    bodyStat: '#FDE68A',
    severityLabel: 'High priority',
    actionVerb: 'Watch out',
  },
  /** Amber map tier — yellow tooltip chrome */
  moderate: {
    headerBg: '#713F12',
    border: '#713F12',
    labelColor: '#FDE047',
    dot: '#EAB308',
    bg: '#1A1709',
    nameColor: '#FEFCE8',
    bodySubtext: '#FACC15',
    bodyStat: '#FEF08A',
    severityLabel: 'Moderate',
    actionVerb: 'Monitor closely',
  },
  /** Yellow map tier (ratio band) — yellow/olive chrome, not gray */
  elevated: {
    headerBg: '#6B5D12',
    border: '#6B5D12',
    labelColor: '#FEF08A',
    dot: '#EAB308',
    bg: '#1A1707',
    nameColor: '#FEFCE8',
    bodySubtext: '#FDE047',
    bodyStat: '#FEF9C3',
    severityLabel: 'Elevated',
    actionVerb: 'Limited impact',
  },
  /** Low (gray) map tier only */
  watch: {
    headerBg: '#374151',
    border: '#4B5563',
    labelColor: '#D1D5DB',
    dot: '#9CA3AF',
    bg: '#141618',
    nameColor: '#F3F4F6',
    bodySubtext: '#9CA3AF',
    bodyStat: '#E5E7EB',
    severityLabel: 'Watch',
    actionVerb: 'No action needed',
  },
}

/** Header subline (after |) for storm-forecast tooltips only. */
const STORM_FORECAST_ACTION = {
  critical: 'Intervention likely',
  high: 'Elevated Risk',
  moderate: 'Monitor closely',
  elevated: 'Area focus',
  watch: 'Peripheral',
}

function tierKeyToSpecTier(tierKey) {
  if (tierKey === 'low') return 'watch'
  return tierKey
}

export default function NeighborhoodStatsCard({
  neighborhood,
  severity,
  isMinimized,
  onMinimize,
  onBringToFront,
  zoomPercent,
  /** '311' = service request copy; 'storm' = severe-weather forecast copy + layout. */
  tooltipMode = '311',
}) {
  const { name, count, residents, topTypes } = neighborhood
  const isStorm = tooltipMode === 'storm'
  const severityTier = severity || neighborhood.color || 'gray'

  const tierKey =
    severityTier === 'red'
      ? 'critical'
      : severityTier === 'orange'
        ? 'high'
        : severityTier === 'amber'
          ? 'moderate'
          : severityTier === 'yellow'
            ? 'elevated'
            : 'low'

  const variant = getTooltipVariant(zoomPercent)

  if (isMinimized || variant === 'closed') {
    return null
  }

  const topTypesSummary = topTypes && topTypes.length > 0 ? topTypes[0].type.toLowerCase() : 'various issues'

  const absorbMapPointer = (e) => {
    e.stopPropagation()
  }

  const handleCardPointerDown = (e) => {
    absorbMapPointer(e)
    onBringToFront?.()
  }

  const spec = SPEC_TIERS[tierKeyToSpecTier(tierKey)]
  const specTierKey = tierKeyToSpecTier(tierKey)
  const headerActionVerb = isStorm
    ? STORM_FORECAST_ACTION[specTierKey] ?? spec.actionVerb
    : spec.actionVerb
  const severityHeaderLabel =
    isStorm && specTierKey === 'high' ? 'High Priority' : spec.severityLabel

  /** Sits in the header row as a flex sibling so it never overlaps title/severity text. */
  const closeBtn = () => (
    <button
      type="button"
      onClick={onMinimize}
      style={{
        flexShrink: 0,
        alignSelf: 'flex-start',
        margin: 0,
        marginLeft: '4px',
        background: 'transparent',
        border: 'none',
        color: 'var(--ui-text-muted)',
        cursor: 'pointer',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--ui-text-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--ui-text-muted)'
      }}
      title="Minimize card"
    >
      <X size={14} />
    </button>
  )

  const headerSeparator = () => (
    <span
      style={{
        width: '1px',
        height: '10px',
        background: 'var(--ui-control-bg)',
        flexShrink: 0,
      }}
      aria-hidden
    />
  )

  // ——— Full (≥100% zoom): dot + severity | action header, body lines per mockup ———
  if (variant === 'full') {
    return (
      <div
        className="neighborhood-stats-card neighborhood-stats-card--full"
        onPointerDown={handleCardPointerDown}
        onPointerUp={absorbMapPointer}
        onMouseDown={absorbMapPointer}
        onTouchStart={absorbMapPointer}
        onClick={absorbMapPointer}
        onDoubleClick={absorbMapPointer}
        style={{
          minWidth: '200px',
          backgroundColor: spec.bg,
          border: `1px solid ${spec.border}`,
          borderRadius: 'var(--radius-xl, 8px)',
          padding: '12px 14px',
          color: 'var(--ui-text-primary)',
          boxShadow: isStorm
            ? 'var(--ui-shadow)'
            : 'var(--ui-shadow)',
          fontFamily: 'var(--font-family-primary)',
          fontSize: '13px',
          lineHeight: '1.5',
          pointerEvents: 'auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            background: spec.headerBg,
            margin: '-12px -14px 10px -14px',
            padding: '7px 14px',
            borderTopLeftRadius: 'var(--radius-xl, 8px)',
            borderTopRightRadius: 'var(--radius-xl, 8px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              rowGap: '4px',
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '999px',
                background: spec.dot,
                display: 'inline-block',
                flex: '0 0 auto',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: spec.labelColor,
              }}
            >
              {severityHeaderLabel}
            </span>
            {headerSeparator()}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: spec.labelColor,
                opacity: 0.75,
                lineHeight: 1.2,
              }}
            >
              {headerActionVerb}
            </span>
          </div>
          {closeBtn()}
        </div>

        <div
          style={{
            fontWeight: 600,
            fontSize: '16px',
            color: spec.nameColor,
            marginBottom: '6px',
            lineHeight: '1.3',
          }}
        >
          {name}
        </div>

        {isStorm ? (
          <>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ui-accent)',
                marginBottom: '8px',
              }}
            >
              Forecast · {neighborhood.forecastWindow ?? 'next 24h'}
            </div>
            <div
              style={{
                color: spec.bodySubtext,
                fontSize: '12px',
                marginBottom: '6px',
                lineHeight: 1.45,
              }}
            >
              ~
              {(neighborhood.predictedRequests ?? count).toLocaleString()} predicted requests ·{' '}
              <span style={{ opacity: 0.95 }}>{neighborhood.forecastDriver ?? 'hcd-signs'}</span>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '10px', lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600, color: spec.nameColor }}>
                ~{(neighborhood.residentsAtRisk ?? residents).toLocaleString()}
              </span>
              <span style={{ color: spec.bodySubtext }}> residents at risk</span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: '11px',
                  color: spec.bodySubtext,
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 600, color: spec.bodyStat }}>
                  {neighborhood.confidencePercent ?? 74}% confidence
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  borderRadius: '999px',
                  background: 'var(--ui-surface-muted)',
                  overflow: 'hidden',
                  border: '1px solid var(--ui-border)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, neighborhood.confidencePercent ?? 74))}%`,
                    borderRadius: '999px',
                    background:
                      'linear-gradient(90deg, var(--ui-accent) 0%, var(--ui-accent-muted) 100%)',
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                color: spec.bodySubtext,
                fontSize: '12px',
                marginBottom: '2px',
              }}
            >
              {count} open {count === 1 ? 'request' : 'requests'}{' '}
              <span style={{ color: spec.bodySubtext, opacity: 0.9 }}>· mostly {topTypesSummary}</span>
            </div>

            <div style={{ fontSize: '12px', marginBottom: '0' }}>
              <span style={{ fontWeight: 600, color: spec.nameColor }}>~{residents.toLocaleString()}</span>
              <span style={{ color: spec.bodySubtext }}> residents affected</span>
            </div>
          </>
        )}
      </div>
    )
  }

  // ——— Compact (80–100%) ———
  if (variant === 'compact') {
    return (
      <div
        className="neighborhood-stats-card neighborhood-stats-card--compact"
        onPointerDown={handleCardPointerDown}
        onPointerUp={absorbMapPointer}
        onMouseDown={absorbMapPointer}
        onTouchStart={absorbMapPointer}
        onClick={absorbMapPointer}
        onDoubleClick={absorbMapPointer}
        style={{
          width: '185px',
          boxSizing: 'border-box',
          backgroundColor: spec.bg,
          border: `1px solid ${spec.border}`,
          borderRadius: '8px',
          padding: '12px 14px',
          color: 'var(--ui-text-primary)',
          boxShadow: 'var(--ui-shadow)',
          fontFamily: 'var(--font-family-primary)',
          pointerEvents: 'auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            background: spec.headerBg,
            margin: '-12px -14px 10px -14px',
            padding: '7px 14px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '999px',
                background: spec.dot,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: spec.labelColor,
                flexShrink: 0,
              }}
            >
              {severityHeaderLabel}
            </span>
            {headerSeparator()}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: isStorm ? '0.06em' : '0.02em',
                textTransform: isStorm ? 'uppercase' : 'none',
                color: spec.labelColor,
                lineHeight: 1.25,
                minWidth: 0,
                opacity: isStorm ? 0.75 : 0.95,
              }}
            >
              {isStorm ? headerActionVerb : `${count} open`}
            </span>
          </div>
          {closeBtn()}
        </div>

        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: spec.nameColor,
            marginBottom: '6px',
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>

        {isStorm ? (
          <div style={{ fontSize: '11px', color: 'var(--ui-accent)', marginBottom: '4px' }}>
            Forecast · {neighborhood.forecastWindow ?? 'next 24h'}
          </div>
        ) : null}

        <div style={{ fontSize: '12px', color: spec.bodySubtext, lineHeight: 1.45 }}>
          {isStorm ? (
            <>
              <div style={{ marginBottom: '4px' }}>
                ~{neighborhood.predictedRequests ?? count} predicted · {neighborhood.forecastDriver ?? 'hcd-signs'}
              </div>
              <span style={{ color: spec.bodyStat, fontWeight: 600 }}>
                ~{(neighborhood.residentsAtRisk ?? residents).toLocaleString()} at risk
              </span>
            </>
          ) : (
            <span style={{ color: spec.bodyStat, fontWeight: 600 }}>
              {residents.toLocaleString()} residents affected
            </span>
          )}
        </div>
      </div>
    )
  }

  // ——— Micro (60–80%) ———
  return (
    <div
      className="neighborhood-stats-card neighborhood-stats-card--micro"
      onPointerDown={handleCardPointerDown}
      onPointerUp={absorbMapPointer}
      onMouseDown={absorbMapPointer}
      onTouchStart={absorbMapPointer}
      onClick={absorbMapPointer}
      onDoubleClick={absorbMapPointer}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: 'auto',
        backgroundColor: spec.bg,
        border: `1px solid ${spec.border}`,
        borderRadius: '6px',
        padding: '8px 10px',
        color: 'var(--ui-text-primary)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        fontFamily: 'var(--font-family-primary)',
        pointerEvents: 'auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '5px',
          background: spec.headerBg,
          margin: '-8px -10px 8px -10px',
          padding: '5px 10px',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flexWrap: 'wrap',
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '999px',
              background: spec.dot,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: spec.labelColor,
              flexShrink: 0,
            }}
          >
            {severityHeaderLabel}
          </span>
        </div>
        {closeBtn()}
      </div>

      <div
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: spec.nameColor,
          lineHeight: 1.3,
        }}
      >
        {name}
      </div>
    </div>
  )
}
