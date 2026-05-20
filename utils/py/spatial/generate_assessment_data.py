#!/usr/bin/env python3
import json
import math
import pathlib
import re
from statistics import mean

from PIL import Image
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "utils/py/common"))
from project_config import load_project_config
CFG = load_project_config(ROOT)
GEOMETRY_TS = ROOT / "src/features/building-hull-import/generated/lod2CandidateGeometry.ts"
DGM = ROOT / "cache" / CFG["cacheSlug"] / "dgm1" / (CFG["dgmTile"] + ".tif")
OUT = ROOT / "src/features/assessment/generated/assessmentDerivedData.ts"

CONFIRMED_IDS = CFG["confirmedLod2Ids"]
REFERENCE_IDS = CFG["referenceLod2Ids"]
_tile = [int(x) for x in CFG["dgmTile"].split("_")]
TILE_E = _tile[0] * 1000
TILE_N = (_tile[1] + 1) * 1000


def load_geometry():
    text = GEOMETRY_TS.read_text(encoding="utf-8")
    match = re.search(r"export const lod2CandidateGeometry = (\{.*\});\n\nexport type", text, re.S)
    if not match:
        raise RuntimeError("Could not read generated LoD2 geometry")
    return json.loads(match.group(1))


def all_points(candidate, kinds):
    points = []
    for kind in kinds:
        for surface in candidate["surfaces"][kind]:
            points.extend(surface["points"])
    return points


def bbox(points):
    return {
        "minE": min(p["e"] for p in points),
        "maxE": max(p["e"] for p in points),
        "minN": min(p["n"] for p in points),
        "maxN": max(p["n"] for p in points),
        "minZ": min(p["z"] for p in points),
        "maxZ": max(p["z"] for p in points),
    }


def principal_orientation(points):
    cx = mean(p["e"] for p in points)
    cy = mean(p["n"] for p in points)
    sxx = sum((p["e"] - cx) ** 2 for p in points)
    syy = sum((p["n"] - cy) ** 2 for p in points)
    sxy = sum((p["e"] - cx) * (p["n"] - cy) for p in points)
    angle = 0.5 * math.atan2(2 * sxy, sxx - syy)
    azimuth = (90 - math.degrees(angle)) % 180
    return azimuth


def summarize_candidate(candidate):
    ground_points = all_points(candidate, ["ground"])
    all_surface_points = all_points(candidate, ["ground", "roof", "wall"])
    b = bbox(all_surface_points)
    ground_bbox = bbox(ground_points)
    return {
        "id": candidate["id"],
        "measuredHeightM": candidate["measuredHeightM"],
        "groundAreaM2": round(sum(s["areaM2"] for s in candidate["surfaces"]["ground"]), 2),
        "roofAreaM2": round(sum(s["areaM2"] for s in candidate["surfaces"]["roof"]), 2),
        "wallAreaM2": round(sum(s["areaM2"] for s in candidate["surfaces"]["wall"]), 2),
        "roofSurfaceCount": len(candidate["surfaces"]["roof"]),
        "wallSurfaceCount": len(candidate["surfaces"]["wall"]),
        "groundElevationM": round(ground_bbox["minZ"], 2),
        "minSurfaceElevationM": round(b["minZ"], 2),
        "maxSurfaceElevationM": round(b["maxZ"], 2),
        "bboxUtm32": {k: round(v, 3) for k, v in ground_bbox.items()},
        "principalAxisAzimuthDeg": round(principal_orientation(ground_points), 1),
        "averageRoofPitchDeg": round(mean(s["pitchDeg"] for s in candidate["surfaces"]["roof"]), 1),
    }


def pixel_for(e, n):
    # DGM1 tile is a 1000m tile; northing decreases down raster rows.
    return int(round(e - TILE_E)), int(round(TILE_N - n))


