#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import re
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from project_config import load_project_config

CFG = load_project_config(ROOT)
GEOMETRY_TS = ROOT / "src/features/building-hull-import/generated/lod2CandidateGeometry.ts"
BASELINE_IFC = ROOT / "dist/generated/hauskompass_lod2_baseline.ifc"
PUBLIC_IFC = ROOT / "public/generated/hauskompass_lod2_baseline.ifc"
OUTPUT_IFC = ROOT / "output/hauskompass_lod2_baseline.ifc"

MAP_E = CFG["targetEasting"]
MAP_N = CFG["targetNorthing"]
MAP_Z = CFG["mapElevationM"]

PART1_STOREY_ID = 20
PART1_PLACEMENT_ID = 31
BODY_SUBCONTEXT_ID = 11

PART1_ID = CFG["confirmedLod2Ids"][0]
PART1_EAST_ROOF_ID = CFG["ifc"]["part1RoofSurfaceIds"]["eastMain"]
PART1_WEST_ROOF_ID = CFG["ifc"]["part1RoofSurfaceIds"]["westMain"]
PART1_ERKER_ROOF_ID = CFG["ifc"]["part1RoofSurfaceIds"]["erker"]
PART2_ID = CFG["confirmedLod2Ids"][1]
PART2_WEST_LOW1_ROOF_ID = CFG["ifc"]["part2RoofSurfaceIds"]["westLow1"]
PART2_WEST_LOW2_ROOF_ID = CFG["ifc"]["part2RoofSurfaceIds"]["westLow2"]
PART2_WEST_ROOF_ID = CFG["ifc"]["part2RoofSurfaceIds"]["westMain"]
PART2_EAST_ROOF_ID = CFG["ifc"]["part2RoofSurfaceIds"]["eastMain"]
DORMER_LENGTH_M = 10.0
ROOF_FRONT_OVERHANG_M = 0.35
ROOF_SIDE_OVERHANG_M = 0.18
GLOBAL_ROOF_OVERHANG_PLAN_M = 0.42
ROOF_HEAL_POINT_TOL_M = 0.08
ROOF_HEAL_COLLINEAR_TOL_M2 = 0.015
ROOF_OFFSET_PARALLEL_TOL = 1e-6
ROOF_RIDGE_Z_TOL_M = 0.12
PART1_GROUND_Z = 517.64
EAST_OVERHANG_FRONT_T = 2.20
EAST_OVERHANG_BACK_T = 1.10
EAST_OVERHANG_S0 = -3.65
EAST_OVERHANG_S1 = 8.15
EAST_OVERHANG_SUPPORT_HALF_WIDTH_M = 0.07


@dataclass(frozen=True)
class Point3:
    x: float
    y: float
    z: float

    def with_z(self, z: float) -> "Point3":
        return Point3(self.x, self.y, z)


@dataclass(frozen=True)
class Point2:
    x: float
    y: float


class IfcAppender:
    def __init__(self, start_id: int) -> None:
        self.next_id = start_id + 1
        self.lines: list[str] = []

    def new(self, entity: str) -> int:
        eid = self.next_id
        self.next_id += 1
        self.lines.append(f"#{eid}={entity};")
        return eid


def ifc_guid() -> str:
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$"
    value = uuid.uuid4().int
    out = []
    for _ in range(22):
        value, idx = divmod(value, 64)
        out.append(chars[idx])
    return "".join(reversed(out))


def fmt(v: float) -> str:
    text = f"{v:.6f}".rstrip("0").rstrip(".")
    if "." not in text:
        text += "."
    if text == "-0.":
        return "0."
    return text


def local_point(pt: Point3) -> Point3:
    return Point3(pt.x - MAP_E, pt.y - MAP_N, pt.z - MAP_Z)


