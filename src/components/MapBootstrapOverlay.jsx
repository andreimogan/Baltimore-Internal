import { Loader2 } from 'lucide-react'

/** Full-screen blocker until Baltimore map bootstrap completes (311 + neighborhoods data loading). */
export default function MapBootstrapOverlay({ visible }) {
  if (!visible) return null

  return (
    <div
      className="map-bootstrap-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 pointer-events-auto"
      style={{
        backdropFilter: 'blur(10px)',
      }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading map data"
      role="progressbar"
    >
      <Loader2 className="map-bootstrap-overlay-icon h-10 w-10 animate-spin shrink-0" aria-hidden />
      <p className="map-bootstrap-overlay-text text-sm font-medium m-0 text-center px-6 max-w-md">
        Loading service requests and neighborhood context…
      </p>
    </div>
  )
}
