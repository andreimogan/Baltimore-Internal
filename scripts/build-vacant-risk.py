#!/usr/bin/env python3
"""
Offline preprocessing for the "Use Cases -> Public Safety" Vacant Building Risk layer.

For each open vacant building notice, compute a transparent composite Risk Score
(0-100) from CURRENT data only, match it to the building footprint it sits on, and
write one small committed file the app renders (footprints colored green->red):

  public/data/vacant-risk-buildings.geojson

Risk factors (each normalized 0..1, weighted):
  vacancyDuration 0.20 | nuisance311 0.30 | absenteeOwner 0.15
  condition 0.15 | vacancyCluster 0.10 | marketWeakness 0.10

Inputs:
  Database/Vacant_Building_Notices.geojson      (the notices)
  Database/Property_Information.geojson          (parcel attrs via BLOCKLOT)
  Database/Buildings_Footprint.geojson           (footprint polygons to color)
  311_Customer_Service_Requests_2024 ArcGIS layer (blight-related SRTypes; cached)

Requires shapely. Run from repo root:  python3 scripts/build-vacant-risk.py
"""
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
from shapely.geometry import shape, Point, box
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VBN = os.path.join(ROOT, "Database", "Vacant_Building_Notices.geojson")
PARCELS = os.path.join(ROOT, "Database", "Property_Information.geojson")
BUILDINGS = os.path.join(ROOT, "Database", "Buildings_Footprint.geojson")
BLIGHT_CACHE = os.path.join(ROOT, "Database", "311_blight_2024.geojson")
OUT = os.path.join(ROOT, "public", "data", "vacant-risk-buildings.geojson")

ARC_311 = ("https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/"
           "311_Customer_Service_Requests_2024/FeatureServer/0/query")
BLIGHT_TYPES = [
    "HCD-Sanitation Property", "HCD-Illegal Dumping", "SW-Dirty Alley", "HCD-Vacant Building",
    "SW-SIU Clean Up (HCD USE ONLY)", "SW-Cleaning", "HCD-Maintenance Structure", "SW-Boarding",
    "SW-Graffiti Removal", "HLTH-Animal Dead Animal Pickup-Wildlife or Stray", "HCD-Abandoned Vehicle",
    "HCD-Rodents", "TRM-Debris In Roadway", "HCD-Graffiti", "HLTH-Animal Trapped In Vacant Building",
    "HCD-Vacant Building Squatter Encounter (Internal BCFD USE Only)", "SW-Fire Debris Removal",
    "HCD-Graffiti Referral", "SW-Clean Up (Mayor’s Fall Cleanup)", "SW-Clean Up (Mayor’s Spring Cleanup)",
    "HCD-CCE Demolition",
]

NOW_YEAR = 2026  # current date context for vacancy/age math
W = {"vacancyDuration": 0.20, "nuisance311": 0.30, "absenteeOwner": 0.15,
     "condition": 0.15, "vacancyCluster": 0.10, "marketWeakness": 0.10}
NUISANCE_RADIUS_M = 150
CLUSTER_RADIUS_M = 100
FOOTPRINT_SNAP_M = 20
KEEP_PARCEL = ["OWNER_1", "PERMHOME", "YEAR_BUILD", "CURRIMPR", "CURRLAND", "STRUCTAREA", "NO_IMPRV", "CITY_TAX"]
CORP = ("LLC", "L L C", "INC", "LLP", " LP", "CORP", "COMPANY", "PROPERT", "HOLDING", "REALTY",
        "ASSOC", "BANK", "TRUST", "HOUSING AUTH", "MAYOR", "CITY OF", "INVEST", "GROUP", "ENTERPRISE",
        "CAPITAL", "VENTURES", "PARTNERS", "MANAGEMENT")
M_PER_DEG_LAT = 111000.0


def meters_box(lon, lat, r):
    dlat = r / M_PER_DEG_LAT
    dlon = r / (M_PER_DEG_LAT * math.cos(math.radians(lat)))
    return box(lon - dlon, lat - dlat, lon + dlon, lat + dlat)


def meters_between(lon1, lat1, lon2, lat2):
    mx = (lon2 - lon1) * M_PER_DEG_LAT * math.cos(math.radians((lat1 + lat2) / 2))
    my = (lat2 - lat1) * M_PER_DEG_LAT
    return math.hypot(mx, my)


def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def fetch_blight_points():
    if os.path.exists(BLIGHT_CACHE):
        with open(BLIGHT_CACHE) as f:
            return json.load(f)["features"]
    in_list = ",".join("'" + t.replace("'", "''") + "'" for t in BLIGHT_TYPES)
    feats, offset = [], 0
    print("Pulling blight 311 points (cached after first run)…")
    while True:
        params = {"where": f"SRType IN ({in_list})", "outFields": "SRType",
                  "outSR": "4326", "f": "geojson", "resultOffset": offset, "resultRecordCount": 2000}
        url = ARC_311 + "?" + urllib.parse.urlencode(params)
        for attempt in range(4):
            try:
                with urllib.request.urlopen(url, timeout=60) as r:
                    page = json.load(r)
                break
            except Exception as e:
                if attempt == 3:
                    raise
                time.sleep(2 * (attempt + 1))
        batch = page.get("features", [])
        exceeded = page.get("exceededTransferLimit") or page.get("properties", {}).get("exceededTransferLimit")
        feats.extend(batch)
        offset += len(batch)
        if len(feats) % 20000 < len(batch or [1]):
            print(f"  …{len(feats)} pulled")
        if not batch or not exceeded:
            break
    with open(BLIGHT_CACHE, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f)
    print(f"  cached {len(feats)} blight points -> {BLIGHT_CACHE}")
    return feats