def parse_surface_points(candidate_id: str, surface_id: str) -> list[Point3]:
    text = GEOMETRY_TS.read_text(encoding="utf-8")
    candidate_pattern = rf'"id": "{re.escape(candidate_id)}".*?"surfaces": \{{(.*?)\n\s*\}}\n\s*\}}'
    candidate_match = re.search(candidate_pattern, text, re.S)
    if not candidate_match:
        raise ValueError(f"Candidate {candidate_id} not found")
    surface_pattern = rf'"id": "{re.escape(surface_id)}".*?"points": \[(.*?)\]\s*\}}'
    surface_match = re.search(surface_pattern, candidate_match.group(1), re.S)
    if not surface_match:
        raise ValueError(f"Surface {surface_id} not found")
    return [
        Point3(float(e), float(n), float(z))
        for e, n, z in re.findall(r'"e": ([0-9.]+),\s*"n": ([0-9.]+),\s*"z": ([0-9.]+)', surface_match.group(1))
    ]


def fit_plane(points: list[Point3]) -> tuple[float, float, float]:
    p1 = points[0]
    nx = ny = nz = 0.0
    found = False
    for i in range(1, len(points) - 1):
        for j in range(i + 1, len(points)):
            p2 = points[i]
            p3 = points[j]
            v1 = (p2.x - p1.x, p2.y - p1.y, p2.z - p1.z)
            v2 = (p3.x - p1.x, p3.y - p1.y, p3.z - p1.z)
            nx = v1[1] * v2[2] - v1[2] * v2[1]
            ny = v1[2] * v2[0] - v1[0] * v2[2]
            nz = v1[0] * v2[1] - v1[1] * v2[0]
            if abs(nz) > 1e-9:
                found = True
                break
        if found:
            break
    if not found:
        raise ValueError("Roof plane is vertical or degenerate")
    a = -nx / nz
    b = -ny / nz
    c = p1.z - a * p1.x - b * p1.y
    return a, b, c


def plane_z(plane: tuple[float, float, float], x: float, y: float) -> float:
    a, b, c = plane
    return a * x + b * y + c


def principal_axis(points: list[Point3]) -> tuple[Point2, Point2, Point2, tuple[float, float], tuple[float, float]]:
    azimuth_deg = 26.4
    az = math.radians(azimuth_deg)
    ux, uy = math.sin(az), math.cos(az)
    vx, vy = math.sin(az + math.pi / 2), math.cos(az + math.pi / 2)
    cx = sum(p.x for p in points) / len(points)
    cy = sum(p.y for p in points) / len(points)
    s_vals = [(p.x - cx) * ux + (p.y - cy) * uy for p in points]
    return Point2(cx, cy), Point2(ux, uy), Point2(vx, vy), (min(s_vals), max(s_vals)), (ux, uy)


def point_from_axis(center: Point2, u: Point2, v: Point2, s: float, t: float, z: float) -> Point3:
    return Point3(center.x + s * u.x + t * v.x, center.y + s * u.y + t * v.y, z)


def heal_planar_ring(points: list[Point3]) -> list[Point3]:
    if len(points) <= 3:
        return points

    deduped: list[Point3] = []
    for pt in points:
        if not deduped:
            deduped.append(pt)
            continue
        prev = deduped[-1]
        if math.hypot(pt.x - prev.x, pt.y - prev.y) < ROOF_HEAL_POINT_TOL_M:
            continue
        deduped.append(pt)

    if len(deduped) > 2 and math.hypot(deduped[0].x - deduped[-1].x, deduped[0].y - deduped[-1].y) < ROOF_HEAL_POINT_TOL_M:
        deduped.pop()

    if len(deduped) <= 3:
        return deduped

    healed: list[Point3] = []
    count = len(deduped)
    for idx, curr in enumerate(deduped):
        prev = deduped[idx - 1]
        nxt = deduped[(idx + 1) % count]
        area2 = abs((curr.x - prev.x) * (nxt.y - prev.y) - (curr.y - prev.y) * (nxt.x - prev.x))
        if area2 < ROOF_HEAL_COLLINEAR_TOL_M2:
            continue
        healed.append(curr)

    return healed if len(healed) >= 3 else deduped


