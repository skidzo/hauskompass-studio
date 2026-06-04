import type { Lod2Candidate, SurfacePoint } from '@/features/project-store/types';

type ProjectedPoint = { x: number; y: number };
type ElevationSurface = {
  id: string;
  kind: 'wall' | 'roof';
  points: ProjectedPoint[];
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

export type Lod2ProjectionView = {
  id: 'main-axis' | 'cross-axis';
  label: string;
  width: number;
  height: number;
  bounds: Bounds;
  surfaces: ElevationSurface[];
};

export type Lod2ProjectionLayout = {
  axisDegrees: number;
  axisLabel: string;
  planPolygons: ProjectedPoint[][];
  planBounds: Bounds;
  elevationViews: Lod2ProjectionView[];
  measuredHeightM: number;
};

type AxisPoint = { long: number; cross: number; z: number };

const COMPASS_LABELS = ['Nord', 'Nord-Ost', 'Ost', 'Süd-Ost', 'Süd', 'Süd-West', 'West', 'Nord-West'] as const;

function dedupeClosedRing(points: readonly SurfacePoint[]): SurfacePoint[] {
  if (points.length < 2) return [...points];
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first.e - last.e) < 0.005 && Math.abs(first.n - last.n) < 0.005 && Math.abs(first.z - last.z) < 0.005) {
    return points.slice(0, -1);
  }
  return [...points];
}

function boundsFromPoints(points: readonly ProjectedPoint[]): Bounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function rotateAroundOrigin(e: number, n: number, originE: number, originN: number, axisRadians: number) {
  const dx = e - originE;
  const dy = n - originN;
  const cos = Math.cos(axisRadians);
  const sin = Math.sin(axisRadians);
  return {
    long: dx * cos + dy * sin,
    cross: -dx * sin + dy * cos,
  };
}

function axisPoint(point: SurfacePoint, originE: number, originN: number, baseZ: number, axisRadians: number): AxisPoint {
  const rotated = rotateAroundOrigin(point.e, point.n, originE, originN, axisRadians);
  return {
    long: rotated.long,
    cross: rotated.cross,
    z: point.z - baseZ,
  };
}

function compassLabel(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_LABELS[index];
}

function axisPairLabel(degrees: number): string {
  return `${compassLabel(degrees)} ↔ ${compassLabel(degrees + 180)}`;
}

export function deriveDominantAxisDegrees(candidates: readonly Lod2Candidate[]): number {
  let sumCos2 = 0;
  let sumSin2 = 0;
  let hasEdge = false;

  for (const candidate of candidates) {
    for (const surface of candidate.surfaces.ground) {
      const points = dedupeClosedRing(surface.points);
      for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        const dx = next.e - current.e;
        const dy = next.n - current.n;
        const length = Math.hypot(dx, dy);
        if (length < 0.25) continue;
        const theta = Math.atan2(dy, dx);
        sumCos2 += Math.cos(2 * theta) * length;
        sumSin2 += Math.sin(2 * theta) * length;
        hasEdge = true;
      }
    }
  }

  if (!hasEdge) return 0;
  let radians = 0.5 * Math.atan2(sumSin2, sumCos2);
  if (radians < 0) radians += Math.PI;
  return (radians * 180) / Math.PI;
}

export function buildLod2ProjectionLayout(candidates: readonly Lod2Candidate[]): Lod2ProjectionLayout {
  if (candidates.length === 0) {
    return {
      axisDegrees: 0,
      axisLabel: axisPairLabel(0),
      planPolygons: [],
      planBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1, width: 1, height: 1 },
      elevationViews: [],
      measuredHeightM: 0,
    };
  }

  const allPoints = candidates.flatMap((candidate) =>
    candidate.surfaces.ground.flatMap((surface) => dedupeClosedRing(surface.points)),
  );
  const originE = allPoints.reduce((sum, point) => sum + point.e, 0) / allPoints.length;
  const originN = allPoints.reduce((sum, point) => sum + point.n, 0) / allPoints.length;
  const baseZ = Math.min(...candidates.map((candidate) => candidate.bboxUtm32.minZ));
  const measuredHeightM = Math.max(...candidates.map((candidate) => candidate.bboxUtm32.maxZ - baseZ));
  const axisDegrees = deriveDominantAxisDegrees(candidates);
  const axisRadians = (axisDegrees * Math.PI) / 180;

  const planPolygons = candidates
    .flatMap((candidate) => candidate.surfaces.ground.slice(0, 1))
    .map((surface) =>
      dedupeClosedRing(surface.points).map((point) => {
        const rotated = axisPoint(point, originE, originN, baseZ, axisRadians);
        return { x: rotated.long, y: rotated.cross };
      }),
    )
    .filter((polygon) => polygon.length >= 3);

  const planBounds = boundsFromPoints(planPolygons.flat());

  const allSurfaces = candidates.flatMap((candidate) => [
    ...candidate.surfaces.wall.map((surface) => ({ ...surface, kind: 'wall' as const })),
    ...candidate.surfaces.roof.map((surface) => ({ ...surface, kind: 'roof' as const })),
  ]);

  const mainAxisSurfaces = allSurfaces.map((surface) => ({
    id: surface.id,
    kind: surface.kind,
    points: dedupeClosedRing(surface.points).map((point) => {
      const rotated = axisPoint(point, originE, originN, baseZ, axisRadians);
      return { x: rotated.long, y: rotated.z };
    }),
  }));

  const crossAxisSurfaces = allSurfaces.map((surface) => ({
    id: surface.id,
    kind: surface.kind,
    points: dedupeClosedRing(surface.points).map((point) => {
      const rotated = axisPoint(point, originE, originN, baseZ, axisRadians);
      return { x: -rotated.cross, y: rotated.z };
    }),
  }));

  const mainBounds = boundsFromPoints(mainAxisSurfaces.flatMap((surface) => surface.points));
  const crossBounds = boundsFromPoints(crossAxisSurfaces.flatMap((surface) => surface.points));

  return {
    axisDegrees,
    axisLabel: axisPairLabel(axisDegrees),
    planPolygons,
    planBounds,
    measuredHeightM,
    elevationViews: [
      {
        id: 'cross-axis',
        label: `Queransicht · ${axisPairLabel(axisDegrees + 180)}`,
        width: crossBounds.width,
        height: crossBounds.height,
        bounds: crossBounds,
        surfaces: crossAxisSurfaces,
      },
      {
        id: 'main-axis',
        label: `Längsansicht · ${axisPairLabel(axisDegrees + 90)}`,
        width: mainBounds.width,
        height: mainBounds.height,
        bounds: mainBounds,
        surfaces: mainAxisSurfaces,
      },
    ],
  };
}
