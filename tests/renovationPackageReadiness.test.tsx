// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectProvider, useProject } from '../src/features/project-store/ProjectContext';
import { computeProjectSourceFingerprint } from '../src/features/project-store/derivedData';
import { setActiveSlug } from '../src/features/project-store/projectStore';
import type { ImportedProject } from '../src/features/project-store/types';
import { RenovationPlanningPanel } from '../src/features/renovation-planning/RenovationPlanningPanel';
import {
  createEmptyRenovationPhotoPlacementState,
  createRenovationPhotoRegistration,
  upsertRenovationPhotoPlacementState,
} from '../src/features/renovation-planning/renovationPhotoPlacementStore';
import { exportRenovationBundle, importRenovationBundle } from '../src/features/renovation-planning/renovationBundle';

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

function makeImportedProject() {
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
    project,
    bundle: {
      ...exportRenovationBundle(project),
      project,
      localRegisters: {
        buildingFacts: [],
        assumptions: [],
        measurementNeeds: [],
        renovationDecisions: [],
      },
      photoPlacementState,
      siteVisitImports: [],
    },
  };
}

function RenovationPackageSmoke() {
  const { activeProject } = useProject();
  return <RenovationPlanningPanel project={activeProject} />;
}

describe('Renovation package readiness', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: vi.fn(() => 'blob:renovation-package'),
        revokeObjectURL: vi.fn(),
      },
      configurable: true,
    });
  });

  it('exports and re-imports a renovation package from the real Paket surface', async () => {
    const { project, bundle } = makeImportedProject();
    const restored = importRenovationBundle(bundle);
    setActiveSlug(restored.slug);

    render(
      <ProjectProvider>
        <RenovationPackageSmoke />
      </ProjectProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Paket' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Renovierungs-Backup exportieren' }));
    expect(screen.getByText(`Renovierung-Backup · nur Metadaten für ${project.slug} exportiert.`)).toBeInTheDocument();
    expect(
      screen.getByText('Renovierung-Backup · nur Metadaten · Nur Metadaten · 1 Foto · 1 Platzierung'),
    ).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Renovierungs-Backup importieren').parentElement?.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();

    const importFile = new File([JSON.stringify(bundle)], 'renovation-backup.json', { type: 'application/json' });
    Object.defineProperty(importFile, 'text', {
      value: async () => JSON.stringify(bundle),
      configurable: true,
    });

    fireEvent.change(fileInput!, { target: { files: [importFile] } });

    expect(await screen.findByText('Wiederherstellung prüfen')).toBeInTheDocument();
    expect(screen.getByText(project.address)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jetzt wiederherstellen' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt wiederherstellen' }));

    await waitFor(() => {
      expect(screen.getByText(/lokal wiederhergestellt/i)).toBeInTheDocument();
    });
  });
});
