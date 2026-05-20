#!/usr/bin/env python3
"""
gml_to_zone_geojson.py — Konvertiert CityGML LoD2-Gebäudegrundrisse in GeoJSON
und ordnet optionale Fotos (per GPS-EXIF) den nächsten Gebäuden zu.

Verwendung:
    python3 utils/py/spatial/gml_to_zone_geojson.py
    python3 utils/py/spatial/gml_to_zone_geojson.py --photo-dir /path/to/photos
    python3 utils/py/spatial/gml_to_zone_geojson.py --radius 400 --out output/zones.geojson

Ergebnis:
    - examples/workshop/zone_geometry.json  (wird überschrieben)
    - Konsolen-Ausgabe: Foto → nächstes GML-Gebäude → Zone
"""

import argparse
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[3]
GML_DIR = ROOT / "cache/lgl-bw/lod2"   # alle Tiles (*.gml) werden durchsucht
GML_PATH = ROOT / "cache/lgl-bw/lod2/LoD2_32_505_5397_1_BW.gml"  # legacy fallback
ZONE_JSON_OUT = ROOT / "examples/workshop/zone_geometry.json"

NS_BLDG = "http://www.opengis.net/citygml/building/1.0"
NS_GML = "http://www.opengis.net/gml"

# Campus-Zentrum aus echten EXIF-GPS-Daten kalibriert (April 2026)
CAMPUS_CENTER = {"lat": 48.726961, "lon": 9.075894}

# ---------------------------------------------------------------------------
# Bekannte Zone-IDs → Zuordnung zu GML-Gebäude-IDs (manuell nach Analyse)
# Wird automatisch ergänzt wenn --match-zones läuft
# ---------------------------------------------------------------------------

# Mapping: GML building ID → zone ID (aus seedLoader.ts)
# Bestätigt durch EXIF-GPS-Analyse von Wikimedia-Fotos + manuelle Geländekenntnis.
GML_TO_ZONE: dict[str, str] = {
    # ── Bestätigte Zuordnungen ──────────────────────────────────────────
    "DEBW_5221000Qivp": "z-kantine-gemeinschaft",  # Kantine (westlichstes Geb., 69×60m) ✅
    "DEBW_5221000Qlay": "z-nucos-gebaeude",         # Pavillon 4 = einziges beheiztes Bürogebäude (NuCOS) ✅
    # ── Pavillons 1–3: leer, denkmalgeschützt ──────────────────────────────
    "DEBW_5221000QjrU": "z-pavillon-1",  # Pavillon 1 (W 180m, 81×81m) ✅
    "DEBW_5221000Qj0P": "z-pavillon-2",  # Pavillon 2 (SW 217m, 81×81m) ✅
    "DEBW_5221000QjN0": "z-pavillon-3",  # Pavillon 3 (SW 132m, 81×81m) ✅
}

# ---------------------------------------------------------------------------
# Geo-Hilfsfunktionen
# ---------------------------------------------------------------------------

def utm32_to_wgs84(E: float, N: float) -> tuple[float, float]:
    """
    UTM Zone 32N (ETRS89) → WGS84 decimal degrees.
    Genauigkeit ~1m für Baden-Württemberg.
    """
    a = 6378137.0
    e2 = 0.00669438
    k0 = 0.9996
    lon0 = math.radians(9.0)

    x = E - 500_000
    y = N

    M = y / k0
    mu = M / (a * (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))

    phi = (mu
           + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
           + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
           + (151 * e1**3 / 96) * math.sin(6 * mu))

    N1 = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    T1 = math.tan(phi) ** 2
    C1 = e2 / (1 - e2) * math.cos(phi) ** 2
    R1 = a * (1 - e2) / (1 - e2 * math.sin(phi) ** 2) ** 1.5
    D = x / (N1 * k0)

    lat = phi - (N1 * math.tan(phi) / R1) * (
        D**2 / 2
        - (5 + 3 * T1 + 10 * C1 - 4 * C1**2 - 9 * e2 / (1 - e2)) * D**4 / 24
        + (61 + 90 * T1 + 298 * C1 + 45 * T1**2 - 252 * e2 / (1 - e2) - 3 * C1**2) * D**6 / 720
    )
    lon = lon0 + (
        D
        - (1 + 2 * T1 + C1) * D**3 / 6
        + (5 - 2 * C1 + 28 * T1 - 3 * C1**2 + 8 * e2 / (1 - e2) + 24 * T1**2) * D**5 / 120
    ) / math.cos(phi)

    return math.degrees(lat), math.degrees(lon)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def convex_hull_2d(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Andrew's monotone chain convex hull."""
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[tuple[float, float]] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper: list[tuple[float, float]] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]


