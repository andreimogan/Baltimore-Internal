# Context: Mapping Baltimore City Council Districts and their ward-precinct subdivisions

## Goal
Render **all Baltimore City Council districts** (14 of them) on a GIS map, together with the **ward-precinct** polygons that subdivide each district (the internal "organization" of every district), with each precinct associated to its containing council district and labeled by its ward-precinct identifier.

(If a single-district view is ever needed — e.g. District 6 — it is just a filter on the result described below.)

## Key fact about the geography (this drives the implementation)
Baltimore's council district boundaries were derived from voter **precinct** boundaries. As a result, each council district is composed of **whole precincts** and the precinct edges are **coincident** with the district edges. Every precinct nests cleanly inside exactly one district — no precinct is split across two districts. This means:
- A spatial join of precincts to districts is exact (no slivers, no ambiguous half-cut polygons).
- Dissolving/merging the precincts by their assigned district should reproduce the council-district boundaries — a useful validation check.

## Data sources (all are GIS-native vector data, not PDFs)

### 1. Council district boundaries
- Dataset: **"Baltimore City Council District"** on Open Baltimore (`data.baltimorecity.gov`), hosted on Esri ArcGIS Hub.
- Content: polygon feature layer, all 14 council districts as separate features.
- Provenance: boundaries finalized November 2023, derived from city voter precinct boundaries; population/race/ethnicity attributes derived from 2020 Census counts.
- ArcGIS Hub item id: `ae0aaac1963f49829705c5c0580905a6`.

### 2. Ward-precinct boundaries (the subdivision layer)
- Dataset: **"Ward-Precincts"** on Open Baltimore (`data.baltimorecity.gov/datasets/ward-precincts-`).
- Content: ward precinct voting boundaries for the city of Baltimore (citywide — all wards and precincts), updated in 2022 to reflect the new Legislative and Congressional districts.
- This is the vector equivalent of the city's `wp_precincts` PDF map.

### 3. Statewide alternative for precincts (optional fallback)
- Dataset: **"Maryland Election Boundaries – Precincts 2022"** (`data-maryland.opendata.arcgis.com`), from the Maryland Department of Planning.
- Content: 2022 precinct (voting district) polygons collected from counties including Baltimore City, with precinct numbers reformatted. Useful if you need consistency across multiple Maryland jurisdictions.

## How to access the data
Each dataset is an ArcGIS Hub / ArcGIS Feature Service, so there are three interchangeable access patterns:

1. **File download** — from the dataset page, use the Download button to get GeoJSON, Shapefile, KML, or CSV. Load into the GIS tool.
2. **Live service** — add the underlying ArcGIS Feature Service REST endpoint (or its GeoJSON URL) directly as a layer; it stays in sync with the source.
3. **Query API** — hit the feature service's `/query` endpoint. To pull the full citywide layer (all districts / all precincts), request everything:
   ```
   {FEATURE_SERVER_LAYER_URL}/query?where=1=1&outFields=*&outSR=4326&f=geojson
   ```
   To pull a single district instead, filter on the district field, e.g. `where={DISTRICT_FIELD}=6`.

## Implementation steps
1. **Load all council districts.** All 14 polygons from the Council District layer. Keep the district-number attribute.
2. **Load all ward-precincts.** The full citywide Ward-Precincts layer.
3. **Establish the precinct → district relationship.** Each precinct must carry the council district it belongs to. Two routes:
   - **(a) Attribute join** — if the precinct attribute table already contains a council-district field, use it directly; no spatial work needed.
   - **(b) Spatial join** — if there is no district field on the precincts, assign each precinct the district whose polygon contains it (a "within" / point-in-polygon-on-centroid join). Because precinct and district boundaries are coincident, this is exact and unambiguous.
   After this step you have a precinct layer where every feature has both its ward-precinct ID and its council-district number.
4. **Validate (recommended).** Dissolve the precincts by their assigned district and compare against the council-district layer; the geometries should match. This confirms the join is correct and the nesting assumption holds.
5. **Symbolize and label.** Render the districts as one layer (e.g. distinct fill/outline per district), the precincts as a layer on top, grouped/colored by district, each precinct labeled by its ward-precinct ID (the `27-001`-style ID — ward number, precinct number).
6. **Optional per-district views.** Since every precinct now carries a district number, any single-district map (e.g. District 6) is just a filter (`district = N`) on the joined precinct layer plus the matching district polygon.

## Must verify at runtime (do NOT assume these — inspect the actual data)
- **Exact field names.** The district-number field on the council layer and the precinct-id / ward / district fields on the precinct layer must be read from the layer's attribute table or the service's field metadata. Do not hardcode guessed names like `DISTRICT` or `Name` without confirming.
- **Whether the Ward-Precincts layer carries a council-district attribute.** This determines whether step 3 uses route (a) or route (b). Check the attribute table first.
- **The exact Feature Service REST endpoint URLs.** Obtain these from each dataset page's "I want to use this" / API / Full Details section rather than constructing them by hand.
- **Spatial reference / CRS.** Confirm the CRS of each layer and reproject to a common CRS before any spatial operation; request `outSR=4326` (WGS84) from the query API if a web map expects lon/lat.
- **Feature count / paging.** A citywide precinct pull may exceed the service's `maxRecordCount` per request. If so, page through results (`resultOffset` / `resultRecordCount`) or use the file download to get the complete set in one go.

## Notes
- Ignore the original PDF map (`wp_precincts ... .pdf`) and the rendered map images on the city Board of Elections / Planning pages — they are pictures of this same data and are not usable as GIS input. The datasets above are the authoritative vector sources.
- "Ward-precinct" identifiers combine a ward number and a precinct number; a precinct belongs to exactly one ward, and (per the nesting fact above) to exactly one council district.