def polygon_signed_area_xy(points: list[Point3]) -> float:
    area = 0.0
    for idx, pt in enumerate(points):
        nxt = points[(idx + 1) % len(points)]
        area += pt.x * nxt.y - nxt.x * pt.y
    return 0.5 * area


def intersect_lines_xy(
    p1: tuple[float, float],
    d1: tuple[float, float],
    p2: tuple[float, float],
    d2: tuple[float, float],
) -> tuple[float, float] | None:
    det = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(det) < ROOF_OFFSET_PARALLEL_TOL:
        return None
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    t = (dx * d2[1] - dy * d2[0]) / det
    return p1[0] + t * d1[0], p1[1] + t * d1[1]


def ring_has_self_intersection_xy(points: list[Point3]) -> bool:
    if len(points) < 4:
        return False

    def orient(a: Point3, b: Point3, c: Point3) -> float:
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

    for i in range(len(points)):
        a = points[i]
        b = points[(i + 1) % len(points)]
        for j in range(i + 1, len(points)):
            if abs(i - j) <= 1 or (i == 0 and j == len(points) - 1):
                continue
            c = points[j]
            d = points[(j + 1) % len(points)]
            o1 = orient(a, b, c)
            o2 = orient(a, b, d)
            o3 = orient(c, d, a)
            o4 = orient(c, d, b)
            if o1 * o2 < 0 and o3 * o4 < 0:
                return True
    return False


def ridge_locked_edge_offsets(points: list[Point3], overhang_m: float) -> list[float]:
    max_z = max(p.z for p in points)
    offsets: list[float] = []
    for idx, pt in enumerate(points):
        nxt = points[(idx + 1) % len(points)]
        is_ridge_edge = abs(pt.z - max_z) <= ROOF_RIDGE_Z_TOL_M and abs(nxt.z - max_z) <= ROOF_RIDGE_Z_TOL_M
        offsets.append(0.0 if is_ridge_edge else overhang_m)
    return offsets


def offset_polygon_xy(
    points: list[Point3],
    offset_m: float,
    plane: tuple[float, float, float],
    edge_offsets: list[float] | None = None,
) -> list[Point3] | None:
    if len(points) < 3:
        return None

    ccw = polygon_signed_area_xy(points) > 0
    offset_points: list[Point3] = []
    count = len(points)
    offsets = edge_offsets if edge_offsets is not None else [offset_m] * count
    if len(offsets) != count:
        return None
    for idx, curr in enumerate(points):
        prev = points[idx - 1]
        nxt = points[(idx + 1) % count]
        prev_offset = offsets[idx - 1]
        next_offset = offsets[idx]

        e_prev = (curr.x - prev.x, curr.y - prev.y)
        e_next = (nxt.x - curr.x, nxt.y - curr.y)
        len_prev = math.hypot(*e_prev)
        len_next = math.hypot(*e_next)
        if len_prev < ROOF_HEAL_POINT_TOL_M or len_next < ROOF_HEAL_POINT_TOL_M:
            return None

        d_prev = (e_prev[0] / len_prev, e_prev[1] / len_prev)
        d_next = (e_next[0] / len_next, e_next[1] / len_next)

        if ccw:
            n_prev = (d_prev[1], -d_prev[0])
            n_next = (d_next[1], -d_next[0])
        else:
            n_prev = (-d_prev[1], d_prev[0])
            n_next = (-d_next[1], d_next[0])

        p_prev = (prev.x + n_prev[0] * prev_offset, prev.y + n_prev[1] * prev_offset)
        p_curr_prev = (curr.x + n_prev[0] * prev_offset, curr.y + n_prev[1] * prev_offset)
        p_curr_next = (curr.x + n_next[0] * next_offset, curr.y + n_next[1] * next_offset)

        intersection = intersect_lines_xy(p_prev, d_prev, p_curr_next, d_next)
        if intersection is None:
            intersection = (
                0.5 * (p_curr_prev[0] + p_curr_next[0]),
                0.5 * (p_curr_prev[1] + p_curr_next[1]),
            )

        x, y = intersection
        offset_points.append(Point3(x, y, plane_z(plane, x, y)))

    healed = heal_planar_ring(offset_points)
    if len(healed) < 3 or ring_has_self_intersection_xy(healed):
        return None
    return healed


