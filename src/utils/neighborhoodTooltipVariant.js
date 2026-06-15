/**
 * Maps map zoom percent (0–200, same scale as zoomToPercent in MapView) to tooltip layout.
 */
export function getTooltipVariant(zoomPercent) {
  if (zoomPercent == null || Number.isNaN(zoomPercent)) return 'full'
  if (zoomPercent >= 100) return 'full'
  if (zoomPercent >= 80) return 'compact'
  if (zoomPercent >= 60) return 'micro'
  return 'closed'
}
