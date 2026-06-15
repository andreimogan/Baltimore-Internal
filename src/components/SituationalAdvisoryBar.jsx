import { useLayoutEffect, useRef } from 'react'
import { CloudLightning } from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'

const ALERT_LABEL = 'Severe weather'
const ALERT_DETAIL =
  'Alert: a severe thunderstorm is forecast to arrive in approximately 24 hours. Plan ahead, watch the sky, and follow official warnings and emergency alerts.'

export default function SituationalAdvisoryBar() {
  const { currentView, stormAdvisoryNeighborhoodsVisible, setStormAdvisoryNeighborhoodsVisible } =
    usePanelContext()
  const marqueeTrackRef = useRef(null)

  useLayoutEffect(() => {
    const track = marqueeTrackRef.current
    if (!track) return
    const first = track.firstElementChild
    if (!(first instanceof HTMLElement)) return

    const applyDuration = () => {
      const w = first.getBoundingClientRect().width
      const pxPerSec = 42
      const seconds = Math.max(22, Math.min(100, w / pxPerSec))
      track.style.setProperty('--advisory-marquee-duration', `${seconds}s`)
    }

    applyDuration()
    const ro = new ResizeObserver(applyDuration)
    ro.observe(first)
    return () => ro.disconnect()
  }, [])

  if (currentView !== 'map') return null

  const show = !stormAdvisoryNeighborhoodsVisible
  const buttonLabel = show
    ? 'Show possible affected neighborhoods'
    : 'Hide possible affected neighborhoods'

  return (
    <div
      className="flex w-max max-w-[min(800px,calc(100vw-32px))] min-h-[48px] items-stretch justify-start rounded-lg border overflow-hidden shadow-lg shrink-0"
      style={{
        borderColor: 'var(--ui-advisory-border)',
        boxShadow: 'var(--ui-dropdown-shadow)',
      }}
      role="region"
      aria-label="Situational advisory"
    >
      <div
        className="flex items-center justify-start gap-2 px-3 py-2.5 shrink-0"
        style={{
          background: 'var(--ui-advisory-gradient)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 8px rgba(255,255,255,0.5)' }}
          aria-hidden
        />
        <CloudLightning className="w-4 h-4 shrink-0 text-white opacity-95" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white leading-tight whitespace-nowrap">
          {ALERT_LABEL}
        </span>
      </div>
      <div
        className="flex flex-1 items-stretch min-w-0 min-h-0 pl-2 pr-2 py-1.5 gap-2"
        style={{
          background: 'var(--ui-advisory-body-bg)',
          borderLeft: '1px solid var(--ui-border-subtle)',
        }}
      >
        <p className="sr-only" role="status" aria-live="polite">
          {ALERT_DETAIL}
        </p>
        <div className="flex-1 self-center min-w-0 my-0 overflow-hidden" aria-hidden>
          <div ref={marqueeTrackRef} className="advisory-marquee-track">
            <span
              className="inline-flex shrink-0 items-center whitespace-nowrap text-[12px] leading-snug pr-14"
              style={{ color: 'var(--ui-advisory-body-text)' }}
            >
              {ALERT_DETAIL}
            </span>
            <span
              className="inline-flex shrink-0 items-center whitespace-nowrap text-[12px] leading-snug pr-14"
              style={{ color: 'var(--ui-advisory-body-text)' }}
              aria-hidden
            >
              {ALERT_DETAIL}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStormAdvisoryNeighborhoodsVisible((v) => !v)}
          className="self-center shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold leading-tight whitespace-nowrap transition-[background,border-color] focus:outline focus:outline-2 focus:outline-offset-1"
          style={{
            borderColor: 'var(--ui-advisory-btn-border)',
            background: 'var(--ui-advisory-btn-bg)',
            color: 'var(--ui-text-primary)',
            outlineColor: 'var(--ui-accent)',
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