def expand_roof_polygon(points: list[Point3], overhang_m: float) -> list[Point3]:
    clean_points = heal_planar_ring(points)
    plane = fit_plane(clean_points)
    edge_offsets = ridge_locked_edge_offsets(clean_points, overhang_m)
    offset_ring = offset_polygon_xy(clean_points, overhang_m, plane, edge_offsets)
    if offset_ring is not None:
        return offset_ring

    cx = sum(p.x for p in clean_points) / len(clean_points)
    cy = sum(p.y for p in clean_points) / len(clean_points)
    expanded: list[Point3] = []
    for p in clean_points:
        dx = p.x - cx
        dy = p.y - cy
        length = math.hypot(dx, dy)
        if length < 1e-9:
            nx = ny = 0.0
        else:
            nx = dx / length
            ny = dy / length
        x = p.x + nx * overhang_m
        y = p.y + ny * overhang_m
        expanded.append(Point3(x, y, plane_z(plane, x, y)))
    return heal_planar_ring(expanded)


def build_stage_roof_overhangs() -> dict[str, list[Point3]]:
    roof_defs = [
        ("PART1_MAIN_EAST", PART1_ID, PART1_EAST_ROOF_ID),
        ("PART1_MAIN_WEST", PART1_ID, PART1_WEST_ROOF_ID),
        ("PART1_ERKER_EAST", PART1_ID, PART1_ERKER_ROOF_ID),
        ("PART2_MAIN_EAST", PART2_ID, PART2_EAST_ROOF_ID),
        ("PART2_MAIN_WEST", PART2_ID, PART2_WEST_ROOF_ID),
        ("PART2_LOW_WEST_1", PART2_ID, PART2_WEST_LOW1_ROOF_ID),
        ("PART2_LOW_WEST_2", PART2_ID, PART2_WEST_LOW2_ROOF_ID),
    ]
    return {
        f"ROOF_OVERHANG_STAGE_{name}": expand_roof_polygon(
            parse_surface_points(candidate_id, surface_id),
            GLOBAL_ROOF_OVERHANG_PLAN_M,
        )
        for name, candidate_id, surface_id in roof_defs
    }


def build_stage_east_overhang() -> dict[str, list[Point3]]:
    roof_pts = parse_surface_points(PART1_ID, PART1_EAST_ROOF_ID)
    plane = fit_plane(roof_pts)
    center = Point2(
        sum(p.x for p in roof_pts) / len(roof_pts),
        sum(p.y for p in roof_pts) / len(roof_pts),
    )
    u = Point2(math.sin(math.radians(26.4)), math.cos(math.radians(26.4)))
    v = Point2(math.sin(math.radians(26.4) + math.pi / 2), math.cos(math.radians(26.4) + math.pi / 2))

    back_left = point_from_axis(center, u, v, EAST_OVERHANG_S0, EAST_OVERHANG_BACK_T, 0.0)
    back_right = point_from_axis(center, u, v, EAST_OVERHANG_S1, EAST_OVERHANG_BACK_T, 0.0)
    front_left = point_from_axis(center, u, v, EAST_OVERHANG_S0, EAST_OVERHANG_FRONT_T, 0.0)
    front_right = point_from_axis(center, u, v, EAST_OVERHANG_S1, EAST_OVERHANG_FRONT_T, 0.0)

    back_left = back_left.with_z(plane_z(plane, back_left.x, back_left.y))
    back_right = back_right.with_z(plane_z(plane, back_right.x, back_right.y))
    front_left = front_left.with_z(plane_z(plane, front_left.x, front_left.y))
    front_right = front_right.with_z(plane_z(plane, front_right.x, front_right.y))

    supports: dict[str, list[Point3]] = {}
    for idx, s in enumerate((-2.6, 1.0, 4.6, 7.6), start=1):
        support_top_left = point_from_axis(center, u, v, s - EAST_OVERHANG_SUPPORT_HALF_WIDTH_M, EAST_OVERHANG_FRONT_T, 0.0)
        support_top_right = point_from_axis(center, u, v, s + EAST_OVERHANG_SUPPORT_HALF_WIDTH_M, EAST_OVERHANG_FRONT_T, 0.0)
        support_top_left = support_top_left.with_z(plane_z(plane, support_top_left.x, support_top_left.y) - 0.02)
        support_top_right = support_top_right.with_z(plane_z(plane, support_top_right.x, support_top_right.y) - 0.02)
        support_bottom_right = support_top_right.with_z(PART1_GROUND_Z)
        support_bottom_left = support_top_left.with_z(PART1_GROUND_Z)
        supports[f"OVERHANG_STAGE_EAST_SUPPORT_{idx}"] = [
            support_bottom_left,
            support_bottom_right,
            support_top_right,
            support_top_left,
        ]

    return {
        "OVERHANG_STAGE_EAST_ROOF": [front_left, front_right, back_right, back_left],
        **supports,
    }