def sample_terrain(window_bbox, margin=20):
    img = Image.open(DGM)
    min_x, min_y = pixel_for(window_bbox["minE"] - margin, window_bbox["maxN"] + margin)
    max_x, max_y = pixel_for(window_bbox["maxE"] + margin, window_bbox["minN"] - margin)
    min_x = max(0, min(999, min_x))
    max_x = max(0, min(999, max_x))
    min_y = max(0, min(999, min_y))
    max_y = max(0, min(999, max_y))
    step = max(1, int(max(max_x - min_x, max_y - min_y) / 60))
    values = []
    samples = []
    for y in range(min_y, max_y + 1, step):
        for x in range(min_x, max_x + 1, step):
            value = float(img.getpixel((x, y)))
            if math.isfinite(value):
                e = 748000 + x
                n = 5485000 - y
                values.append(value)
                samples.append((e, n, value))
    if not samples:
        raise RuntimeError("No terrain samples")
    # Fit z = a*E + b*N + c for approximate slope direction.
    e0 = mean(s[0] for s in samples)
    n0 = mean(s[1] for s in samples)
    z0 = mean(s[2] for s in samples)
    see = sum((s[0] - e0) ** 2 for s in samples)
    snn = sum((s[1] - n0) ** 2 for s in samples)
    sen = sum((s[0] - e0) * (s[1] - n0) for s in samples)
    sez = sum((s[0] - e0) * (s[2] - z0) for s in samples)
    snz = sum((s[1] - n0) * (s[2] - z0) for s in samples)
    det = see * snn - sen * sen
    a = b = 0.0
    if abs(det) > 1e-9:
        a = (sez * snn - snz * sen) / det
        b = (snz * see - sez * sen) / det
    slope = math.sqrt(a * a + b * b)
    uphill_azimuth = (math.degrees(math.atan2(a, b)) + 360) % 360
    drainage_azimuth = (uphill_azimuth + 180) % 360
    return {
        "sourceTile": CFG["dgmTile"] + ".tif",
        "sampleWindowUtm32": {
            "minE": TILE_E + min_x,
            "maxE": TILE_E + max_x,
            "minN": TILE_N - max_y,
            "maxN": TILE_N - min_y,
        },
        "sampleCount": len(values),
        "minElevationM": round(min(values), 2),
        "maxElevationM": round(max(values), 2),
        "meanElevationM": round(mean(values), 2),
        "reliefM": round(max(values) - min(values), 2),
        "approxSlopePercent": round(slope * 100, 2),
        "approxDrainageAzimuthDeg": round(drainage_azimuth, 1),
    }


def main():
    geometry = load_geometry()
    candidates = {c["id"]: c for c in geometry["candidates"]}
    confirmed = [candidates[id_] for id_ in CONFIRMED_IDS]
    references = [candidates[id_] for id_ in REFERENCE_IDS]
    confirmed_points = [p for candidate in confirmed for p in all_points(candidate, ["ground"])]
    active_points = [p for candidate in [*confirmed, *references] for p in all_points(candidate, ["ground"])]
    combined_bbox = bbox(confirmed_points)
    payload = {
        "confirmedObject": {
            "partIds": CONFIRMED_IDS,
            "combinedGroundAreaM2": round(sum(summarize_candidate(c)["groundAreaM2"] for c in confirmed), 2),
            "combinedRoofAreaM2": round(sum(summarize_candidate(c)["roofAreaM2"] for c in confirmed), 2),
            "combinedWallAreaM2": round(sum(summarize_candidate(c)["wallAreaM2"] for c in confirmed), 2),
            "bboxUtm32": {k: round(v, 3) for k, v in combined_bbox.items()},
            "principalAxisAzimuthDeg": round(principal_orientation(confirmed_points), 1),
            "parts": [summarize_candidate(c) for c in confirmed],
            "futureRoofNote": "Current metrics describe existing LoD2 evidence geometry. Future unified roof geometry is a later planning variant.",
        },
        "terrain": {
            "confirmedObject": sample_terrain(combined_bbox, margin=20),
            "activeContext": sample_terrain(bbox(active_points), margin=20),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "export const assessmentDerivedData = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n\nexport type AssessmentDerivedData = typeof assessmentDerivedData;\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
