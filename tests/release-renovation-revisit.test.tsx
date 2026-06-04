// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import corpus from './fixtures/address-corpus.json';
import { ProjectProvider, useProject } from '../src/features/project-store/ProjectContext';
import { useIfcGeneration } from '../src/app/hooks/useIfcGeneration';
import { useTerrainData } from '../src/app/hooks/useTerrainData';
import { computeProjectSourceFingerprint } from '../src/features/project-store/derivedData';
import type { ImportedProject } from '../src/features/project-store/types';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    get length() {
      return store.size;
    },
  };
}

const renovationFixture = (corpus as Array<{ address: string; mode: string }>).find(
  (entry) => entry.address === 'Demohaus BY 31, 92526 Beispielstadt',
);

function makeProject(): ImportedProject {
  const base: ImportedProject = {
    slug: 'renovation-demo_20260522',
    address: renovationFixture?.address ?? 'Demohaus BY 31, 92526 Beispielstadt',
    geocode: {
      lat: 49.428,
      lon: 12.418,
      displayName: renovationFixture?.address ?? 'Demohaus BY 31, 92526 Beispielstadt',
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
  };
  const sourceFingerprint = computeProjectSourceFingerprint(base);
  return {
    ...base,
    derivedData: {
      terrain: {
        sourceFingerprint,
        generatedAt: '2026-05-22T10:00:00.000Z',
        generatorVersion: 'terrain-open-meteo-v1',
        payload: {
          centerZ: 412,
          nsProfile: [{ dist: 0, z: 412, zSmooth: 412 }],
          ewProfile: [{ dist: 0, z: 412, zSmooth: 412 }],
          reliefM: 2,
          meanElevationM: 412,
          slopePercent: 1.4,
          fetchedAt: '2026-05-22T10:00:00.000Z',
          source: 'Open-Meteo Elevation · SRTM / ASTER',
        },
      },
      ifc: {
        sourceFingerprint,
        generatedAt: '2026-05-22T10:05:00.000Z',
        generatorVersion: 'lod2-ifc-v1',
        payload: 'IFC-REVISIT-CONTENT',
      },
    },
  };
}

function DerivedRevisitSmoke() {
  const { activeProject } = useProject();
  const { terrainData } = useTerrainData(activeProject, () => undefined);
  const { lod2IfcContent } = useIfcGeneration(activeProject, () => undefined);

  return (
    <div>
      <span>{activeProject?.address ?? 'kein-projekt'}</span>
      <span>{terrainData ? `terrain:${terrainData.centerZ}` : 'terrain:none'}</span>
      <span>{lod2IfcContent ? `ifc:${lod2IfcContent}` : 'ifc:none'}</span>
    </div>
  );
}

describe('release smoke: renovation revisit with persisted derived data', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });

    const project = makeProject();
    localStorage.setItem('hk_project_list', JSON.stringify([project.slug]));
    localStorage.setItem(`hk_project_${project.slug}`, JSON.stringify(project));
    localStorage.setItem('hk_active_project', project.slug);
  });

  it('restores the saved renovation project and reuses persisted terrain/IFC on revisit', async () => {
    render(
      <ProjectProvider>
        <DerivedRevisitSmoke />
      </ProjectProvider>,
    );

    expect(await screen.findByText(renovationFixture?.address ?? 'Demohaus BY 31, 92526 Beispielstadt')).toBeInTheDocument();
    expect(screen.getByText('terrain:412')).toBeInTheDocument();
    expect(screen.getByText('ifc:IFC-REVISIT-CONTENT')).toBeInTheDocument();
  });
});
