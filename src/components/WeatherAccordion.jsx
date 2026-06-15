import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  Circle,
  Cloud,
  CloudMoon,
  CloudRain,
  CloudSun,
  Home,
  Building2,
  Bug,
  Car,
  Droplets,
  Eye,
  Shield,
  Trash2,
  Trees,
  Wind,
  Wrench,
} from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'
import { isUiVisible } from '../config/uiVisibilitySettings'
import { categorizeSRType } from '../utils/311TypeBuckets'
import { applyBaltimore311MapFilters } from '../utils/baltimore311MapFilters'
import { calculateNeighborhood311Density } from '../utils/neighborhoodDensity'
import { findNeighborhoodContainingPoint, isCriticalNeighborhood } from '../utils/neighborhoodStats'
import SituationalAdvisoryBar from './SituationalAdvisoryBar'

/** Stable key for grouping open requests — same normalized address shares one row. */
function addressGroupKey(feature) {
  const raw = feature?.properties?.Address
  if (raw && typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\s+/g, ' ').toLowerCase()
  }
  const c = feature?.geometry?.coordinates
  if (c?.length >= 2) {
    return `coord:${c[0].toFixed(5)},${c[1].toFixed(5)}`
  }
  return 'unknown'
}

const BALTIMORE_COORDS = { latitude: 39.2904, longitude: -76.6122, label: 'Baltimore' }

const HOURLY_FIELDS = [
  'temperature_2m',
  'cloud_cover',
  'visibility',
  'wind_speed_10m',
  'wind_gusts_10m',
  'precipitation_probability',
  'precipitation',
  'rain',
]

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getPeriodSummary(rows) {
  if (!rows.length) {
    return {
      minTemp: 0,
      maxTemp: 0,
      avgCloud: 0,
      precipMm: 0,
      rainMm: 0,
      maxPrecipProb: 0,
      avgVisibilityKm: 0,
      maxWindKmh: 0,
      maxGustKmh: 0,
    }
  }

  const temperatures = rows.map((row) => row.temperature_2m)
  const cloud = rows.map((row) => row.cloud_cover)
  const visibilityKm = rows.map((row) => row.visibility / 1000)
  const wind = rows.map((row) => row.wind_speed_10m)
  const gust = rows.map((row) => row.wind_gusts_10m)
  const precip = rows.map((row) => row.precipitation)
  const rain = rows.map((row) => row.rain)
  const precipProb = rows.map((row) => row.precipitation_probability)

  return {
    minTemp: Math.round(Math.min(...temperatures)),
    maxTemp: Math.round(Math.max(...temperatures)),
    avgCloud: Math.round(average(cloud)),
    precipMm: Number(precip.reduce((sum, value) => sum + value, 0).toFixed(1)),
    rainMm: Number(rain.reduce((sum, value) => sum + value, 0).toFixed(1)),
    maxPrecipProb: Math.round(Math.max(...precipProb)),
    avgVisibilityKm: Number(average(visibilityKm).toFixed(1)),
    maxWindKmh: Math.round(Math.max(...wind)),
    maxGustKmh: Math.round(Math.max(...gust)),
  }
}

function getCondition(summary) {
  if (summary.rainMm >= 1.5 || summary.maxPrecipProb >= 55) {
    return {
      label: 'Rain likely',
      tone: 'warn',
      Icon: CloudRain,
      accent: 'var(--ui-status-info-text)',
      chipBackground: 'var(--ui-status-info-bg)',
      chipBorder: 'var(--ui-status-info-border)',
    }
  }
  if (summary.avgCloud >= 75) {
    return {
      label: 'Mostly cloudy',
      tone: 'muted',
      Icon: Cloud,
      accent: 'var(--ui-text-muted)',
      chipBackground: 'var(--ui-surface-muted)',
      chipBorder: 'var(--ui-border)',
    }
  }
  return {
    label: 'Partly clear',
    tone: 'calm',
    Icon: CloudSun,
    accent: 'var(--ui-accent)',
    chipBackground: 'var(--ui-status-warning-bg)',
    chipBorder: 'var(--ui-status-warning-border)',
  }
}

