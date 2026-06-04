/**
 * fetchTerrainProfile.ts
 * ----------------------
 * Fetches elevation cross-sections via Open-Meteo elevation API (SRTM / ASTER
 * blend) entirely in the browser — no Python pipeline required.
 *
 * Source: https://open-meteo.com/en/docs/elevation-api
 *         CORS-enabled, no API key, free (fair-use)
 */

import type { ImportedTerrainData, ImportedTerrainPoint, ProjectGeocodeResult } from '@/features/project-store/types';
export type { ImportedTerrainData, ImportedTerrainPoint } from '@/features/project-store/types';

const HALF_M = 120; // transect half-length in metres
const STEP_M = 6;   // sample spacing — gives 41 points per arm (–120..+120)

function runningMedian(values: number[], w = 3): number[] {
  const half = Math.floor(w / 2);
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - half), Math.min(values.length, i + half + 1));
    const sorted = [...slice].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  });
}

async function callOpenMeteoElevation(lats: number[], lons: number[]): Promise<number[]> {
  const latStr = lats.map((l) => l.toFixed(6)).join(',');
  const lonStr = lons.map((l) => l.toFixed(6)).join(',');
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${latStr}&longitude=${lonStr}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Open-Meteo Elevation HTTP ${res.status}`);
  const json = (await res.json()) as { elevation?: number[] };
  if (!json.elevation) throw new Error('Open-Meteo: kein elevation-Feld in Antwort');
  return json.elevation;
}

export async function fetchTerrainProfile(
  geocode: ProjectGeocodeResult,
): Promise<ImportedTerrainData> {
  const { lat, lon } = geocode;

  const degPerMLat = 1 / 111_320;
  const degPerMLon = 1 / (111_320 * Math.cos((lat * Math.PI) / 180));

  const dists: number[] = [];
  for (let d = -HALF_M; d <= HALF_M + 0.001; d += STEP_M) {
    dists.push(Math.round(d));
  }

  const nsLats = dists.map((d) => lat + d * degPerMLat);
  const nsLons = dists.map(() => lon);
  const ewLats = dists.map(() => lat);
  const ewLons = dists.map((d) => lon + d * degPerMLon);

  const [nsRaw, ewRaw] = await Promise.all([
    callOpenMeteoElevation(nsLats, nsLons),
    callOpenMeteoElevation(ewLats, ewLons),
  ]);

  const nsSmooth = runningMedian(nsRaw, 3);
  const ewSmooth = runningMedian(ewRaw, 3);

  const nsProfile: ImportedTerrainPoint[] = dists.map((d, i) => ({
    dist: d,
    z: nsRaw[i],
    zSmooth: nsSmooth[i],
  }));

  const ewProfile: ImportedTerrainPoint[] = dists.map((d, i) => ({
    dist: d,
    z: ewRaw[i],
    zSmooth: ewSmooth[i],
  }));

  const centerIdx = Math.floor(dists.length / 2);
  const centerZ = (nsRaw[centerIdx] + ewRaw[centerIdx]) / 2;

  const allRaw = [...nsRaw, ...ewRaw];
  const reliefM = Math.max(...allRaw) - Math.min(...allRaw);
  const meanElevationM = allRaw.reduce((s, v) => s + v, 0) / allRaw.length;

  const nsGrad = Math.abs(nsSmooth[nsSmooth.length - 1] - nsSmooth[0]) / (HALF_M * 2);
  const ewGrad = Math.abs(ewSmooth[ewSmooth.length - 1] - ewSmooth[0]) / (HALF_M * 2);
  const slopePercent = ((nsGrad + ewGrad) / 2) * 100;

  return {
    centerZ,
    nsProfile,
    ewProfile,
    reliefM,
    meanElevationM,
    slopePercent,
    fetchedAt: new Date().toISOString(),
    source: 'Open-Meteo Elevation · SRTM / ASTER',
  };
}
