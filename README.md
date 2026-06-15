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

- Baltimore 311 service requests (city open data API)
- Council district and neighborhood boundaries (bundled GeoJSON in `public/data/`)

## License

Private / internal use unless otherwise specified by the repository owner.