def polygon_centroid(coords: list[tuple[float, float]]) -> tuple[float, float]:
    n = len(coords)
    return sum(c[0] for c in coords) / n, sum(c[1] for c in coords) / n


def polygon_area_m2(pts_wgs: list[tuple[float, float]], ref_lat: float, ref_lon: float) -> float:
    """Schätzung der Grundfläche in m² via konvexer Hülle + Shoelace."""
    cos_lat = math.cos(math.radians(ref_lat))
    # Projektion WGS84 → lokale Meter (lon, lat → x, y)
    pts_m = [
        ((lo - ref_lon) * 111_320 * cos_lat, (la - ref_lat) * 111_320)
        for la, lo in pts_wgs
    ]
    hull = convex_hull_2d(pts_m)  # type: ignore[arg-type]  # convex_hull_2d defined below
    n = len(hull)
    if n < 3:
        return 0.0
    area = sum(
        hull[i][0] * hull[(i + 1) % n][1] - hull[(i + 1) % n][0] * hull[i][1]
        for i in range(n)
    )
    return abs(area) / 2


def cardinal_direction(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> str:
    """Himmelsrichtung (8 Richtungen) vom Ausgangspunkt zum Zielpunkt."""
    dy = (to_lat - from_lat) * 111_320
    dx = (to_lon - from_lon) * 111_320 * math.cos(math.radians(from_lat))
    bearing = math.degrees(math.atan2(dx, dy)) % 360
    dirs = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
    idx = round(bearing / 45) % 8
    return dirs[idx]


def building_label(b: dict) -> str:
    """Sprechender Name aus Richtung, Distanz und Grundfläche."""
    direction = cardinal_direction(
        CAMPUS_CENTER["lat"], CAMPUS_CENTER["lon"],
        b["centroid_lat"], b["centroid_lon"],
    )
    area = b.get("area_m2", 0)
    if area >= 3000:
        size = "Großes Gebäude"
    elif area >= 800:
        size = "Mittleres Gebäude"
    else:
        size = "Kleines Gebäude"
    return f"{size} {direction} ({b['dist_m']:.0f} m, ~{area:.0f} m²)"




# ---------------------------------------------------------------------------
# GML parsen
# ---------------------------------------------------------------------------

def parse_gml_buildings(gml_path: Path, radius_m: float) -> list[dict]:
    """
    Liest alle Building-Elemente aus dem GML, konvertiert Grundriss-Koordinaten
    von UTM32N nach WGS84 und filtert nach Abstand zum Campus.
    """
    tree = ET.parse(gml_path)
    root = tree.getroot()

    buildings = []
    for b in root.findall(f".//{{{NS_BLDG}}}Building"):
        pts_wgs: list[tuple[float, float]] = []

        # Sammle alle 3D-Punkte aus posList-Elementen (LoD2-Flächen)
        for pl in b.findall(f".//{{{NS_GML}}}posList"):
            raw = pl.text.strip().split()
            vals = [float(v) for v in raw]
            for i in range(0, len(vals) - 2, 3):
                E, N = vals[i], vals[i + 1]
                la, lo = utm32_to_wgs84(E, N)
                pts_wgs.append((la, lo))

        if not pts_wgs:
            continue

        clat, clon = polygon_centroid(pts_wgs)
        dist = haversine_m(CAMPUS_CENTER["lat"], CAMPUS_CENTER["lon"], clat, clon)

        if dist > radius_m:
            continue

        bid = b.get(f"{{{NS_GML}}}id", "unknown")
        area = polygon_area_m2(pts_wgs, clat, clon)
        buildings.append({
            "id": bid,
            "centroid_lat": clat,
            "centroid_lon": clon,
            "dist_m": dist,
            "pts_wgs": pts_wgs,
            "n_pts": len(pts_wgs),
            "area_m2": area,
        })

    buildings.sort(key=lambda x: x["dist_m"])
    return buildings


# ---------------------------------------------------------------------------
# GeoJSON bauen
# ---------------------------------------------------------------------------

def buildings_to_geojson(buildings: list[dict], zone_id_map: dict[str, str]) -> dict:
    """
    Erstellt eine GeoJSON FeatureCollection.
    Nur Gebäude mit einer bestätigten Zone-ID (aus GML_TO_ZONE) werden ausgegeben.
    Nicht gemappte Gebäude sind im Inspection-GeoJSON sichtbar, aber nicht hier.
    """
    features = []
    for b in buildings:
        zone_id = zone_id_map.get(b["id"])
        if not zone_id:
            continue  # Nur bestätigte Zonen ausgeben

        # Projiziere Grundriss-Punkte auf 2D-Konvexhülle (lon, lat für GeoJSON)
        pts_2d = [(lo, la) for la, lo in b["pts_wgs"]]
        hull = convex_hull_2d(pts_2d)
        if len(hull) < 3:
            continue
        hull_closed = hull + [hull[0]]
        label = building_label(b)

        features.append({
            "type": "Feature",
            "properties": {
                "zoneId": zone_id,
                "gmlId": b["id"],
                "name": label,
                "centroid_lat": round(b["centroid_lat"], 7),
                "centroid_lon": round(b["centroid_lon"], 7),
                "dist_m": round(b["dist_m"]),
                "area_m2": round(b.get("area_m2", 0)),
                "source": "lgl-bw-lod2",
                "accuracy": "gml-footprint",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[round(c[0], 7), round(c[1], 7)] for c in hull_closed]],
            },
        })

    return {"type": "FeatureCollection", "features": features}


