// Map view presets — Baltimore only

export const VIEW_PRESETS = {
  baltimore: {
    maplibre: {
      center: [-76.6188, 39.2913],
      zoom: 15,
      pitch: 54,
      bearing: 18,
    },
  },
}

export const getViewPreset = (city, engine) => VIEW_PRESETS[city]?.[engine] ?? null
