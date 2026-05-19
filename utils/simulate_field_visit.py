#!/usr/bin/env python3
"""
simulate_field_visit.py — Simuliert einen echten Feldbesuch am Eiermann-Campus.

Verarbeitet alle JPEG-Fotos in einem Verzeichnis:
- Liest EXIF-GPS und Aufnahmedatum
- Ordnet jedes Foto der nächsten Zone zu (via zone_geometry.json Centroids)
- Gibt einen Feldbericht und JSON-Asset-Records aus
- Schreibt eine Seed-JSON die direkt in die IndexedDB importiert werden kann

Verwendung:
    python3 utils/simulate_field_visit.py
    python3 utils/simulate_field_visit.py --photo-dir /pfad/zu/fotos
    python3 utils/simulate_field_visit.py --out output/field_visit_assets.json
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
PHOTO_DIR_DEFAULT = Path("/home/johannes/Bilder/2026-04_Fotos_Eimermann_Campus")
ZONE_GEOMETRY = ROOT / "examples/eiermann/zone_geometry.json"
ZONES_JSON = ROOT / "examples/eiermann/zones.json"

PROJECT_ID = "proj-eiermann-campus"
SITE_ID = "site-eiermann-campus"

# ---------------------------------------------------------------------------
# Geo
# ---------------------------------------------------------------------------

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def polygon_centroid(coords):
    """GeoJSON coords: [[lon, lat], ...]"""
    n = len(coords) - 1  # last point == first
    lats = [c[1] for c in coords[:n]]
    lons = [c[0] for c in coords[:n]]
    return sum(lats) / n, sum(lons) / n


# ---------------------------------------------------------------------------
# Zone lookup from GeoJSON
# ---------------------------------------------------------------------------

def load_zone_centroids():
    """Returns list of {zone_id, lat, lon, name}."""
    geojson = json.loads(ZONE_GEOMETRY.read_text())
    zones_meta = {z["id"]: z["name"] for z in json.loads(ZONES_JSON.read_text())}
    result = []
    for feat in geojson["features"]:
        zid = feat["properties"]["zoneId"]
        coords = feat["geometry"]["coordinates"][0]
        clat, clon = polygon_centroid(coords)
        result.append({
            "zone_id": zid,
            "lat": clat,
            "lon": clon,
            "name": zones_meta.get(zid, zid),
        })
    return result


def nearest_zone(lat, lon, zone_centroids):
    best = min(zone_centroids, key=lambda z: haversine_m(lat, lon, z["lat"], z["lon"]))
    dist = haversine_m(lat, lon, best["lat"], best["lon"])
    return best, dist


# ---------------------------------------------------------------------------
# EXIF
# ---------------------------------------------------------------------------

def read_photo_exif(path: Path):
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
    except ImportError:
        return None

    def dms2dec(dms, ref):
        d, m, s = dms
        dec = float(d) + float(m) / 60 + float(s) / 3600
        if ref in ("S", "W"):
            dec = -dec
        return dec

    try:
        img = Image.open(path)
        exif_raw = img._getexif()
        if not exif_raw:
            return None
        gps = {}
        dt = None
        model = None
        for tag_id, val in exif_raw.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for g, v in val.items():
                    gps[GPSTAGS.get(g, g)] = v
            elif tag == "DateTimeOriginal":
                dt = val
            elif tag == "DateTime" and not dt:
                dt = val
            elif tag == "Model":
                model = val
        if "GPSLatitude" not in gps:
            return None
        lat = dms2dec(gps["GPSLatitude"], gps.get("GPSLatitudeRef", "N"))
        lon = dms2dec(gps["GPSLongitude"], gps.get("GPSLongitudeRef", "E"))
        alt = float(gps["GPSAltitude"]) if "GPSAltitude" in gps else None
        # Parse datetime: "2026:04:22 13:15:28" → ISO
        iso_dt = None
        if dt:
            try:
                iso_dt = datetime.strptime(dt, "%Y:%m:%d %H:%M:%S").isoformat()
            except ValueError:
                iso_dt = dt
        return {"lat": lat, "lon": lon, "alt": alt, "capturedAt": iso_dt, "cameraModel": model}
    except Exception as e:
        print(f"  [WARN] EXIF-Fehler bei {path.name}: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Asset-Record Generator
# ---------------------------------------------------------------------------

def make_asset_id(filename: str) -> str:
    # Deterministic ID aus Dateiname
    stem = Path(filename).stem.replace("_", "").replace("-", "")[:8].upper()
    return f"A-FIELD-{stem}"


def photo_to_asset(path: Path, exif, zone_id: str, dist_m: float) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    asset_id = make_asset_id(path.name)
    return {
        "id": asset_id,
        "projectId": PROJECT_ID,
        "zoneId": zone_id,
        "assetType": "photo",
        "title": path.stem.replace("_", " "),
        "description": f"Feldbesuch 2026-04-22 — automatisch zugeordnet (Abstand zur Zonenmitte: {dist_m:.0f}m)",
        "fileName": path.name,
        "fileSize": path.stat().st_size,
        "mimeType": "image/jpeg",
        "capturedAt": exif.get("capturedAt") or "2026-04-22T00:00:00",
        "gpsLat": exif.get("lat"),
        "gpsLon": exif.get("lon"),
        "gpsAlt": exif.get("alt"),
        "tags": ["feldbesuch", "2026-04", "eiermann-campus"],
        "processingStatus": "raw",
        "sensitivityLevel": "internal",
        "publicationStatus": "needs_review",
        "createdAt": now,
        "updatedAt": now,
        "_sourceFile": str(path),  # für Import-Skript: Blob-Quelle
    }


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--photo-dir", type=Path, default=PHOTO_DIR_DEFAULT)
    parser.add_argument("--out", type=Path, default=ROOT / "output/field_visit_assets.json")
    args = parser.parse_args()

    print("=== Eiermann-Campus Feldbesuch-Simulation ===")
    print(f"Foto-Verzeichnis: {args.photo_dir}")
    print()

    zone_centroids = load_zone_centroids()
    print(f"Zonen geladen: {len(zone_centroids)}")

    photos = sorted(args.photo_dir.glob("*.JPEG")) + sorted(args.photo_dir.glob("*.jpeg")) + \
             sorted(args.photo_dir.glob("*.jpg")) + sorted(args.photo_dir.glob("*.JPG"))
    print(f"Fotos gefunden: {len(photos)}")
    print()

    assets = []
    zone_photo_map: dict[str, list[str]] = {}

    print(f"{'Datei':22} {'lat':>12} {'lon':>12} {'alt':>6}  {'Zone':35} {'Abstand':>9}  Bewertung")
    print("-" * 115)

    for photo in photos:
        exif = read_photo_exif(photo)
        if not exif:
            print(f"{photo.name:22}  KEIN EXIF GPS — übersprungen")
            continue

        zone, dist = nearest_zone(exif["lat"], exif["lon"], zone_centroids)

        # Qualitätsbewertung: Distanz zur Zonenmitte
        if dist < 50:
            bewertung = "✓ eindeutig"
        elif dist < 150:
            bewertung = "~ wahrscheinlich"
        else:
            bewertung = "? unsicher (>150m)"

        print(f"{photo.name:22} {exif['lat']:12.6f} {exif['lon']:12.6f} {exif['alt'] or 0:6.0f}m  "
              f"{zone['name']:35} {dist:8.0f}m  {bewertung}")

        zone_photo_map.setdefault(zone["zone_id"], []).append(photo.name)
        assets.append(photo_to_asset(photo, exif, zone["zone_id"], dist))

    print()
    print("=== Zusammenfassung nach Zone ===")
    for zone_id, photo_list in sorted(zone_photo_map.items()):
        zone_name = next((z["name"] for z in zone_centroids if z["zone_id"] == zone_id), zone_id)
        print(f"  {zone_id:35s} ({len(photo_list)} Fotos): {', '.join(photo_list)}")

    zones_covered = len(zone_photo_map)
    zones_total = len(zone_centroids)
    print()
    print(f"Abdeckung: {zones_covered}/{zones_total} Zonen mit mindestens 1 Foto")
    print(f"Assets gesamt: {len(assets)}")

    # JSON-Ausgabe
    args.out.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "simulation": True,
        "sourcePhotoDir": str(args.photo_dir),
        "assets": assets,
        "note": "GPS-Koordinaten aus EXIF. Blobs müssen separat über AssetIngestPanel hochgeladen werden."
    }
    with open(args.out, "w") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print()
    print(f"✓ Asset-JSON geschrieben: {args.out}")
    print()
    print("NÄCHSTE SCHRITTE:")
    print("  1. App starten: npm run dev")
    print("  2. Fotos über AssetIngestPanel in die jeweiligen Zonen importieren")
    print("     → EXIF-GPS wird automatisch ausgelesen")
    print("  3. GPS-Marker erscheinen auf der Karte (Karten-Tab)")
    print("  4. Beobachtungen für jede Zone anlegen")
    print("  5. JSON-Backup herunterladen (Szenen-Tab)")


if __name__ == "__main__":
    main()
