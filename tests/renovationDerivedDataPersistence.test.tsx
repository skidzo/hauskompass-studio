// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useIfcGeneration } from '../src/app/hooks/useIfcGeneration';
import { useTerrainData } from '../src/app/hooks/useTerrainData';
import type { ImportedProject, ImportedTerrainData } from '../src/features/project-store/types';

const TERRAIN_FIXTURE: ImportedTerrainData = {
  centerZ: 412,
  nsProfile: [{ dist: 0, z: 412, zSmooth: 412 }],
  ewProfile: [{ dist: 0, z: 412, zSmooth: 412 }],
  reliefM: 2,
  meanElevationM: 412,
  slopePercent: 1.4,
  fetchedAt: '2026-05-22T10:00:00.000Z',
  source: 'Open-Meteo Elevation · SRTM / ASTER',
};

vi.mock('../src/features/lod2-derived/fetchTerrainProfile', () => ({
  fetchTerrainProfile: vi.fn(async () => TERRAIN_FIXTURE),
}));

function makeProject(overrides: Partial<ImportedProject> = {}): ImportedProject {
  return {
    slug: 'ren-project',
    address: 'Demohaus BY 31, 92526 Beispielstadt',
    geocode: {
      lat: 49.428,
      lon: 12.418,
      displayName: 'Demohaus BY 31, 92526 Beispielstadt',
      utm32: { easting: 750000, northing: 5480000 },
      tileId: '750_5480',
      nominatimState: 'Bayern',
    },
    sourceTile: '750_5480',
    candidates: [
      {
        id: 'c1',
        functionCode: '1000',
        roofTypeCode: 'flat',
        measuredHeightM: 8,
        bboxUtm32: { minE: 1, maxE: 2, minN: 3, maxN: 4, minZ: 0, maxZ: 8 },
        centroidUtm32: { easting: 1.5, northing: 3.5 },
        bboxDistanceToGeocodeM: 5,
        centroidDistanceToGeocodeM: 5,
        surfaces: { ground: [], wall: [], roof: [] },
      },
    ],
    confirmedIds: ['c1'],
    importedAt: '2026-05-22T09:00:00.000Z',
    ...overrides,
  };
}

describe('renovation derived-data persistence', () => {
  it('persists and reloads terrain data for the same project source', async () => {
    const updateProject = vi.fn();
    const initialProject = makeProject();
    const { result, rerender } = renderHook(
      ({ project }) => useTerrainData(project, updateProject),
      { initialProps: { project: initialProject as ImportedProject | null } },
    );

    await act(async () => {
      await result.current.fetchTerrain();
    });

    expect(updateProject).toHaveBeenCalledTimes(1);
    const persistedProject = updateProject.mock.calls[0][0] as ImportedProject;
    expect(persistedProject.derivedData?.terrain?.payload.centerZ).toBe(412);

    rerender({ project: persistedProject });
    await waitFor(() => {
      expect(result.current.terrainData?.centerZ).toBe(412);
    });

    rerender({ project: { ...persistedProject, confirmedIds: ['other'] } });
    await waitFor(() => {
      expect(result.current.terrainData).toBeNull();
    });
  });

  it('persists and reloads IFC content for the same project source', async () => {
    const updateProject = vi.fn();
    const initialProject = makeProject();
    const { result, rerender } = renderHook(
      ({ project }) => useIfcGeneration(project, updateProject),
      { initialProps: { project: initialProject as ImportedProject | null } },
    );

    act(() => {
      result.current.setGenerated('IFC-DATA');
    });

    expect(updateProject).toHaveBeenCalledTimes(1);
    const persistedProject = updateProject.mock.calls[0][0] as ImportedProject;
    expect(persistedProject.derivedData?.ifc?.payload).toBe('IFC-DATA');

    rerender({ project: persistedProject });
    await waitFor(() => {
      expect(result.current.lod2IfcContent).toBe('IFC-DATA');
    });

    rerender({ project: { ...persistedProject, confirmedIds: ['other'] } });
    await waitFor(() => {
      expect(result.current.lod2IfcContent).toBeNull();
    });
  });
});
