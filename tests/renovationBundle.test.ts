import { beforeEach, describe, expect, it } from 'vitest';

import { loadProject } from '../src/features/project-store/projectStore';
import {
  createRegisterTemplate,
  loadLocalPlanningRegisters,
  saveLocalPlanningRegisters,
} from '../src/features/renovation-planning/localPlanningRegisters';
import { exportRenovationBundle, importRenovationBundle } from '../src/features/renovation-planning/renovationBundle';
import {
  createEmptyRenovationPhotoPlacementState,
  createRenovationPhotoRegistration,
  loadRenovationPhotoPlacementState,
  saveRenovationPhotoPlacementState,
  upsertRenovationPhotoPlacementState,
} from '../src/features/renovation-planning/renovationPhotoPlacementStore';
import { loadSiteVisitImports, saveSiteVisitImports, type SiteVisitImport } from '../src/features/renovation-planning/siteVisitImport';
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

const TEST_PROJECT: ImportedProject = {
  slug: 'house-a',
  address: 'Test House A',
  geocode: {
    lat: 48.1,
    lon: 11.5,
    displayName: 'Test House A, Sampletown',
    utm32: { easting: 691000, northing: 5331000 },
    tileId: '514_5403',
  },
  sourceTile: '514_5403',
  candidates: [],
  confirmedIds: [],
  importedAt: '2026-05-21T10:00:00.000Z',
};

const TEST_SITE_VISIT: SiteVisitImport = {
  visitId: 'visit-2026-05-21',
  visitDate: '2026-05-21',
  device: 'Fairphone',
  cameraSettings: '4:3, no flash',
  blocks: [
    {
      id: 'S01',
      photoFiles: ['2026-05-21_S01_front_01.jpg'],
      laserMeasurements: [
        {
          referencePoint: 'Front threshold',
          distanceM: 2.4,
          stationDescription: 'Two steps in front of the door',
        },
      ],
      notes: 'Front facade overview',
    },
  ],
};

describe('renovation bundle', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorage,
      configurable: true,
    });
  });

  it('exports a renovation bundle with shared envelope metadata', () => {
    const registers = loadLocalPlanningRegisters();
    registers.buildingFacts.push({
      ...createRegisterTemplate('buildingFacts'),
      id: 'local-fact-1',
      label: 'Ceiling height hallway',
      value: '2.38',
    });
    saveLocalPlanningRegisters(registers);
    saveSiteVisitImports([TEST_SITE_VISIT]);

    const initialState = createEmptyRenovationPhotoPlacementState(TEST_PROJECT.slug);
    const photoBundle = createRenovationPhotoRegistration({
      projectSlug: TEST_PROJECT.slug,
      title: 'Hallway overview',
      importSource: 'current_device',
      isHistorical: false,
      roomId: 'hallway',
    });
    saveRenovationPhotoPlacementState(upsertRenovationPhotoPlacementState(initialState, photoBundle));

    const bundle = exportRenovationBundle(TEST_PROJECT);

    expect(bundle.format).toBe('hauskompass.bundle');
    expect(bundle.bundleIntent).toBe('full_backup');
    expect(bundle.projectMode).toBe('renovation');
    expect(bundle.payloadType).toBe('renovation_bundle');
    expect(bundle.mediaTransport).toBe('inline_none');
    expect(bundle.projectRef.projectSlug).toBe(TEST_PROJECT.slug);
    expect(bundle.localRegisters.buildingFacts).toHaveLength(1);
    expect(bundle.photoPlacementState.photos).toHaveLength(1);
    expect(bundle.siteVisitImports).toHaveLength(1);
  });

  it('restores local renovation state from a bundle', () => {
    const registers = loadLocalPlanningRegisters();
    registers.assumptions.push({
      ...createRegisterTemplate('assumptions'),
      id: 'local-assumption-1',
      statement: 'Pipe route may cross stair wall',
    });
    saveLocalPlanningRegisters(registers);
    saveSiteVisitImports([TEST_SITE_VISIT]);

    const initialState = createEmptyRenovationPhotoPlacementState(TEST_PROJECT.slug);
    const photoBundle = createRenovationPhotoRegistration({
      projectSlug: TEST_PROJECT.slug,
      title: 'Archive wall opening',
      importSource: 'historical_archive',
      isHistorical: true,
      whatIsVisible: 'Open wall with visible vertical pipe.',
    });
    saveRenovationPhotoPlacementState(upsertRenovationPhotoPlacementState(initialState, photoBundle));

    const bundle = exportRenovationBundle(TEST_PROJECT);

    window.localStorage.clear();

    const restored = importRenovationBundle(bundle);

    expect(restored.slug).toBe(TEST_PROJECT.slug);
    expect(loadProject(TEST_PROJECT.slug)?.address).toBe('Test House A');
    expect(loadLocalPlanningRegisters().assumptions).toHaveLength(1);
    expect(loadRenovationPhotoPlacementState(TEST_PROJECT.slug).photos).toHaveLength(1);
    expect(loadSiteVisitImports()).toHaveLength(1);
  });
});