def parcel_lookup():
    print("Streaming parcels for BLOCKLOT lookup…")
    lut = {}
    with open(PARCELS) as f:
        for line in f:
            line = line.strip()
            if not line.startswith('{ "type": "Feature"'):
                continue
            if line.endswith(","):
                line = line[:-1]
            try:
                p = json.loads(line)["properties"]
            except json.JSONDecodeError:
                continue
            bl = (p.get("BLOCKLOT") or "").strip()
            if bl:
                lut[bl] = {k: p.get(k) for k in KEEP_PARCEL}
    print(f"  {len(lut)} parcels indexed")
    return lut


def market_weakness(code):
    if not code or code == "NA":
        return 0.5
    c = code.strip().upper()
    if len(c) == 1 and "A" <= c <= "Z":
        return clamp01((ord(c) - ord("A")) / 9.0)
    return 0.5


def absentee_score(parcel):
    if not parcel:
        return 0.5, "unknown"
    if str(parcel.get("PERMHOME") or "").strip().upper() == "Y":
        return 0.0, "owner-occupied"
    owner = str(parcel.get("OWNER_1") or "").upper()
    if any(tok in owner for tok in CORP):
        return 1.0, "corporate/investor"
    return 0.5, "individual (non-occupant)"


def condition_score(parcel):
    if not parcel:
        return 0.5
    yb = parcel.get("YEAR_BUILD") or 0
    age = clamp01((NOW_YEAR - yb) / 120.0) if yb and yb > 1700 else 0.5
    impr = parcel.get("CURRIMPR") or 0
    low_val = 1.0 if impr < 10000 else (0.5 if impr < 30000 else 0.0)
    no_impr = 1.0 if parcel.get("NO_IMPRV") else 0.0
    return clamp01(0.5 * age + 0.4 * low_val + 0.1 * no_impr)


def tier_of(score):
    return "Low" if score < 25 else "Moderate" if score < 50 else "High" if score < 75 else "Severe"


