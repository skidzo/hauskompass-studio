"""
Download LGL BW LoD2 CityGML tile for a given UTM32 tile ID or address.

Usage (from project root):
    python utils/py/spatial/download_lgl_bw_lod2.py 509_5396
    python utils/py/spatial/download_lgl_bw_lod2.py 509 5396
    python utils/py/spatial/download_lgl_bw_lod2.py --address "Demohaus BW 29, 70563 Stuttgart"

Downloads the 2km ZIP to cache/lgl-bw/lod2/ and extracts the relevant 1km GML files.
"""

import argparse
import math
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CACHE_DIR = os.path.join(ROOT, "cache", "lgl-bw", "lod2")
BASE_URL = "https://opengeodata.lgl-bw.de/data/lod2"
REFERER = "https://opengeodata.lgl-bw.de/"


def bw_zip_tile(tile_e: int, tile_n: int) -> tuple[int, int]:
    """Compute 2km ZIP tile coordinates from 1km tile indices.

    LGL BW names 2km ZIPs using the lower-left 1km tile, where:
    - E: rounded down to nearest odd number
    - N: rounded down to nearest even number
    """
    zip_e = tile_e if tile_e % 2 == 1 else tile_e - 1
    zip_n = tile_n if tile_n % 2 == 0 else tile_n - 1
    return zip_e, zip_n


def tile_from_utm32(easting_m: float, northing_m: float) -> tuple[int, int]:
    """Get 1km tile indices from UTM32 meter coordinates."""
    return math.floor(easting_m / 1000), math.floor(northing_m / 1000)


def geocode_to_utm32(address: str) -> tuple[float, float]:
    """Geocode an address using Nominatim and convert to UTM32."""
    import json
    import math as m

    url = (
        "https://nominatim.openstreetmap.org/search"
        f"?q={urllib.parse.quote(address)}&format=json&limit=1"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "HauskompassBW/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        results = json.loads(resp.read())
    if not results:
        raise ValueError(f"Adresse nicht gefunden: {address!r}")
    lat, lon = float(results[0]["lat"]), float(results[0]["lon"])
    print(f"  Geocoded: {lat:.5f}°N, {lon:.5f}°E")

    # WGS84 → UTM32N (EPSG:25832) — simplified Karney algorithm
    a = 6378137.0
    f = 1 / 298.257223563
    k0 = 0.9996
    e2 = 2 * f - f**2
    n = f / (2 - f)

    lon_rad = m.radians(lon)
    lat_rad = m.radians(lat)
    lon0 = m.radians(9.0)  # UTM zone 32 central meridian

    cos_lat = m.cos(lat_rad)
    sin_lat = m.sin(lat_rad)
    tan_lat = m.tan(lat_rad)
    eta = m.sqrt(e2 / (1 - e2)) * cos_lat
    N = a / m.sqrt(1 - e2 * sin_lat**2)
    T = tan_lat**2
    C = (e2 / (1 - e2)) * cos_lat**2
    A = (lon_rad - lon0) * cos_lat

    M = a * (
        (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * lat_rad
        - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * m.sin(2 * lat_rad)
        + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * m.sin(4 * lat_rad)
        - (35 * e2**3 / 3072) * m.sin(6 * lat_rad)
    )

    easting = (
        k0
        * N
        * (
            A
            + (1 - T + C) * A**3 / 6
            + (5 - 18 * T + T**2 + 72 * C - 58 * eta**2) * A**5 / 120
        )
        + 500000.0
    )
    northing = k0 * (
        M
        + N
        * tan_lat
        * (
            A**2 / 2
            + (5 - T + 9 * C + 4 * C**2) * A**4 / 24
            + (61 - 58 * T + T**2 + 600 * C - 330 * eta**2) * A**6 / 720
        )
    )
    return easting, northing


def download_tile(tile_e: int, tile_n: int) -> list[str]:
    """Download and extract LGL BW LoD2 ZIP for the given 1km tile. Returns extracted GML paths."""
    zip_e, zip_n = bw_zip_tile(tile_e, tile_n)
    zip_name = f"LoD2_32_{zip_e}_{zip_n}_2_bw.zip"
    gml_name = f"LoD2_32_{tile_e}_{tile_n}_1_BW.gml"
    url = f"{BASE_URL}/{zip_name}?customerGroup=keine-angabe"

    os.makedirs(CACHE_DIR, exist_ok=True)
    zip_path = os.path.join(CACHE_DIR, zip_name)

    if not os.path.exists(zip_path):
        print(f"Downloading {url} …")
        req = urllib.request.Request(url, headers={"Referer": REFERER})
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
        except urllib.error.HTTPError as e:
            print(f"HTTP {e.code}: Tile nicht verfügbar (falsche Koordinaten?)")
            sys.exit(1)
        with open(zip_path, "wb") as f:
            f.write(data)
        print(f"  Saved to {zip_path} ({len(data)//1024} KB)")
    else:
        print(f"  Bereits im Cache: {zip_path}")

    # Extract GML files
    extracted = []
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.namelist():
            if member.endswith(".gml"):
                basename = os.path.basename(member)
                dest = os.path.join(CACHE_DIR, basename)
                if not os.path.exists(dest):
                    with zf.open(member) as src, open(dest, "wb") as dst:
                        dst.write(src.read())
                    print(f"  Extracted: {basename}")
                else:
                    print(f"  Bereits extrahiert: {basename}")
                extracted.append(dest)

    target = os.path.join(CACHE_DIR, gml_name)
    if os.path.exists(target):
        print(f"\nZum Hochladen: {target}")
    else:
        print(f"\nGesuchte Datei nicht im ZIP: {gml_name}")
        print(f"  Verfügbar: {[os.path.basename(p) for p in extracted]}")

    return extracted


def main() -> None:
    import urllib.parse  # ensure available

    parser = argparse.ArgumentParser(description="LGL BW LoD2 CityGML herunterladen")
    parser.add_argument("tile", nargs="*", help="Tile-ID '509_5396' oder '509 5396'")
    parser.add_argument("--address", help="Adresse geocodieren und Tile ermitteln")
    args = parser.parse_args()

    if args.address:
        print(f"Geocodiere: {args.address}")
        easting, northing = geocode_to_utm32(args.address)
        tile_e, tile_n = tile_from_utm32(easting, northing)
        print(f"  UTM32: E={easting:.0f} / N={northing:.0f} → Tile {tile_e}_{tile_n}")
    elif args.tile:
        if len(args.tile) == 1 and "_" in args.tile[0]:
            tile_e, tile_n = map(int, args.tile[0].split("_"))
        elif len(args.tile) == 2:
            tile_e, tile_n = int(args.tile[0]), int(args.tile[1])
        else:
            parser.error("Tile als '509_5396' oder '509 5396' angeben")
            return
    else:
        parser.print_help()
        sys.exit(1)

    download_tile(tile_e, tile_n)


if __name__ == "__main__":
    import urllib.parse  # noqa: F401
    main()