def buildings_to_inspect_geojson(buildings: list[dict], zone_id_map: dict[str, str]) -> dict:
    """
    Erzeugt eine Inspektion-GeoJSON mit Point-Markern (für geojson.io).
    Jeder Marker trägt den sprechenden Namen, GML-ID und aktuelle/gewünschte Zone-ID.
    So kann der Nutzer visuell zuordnen: "Großes Gebäude NW = Parkdeck 1"
    """
    features = []
    for b in buildings:
        zone_id = zone_id_map.get(b["id"], "→ HIER ZONE-ID EINTRAGEN")
        label = building_label(b)
        features.append({
            "type": "Feature",
            "properties": {
                "name": label,
                "gmlId": b["id"],
                "zoneId": zone_id,
                "area_m2": round(b.get("area_m2", 0)),
                "dist_m": round(b["dist_m"]),
                "marker-color": "#e65100",
                "marker-size": "medium",
            },
            "geometry": {
                "type": "Point",
                "coordinates": [round(b["centroid_lon"], 7), round(b["centroid_lat"], 7)],
            },
        })
    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# EXIF GPS aus Fotos lesen (optional, Pillow)
# ---------------------------------------------------------------------------

def read_photo_gps(photo_dir: Path) -> list[dict]:
    """Liest EXIF-GPS aus allen JPEG-Dateien im Verzeichnis."""
    results = []
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
    except ImportError:
        print("  [WARN] Pillow nicht installiert — überspringe Foto-GPS-Analyse", file=sys.stderr)
        return results

    def dms_to_dec(dms, ref):
        d, m, s = dms
        dec = float(d) + float(m) / 60 + float(s) / 3600
        if ref in ("S", "W"):
            dec = -dec
        return dec

    for f in sorted(photo_dir.glob("*.JPEG")) + sorted(photo_dir.glob("*.jpeg")) + sorted(photo_dir.glob("*.jpg")) + sorted(photo_dir.glob("*.JPG")):
        try:
            img = Image.open(f)
            exif_raw = img._getexif()
            if not exif_raw:
                continue
            gps_info: dict = {}
            date_str = None
            for tag_id, val in exif_raw.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    for g_id, g_val in val.items():
                        gps_info[GPSTAGS.get(g_id, g_id)] = g_val
                elif tag in ("DateTimeOriginal", "DateTime"):
                    date_str = val
            if "GPSLatitude" not in gps_info:
                continue
            lat = dms_to_dec(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
            lon = dms_to_dec(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E"))
            alt = float(gps_info["GPSAltitude"]) if "GPSAltitude" in gps_info else None
            results.append({"file": f.name, "lat": lat, "lon": lon, "alt": alt, "date": date_str})
        except Exception as e:
            print(f"  [WARN] {f.name}: {e}", file=sys.stderr)

    return results


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--radius", type=float, default=350, help="Suchradius in Metern um Campus-Zentrum (Standard: 350)")
    parser.add_argument("--out", type=Path, default=ZONE_JSON_OUT, help=f"GeoJSON-Ausgabedatei (Standard: {ZONE_JSON_OUT})")
    parser.add_argument("--photo-dir", type=Path, default=None, help="Verzeichnis mit JPEG-Fotos für GPS-Auswertung")
    parser.add_argument("--analyse", action="store_true", help="Nur Analyse ausgeben, keine Datei schreiben")
    args = parser.parse_args()

    print(f"=== GML → GeoJSON Konverter (Eiermann Campus) ===")
    print(f"GML:    alle Tiles in {GML_DIR}")
    print(f"Radius: {args.radius:.0f} m")
    print(f"Zentrum: lat={CAMPUS_CENTER['lat']:.6f}  lon={CAMPUS_CENTER['lon']:.6f}")
    print()

    # --- GML lesen (alle Tiles) ---
    gml_files = sorted(GML_DIR.glob("*.gml"))
    if not gml_files:
        print(f"FEHLER: Keine GML-Dateien in {GML_DIR}", file=sys.stderr)
        sys.exit(1)

    buildings = []
    for gml_file in gml_files:
        buildings.extend(parse_gml_buildings(gml_file, args.radius))
    # Deduplizieren (selbe ID aus mehreren Tiles)
    seen_ids: set[str] = set()
    unique = []
    for b in buildings:
        if b["id"] not in seen_ids:
            seen_ids.add(b["id"])
            unique.append(b)
    buildings = unique
    print(f"Gefundene Gebäude im Radius {args.radius:.0f}m: {len(buildings)}")
    print()
    print(f"{'Rang':>4}  {'Abstand':>8}  {'GML-ID':32}  {'lat':>12}  {'lon':>12}  {'Fläche m²':>10}  {'Bezeichnung'}") 
    print("-" * 120)
    for i, b in enumerate(buildings, 1):
        label = building_label(b)
        print(f"{i:4d}  {b['dist_m']:7.0f}m  {b['id']:32s}  {b['centroid_lat']:12.6f}  {b['centroid_lon']:12.6f}  {b.get('area_m2', 0):10.0f}  {label}")

    # --- Foto-GPS auswerten ---
    if args.photo_dir:
        print()
        print(f"=== Foto-GPS-Auswertung: {args.photo_dir} ===")
        photos = read_photo_gps(args.photo_dir)
        if not photos:
            print("  Keine GPS-Fotos gefunden.")
        else:
            print(f"  {len(photos)} Fotos mit GPS gefunden:")
            print(f"  {'Datei':20}  {'lat':>12}  {'lon':>12}  {'alt':>8}  {'Nächstes Gebäude':32}  {'Abstand':>8}")
            print("  " + "-" * 100)
            for p in photos:
                if not buildings:
                    break
                nearest = min(buildings, key=lambda b: haversine_m(p["lat"], p["lon"], b["centroid_lat"], b["centroid_lon"]))
                d = haversine_m(p["lat"], p["lon"], nearest["centroid_lat"], nearest["centroid_lon"])
                alt_str = f"{p['alt']:.0f}m" if p["alt"] else "–"
                print(f"  {p['file']:20}  {p['lat']:12.6f}  {p['lon']:12.6f}  {alt_str:>8}  {nearest['id']:32}  {d:7.0f}m")

    # --- GeoJSON schreiben ---
    if not args.analyse:
        geojson = buildings_to_geojson(buildings, GML_TO_ZONE)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        print()
        print(f"✓ GeoJSON geschrieben: {args.out}  ({len(geojson['features'])} Features)")

        # Inspektion-GeoJSON mit benannten Point-Markern (für geojson.io)
        inspect_path = args.out.parent / (args.out.stem + "_inspect.geojson")
        inspect = buildings_to_inspect_geojson(buildings, GML_TO_ZONE)
        with open(inspect_path, "w", encoding="utf-8") as f:
            json.dump(inspect, f, ensure_ascii=False, indent=2)
        print(f"✓ Inspektion-Marker: {inspect_path}  ({len(inspect['features'])} Punkte)")
        print()
        print("NÄCHSTE SCHRITTE:")
        print("  1. Öffne die Inspektion-GeoJSON in geojson.io (Datei per Drag&Drop auf die Karte)")
        print("  2. Klicke jeden orangefarbenen Marker → 'name' und 'gmlId' sind sichtbar")
        print("  3. Identifiziere die Zone (z.B. Parkdeck 1, Kantine) und trage sie in GML_TO_ZONE ein")
        print("  4. Führe das Script erneut aus → zone_geometry.json wird mit echten Zone-IDs aktualisiert")


if __name__ == "__main__":
    main()