def main():
    for p in (VBN, PARCELS, BUILDINGS):
        if not os.path.exists(p):
            sys.exit(f"Missing {p}")

    vbn = json.load(open(VBN))["features"]
    parcels = parcel_lookup()
    blight = fetch_blight_points()

    print("Indexing blight 311 + vacancy cluster…")
    bpts, bxy = [], []
    for f in blight:
        g = f.get("geometry")
        if g and g.get("type") == "Point":
            x, y = g["coordinates"][0], g["coordinates"][1]
            bpts.append(Point(x, y)); bxy.append((x, y))
    btree = STRtree(bpts)

    vpts, vxy = [], []
    for f in vbn:
        g = f.get("geometry"); c = g["coordinates"]
        vpts.append(Point(c[0], c[1])); vxy.append((c[0], c[1]))
    vtree = STRtree(vpts)

    print("Loading building footprints…")
    bld = json.load(open(BUILDINGS))["features"]
    bgeoms = []
    for f in bld:
        g = f.get("geometry")
        if not g:
            continue
        try:
            sg = shape(g)
        except Exception:
            continue
        if not sg.is_empty:
            bgeoms.append(sg)
    btree_b = STRtree(bgeoms)
    print(f"  {len(bgeoms)} footprints indexed")

    def count_within(tree, xy_arr, lon, lat, r):
        bx = meters_box(lon, lat, r)
        n = 0
        for i in tree.query(bx):
            x2, y2 = xy_arr[i]
            if meters_between(lon, lat, x2, y2) <= r:
                n += 1
        return n

    import bisect

    def round_coords(o):
        if isinstance(o, (list, tuple)):
            if o and isinstance(o[0], (int, float)):
                return [round(float(o[0]), 6), round(float(o[1]), 6)]
            return [round_coords(x) for x in o]
        return o

    # Pass 1 — compute raw factors + footprint match per notice.
    print("Pass 1: raw factors + footprint matching…")
    recs = []
    contained = nearest = unmatched = 0
    for idx, f in enumerate(vbn):
        p = f.get("properties") or {}
        lon, lat = vxy[idx]
        parcel = parcels.get((p.get("BLOCKLOT") or "").strip())
        dn = p.get("DateNotice") or ""
        yr = int(dn[:4]) if len(dn) >= 4 and dn[:4].isdigit() else NOW_YEAR
        vac_years = max(0, NOW_YEAR - yr)
        n_nuis = count_within(btree, bxy, lon, lat, NUISANCE_RADIUS_M)
        n_clu = max(0, count_within(vtree, vxy, lon, lat, CLUSTER_RADIUS_M) - 1)
        s_abs, owner_type = absentee_score(parcel)
        s_cond = condition_score(parcel)
        s_mkt = market_weakness(p.get("HousingMarketTypology2023"))

        pt = vpts[idx]
        match_i, match_geom, kind = None, None, None
        for i in list(btree_b.query(pt)):
            if bgeoms[i].contains(pt):
                match_i, match_geom = i, bgeoms[i]; contained += 1; kind = 'c'; break
        if match_i is None:
            best_d, best_i = FOOTPRINT_SNAP_M + 1, None
            for i in list(btree_b.query(meters_box(lon, lat, FOOTPRINT_SNAP_M))):
                d = bgeoms[i].distance(pt) * M_PER_DEG_LAT
                if d < best_d:
                    best_d, best_i = d, i
            if best_i is not None:
                match_i, match_geom = best_i, bgeoms[best_i]; nearest += 1
        if match_i is None:
            unmatched += 1

        recs.append({"p": p, "parcel": parcel, "lon": lon, "lat": lat, "vac_years": vac_years,
                     "n_nuis": n_nuis, "n_clu": n_clu, "s_abs": s_abs, "owner_type": owner_type,
                     "s_cond": s_cond, "s_mkt": s_mkt, "match_i": match_i, "match_geom": match_geom})
        if (idx + 1) % 4000 == 0:
            print(f"  …{idx + 1}/{len(vbn)}")

    # Percentile-rank the saturating/continuous signals so scores spread across the full
    # range (Baltimore vacants cluster in distressed areas → absolute caps saturate).
    def pct_fn(values):
        srt = sorted(values)
        n = len(srt)
        return lambda v: (bisect.bisect_left(srt, v) / (n - 1)) if n > 1 else 0.0
    pct_nuis = pct_fn([r["n_nuis"] for r in recs])
    pct_clu = pct_fn([r["n_clu"] for r in recs])
    pct_vac = pct_fn([r["vac_years"] for r in recs])

    # Pass 2 — final weighted score + dedup by footprint (keep max).
    print("Pass 2: scoring…")
    best_for_footprint = {}
    point_fallback = []
    for r in recs:
        p, parcel = r["p"], r["parcel"]
        s_vac, s_nuis, s_clu = pct_vac(r["vac_years"]), pct_nuis(r["n_nuis"]), pct_clu(r["n_clu"])
        s_abs, s_cond, s_mkt = r["s_abs"], r["s_cond"], r["s_mkt"]
        score = round(100 * (W["vacancyDuration"] * s_vac + W["nuisance311"] * s_nuis +
                             W["absenteeOwner"] * s_abs + W["condition"] * s_cond +
                             W["vacancyCluster"] * s_clu + W["marketWeakness"] * s_mkt))
        impr = (parcel or {}).get("CURRIMPR") or 0
        land = (parcel or {}).get("CURRLAND") or 0
        props = {
            "OBJECTID": p.get("OBJECTID"), "Address": p.get("Address"), "NoticeNum": p.get("NoticeNum"),
            "riskScore": score, "tier": tier_of(score),
            "vacancyYears": r["vac_years"], "ownerType": r["owner_type"], "owner": (parcel or {}).get("OWNER_1"),
            "assessedValue": (impr + land) or None, "nuisanceCount": r["n_nuis"], "clusterCount": r["n_clu"],
            "marketTier": p.get("HousingMarketTypology2023"),
            "f_vacancy": round(s_vac, 2), "f_nuisance": round(s_nuis, 2), "f_absentee": round(s_abs, 2),
            "f_condition": round(s_cond, 2), "f_cluster": round(s_clu, 2), "f_market": round(s_mkt, 2),
            "district": p.get("district"), "precinct": p.get("precinct"), "neighborhood": p.get("neighborhood"),
        }
        if r["match_i"] is not None:
            prev = best_for_footprint.get(r["match_i"])
            if prev is None or score > prev[0]:
                props["geom"] = "polygon"
                feat = {"type": "Feature", "properties": props,
                        "geometry": {"type": r["match_geom"].geom_type,
                                     "coordinates": round_coords(r["match_geom"].__geo_interface__["coordinates"])}}
                best_for_footprint[r["match_i"]] = (score, feat)
        else:
            props["geom"] = "point"
            point_fallback.append({"type": "Feature", "properties": props,
                                   "geometry": {"type": "Point", "coordinates": [round(r["lon"], 6), round(r["lat"], 6)]}})

    feats = [v[1] for v in best_for_footprint.values()] + point_fallback
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))

    # distribution
    from collections import Counter
    dist = Counter(v[1]["properties"]["tier"] for v in best_for_footprint.values())
    for pf in point_fallback:
        dist[pf["properties"]["tier"]] += 1
    print(f"\nNotices: {len(vbn)} | footprint contained={contained} nearest={nearest} unmatched(points)={unmatched}")
    print(f"Unique footprints: {len(best_for_footprint)} | total output features: {len(feats)}")
    print("Tier distribution:", dict(dist))
    print(f"Wrote {OUT} ({os.path.getsize(OUT)//1024} KB)")


if __name__ == "__main__":
    main()
