#!/usr/bin/env python3
import json
import math
import pathlib

from PIL import Image
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "utils/py/common"))
from project_config import load_project_config
CFG = load_project_config(ROOT)
OSM = ROOT / "cache/osm/overpass_180m_roads_buildings.json"
DGM = ROOT / "cache" / CFG["cacheSlug"] / "dgm1" / (CFG["dgmTile"] + ".tif")
GEOMETRY = ROOT / "src/features/building-hull-import/generated/lod2CandidateGeometry.ts"
OUT = ROOT / "src/features/map-view/generated/siteContextData.ts"

ACTIVE_IDS = set(CFG["confirmedLod2Ids"]) | set(CFG["referenceLod2Ids"])
_tile = [int(x) for x in CFG["dgmTile"].split("_")]
TILE_E = _tile[0] * 1000
TILE_N = (_tile[1] + 1) * 1000


def wgs84_to_utm32(lat, lon):
    a = 6378137.0
    f = 1 / 298.257223563
    k0 = 0.9996
    e = math.sqrt(f * (2 - f))
    e2 = e * e
    ep2 = e2 / (1 - e2)
    latr = math.radians(lat)
    lonr = math.radians(lon)
    lon0 = math.radians(9)
    n_radius = a / math.sqrt(1 - e2 * math.sin(latr) ** 2)
    t = math.tan(latr) ** 2
    c = ep2 * math.cos(latr) ** 2
    aa = math.cos(latr) * (lonr - lon0)
    meridian = a * (
        (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * latr
        - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * latr)
        + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * latr)
        - (35 * e2**3 / 3072) * math.sin(6 * latr)
    )
    easting = k0 * n_radius * (
        aa + (1 - t + c) * aa**3 / 6 + (5 - 18 * t + t**2 + 72 * c - 58 * ep2) * aa**5 / 120
    ) + 500000
    northing = k0 * (
        meridian
        + n_radius
        * math.tan(latr)
        * (aa**2 / 2 + (5 - t + 9 * c + 4 * c**2) * aa**4 / 24 + (61 - 58 * t + t**2 + 600 * c - 330 * ep2) * aa**6 / 720)
    )
    return easting, northing


def load_geometry():
    import re

    text = GEOMETRY.read_text(encoding="utf-8")
    match = re.search(r"export const lod2CandidateGeometry = (\{.*\});\n\nexport type", text, re.S)
    return json.loads(match.group(1))


def terrain_value(e, n, image):
    x = int(round(e - TILE_E))
    y = int(round(TILE_N - n))
    if x < 0 or x >= image.width or y < 0 or y >= image.height:
        return None
    return float(image.getpixel((x, y)))


def main():
    geometry = load_geometry()
    active = [candidate for candidate in geometry["candidates"] if candidate["id"] in ACTIVE_IDS]
    points = [
        point
        for candidate in active
        for surface in candidate["surfaces"]["ground"]
        for point in surface["points"]
    ]
    min_e = min(p["e"] for p in points) - 45
    max_e = max(p["e"] for p in points) + 45
    min_n = min(p["n"] for p in points) - 45
    max_n = max(p["n"] for p in points) + 45

    osm = json.loads(OSM.read_text(encoding="utf-8"))
    nodes = {}
    for element in osm["elements"]:
        if element["type"] == "node":
            nodes[element["id"]] = wgs84_to_utm32(element["lat"], element["lon"])

    roads = []
    osm_buildings = []
    for way in [element for element in osm["elements"] if element["type"] == "way"]:
        tags = way.get("tags", {})
        coords = []
        for node_id in way.get("nodes", []):
            if node_id not in nodes:
                continue
            e, n = nodes[node_id]
            if min_e <= e <= max_e and min_n <= n <= max_n:
                coords.append({"e": round(e, 3), "n": round(n, 3)})
        if len(coords) < 2:
            continue
        if "highway" in tags:
            roads.append(
                {
                    "id": way["id"],
                    "name": tags.get("name") or tags.get("ref") or tags["highway"],
                    "type": tags["highway"],
                    "surface": tags.get("surface"),
                    "points": coords,
                }
            )
        elif "building" in tags:
            osm_buildings.append(
                {
                    "id": way["id"],
                    "label": tags.get("addr:housenumber") or tags.get("building"),
                    "building": tags.get("building"),
                    "points": coords,
                }
            )

    image = Image.open(DGM)
    terrain = []
    step = 8
    for e in range(math.floor(min_e / step) * step, math.ceil(max_e / step) * step + 1, step):
        for n in range(math.floor(min_n / step) * step, math.ceil(max_n / step) * step + 1, step):
            value = terrain_value(e, n, image)
            if value is not None:
                terrain.append({"e": e, "n": n, "z": round(value, 2)})

    payload = {
        "mapWindowUtm32": {
            "minE": round(min_e, 3),
            "maxE": round(max_e, 3),
            "minN": round(min_n, 3),
            "maxN": round(max_n, 3),
        },
        "terrain": terrain,
        "roads": roads,
        "osmBuildings": osm_buildings,
        "sources": {
            "osm": "cache/osm/overpass_180m_roads_buildings.json",
            "dgm1": f"cache/{CFG['cacheSlug']}/dgm1/{CFG['dgmTile']}.tif",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "export const siteContextData = "
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + ";\n\nexport type SiteContextData = typeof siteContextData;\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)} roads={len(roads)} buildings={len(osm_buildings)} terrain={len(terrain)}")


if __name__ == "__main__":
    main()
