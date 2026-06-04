// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useIfcGeneration } from '../src/app/hooks/useIfcGeneration';
import { useTerrainData } from '../src/app/hooks/useTerrainData';
import { ProjectProvider, useProject } from '../src/features/project-store/ProjectContext';
import { computeProjectSourceFingerprint } from '../src/features/project-store/derivedData';
import { setActiveSlug } from '../src/features/project-store/projectStore';
import { RenovationPlanningPanel } from '../src/features/renovation-planning/RenovationPlanningPanel';
import {
  createEmptyRenovationPhotoPlacementState,
  createRenovationPhotoRegistration,
  upsertRenovationPhotoPlacementState,
} from '../src/features/renovation-planning/renovationPhotoPlacementStore';
import { importRenovationBundle, type RenovationBundleExport } from '../src/features/renovation-planning/renovationBundle';
import type { ImportedProject } from '../src/features/project-store/types';
import { createStudioBundleEnvelope } from '../src/lib/studio-core/backup/helpers';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    clear() { store.clear(); },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
    key(index: number) { return Array.from(store.keys())[index] ?? null; },
    removeItem(key: string) { store.delete(key); },
    setItem(key: string, value: string) { store.set(key, value); },
    get length() { return store.size; },
  };
}

function makeProject(): ImportedProject {
  const base: ImportedProject = {
    slug: 'renovation-demo_20260522',
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

function makeBundle(): RenovationBundleExport {
  const project = makeProject();
  const initialState = createEmptyRenovationPhotoPlacementState(project.slug);
  const registration = createRenovationPhotoRegistration({
    projectSlug: project.slug,
    title: 'Hallway overview',
    importSource: 'imported_from_other_device',
    isHistorical: false,
    roomId: 'hallway',
    placementSource: 'manual',
    placementConfidence: 'approximate',
    orientationConfidence: 'likely',
    whatIsVisible: 'Visible wall cracks and radiator niche.',
    evidenceNoteKind: 'observation',
    evidenceNoteText: 'Cracks above the radiator niche need review.',
  });
  const photoPlacementState = upsertRenovationPhotoPlacementState(initialState, registration);
  return {
    ...createStudioBundleEnvelope({
      bundleIntent: 'full_backup',
      exportedAt: '2026-05-22T12:00:00.000Z',
      projectRef: {
        projectId: project.slug,
        projectSlug: project.slug,
        title: project.address,
      },
      projectMode: 'renovation',
      payloadType: 'renovation_bundle',
      counts: {
        photos: photoPlacementState.photos.length,
        placements: photoPlacementState.placements.length,
      },
      mediaTransport: 'inline_none',
    }),
    project,
    localRegisters: {
      buildingFacts: [],
      assumptions: [],
      measurementNeeds: [],
      renovationDecisions: [],
    },
    photoPlacementState,
    siteVisitImports: [],
  };
}

function RenovationImportedSessionSmoke() {
  const { activeProject } = useProject();
  const { terrainData } = useTerrainData(activeProject, () => undefined);
  const { lod2IfcContent } = useIfcGeneration(activeProject, () => undefined);

  return (
    <div>
      <span>{activeProject?.address ?? 'kein-projekt'}</span>
      <span>{terrainData ? `terrain:${terrainData.centerZ}` : 'terrain:none'}</span>
      <span>{lod2IfcContent ? `ifc:${lod2IfcContent}` : 'ifc:none'}</span>
      <RenovationPlanningPanel project={activeProject} />
    </div>
  );
}

describe('Renovation imported-project readiness', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });

    const restored = importRenovationBundle(makeBundle());
    setActiveSlug(restored.slug);
  });

  afterEach(() => {
    cleanup();
  });

  it('restores a renovation bundle into a usable planning session with persisted evidence and derived data', async () => {
    render(
      <ProjectProvider>
        <RenovationImportedSessionSmoke />
      </ProjectProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Demohaus BY 31, 92526 Beispielstadt' })).toBeInTheDocument();
    expect(screen.getByText('terrain:412')).toBeInTheDocument();
    expect(screen.getByText('ifc:IFC-REVISIT-CONTENT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fotos' }));

    expect(await screen.findByText('Foto-Platzierung & historische Bild-Evidenz')).toBeInTheDocument();
    expect(screen.getByText('Hallway overview')).toBeInTheDocument();
    expect(screen.getByText('Raum: hallway')).toBeInTheDocument();
    expect(screen.getByText(/Quelle: manual/i)).toBeInTheDocument();
  });
});
