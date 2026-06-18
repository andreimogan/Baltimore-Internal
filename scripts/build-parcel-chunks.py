#!/usr/bin/env python3
"""
One-time preprocessing: split a large Baltimore polygon dataset into small
per-boundary GeoJSON chunks that the app loads on demand. Used for both the
parcel layer (default) and the buildings-footprint layer (via CLI args).

Outputs (gitignored — regenerable artifacts), for OUT = public/data/<layer>:
  OUT/neighborhood/<slug>.geojson
  OUT/district/<AREA_NAME>.geojson
  OUT/precinct/<VDTST12>.geojson
  OUT/manifest.json

Each feature is tagged by a spatial join (representative point within polygon)
against the SAME boundary layers the app renders, so chunk keys line up with
the panel's selection lists.

Requires: shapely 2.x  (pip install --user shapely)
Run from repo root:
  python3 scripts/build-parcel-chunks.py                                 # parcels (defaults)
  python3 scripts/build-parcel-chunks.py \\
      --src Database/Buildings_Footprint.geojson --out public/data/buildings \\
      --keep GlobalID,AREA_,SRCDATE --label buildings                    # buildings
"""
import argparse
import json
import os
import re
import sys
import urllib.request
from shapely.geometry import shape
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.join(ROOT, "Database", "Property_Information.geojson")
DEFAULT_OUT = os.path.join(ROOT, "public", "data", "parcels")
DEFAULT_KEEP = ["PIN", "FULLADDR", "OWNER_1", "CURRLAND", "CURRIMPR", "YEAR_BUILD"]
DISTRICTS = os.path.join(ROOT, "public", "data", "baltimore-council-districts.geojson")
PRECINCTS = os.path.join(ROOT, "public", "data", "baltimore-ward-precincts.geojson")
NEIGHBORHOODS_CACHE = os.path.join(ROOT, "Database", "baltimore-neighborhoods.geojson")
NEIGHBORHOODS_URL = (
    "https://services1.arcgis.com/mVFRs7NF4iFitgbY/arcgis/rest/services/"
    "GP_Boundaries/FeatureServer/1/query?where=1%3D1&outFields=Name&f=geojson"
)
COORD_PRECISION = 6


def slugify(name):
    """Mirror of src/utils/parcelChunks.js -> must stay identical."""
    return re.sub(r"[^a-z0-9]+", "_", (name or "").strip().lower()).strip("_")


def fetch_neighborhoods():
    if os.path.exists(NEIGHBORHOODS_CACHE):
        with open(NEIGHBORHOODS_CACHE) as f:
            return json.load(f)
    print("Downloading neighborhoods layer (paged)…")
    features, offset = [], 0
    while True:
        url = f"{NEIGHBORHOODS_URL}&resultOffset={offset}&resultRecordCount=1000"
        with urllib.request.urlopen(url) as resp:
            page = json.load(resp)
        batch = page.get("features", [])
        features.extend(batch)
        if not page.get("exceededTransferLimit") or not batch:
            break
        offset += len(batch)
    fc = {"type": "FeatureCollection", "features": features}
    with open(NEIGHBORHOODS_CACHE, "w") as f:
        json.dump(fc, f)
    print(f"  cached {len(features)} neighborhoods -> {NEIGHBORHOODS_CACHE}")
    return fc


def build_index(geojson, key_fn):
    """Return (STRtree, geoms, keys) where keys[i] is the boundary key for geoms[i]."""
    geoms, keys = [], []
    for feat in geojson.get("features", []):
        geom = feat.get("geometry")
        if not geom:
            continue
        key = key_fn(feat.get("properties") or {})
        if not key:
            continue
        try:
            g = shape(geom)
        except Exception:
            continue
        if g.is_empty:
            continue
        geoms.append(g)
        keys.append(key)
    return STRtree(geoms), geoms, keys


def locate(tree, geoms, keys, pt):
    """Key of the polygon containing pt, or None."""
    for i in tree.query(pt):
        if geoms[i].contains(pt):
            return keys[i]
    return None


def round_coords(obj):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(float(c), COORD_PRECISION) for c in obj]
        return [round_coords(o) for o in obj]
    return obj


def trim(v):
    return v.strip() if isinstance(v, str) else v


