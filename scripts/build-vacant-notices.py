#!/usr/bin/env python3
"""
One-time preprocessing for the Vacant Building Notice point layer.

Reads Database/Vacant_Building_Notices.geojson (~11.7k points), spatial-joins
each point to the SAME boundary layers the app renders (so tag values match the
panel's selection lists exactly), slims the properties, and writes a single small
file the app loads once and filters in memory:

  public/data/vacant-building-notices.geojson   (committed — small, ~3-4 MB)

District/neighborhood are already present on the source but are re-derived by
spatial join for exact parity, falling back to the embedded values if a point
lands outside every polygon. Precinct has no source field, so it comes only from
the join.

Requires: shapely 2.x   Run from repo root:  python3 scripts/build-vacant-notices.py
"""
import json
import os
import sys
from shapely.geometry import shape
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Database", "Vacant_Building_Notices.geojson")
DISTRICTS = os.path.join(ROOT, "public", "data", "baltimore-council-districts.geojson")
PRECINCTS = os.path.join(ROOT, "public", "data", "baltimore-ward-precincts.geojson")
NEIGHBORHOODS = os.path.join(ROOT, "Database", "baltimore-neighborhoods.geojson")
OUT = os.path.join(ROOT, "public", "data", "vacant-building-notices.geojson")

KEEP_PROPS = ["OBJECTID", "NoticeNum", "DateNotice", "Address", "BLOCKLOT", "HousingMarketTypology2023"]
COORD_PRECISION = 6


def build_index(geojson, key_fn):
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
    for i in tree.query(pt):
        if geoms[i].contains(pt):
            return keys[i]
    return None


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Missing {SRC}")
    for p in (DISTRICTS, PRECINCTS, NEIGHBORHOODS):
        if not os.path.exists(p):
            sys.exit(f"Missing boundary layer {p}")

    with open(DISTRICTS) as f:
        districts = json.load(f)
    with open(PRECINCTS) as f:
        precincts = json.load(f)
    with open(NEIGHBORHOODS) as f:
        neighborhoods = json.load(f)
    with open(SRC) as f:
        vbn = json.load(f)

    print("Building spatial indexes…")
    d_tree, d_geoms, d_keys = build_index(districts, lambda p: str(p.get("AREA_NAME") or "").strip())
    p_tree, p_geoms, p_keys = build_index(precincts, lambda p: str(p.get("VDTST12") or "").strip())
    n_tree, n_geoms, n_keys = build_index(neighborhoods, lambda p: str(p.get("Name") or "").strip())
    print(f"  districts={len(d_keys)} precincts={len(p_keys)} neighborhoods={len(n_keys)}")

    out_feats = []
    n_total = with_d = with_p = with_n = 0
    for feat in vbn.get("features", []):
        geom = feat.get("geometry")
        if not geom or geom.get("type") != "Point":
            continue
        n_total += 1
        props = feat.get("properties") or {}
        try:
            pt = shape(geom)
        except Exception:
            continue

        district = locate(d_tree, d_geoms, d_keys, pt)
        if not district and props.get("Council_District") not in (None, ""):
            district = str(props.get("Council_District")).strip()
        precinct = locate(p_tree, p_geoms, p_keys, pt)
        neighborhood = locate(n_tree, n_geoms, n_keys, pt) or (props.get("Neighborhood") or None)

        with_d += bool(district)
        with_p += bool(precinct)
        with_n += bool(neighborhood)

        slim = {k: (props.get(k).strip() if isinstance(props.get(k), str) else props.get(k)) for k in KEEP_PROPS}
        slim["district"] = district
        slim["precinct"] = precinct
        slim["neighborhood"] = neighborhood
        coords = [round(float(c), COORD_PRECISION) for c in geom["coordinates"]]
        out_feats.append({"type": "Feature", "properties": slim, "geometry": {"type": "Point", "coordinates": coords}})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"type": "FeatureCollection", "features": out_feats}, f, separators=(",", ":"))

    print(f"Tagged {n_total} points → {len(out_feats)} written")
    print(f"  with district={with_d}  precinct={with_p}  neighborhood={with_n}")
    print(f"Wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)")
    print("Done.")


if __name__ == "__main__":
    main()