def build_dormer_surfaces() -> dict[str, list[Point3]]:
    roof_pts = parse_surface_points(PART1_ID, PART1_WEST_ROOF_ID)
    plane = fit_plane(roof_pts)
    part2_roof_pts = parse_surface_points(PART2_ID, PART2_WEST_ROOF_ID)
    part2_plane = fit_plane(part2_roof_pts)
    center = Point2(
        sum(p.x for p in roof_pts) / len(roof_pts),
        sum(p.y for p in roof_pts) / len(roof_pts),
    )
    u = Point2(math.sin(math.radians(26.4)), math.cos(math.radians(26.4)))
    v = Point2(math.sin(math.radians(26.4) + math.pi / 2), math.cos(math.radians(26.4) + math.pi / 2))
    s_vals = [(p.x - center.x) * u.x + (p.y - center.y) * u.y for p in roof_pts]
    t_vals = [(p.x - center.x) * v.x + (p.y - center.y) * v.y for p in roof_pts]
    min_s, max_s = min(s_vals), max(s_vals)
    min_t, max_t = min(t_vals), max(t_vals)
    # Flush one dormer cheek with the outer side edge of Part 1 and run the
    # 10 m segment back from there toward the Part 1 / Part 2 connection zone.
    s1 = max_s
    s0 = max(min_s, s1 - DORMER_LENGTH_M)

    # The dormer starts at the outer west eave / wall line of Part 1.
    # Its upper back edge is set onto the ridge line of Part 1 so it stays
    # parallel to the main roof ridge. The front eave line uses the adjoining
    # Part 2 roof height at the connection side as its constant closure level.
    t_front = min_t
    t_back = max_t

    front_left = point_from_axis(center, u, v, s0, t_front, 0.0)
    front_right = point_from_axis(center, u, v, s1, t_front, 0.0)
    back_left = point_from_axis(center, u, v, s0, t_back, 0.0)
    back_right = point_from_axis(center, u, v, s1, t_back, 0.0)

    front_left = front_left.with_z(plane_z(plane, front_left.x, front_left.y))
    front_right = front_right.with_z(plane_z(plane, front_right.x, front_right.y))
    ridge_z = max(p.z for p in roof_pts)

    front_eave_z = plane_z(part2_plane, front_right.x, front_right.y)
    front_top_left = front_left.with_z(front_eave_z)
    front_top_right = front_right.with_z(front_eave_z)
    back_top_left = back_left.with_z(ridge_z)
    back_top_right = back_right.with_z(ridge_z)

    roof_s0 = s0 - ROOF_SIDE_OVERHANG_M
    roof_s1 = s1 + ROOF_SIDE_OVERHANG_M
    roof_t_front = t_front - ROOF_FRONT_OVERHANG_M
    roof_rise_per_t = (ridge_z - front_eave_z) / (t_back - t_front)
    roof_front_z = front_eave_z - roof_rise_per_t * ROOF_FRONT_OVERHANG_M
    roof_front_left = point_from_axis(center, u, v, roof_s0, roof_t_front, 0.0).with_z(roof_front_z)
    roof_front_right = point_from_axis(center, u, v, roof_s1, roof_t_front, 0.0).with_z(roof_front_z)
    roof_back_left = point_from_axis(center, u, v, roof_s0, t_back, 0.0).with_z(ridge_z)
    roof_back_right = point_from_axis(center, u, v, roof_s1, t_back, 0.0).with_z(ridge_z)

    return {
        "GAUBE_STAGE_WEST_FRONT_WALL": [front_left, front_right, front_top_right, front_top_left],
        "GAUBE_STAGE_WEST_LEFT_CHEEK": [front_left, front_top_left, back_top_left],
        "GAUBE_STAGE_WEST_RIGHT_CHEEK": [front_right, back_top_right, front_top_right],
        "GAUBE_STAGE_WEST_ROOF": heal_planar_ring([roof_front_left, roof_front_right, roof_back_right, roof_back_left]),
    }


