#!/usr/bin/env python3
import json
import math
import pathlib
import xml.etree.ElementTree as ET

import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "utils/py/common"))
from project_config import load_project_config
CFG = load_project_config(ROOT)
GML = ROOT / "cache" / CFG["cacheSlug"] / "lod2" / (CFG["dgmTile"] + ".gml")
OUT = ROOT / "src/features/building-hull-import/generated/lod2CandidateGeometry.ts"
TARGET = (CFG["targetEasting"], CFG["targetNorthing"])
MANUAL_TRANSLATIONS = {}  # no manual offset needed; raw CityGML positions are correct
NS = {
    "bldg": "http://www.opengis.net/citygml/building/1.0",
    "gml": "http://www.opengis.net/gml",
}


def parse_pos_list(text):
    vals = [float(x) for x in text.split()]
    return [
        {"e": vals[i], "n": vals[i + 1], "z": vals[i + 2]}
        for i in range(0, len(vals), 3)
    ]


def area_3d(points):
    if len(points) < 3:
        return 0.0
    p0 = points[0]
    total = 0.0
    for i in range(1, len(points) - 1):
        a = vec(p0, points[i])
        b = vec(p0, points[i + 1])
        total += norm(cross(a, b)) / 2
    return total


def vec(a, b):
    return (b["e"] - a["e"], b["n"] - a["n"], b["z"] - a["z"])


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def norm(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def surface_normal(points):
    nx = ny = nz = 0.0
    for i, current in enumerate(points):
        nxt = points[(i + 1) % len(points)]
        nx += (current["n"] - nxt["n"]) * (current["z"] + nxt["z"])
        ny += (current["z"] - nxt["z"]) * (current["e"] + nxt["e"])
        nz += (current["e"] - nxt["e"]) * (current["n"] + nxt["n"])
    length = norm((nx, ny, nz))
    if length == 0:
        return (0.0, 0.0, 1.0)
    if nz < 0:
        nx, ny, nz = -nx, -ny, -nz
    return (nx / length, ny / length, nz / length)


def pitch_azimuth(points):
    normal = surface_normal(points)
    pitch = math.degrees(math.acos(max(0.0, min(1.0, abs(normal[2])))))
    azimuth = (math.degrees(math.atan2(normal[0], normal[1])) + 360) % 360
    return pitch, azimuth


def bbox(points):
    es = [p["e"] for p in points]
    ns = [p["n"] for p in points]
    zs = [p["z"] for p in points]
    return {
        "minE": min(es),
        "maxE": max(es),
        "minN": min(ns),
        "maxN": max(ns),
        "minZ": min(zs),
        "maxZ": max(zs),
    }


def dist_to_bbox(b):
    dx = max(b["minE"] - TARGET[0], 0, TARGET[0] - b["maxE"])
    dy = max(b["minN"] - TARGET[1], 0, TARGET[1] - b["maxN"])
    return math.hypot(dx, dy)


def translate_points(points, delta):
    return [
        {
            "e": round(p["e"] + delta["e"], 3),
            "n": round(p["n"] + delta["n"], 3),
            "z": round(p["z"] + delta.get("z", 0.0), 3),
        }
        for p in points
    ]


def surface_entries(building, tag, kind):
    entries = []
    for surface in building.findall(f".//bldg:{tag}", NS):
        sid = surface.attrib.get("{http://www.opengis.net/gml}id", "")
        pos = surface.find(".//gml:posList", NS)
        if pos is None or not pos.text:
            continue
        points = parse_pos_list(pos.text)
        if len(points) > 1 and points[0] == points[-1]:
            points = points[:-1]
        pitch, azimuth = pitch_azimuth(points)
        entries.append(
            {
                "id": sid,
                "kind": kind,
                "areaM2": round(area_3d(points), 2),
                "pitchDeg": round(pitch, 1),
                "azimuthDeg": round(azimuth, 1),
                "points": [
                    {"e": round(p["e"], 3), "n": round(p["n"], 3), "z": round(p["z"], 3)}
                    for p in points
                ],
            }
        )
    return entries


def main():
    root = ET.parse(GML).getroot()
    candidates = []
    for building in root.findall(".//bldg:Building", NS):
        ground_surfaces = surface_entries(building, "GroundSurface", "ground")
        if not ground_surfaces:
            continue
        all_ground_points = [point for surface in ground_surfaces for point in surface["points"]]
        b = bbox(all_ground_points)
        centroid_e = sum(p["e"] for p in all_ground_points) / len(all_ground_points)
        centroid_n = sum(p["n"] for p in all_ground_points) / len(all_ground_points)
        dx = centroid_e - TARGET[0]
        dy = centroid_n - TARGET[1]
        candidates.append(
            {
                "id": building.attrib.get("{http://www.opengis.net/gml}id", ""),
                "functionCode": (building.findtext("bldg:function", default="", namespaces=NS) or "").strip(),
                "roofTypeCode": (building.findtext("bldg:roofType", default="", namespaces=NS) or "").strip(),
                "measuredHeightM": round(float(building.findtext("bldg:measuredHeight", default="nan", namespaces=NS)), 3),
                "bboxUtm32": {k: round(v, 3) for k, v in b.items()},
                "centroidUtm32": {"easting": round(centroid_e, 3), "northing": round(centroid_n, 3)},
                "bboxDistanceToGeocodeM": round(dist_to_bbox(b), 3),
                "centroidDistanceToGeocodeM": round(math.hypot(dx, dy), 3),
                "surfaces": {
                    "ground": ground_surfaces,
                    "roof": surface_entries(building, "RoofSurface", "roof"),
                    "wall": surface_entries(building, "WallSurface", "wall"),
                },
            }
        )

    for candidate in candidates:
        delta = MANUAL_TRANSLATIONS.get(candidate["id"])
        if not delta:
            continue
        for kind in ("ground", "roof", "wall"):
            for surface in candidate["surfaces"][kind]:
                surface["points"] = translate_points(surface["points"], delta)
                surface["areaM2"] = round(surface["areaM2"], 2)
                if kind in ("roof", "wall", "ground"):
                    pass
        all_points = [point for kind in ("ground", "roof", "wall") for surface in candidate["surfaces"][kind] for point in surface["points"]]
        candidate["bboxUtm32"] = {k: round(v, 3) for k, v in bbox(all_points).items()}
        candidate["centroidUtm32"] = {
            "easting": round(sum(p["e"] for p in all_points) / len(all_points), 3),
            "northing": round(sum(p["n"] for p in all_points) / len(all_points), 3),
        }
        candidate["bboxDistanceToGeocodeM"] = round(dist_to_bbox(candidate["bboxUtm32"]), 3)
        candidate["centroidDistanceToGeocodeM"] = round(
            math.hypot(candidate["centroidUtm32"]["easting"] - TARGET[0], candidate["centroidUtm32"]["northing"] - TARGET[1]), 3
        )

    candidates.sort(key=lambda row: (row["bboxDistanceToGeocodeM"], row["centroidDistanceToGeocodeM"]))
    payload = {
        "sourceTile": CFG["dgmTile"] + ".gml",
        "addressPointUtm32": {"easting": round(TARGET[0], 3), "northing": round(TARGET[1], 3)},
        "candidates": candidates[:12],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "export const lod2CandidateGeometry = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n\nexport type Lod2CandidateGeometry = typeof lod2CandidateGeometry;\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)} with {len(payload['candidates'])} candidates")


if __name__ == "__main__":
    main()
