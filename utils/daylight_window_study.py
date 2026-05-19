#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import math
import sys
from statistics import mean


LAT_RAD = math.radians(49.4619861)
LON_DEG = 12.425139
TZ_OFFSET_H = 1.0
RIDGE_AZIMUTH_DEG = 26.4
WORKPLANE_Z = 523.10
WINDOW_EDGE_MARGIN_M = 0.75
WORKPLANE_S_MARGIN_M = 0.50
WORKPLANE_T_MARGIN_M = 0.10


def load_exporter():
    spec = importlib.util.spec_from_file_location("export_ifc", "utils/export_ifc.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules["export_ifc"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


mod = load_exporter()
U = mod.Point2(math.sin(math.radians(RIDGE_AZIMUTH_DEG)), math.cos(math.radians(RIDGE_AZIMUTH_DEG)))
V = mod.Point2(math.sin(math.radians(RIDGE_AZIMUTH_DEG) + math.pi / 2), math.cos(math.radians(RIDGE_AZIMUTH_DEG) + math.pi / 2))


def roof_info(roof_id: str) -> dict[str, object]:
    pts = mod.parse_surface_points(mod.PART1_ID, roof_id)
    plane = mod.fit_plane(pts)
    center = mod.Point2(sum(p.x for p in pts) / len(pts), sum(p.y for p in pts) / len(pts))
    poly = []
    for p in pts:
        s = (p.x - center.x) * U.x + (p.y - center.y) * U.y
        t = (p.x - center.x) * V.x + (p.y - center.y) * V.y
        poly.append((s, t))
    return {"pts": pts, "plane": plane, "center": center, "poly": poly}


WEST = roof_info(mod.PART1_WEST_ROOF_ID)
EAST = roof_info(mod.PART1_EAST_ROOF_ID)
DORMER_S0 = max(s for s, _ in WEST["poly"]) - mod.DORMER_LENGTH_M


def point_in_poly(x: float, y: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    for i, (x1, y1) in enumerate(poly):
        x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y):
            x_cross = (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1
            if x < x_cross:
                inside = not inside
    return inside


def local_st(roof: dict[str, object], x: float, y: float) -> tuple[float, float]:
    center = roof["center"]
    s = (x - center.x) * U.x + (y - center.y) * U.y
    t = (x - center.x) * V.x + (y - center.y) * V.y
    return s, t


def intersect_roof(
    pt: tuple[float, float, float],
    direction: tuple[float, float, float],
    roof: dict[str, object],
) -> tuple[float, float, float, float] | None:
    a, b, c = roof["plane"]
    denom = direction[2] - a * direction[0] - b * direction[1]
    if abs(denom) < 1e-9:
        return None
    lam = (a * pt[0] + b * pt[1] + c - pt[2]) / denom
    if lam <= 1e-6:
        return None
    x = pt[0] + lam * direction[0]
    y = pt[1] + lam * direction[1]
    z = pt[2] + lam * direction[2]
    s, t = local_st(roof, x, y)
    if not point_in_poly(s, t, roof["poly"]):
        return None
    return lam, s, t, z


def ray_hits_window(
    pt: tuple[float, float, float],
    direction: tuple[float, float, float],
    windows_by_roof: dict[str, list[dict[str, float]]],
) -> tuple[bool, str | None]:
    hits = []
    for key, roof in (("east", EAST), ("west", WEST)):
        hit = intersect_roof(pt, direction, roof)
        if hit is not None:
            lam, s, t, z = hit
            hits.append((lam, key, s, t, z))
    if not hits:
        return False, None
    _, roof_key, s, t, _ = min(hits, key=lambda item: item[0])
    for rect in windows_by_roof.get(roof_key, []):
        if abs(s - rect["s"]) <= rect["w"] / 2 and abs(t - rect["t"]) <= rect["h"] / 2:
            return True, roof_key
    return False, roof_key


def solar_pos(day_of_year: int, hour_local: float) -> tuple[float, float]:
    gamma = 2 * math.pi / 365 * (day_of_year - 1 + (hour_local - 12) / 24)
    eqtime = 229.18 * (
        0.000075
        + 0.001868 * math.cos(gamma)
        - 0.032077 * math.sin(gamma)
        - 0.014615 * math.cos(2 * gamma)
        - 0.040849 * math.sin(2 * gamma)
    )
    decl = (
        0.006918
        - 0.399912 * math.cos(gamma)
        + 0.070257 * math.sin(gamma)
        - 0.006758 * math.cos(2 * gamma)
        + 0.000907 * math.sin(2 * gamma)
        - 0.002697 * math.cos(3 * gamma)
        + 0.00148 * math.sin(3 * gamma)
    )
    time_offset = eqtime + 4 * LON_DEG - 60 * TZ_OFFSET_H
    tst = hour_local * 60 + time_offset
    ha = math.radians(tst / 4 - 180)
    cos_zenith = math.sin(LAT_RAD) * math.sin(decl) + math.cos(LAT_RAD) * math.cos(decl) * math.cos(ha)
    cos_zenith = max(-1.0, min(1.0, cos_zenith))
    zenith = math.acos(cos_zenith)
    altitude = math.pi / 2 - zenith
    azimuth = math.atan2(
        math.sin(ha),
        math.cos(ha) * math.sin(LAT_RAD) - math.tan(decl) * math.cos(LAT_RAD),
    ) + math.pi
    return altitude, azimuth


def sun_dir(altitude: float, azimuth: float) -> tuple[float, float, float]:
    return (
        math.cos(altitude) * math.sin(azimuth),
        math.cos(altitude) * math.cos(azimuth),
        math.sin(altitude),
    )


def t_for_z(roof: dict[str, object], z_value: float) -> float:
    center = roof["center"]
    p0 = mod.point_from_axis(center, U, V, 0.0, 0.0, 0.0)
    p1 = mod.point_from_axis(center, U, V, 0.0, 1.0, 0.0)
    z0 = mod.plane_z(roof["plane"], p0.x, p0.y)
    z1 = mod.plane_z(roof["plane"], p1.x, p1.y)
    return (z_value - z0) / (z1 - z0)


def make_windows(side: str, count: int, t_center: float) -> list[dict[str, float]]:
    roof = WEST if side == "west" else EAST
    s_min = min(s for s, _ in roof["poly"]) + WINDOW_EDGE_MARGIN_M
    s_max = DORMER_S0 - WINDOW_EDGE_MARGIN_M
    if count == 1:
        centers = [(s_min + s_max) / 2]
    else:
        step = (s_max - s_min) / (count - 1)
        centers = [s_min + step * idx for idx in range(count)]
    return [{"s": s, "t": t_center, "w": mod.ROOF_WINDOW_WIDTH_M, "h": mod.ROOF_WINDOW_HEIGHT_M} for s in centers]


def build_workplane_points() -> list[tuple[float, float, float]]:
    s_min = max(min(s for s, _ in WEST["poly"]), min(s for s, _ in EAST["poly"])) + WORKPLANE_S_MARGIN_M
    s_max = min(max(s for s, _ in WEST["poly"]), max(s for s, _ in EAST["poly"])) - WORKPLANE_S_MARGIN_M
    west_t = t_for_z(WEST, WORKPLANE_Z) + WORKPLANE_T_MARGIN_M
    east_t = t_for_z(EAST, WORKPLANE_Z) - WORKPLANE_T_MARGIN_M
    pts = []
    for i in range(16):
        s = s_min + (s_max - s_min) * (i + 0.5) / 16
        for j in range(6):
            t = west_t + (east_t - west_t) * (j + 0.5) / 6
            pt = mod.point_from_axis(WEST["center"], U, V, s, t, 0.0)
            pts.append((pt.x, pt.y, WORKPLANE_Z))
    return pts


SAMPLE_TIMES = [
    (day, hour, *solar_pos(day, hour))
    for day in (21, 52, 80, 111, 141, 172, 203, 234, 266, 295, 325, 355)
    for hour in (8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 17.5)
    if solar_pos(day, hour)[0] > 0
]

SKY_DIRS = []
for alt_deg in (12, 24, 36, 48, 60, 72):
    alt = math.radians(alt_deg)
    for idx in range(12):
        az = 2 * math.pi * (idx + 0.5) / 12
        weight = max(math.sin(alt) * math.cos(alt), 0.0)
        SKY_DIRS.append((sun_dir(alt, az), weight))


def evaluate_layout(name: str, windows_by_roof: dict[str, list[dict[str, float]]]) -> dict[str, object]:
    points = build_workplane_points()
    lit_counts = []
    morning_hits = midday_hits = afternoon_hits = 0

    for pt in points:
        hit_total = 0
        for _, hour, alt, az in SAMPLE_TIMES:
            hit, _ = ray_hits_window(pt, sun_dir(alt, az), windows_by_roof)
            if not hit:
                continue
            hit_total += 1
            if hour < 11.5:
                morning_hits += 1
            elif hour > 14.5:
                afternoon_hits += 1
            else:
                midday_hits += 1
        lit_counts.append(hit_total)

    diffuse_scores = []
    for pt in points:
        visible = 0.0
        total = 0.0
        for direction, weight in SKY_DIRS:
            hit, _ = ray_hits_window(pt, direction, windows_by_roof)
            total += weight
            if hit:
                visible += weight
        diffuse_scores.append(visible / total if total else 0.0)

    total_slots = len(points) * len(SAMPLE_TIMES)
    direct_pct = 100 * sum(lit_counts) / total_slots
    diffuse_pct = 100 * mean(diffuse_scores)
    uniformity = 1 - (max(lit_counts) - min(lit_counts)) / max(1, max(lit_counts))
    balance = min(morning_hits, afternoon_hits) / max(morning_hits, afternoon_hits) if max(morning_hits, afternoon_hits) else 0.0

    return {
        "name": name,
        "windowCount": sum(len(items) for items in windows_by_roof.values()),
        "positions": windows_by_roof,
        "directSunPct": round(direct_pct, 2),
        "diffuseSkyPct": round(diffuse_pct, 2),
        "uniformity": round(uniformity, 3),
        "balance": round(balance, 3),
        "morningHits": morning_hits,
        "middayHits": midday_hits,
        "afternoonHits": afternoon_hits,
        "avgLitSamplesPerPoint": round(mean(lit_counts), 2),
    }


def main() -> None:
    layouts = {
        "west2": {"west": make_windows("west", 2, 1.05)},
        "east2": {"east": make_windows("east", 2, -1.55)},
        "dual4": {"west": make_windows("west", 2, 1.05), "east": make_windows("east", 2, -1.55)},
        "dual6": {"west": make_windows("west", 3, 1.05), "east": make_windows("east", 3, -1.55)},
    }
    for name, windows in layouts.items():
        print(evaluate_layout(name, windows))


if __name__ == "__main__":
    main()
