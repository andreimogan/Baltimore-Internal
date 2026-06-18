# Baltimore IC Use Cases

Interactive map application for exploring Baltimore 311 service requests, council districts, and neighborhoods. Built with React, Vite, and MapLibre GL.

## Map basemap

The map uses [MapTiler](https://www.maptiler.com/) for the streets basemap. The API key is included in the app so **no extra setup is required** to view the map after clone and `npm run dev`.

> **Note:** The key is visible in the client bundle (normal for browser map apps). Restrict it by HTTP referrer in the [MapTiler dashboard](https://cloud.maptiler.com/) if you deploy to a public URL.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm (included with Node.js)

## Local setup

```bash
git clone git@github.com:andreimogan/Baltimore-Internal.git
cd Baltimore-Internal

npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

All map data is committed to the repo, so `npm install && npm run dev` is all that's
needed — there is no separate data build or regeneration step.

### Optional: OpenAI copilot

To use “Ask SIA” chat, copy `.env.example` to `.env` and set `VITE_OPENAI_API_KEY`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_OPENAI_API_KEY` | No | “Ask SIA” copilot chat |

`.env` is gitignored. Only needed if you use the copilot feature.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Data sources

All datasets are Baltimore City open geospatial data. Layers marked **live** are fetched from
ArcGIS at runtime; the rest are bundled GeoJSON committed under `Database/` (raw) and
`public/data/` (app-ready).

| Layer | File / endpoint | Origin |
|-------|-----------------|--------|
| **Parcels** (property info) | `Database/Property_Information.geojson` → chunked to `public/data/parcels/` | Open Baltimore — Real Property Information parcels (`data.baltimorecity.gov`). *(confirm exact dataset page URL)* |
| **Buildings Footprint** | `Database/Buildings_Footprint.geojson` → chunked to `public/data/buildings/` | Open Baltimore — Building Footprints (`data.baltimorecity.gov`). *(confirm exact dataset page URL)* |
| **Vacant Building Notices** | `Database/Vacant_Building_Notices.geojson` → `public/data/vacant-building-notices.geojson` | Baltimore DHCD — Vacant Building Notices (open), `egisdata.baltimorecity.gov` layer `ob_VBN_Open_Pt_Flat`. **US-geo-restricted** — re-download needs a US connection/VPN. |
| **Vacant Building Risk** (Public Safety use case) | `public/data/vacant-risk-buildings.geojson` (derived) | Computed by `scripts/build-vacant-risk.py` from notices + parcels + footprints + 311 blight requests. |
| **311 Service Requests** (live) | `services1.arcgis.com/UWYHeuuJISiGmgXx/.../311_Customer_Service_Requests_{year}/FeatureServer/0` | Open Baltimore 311 (fetched live per year; not stored in repo). |
| **Council Districts** | `public/data/baltimore-council-districts.geojson` | Open Baltimore — "Baltimore City Council District", ArcGIS Hub item `ae0aaac1963f49829705c5c0580905a6` (finalized Nov 2023, from 2020 Census + voter precincts). |
| **Ward-Precincts** | `public/data/baltimore-ward-precincts.geojson` | Open Baltimore — "Ward-Precincts" (`data.baltimorecity.gov/datasets/ward-precincts-`, updated 2022). |
| **Neighborhoods** (live) | `services1.arcgis.com/mVFRs7NF4iFitgbY/.../GP_Boundaries/FeatureServer/1` | Baltimore GP_Boundaries neighborhoods (fetched live; cached to `Database/baltimore-neighborhoods.geojson` only for chunk builds). |

The large raw sources (`Property_Information.geojson` 537 MB, `Buildings_Footprint.geojson`
188 MB) are **not committed** (gitignored) — the app reads the small pre-built chunks instead.
They are only needed to *regenerate* chunks via `scripts/build-parcel-chunks.py`.

## License

Private / internal use unless otherwise specified by the repository owner.
