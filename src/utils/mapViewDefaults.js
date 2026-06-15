import { getViewPreset } from '../config/viewPresets'

const STORAGE_KEY = 'baltimore-ic-saved-map-views'

function isValidView(view) {
  if (!view || typeof view !== 'object') return false

  const { center, zoom, pitch, bearing } = view
  if (!Array.isArray(center) || center.length !== 2) return false
  if (typeof center[0] !== 'number' || typeof center[1] !== 'number') return false
  if (typeof zoom !== 'number') return false
  if (typeof pitch !== 'number') return false
  if (typeof bearing !== 'number') return false

  return true
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadSavedMapView(city, engine) {
  const view = readStorage()[city]?.[engine]
  return isValidView(view) ? view : null
}

export function saveMapView(city, engine, view) {
  if (!city || !engine || !isValidView(view)) return false

  const data = readStorage()
  if (!data[city]) data[city] = {}
  data[city][engine] = {
    center: [view.center[0], view.center[1]],
    zoom: view.zoom,
    pitch: view.pitch,
    bearing: view.bearing,
  }
  writeStorage(data)
  return true
}

export function getEffectiveViewPreset(city, engine) {
  return loadSavedMapView(city, engine) ?? getViewPreset(city, engine)
}
