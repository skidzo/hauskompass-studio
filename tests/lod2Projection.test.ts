import { describe, expect, it } from 'vitest';

import type { Lod2Candidate } from '../src/features/project-store/types';
import { buildLod2ProjectionLayout, deriveDominantAxisDegrees } from '../src/features/building-parts/lod2Projection';

function makeRectCandidate(id: string, cx: number, cy: number, width: number, depth: number, height: number, rotationDeg: number): Lod2Candidate {
  const angle = (rotationDeg * Math.PI) / 180;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const corners = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
    [-halfWidth, -halfDepth],
  ].map(([x, y]) => ({
    e: cx + x * Math.cos(angle) - y * Math.sin(angle),
    n: cy + x * Math.sin(angle) + y * Math.cos(angle),
  }));

  return {
    id,
    functionCode: '1000',
    roofTypeCode: '1000',
    measuredHeightM: height,
    bboxUtm32: {
      minE: Math.min(...corners.map((point) => point.e)),
      maxE: Math.max(...corners.map((point) => point.e)),
      minN: Math.min(...corners.map((point) => point.n)),
      maxN: Math.max(...corners.map((point) => point.n)),
      minZ: 100,
      maxZ: 100 + height,
    },
    centroidUtm32: { easting: cx, northing: cy },
    bboxDistanceToGeocodeM: 0,
    centroidDistanceToGeocodeM: 0,
    surfaces: {
      ground: [{ id: `${id}-ground`, kind: 'ground', areaM2: width * depth, pitchDeg: 0, azimuthDeg: rotationDeg, points: corners.map((point) => ({ ...point, z: 100 })) }],
      wall: [{ id: `${id}-wall-a`, kind: 'wall', areaM2: width * height, pitchDeg: 90, azimuthDeg: rotationDeg, points: [
        { ...corners[0], z: 100 },
        { ...corners[1], z: 100 },
        { ...corners[1], z: 100 + height },
        { ...corners[0], z: 100 + height },
        { ...corners[0], z: 100 },
      ] }],
      roof: [{ id: `${id}-roof`, kind: 'roof', areaM2: width * depth, pitchDeg: 35, azimuthDeg: rotationDeg, points: corners.map((point) => ({ ...point, z: 100 + height })) }],
    },
  };
}

describe('lod2Projection', () => {
  it('derives a dominant axis from elongated rotated candidates', () => {
    const candidates = [
      makeRectCandidate('a', 691000, 5331000, 18, 7, 8, 35),
      makeRectCandidate('b', 691020, 5331012, 16, 6, 8, 35),
    ];

    const axis = deriveDominantAxisDegrees(candidates);
    expect(axis).toBeGreaterThan(25);
    expect(axis).toBeLessThan(45);
  });

  it('builds ensemble-oriented plan and elevation layouts', () => {
    const candidates = [
      makeRectCandidate('a', 691000, 5331000, 18, 7, 8, 35),
      makeRectCandidate('b', 691020, 5331012, 16, 6, 8, 35),
    ];

    const layout = buildLod2ProjectionLayout(candidates);

    expect(layout.planPolygons).toHaveLength(2);
    expect(layout.planBounds.width).toBeGreaterThan(layout.planBounds.height);
    expect(layout.elevationViews).toHaveLength(2);
    expect(layout.elevationViews[0].label).toContain('Queransicht');
    expect(layout.elevationViews[1].label).toContain('Längsansicht');
    expect(layout.elevationViews[0].bounds.minX).toBeLessThan(layout.elevationViews[0].bounds.maxX);
    expect(layout.elevationViews[1].bounds.minX).toBeLessThan(layout.elevationViews[1].bounds.maxX);
    expect(layout.measuredHeightM).toBeCloseTo(8, 5);
  });
});