def add_surface_product(app: IfcAppender, product: str, name: str, placement_ref: int, points: list[Point3]) -> int:
    point_ids = [app.new(f"IFCCARTESIANPOINT(({fmt(p.x)},{fmt(p.y)},{fmt(p.z)}))") for p in points]
    loop_id = app.new(f"IFCPOLYLOOP(({','.join(f'#{pid}' for pid in point_ids)}))")
    bound_id = app.new(f"IFCFACEOUTERBOUND(#{loop_id},.T.)")
    face_id = app.new(f"IFCFACE((#{bound_id}))")
    shell_id = app.new(f"IFCCLOSEDSHELL((#{face_id}))")
    brep_id = app.new(f"IFCFACETEDBREP(#{shell_id})")
    shape_rep_id = app.new(f"IFCSHAPEREPRESENTATION(#{BODY_SUBCONTEXT_ID},'Body','Brep',(#${brep_id}))".replace("#$", "#"))
    prod_shape_id = app.new(f"IFCPRODUCTDEFINITIONSHAPE($,$,(#{shape_rep_id}))")
    axis_point_id = app.new("IFCCARTESIANPOINT((0.,0.,0.))")
    axis_z_id = app.new("IFCDIRECTION((0.,0.,1.))")
    axis_x_id = app.new("IFCDIRECTION((1.,0.,0.))")
    axis_id = app.new(f"IFCAXIS2PLACEMENT3D(#{axis_point_id},#{axis_z_id},#{axis_x_id})")
    local_placement_id = app.new(f"IFCLOCALPLACEMENT(#{placement_ref},#{axis_id})")
    return app.new(f"{product}('{ifc_guid()}',$,'{name}',$,$,#{local_placement_id},#{prod_shape_id},$,$)")


def inject_entities(base_ifc: str, entities: list[str]) -> str:
    stage_ids = re.findall(r"^#(\d+)=.*(?:GAUBE_STAGE_|_STAGE_).*$", base_ifc, re.M)
    if stage_ids:
        stage_refs = tuple(f"#{sid}" for sid in stage_ids)
        kept_lines: list[str] = []
        for line in base_ifc.splitlines():
            if "GAUBE_STAGE_" in line or "_STAGE_" in line:
                continue
            if "IFCRELCONTAINEDINSPATIALSTRUCTURE" in line and any(ref in line for ref in stage_refs):
                continue
            kept_lines.append(line)
        base_ifc = "\n".join(kept_lines) + "\n"
    marker = "ENDSEC;"
    pos = base_ifc.rfind(marker)
    if pos == -1:
        raise ValueError("IFC DATA ENDSEC not found")
    return base_ifc[:pos] + "\n".join(entities) + "\n" + base_ifc[pos:]