def main():
    ap = argparse.ArgumentParser(description="Split a polygon GeoJSON into per-boundary chunks.")
    ap.add_argument("--src", default=DEFAULT_SRC, help="Source GeoJSON (line-delimited features).")
    ap.add_argument("--out", default=DEFAULT_OUT, help="Output dir (e.g. public/data/buildings).")
    ap.add_argument("--keep", default=",".join(DEFAULT_KEEP), help="Comma-separated props to keep.")
    ap.add_argument("--label", default="parcels", help="Label used in log output.")
    args = ap.parse_args()

    src = args.src if os.path.isabs(args.src) else os.path.join(ROOT, args.src)
    out_dir = args.out if os.path.isabs(args.out) else os.path.join(ROOT, args.out)
    keep_props = [k.strip() for k in args.keep.split(",") if k.strip()]
    label = args.label

    if not os.path.exists(src):
        sys.exit(f"Missing {src}")

    with open(DISTRICTS) as f:
        districts = json.load(f)
    with open(PRECINCTS) as f:
        precincts = json.load(f)
    neighborhoods = fetch_neighborhoods()

    print("Building spatial indexes…")
    d_tree, d_geoms, d_keys = build_index(districts, lambda p: str(p.get("AREA_NAME") or "").strip())
    p_tree, p_geoms, p_keys = build_index(precincts, lambda p: str(p.get("VDTST12") or "").strip())
    n_tree, n_geoms, n_keys = build_index(neighborhoods, lambda p: str(p.get("Name") or "").strip())
    print(f"  districts={len(d_keys)} precincts={len(p_keys)} neighborhoods={len(n_keys)}")

    # records hold one shared slimmed feature dict + its three boundary keys.
    records = []
    n_total = matched_any = 0
    print(f"Streaming + tagging {label}…")
    with open(src) as f:
        for line in f:
            line = line.strip()
            if not line.startswith('{ "type": "Feature"') and not line.startswith('{"type":"Feature"'):
                continue
            if line.endswith(","):
                line = line[:-1]
            try:
                feat = json.loads(line)
            except json.JSONDecodeError:
                continue
            geom = feat.get("geometry")
            if not geom:
                continue
            n_total += 1
            try:
                pt = shape(geom).representative_point()
            except Exception:
                continue

            d_key = locate(d_tree, d_geoms, d_keys, pt)
            p_key = locate(p_tree, p_geoms, p_keys, pt)
            n_name = locate(n_tree, n_geoms, n_keys, pt)
            if not (d_key or p_key or n_name):
                continue
            matched_any += 1

            props = feat.get("properties") or {}
            slim = {k: trim(props.get(k)) for k in keep_props}
            slim_feat = {
                "type": "Feature",
                "properties": slim,
                "geometry": {"type": geom["type"], "coordinates": round_coords(geom["coordinates"])},
            }
            records.append((slim_feat, n_name, d_key, p_key))
            if n_total % 25000 == 0:
                print(f"  …{n_total} parsed, {matched_any} matched")

    print(f"Parsed {n_total} {label}, {matched_any} matched at least one boundary.")

    manifest = {"neighborhood": {}, "district": {}, "precinct": {}}

    def write_group(kind, key_index, key_to_filename):
        buckets = {}
        for rec in records:
            key = rec[key_index]
            if not key:
                continue
            buckets.setdefault(key, []).append(rec[0])
        out = os.path.join(out_dir, kind)
        os.makedirs(out, exist_ok=True)
        for key, feats in buckets.items():
            fname = key_to_filename(key)
            with open(os.path.join(out, fname), "w") as fh:
                json.dump({"type": "FeatureCollection", "features": feats}, fh, separators=(",", ":"))
            manifest[kind][key] = len(feats)
        print(f"  {kind}: {len(buckets)} chunks")

    print("Writing chunks…")
    os.makedirs(out_dir, exist_ok=True)
    write_group("neighborhood", 1, lambda k: f"{slugify(k)}.geojson")
    write_group("district", 2, lambda k: f"{k}.geojson")
    write_group("precinct", 3, lambda k: f"{k}.geojson")

    # For neighborhoods, manifest keys are the slug (what the runtime fetches by).
    manifest["neighborhood"] = {slugify(k): v for k, v in manifest["neighborhood"].items()}
    with open(os.path.join(out_dir, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, separators=(",", ":"))
    print(f"Wrote manifest.json -> {out_dir}")
    print("Done.")


if __name__ == "__main__":
    main()
