import type { ProjectGeocodeResult, Utm32Point } from '../project-store/types';

/** WGS84 → UTM32N (EPSG:25832) — Transverse Mercator projection. */
export function wgs84ToUtm32(latDeg: number, lonDeg: number): Utm32Point {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const lon0 = (9 * Math.PI) / 180; // Zone 32 central meridian
    const falseE = 500000;
    const falseN = 0;

    const lat = (latDeg * Math.PI) / 180;
    const lon = (lonDeg * Math.PI) / 180;
    const e2 = 2 * f - f * f;
    const ep2 = e2 / (1 - e2);
    const N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    const T = Math.tan(lat) ** 2;
    const C = ep2 * Math.cos(lat) ** 2;
    const A = Math.cos(lat) * (lon - lon0);
    const M =
        a *
        ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * lat -
            ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * lat) +
            ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * lat) -
            ((35 * e2 ** 3) / 3072) * Math.sin(6 * lat));

    const easting =
        falseE +
        k0 *
        N *
        (A +
            ((1 - T + C) * A ** 3) / 6 +
            ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120);
    const northing =
        falseN +
        k0 *
        (M +
            N *
            Math.tan(lat) *
            (A ** 2 / 2 +
                ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
                ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));

    return { easting, northing };
}

/** Compute the 1 km tile ID used by LDBV/LGL: floor(E/1000)_floor(N/1000). */
export function tileFromUtm32(utm: Utm32Point): string {
    return `${Math.floor(utm.easting / 1000)}_${Math.floor(utm.northing / 1000)}`;
}

/** UTM32N (EPSG:25832) → WGS84 — inverse Transverse Mercator. Accuracy ~1 m in central Europe. */
export function utm32ToWgs84(easting: number, northing: number): { lat: number; lon: number } {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const lon0 = (9 * Math.PI) / 180; // Zone 32 central meridian
    const falseE = 500000;
    const e2 = 2 * f - f * f;
    const ep2 = e2 / (1 - e2);

    const x = easting - falseE;
    const M = northing / k0;
    const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const phi1 =
        mu +
        (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) +
        (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) +
        (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu) +
        (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

    const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
    const T1 = Math.tan(phi1) * Math.tan(phi1);
    const C1 = ep2 * Math.cos(phi1) * Math.cos(phi1);
    const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
    const D = x / (N1 * k0);

    const lat =
        phi1 -
        (N1 * Math.tan(phi1) / R1) *
        (D * D / 2 -
            (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24 +
            (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720);

    const lon =
        lon0 +
        (D -
            (1 + 2 * T1 + C1) * D * D * D / 6 +
            (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120) /
        Math.cos(phi1);

    return { lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI };
}

/** Call Nominatim to geocode a free-text address. Returns state info from addressdetails. */
export async function geocodeAddress(address: string): Promise<ProjectGeocodeResult> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Hauskompass/1.0 (local-dev)' },
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: { state?: string; country_code?: string };
    }>;
    if (!data.length) throw new Error('Adresse nicht gefunden');
    const { lat, lon, display_name, address: addr } = data[0];
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    const utm32 = wgs84ToUtm32(latN, lonN);
    const tileId = tileFromUtm32(utm32);
    return { lat: latN, lon: lonN, displayName: display_name, utm32, tileId, nominatimState: addr?.state };
}