def main() -> None:
    if not BASELINE_IFC.exists():
        raise FileNotFoundError(f"Baseline IFC missing: {BASELINE_IFC}")

    base_ifc = BASELINE_IFC.read_text(encoding="utf-8")
    max_id = max(int(m) for m in re.findall(r"#(\d+)=", base_ifc))

    dormer = build_dormer_surfaces()
    roof_overhangs = build_stage_roof_overhangs()
    east_overhang = build_stage_east_overhang()
    app = IfcAppender(max_id)

    front_id = add_surface_product(
        app,
        "IFCWALL",
        "GAUBE_STAGE_WEST_FRONT_WALL",
        PART1_PLACEMENT_ID,
        [local_point(p) for p in dormer["GAUBE_STAGE_WEST_FRONT_WALL"]],
    )
    left_id = add_surface_product(
        app,
        "IFCWALL",
        "GAUBE_STAGE_WEST_LEFT_CHEEK",
        PART1_PLACEMENT_ID,
        [local_point(p) for p in dormer["GAUBE_STAGE_WEST_LEFT_CHEEK"]],
    )
    right_id = add_surface_product(
        app,
        "IFCWALL",
        "GAUBE_STAGE_WEST_RIGHT_CHEEK",
        PART1_PLACEMENT_ID,
        [local_point(p) for p in dormer["GAUBE_STAGE_WEST_RIGHT_CHEEK"]],
    )
    roof_id = add_surface_product(
        app,
        "IFCROOF",
        "GAUBE_STAGE_WEST_ROOF",
        PART1_PLACEMENT_ID,
        [local_point(p) for p in dormer["GAUBE_STAGE_WEST_ROOF"]],
    )

    east_overhang_roof_id = add_surface_product(
        app,
        "IFCROOF",
        "OVERHANG_STAGE_EAST_ROOF",
        PART1_PLACEMENT_ID,
        [local_point(p) for p in east_overhang["OVERHANG_STAGE_EAST_ROOF"]],
    )
    support_ids = [
        add_surface_product(
            app,
            "IFCWALL",
            name,
            PART1_PLACEMENT_ID,
            [local_point(p) for p in points],
        )
        for name, points in east_overhang.items()
        if name != "OVERHANG_STAGE_EAST_ROOF"
    ]
    roof_overhang_ids = [
        add_surface_product(
            app,
            "IFCROOF",
            name,
            PART1_PLACEMENT_ID,
            [local_point(p) for p in points],
        )
        for name, points in roof_overhangs.items()
    ]

    app.new(
        f"IFCRELCONTAINEDINSPATIALSTRUCTURE('{ifc_guid()}',$,$,$,("
        f"#{front_id},#{left_id},#{right_id},#{roof_id},#{east_overhang_roof_id}"
        + "".join(f",#{eid}" for eid in support_ids + roof_overhang_ids)
        + f"),#{PART1_STOREY_ID})"
    )

    final_ifc = inject_entities(base_ifc, app.lines)
    PUBLIC_IFC.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_IFC.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_IFC.write_text(final_ifc, encoding="utf-8")
    OUTPUT_IFC.write_text(final_ifc, encoding="utf-8")

    front = dormer["GAUBE_STAGE_WEST_FRONT_WALL"]
    dormer_len = math.hypot(front[1].x - front[0].x, front[1].y - front[0].y)
    print(f"wrote {PUBLIC_IFC.relative_to(ROOT)} and {OUTPUT_IFC.relative_to(ROOT)}")
    print(f"dormer front length ≈ {dormer_len:.2f} m")
    print(
        "dormer eave height ≈ "
        f"{front[3].z:.2f}–{front[2].z:.2f} m absolute"
    )
    roof = dormer["GAUBE_STAGE_WEST_ROOF"]
    depth_left = math.hypot(roof[3].x - roof[0].x, roof[3].y - roof[0].y)
    depth_right = math.hypot(roof[2].x - roof[1].x, roof[2].y - roof[1].y)
    print(f"dormer depth ≈ {depth_left:.2f}–{depth_right:.2f} m")
    rise = roof[3].z - roof[0].z
    pitch = math.degrees(math.atan2(rise, depth_left)) if depth_left > 1e-6 else 0.0
    print(f"dormer roof pitch ≈ {pitch:.1f}°")


if __name__ == "__main__":
    main()