function buildRows(hourly) {
  const time = hourly?.time || []
  return time.map((slot, index) => ({
    time: slot,
    temperature_2m: hourly.temperature_2m?.[index] ?? 0,
    cloud_cover: hourly.cloud_cover?.[index] ?? 0,
    visibility: hourly.visibility?.[index] ?? 0,
    wind_speed_10m: hourly.wind_speed_10m?.[index] ?? 0,
    wind_gusts_10m: hourly.wind_gusts_10m?.[index] ?? 0,
    precipitation_probability: hourly.precipitation_probability?.[index] ?? 0,
    precipitation: hourly.precipitation?.[index] ?? 0,
    rain: hourly.rain?.[index] ?? 0,
  }))
}

export default function WeatherAccordion() {
  const {
    selectedDate,
    baltimore311Data,
    baltimoreNeighborhoodsData,
    baltimore311Types,
    baltimore311HideClosed,
    currentView,
    setCurrentView,
    requestMapFocus,
    requestMapPopup,
    setCopilotVisible,
    setActiveTab,
    setChatMessages,
    uiVisibility,
  } = usePanelContext()
  const showAdvisory = isUiVisible(uiVisibility, 'situationalAdvisoryBar')
  const showWeatherPanel = isUiVisible(uiVisibility, 'weatherPanel')
  const [weatherOpen, setWeatherOpen] = useState(false)
  const [cityInfoOpen, setCityInfoOpen] = useState(false)
  const [interventionOpen, setInterventionOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weatherData, setWeatherData] = useState(null)

  useEffect(() => {
    if (!showWeatherPanel) return

    let cancelled = false
    const coords = BALTIMORE_COORDS

    const loadWeather = async () => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        hourly: HOURLY_FIELDS.join(','),
      })

      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`Weather request failed (${response.status})`)
        }
        const payload = await response.json()
        if (!cancelled) setWeatherData(payload)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load weather data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadWeather()
    const refreshId = setInterval(loadWeather, 10 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(refreshId)
    }
  }, [showWeatherPanel])

  const derived = useMemo(() => {
    const rows = buildRows(weatherData?.hourly)
    if (!rows.length) return null

    const nowMs = Date.now()
    const todayRows = rows.filter((row) => {
      const ts = new Date(row.time).getTime()
      return ts >= nowMs && ts <= nowMs + 12 * 60 * 60 * 1000
    })
    const tonightRows = rows.filter((row) => {
      const ts = new Date(row.time).getTime()
      return ts > nowMs + 12 * 60 * 60 * 1000 && ts <= nowMs + 24 * 60 * 60 * 1000
    })

    const current = rows.find((row) => new Date(row.time).getTime() >= nowMs) || rows[0]
    const today = getPeriodSummary(todayRows)
    const tonight = getPeriodSummary(tonightRows)
    const condition = getCondition(today)
    return {
      cityLabel: BALTIMORE_COORDS.label,
      currentTemp: Math.round(current.temperature_2m),
      today,
      tonight,
      condition,
    }
  }, [weatherData])

  const latestOpenRequests = useMemo(() => {
    if (!baltimore311Data?.features?.length) return []

    const filtered = applyBaltimore311MapFilters(
      baltimore311Data,
      baltimore311Types,
      baltimore311HideClosed,
      selectedDate
    )

    return filtered.features
      .sort((a, b) => (b?.properties?.CreatedDate || 0) - (a?.properties?.CreatedDate || 0))
      .slice(0, 5)
  }, [baltimore311Data, selectedDate, baltimore311Types, baltimore311HideClosed])

  /** Critical (red-tier) neighborhoods only; requests grouped by normalized address. */
  const criticalInterventionGroups = useMemo(() => {
    if (!baltimore311Data?.features?.length || !baltimoreNeighborhoodsData) {
      return []
    }

    const filtered311Data = applyBaltimore311MapFilters(
      baltimore311Data,
      baltimore311Types,
      baltimore311HideClosed,
      selectedDate
    )

    if (!filtered311Data.features.length) return []

    const densityMap = calculateNeighborhood311Density(
      baltimoreNeighborhoodsData,
      filtered311Data,
      baltimore311HideClosed
    )

    const eligible = []
    for (const feature of filtered311Data.features) {
      const coords = feature.geometry?.coordinates
      if (!coords || coords.length < 2) continue

      const hood = findNeighborhoodContainingPoint(coords[0], coords[1], baltimoreNeighborhoodsData)
      if (!hood || !isCriticalNeighborhood(hood, densityMap)) continue

      eligible.push({ feature, neighborhoodName: hood })
    }

    const byAddress = new Map()
    for (const row of eligible) {
      const key = addressGroupKey(row.feature)
      if (!byAddress.has(key)) byAddress.set(key, [])
      byAddress.get(key).push(row)
    }

    const groups = [...byAddress.entries()].map(([key, rowList]) => {
      const sorted = [...rowList].sort(
        (a, b) => (b.feature.properties?.CreatedDate || 0) - (a.feature.properties?.CreatedDate || 0)
      )
      const firstAddr = sorted.find((r) => r.feature.properties?.Address?.trim())?.feature.properties.Address
      const displayAddress =
        firstAddr?.trim() || (key.startsWith('coord:') ? `Near ${sorted[0].neighborhoodName}` : 'Address unavailable')

      const latestCreated = Math.max(...sorted.map((r) => r.feature.properties?.CreatedDate || 0))

      return {
        key,
        displayAddress,
        neighborhoodName: sorted[0].neighborhoodName,
        requests: sorted.map((r) => r.feature),
        latestCreated,
      }
    })

    groups.sort((a, b) => b.latestCreated - a.latestCreated)
    return groups
  }, [
    selectedDate,
    baltimore311Data,
    baltimoreNeighborhoodsData,
    baltimore311Types,
    baltimore311HideClosed,
  ])

  const getBucketIcon = (bucketId) => {
    switch (bucketId) {
      case 'sanitation':
        return Trash2
      case 'housing':
        return Home
      case 'streets':
        return Wrench
      case 'water':
        return Droplets
      case 'parks':
        return Trees
      case 'animals':
        return Bug
      case 'vehicles':
        return Car
      case 'safety':
        return Shield
      case 'facilities':
        return Building2
      default:
        return Circle
    }
  }

  const formatRequestTime = (timestamp) => {
    if (!timestamp) return 'Unknown time'
    const date = new Date(timestamp)
    const now = Date.now()
    const diffHours = Math.floor((now - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'Less than 1h ago'
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleAnalyze311Request = (request) => {
    const props = request?.properties || {}
    const srType = props.SRType || 'Service Request'
    const locationHint = props.Neighborhood || props.Address || 'City Priority Zone'
    const detail = props.SRStatus ? `Status: ${props.SRStatus}` : 'Open 311 request requires triage.'

    const planMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'action-plan-context',
      timestamp: new Date(),
      context: {
        title: `311 Response Plan: ${srType}`,
        description: `${detail} ${props.Agency ? `Agency: ${props.Agency}.` : ''}`.trim(),
        locationHint,
        workOrderStrategy: 'single',
        steps: [
          { id: 'step-1', text: `Assign initial triage owner for ${srType}`, source: 'recommended' },
          { id: 'step-2', text: `Validate on-site conditions at ${locationHint}`, source: 'recommended' },
          { id: 'step-3', text: 'Define response scope, crew, and equipment', source: 'recommended' },
          { id: 'step-4', text: 'Publish ETA and monitor closure progress', source: 'recommended' },
        ],
      },
      removedStepIds: [],
      customSteps: [],
      approvedAction: false,
    }

    setCopilotVisible(true)
    setActiveTab('chat')
    setChatMessages((prev) => [...prev, planMessage])
  }

  const handleGoToRequestOnMap = (request) => {
    const coords = request?.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return

    const props = request?.properties || {}
    const lng = coords[0]
    const lat = coords[1]

    setCurrentView('map')
    requestMapFocus({ lng, lat, zoom: 15 })
    requestMapPopup({
      lng,
      lat,
      properties: {
        SRType: props.SRType || 'Service Request',
        Address: props.Address || '',
        SRStatus: props.SRStatus || '',
        CreatedDate: props.CreatedDate || null,
        CloseDate: props.CloseDate || null,
        Agency: props.Agency || '',
        Neighborhood: props.Neighborhood || '',
      },
    })
  }

  /** One AI plan per group; single-request groups reuse per-request handler. */
  const handleAnalyzeCriticalGroup = (requests) => {
    if (!requests?.length) return
    if (requests.length === 1) {
      handleAnalyze311Request(requests[0])
      return
    }

    const props0 = requests[0]?.properties || {}
    const locationHint = props0.Address || props0.Neighborhood || 'City Priority Zone'
    const types = [...new Set(requests.map((r) => r.properties?.SRType || 'Service Request'))]
    const hood = props0.Neighborhood || ''

    const planMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'action-plan-context',
      timestamp: new Date(),
      context: {
        title: `311 Priority batch: ${requests.length} requests (shared address)`,
        description: `${requests.length} open requests grouped by address for single dispatch. Types: ${types.join(', ')}.${hood ? ` Area: ${hood}.` : ''}`,
        locationHint,
        workOrderStrategy: 'batched-address',
        steps: [
          {
            id: 'step-1',
            text: `Schedule one field visit covering all ${requests.length} tickets at this location`,
            source: 'recommended',
          },
          {
            id: 'step-2',
            text: 'Verify work scope against each SR type before dispatch',
            source: 'recommended',
          },
          {
            id: 'step-3',
            text: 'Assign crew and equipment for combined resolution where possible',
            source: 'recommended',
          },
          {
            id: 'step-4',
            text: 'Close out each SR after on-site verification',
            source: 'recommended',
          },
        ],
      },
      removedStepIds: [],
      customSteps: [],
      approvedAction: false,
    }

    setCopilotVisible(true)
    setActiveTab('chat')
    setChatMessages((prev) => [...prev, planMessage])
  }

  if (currentView === 'work-orders') return null
  if (!showAdvisory && !showWeatherPanel) return null

  return (
    <div
      className="fixed weather-overlay-shell pointer-events-none flex flex-col items-end gap-2 min-h-0 z-20"
      style={{
        top: '84px',
        right: '16px',
      }}
    >
      {showAdvisory && (
        <div className="pointer-events-auto shrink-0 w-max">
          <SituationalAdvisoryBar />
        </div>
      )}
      {showWeatherPanel && (
      <aside
        className="pointer-events-auto flex flex-col shrink-0 w-[360px] overflow-hidden"
        aria-label="Weather Information panel"
      >
      <div
        className="weather-overlay-surface border rounded-[10px] flex flex-col h-fit gap-1 overflow-hidden shrink-0"
        style={{ borderColor: 'var(--ui-border)' }}
      >
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setWeatherOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ color: 'var(--ui-text-primary)' }}
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} />
              <span className="text-sm font-semibold">Weather Information</span>
            </div>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{ transform: weatherOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--ui-text-muted)' }}
            />
          </button>

          {weatherOpen && (
            <div className="px-3 pb-3">
              <div className="border-t pt-3" style={{ borderColor: 'var(--ui-border)' }}>
              {loading && (
                <div className="text-xs px-3 py-3 rounded-md" style={{ color: 'var(--ui-text-muted)', background: 'var(--ui-surface-muted)' }}>
                  Loading weather data...
                </div>
              )}

              {!loading && error && (
                <div
                  className="text-xs px-3 py-3 rounded-md border"
                  style={{
                    color: 'var(--ui-status-error-text)',
                    background: 'var(--ui-status-error-bg)',
                    borderColor: 'var(--ui-status-error-border)',
                  }}
                >
                  {error}
                </div>
              )}

              {!loading && !error && derived && (
                <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                      {derived.cityLabel}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                      Current: {derived.currentTemp}C
                    </p>
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold"
                    style={{
                      color: derived.condition.accent,
                      background: derived.condition.chipBackground,
                      borderColor: derived.condition.chipBorder,
                    }}
                  >
                    <derived.condition.Icon className="w-3.5 h-3.5" />
                    {derived.condition.label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <section
                    className="rounded-[8px] border px-2.5 py-2"
                    style={{ borderColor: 'var(--ui-border)', background: 'var(--ui-surface-muted)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--ui-text-secondary)' }}>Today</p>
                      <CloudSun className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                      {derived.today.minTemp} - {derived.today.maxTemp}C
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                      Cloud {derived.today.avgCloud}%
                    </p>
                  </section>

                  <section
                    className="rounded-[8px] border px-2.5 py-2"
                    style={{ borderColor: 'var(--ui-border)', background: 'var(--ui-surface-muted)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--ui-text-secondary)' }}>Tonight</p>
                      <CloudMoon className="w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                      {derived.tonight.minTemp} - {derived.tonight.maxTemp}C
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                      Cloud {derived.tonight.avgCloud}%
                    </p>
                  </section>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-[8px] px-2 py-1.5" style={{ background: 'var(--ui-surface-muted)' }}>
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5" style={{ color: 'var(--ui-accent)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                        {derived.today.maxPrecipProb}%
                      </span>
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>Rain chance</p>
                  </div>

                  <div className="rounded-[8px] px-2 py-1.5" style={{ background: 'var(--ui-surface-muted)' }}>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-muted)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                        {derived.today.avgVisibilityKm} km
                      </span>
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>Visibility</p>
                  </div>

                  <div className="rounded-[8px] px-2 py-1.5" style={{ background: 'var(--ui-surface-muted)' }}>
                    <div className="flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-muted)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                        {derived.today.maxGustKmh}
                      </span>
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>Gust km/h</p>
                  </div>
                </div>

                {(derived.today.rainMm >= 1.5 || derived.today.maxPrecipProb >= 55) && (
                  <div
                    className="flex items-center gap-2 rounded-[8px] border px-2.5 py-2"
                    style={{
                      borderColor: 'var(--ui-status-info-border)',
                      background: 'var(--ui-status-info-bg)',
                      color: 'var(--ui-status-info-text)',
                    }}
                  >
                    <CloudRain className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold">
                      Rain impact elevated today. Prioritize drainage and road condition monitoring.
                    </span>
                  </div>
                )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setCityInfoOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            style={{ color: 'var(--ui-text-primary)' }}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} />
              <span className="text-sm font-semibold">Latest 311 Service Requests</span>
            </div>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{ transform: cityInfoOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--ui-text-muted)' }}
            />
          </button>

          {cityInfoOpen && (
          <div className="px-3 pb-2">
            <div className="border-t pt-2 flex flex-col gap-1.5" style={{ borderColor: 'var(--ui-border)' }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
              Latest 5 open 311 requests
            </p>

            {latestOpenRequests.length === 0 && (
              <div
                className="text-xs px-3 py-2 rounded-md border"
                style={{
                  color: 'var(--ui-text-muted)',
                  borderColor: 'var(--ui-border)',
                  background: 'var(--ui-surface-muted)',
                }}
              >
                No open requests available for the selected date.
              </div>
            )}

              {latestOpenRequests.map((request, index) => {
              const srType = request?.properties?.SRType || 'Service Request'
              const created = request?.properties?.CreatedDate
              const bucketId = categorizeSRType(srType)
              const BucketIcon = getBucketIcon(bucketId)

              return (
                <div
                  key={`${srType}-${created || index}`}
                  className="rounded-[8px] border px-2 py-1.5 weather-overlay-soft-card"
                  style={{
                    borderColor: 'var(--ui-border)',
                    background: 'var(--ui-surface-muted)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0"
                        style={{ borderColor: 'var(--ui-advisory-btn-border)', background: 'var(--ui-advisory-btn-bg)' }}
                      >
                        <BucketIcon className="w-3 h-3" style={{ color: 'var(--ui-accent)' }} />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="text-[11px] font-semibold truncate block text-left underline-offset-2 max-w-[175px]"
                          style={{ color: 'var(--ui-text-primary)' }}
                          onClick={() => handleGoToRequestOnMap(request)}
                          title="Go to map"
                        >
                          {srType}
                        </button>
                        <span className="text-[9px] block" style={{ color: 'var(--ui-text-muted)' }}>
                          {formatRequestTime(created)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] underline underline-offset-2"
                      style={{ color: 'var(--ui-accent)' }}
                      onClick={() => handleAnalyze311Request(request)}
                    >
                      AI Analyze Steps
                    </button>
                  </div>
                </div>
              )
              })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col h-fit min-h-0">
          <button
            type="button"
            onClick={() => setInterventionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-left shrink-0"
            style={{ color: 'var(--ui-text-primary)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ui-status-error-text)' }} />
              <span className="text-sm font-semibold">Immediate Intervention Needed</span>
            </div>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{ transform: interventionOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--ui-text-muted)' }}
            />
          </button>

          {interventionOpen && (
            <div className="px-3 pb-2 flex flex-col">
              <div
                className="border-t pt-2 flex flex-col gap-1.5"
                style={{ borderColor: 'var(--ui-border)' }}
              >
                <p className="text-[11px] uppercase tracking-wide shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                  Priority operational step
                </p>

                <div className="flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden min-h-0 max-h-[calc(6*3.375rem+5*0.375rem)] pr-0.5">
                {criticalInterventionGroups.length === 0 && (
                  <div
                    className="text-xs px-3 py-2 rounded-md border"
                    style={{
                      color: 'var(--ui-text-muted)',
                      borderColor: 'var(--ui-border)',
                      background: 'var(--ui-surface-muted)',
                    }}
                  >
                    No open requests in critical neighborhoods for the selected filters and date.
                  </div>
                )}

                {criticalInterventionGroups.map((group) => (
                    <div
                      key={group.key}
                      className="rounded-[8px] border px-2 py-1.5 weather-overlay-soft-card"
                      style={{
                        borderColor: 'var(--ui-border)',
                        background: 'var(--ui-surface-muted)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0"
                            style={{ borderColor: 'var(--ui-status-error-border)', background: 'var(--ui-status-error-bg)' }}
                          >
                            <AlertTriangle className="w-3 h-3" style={{ color: 'var(--ui-status-error-text)' }} />
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              className="text-[11px] font-semibold truncate block text-left max-w-[175px] underline-offset-2"
                              style={{ color: 'var(--ui-text-primary)' }}
                              onClick={() => handleGoToRequestOnMap(group.requests[0])}
                              title="Go to map"
                            >
                              {group.displayAddress}
                            </button>
                            <span className="text-[9px] block" style={{ color: 'var(--ui-text-muted)' }}>
                              {group.requests.length} open · {group.neighborhoodName} ·{' '}
                              {formatRequestTime(group.latestCreated)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-[10px] underline underline-offset-2 shrink-0"
                          style={{ color: 'var(--ui-accent)' }}
                          onClick={() => handleAnalyzeCriticalGroup(group.requests)}
                        >
                          AI Analyze Steps
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </aside>
      )}
    </div>
  )
}
