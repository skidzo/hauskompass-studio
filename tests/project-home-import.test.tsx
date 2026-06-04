// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectHome } from '../src/features/project-home/ProjectHome';
import { saveProject } from '../src/features/project-store/projectStore';
import type { ImportedProject } from '../src/features/project-store/types';
import type { WorkshopBundlePayload } from '../src/features/workshop/db/workshopDb';
import { saveProjectHomeRecord, workshopProjectHomeRecord } from '../src/features/project-home/projectHomeRegistry';
import { createEmptyRenovationPhotoPlacementState } from '../src/features/renovation-planning/renovationPhotoPlacementStore';
import { createStudioBundleEnvelope } from '../src/lib/studio-core/backup/helpers';

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

const LEGACY_WORKSHOP_BUNDLE: WorkshopBundlePayload = {
  seedVersion: '9',
  projectId: 'proj-eiermann-campus',
  project: {
    id: 'proj-eiermann-campus',
    slug: 'proj-eiermann-campus',
    title: 'Eiermann-Campus Stuttgart-Vaihingen',
    description: '',
    siteId: 'site-eiermann-campus',
    projectMode: 'active',
    createdAt: '2026-05-20T08:00:00.000Z',
    updatedAt: '2026-05-20T10:15:00.000Z',
    version: '1',
    responsibleParty: '',
    sensitivityDefault: 'internal',
    publicationDefault: 'needs_review',
    characterProfile: {
      projectType: 'workshop',
      projectCharacter: 'campus',
      projectScale: 'large',
      siteComplexity: 'high',
      stakeholderComplexity: 'high',
      workshopMode: 'full',
      singleProjectMode: 'none',
      spatialModelAvailability: 'mixed',
    },
  },
  site: {
    id: 'site-eiermann-campus',
    projectId: 'proj-eiermann-campus',
    name: 'Eiermann-Campus',
    shortDescription: '',
    address: 'Workshop-Campus Demo, 70569 Stuttgart',
    geocode: undefined,
    historicalSummary: '',
    currentAccess: 'unknown',
    heritageStatus: 'unknown',
    externalRefs: [],
    sensitivityLevel: 'internal',
    publicationStatus: 'needs_review',
  },
  zones: [],
  places: [],
  assets: [],
  observations: [],
  interpretations: [],
  claims: [],
  questions: [],
  memories: [],
  eventPhases: [],
  assessments: [],
  scenarios: [],
  workshopScenes: [],
  blobAssetIds: ['A-1', 'A-2'],
  placeholderAssetIds: [],
};

const BLOCKED_RENOVATION_BUNDLE = {
  ...createStudioBundleEnvelope({
    bundleIntent: 'full_backup',
    exportedAt: '2026-05-21T12:00:00.000Z',
    projectRef: {
      projectId: TEST_PROJECT.slug,
      projectSlug: TEST_PROJECT.slug,
      title: TEST_PROJECT.address,
    },
    projectMode: 'renovation',
    payloadType: 'renovation_bundle',
    validation: {
      state: 'blocked',
      payloadValid: false,
      errors: ['payload invalid'],
    },
  }),
  project: TEST_PROJECT,
  localRegisters: {
    buildingFacts: [],
    assumptions: [],
    measurementNeeds: [],
    renovationDecisions: [],
  },
  photoPlacementState: createEmptyRenovationPhotoPlacementState(TEST_PROJECT.slug),
  siteVisitImports: [],
};

afterEach(() => {
  cleanup();
});

describe('ProjectHome renovation imports', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorage,
      configurable: true,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => [],
    }));
  });

  it('shows an imported renovation project immediately in Project Home', async () => {
    const onSelectRenovation = vi.fn();
    const { container } = render(
      <ProjectHome
        onSelectBuiltin={vi.fn()}
        onSelectRenovation={onSelectRenovation}
        onNewProject={vi.fn()}
        onStartWorkshop={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const renovationImportInput = inputs[1] as HTMLInputElement | undefined;
    expect(renovationImportInput).toBeDefined();

    const file = new File([JSON.stringify(TEST_PROJECT)], 'renovation.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify(TEST_PROJECT),
      configurable: true,
    });

    fireEvent.change(renovationImportInput!, {
      target: { files: [file] },
    });

    expect(await screen.findByText('Wiederherstellung prüfen')).toBeInTheDocument();
    expect(screen.getByText('Renovierung-Backup · Legacy-JSON')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt wiederherstellen' }));

    await waitFor(() => {
      expect(onSelectRenovation).toHaveBeenCalledWith(TEST_PROJECT.slug);
    });
    expect(await screen.findByText(TEST_PROJECT.address)).toBeInTheDocument();
  });


  it('blocks a validation-failed renovation backup before restore', async () => {
    const { container } = render(
      <ProjectHome
        onSelectBuiltin={vi.fn()}
        onSelectRenovation={vi.fn()}
        onNewProject={vi.fn()}
        onStartWorkshop={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const renovationImportInput = inputs[1] as HTMLInputElement | undefined;
    expect(renovationImportInput).toBeDefined();

    const file = new File([JSON.stringify(BLOCKED_RENOVATION_BUNDLE)], 'renovation-blocked.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify(BLOCKED_RENOVATION_BUNDLE),
      configurable: true,
    });

    fireEvent.change(renovationImportInput!, {
      target: { files: [file] },
    });

    expect(await screen.findByText('Wiederherstellung prüfen')).toBeInTheDocument();
    expect(screen.getByText(/payload invalid/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jetzt wiederherstellen' })).toBeDisabled();
  });

  it('shows an immediate error for an invalid workshop backup file', async () => {
    const { container } = render(
      <ProjectHome
        onSelectBuiltin={vi.fn()}
        onSelectRenovation={vi.fn()}
        onNewProject={vi.fn()}
        onStartWorkshop={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const workshopImportInput = inputs[0] as HTMLInputElement | undefined;
    expect(workshopImportInput).toBeDefined();

    const file = new File([JSON.stringify({ foo: 'bar' })], 'workshop-invalid.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify({ foo: 'bar' }),
      configurable: true,
    });

    fireEvent.change(workshopImportInput!, {
      target: { files: [file] },
    });

    expect(await screen.findByText(/Ungültiges Workshop-Backup/i)).toBeInTheDocument();
  });




  it('shows workshop backup cards before older renovation entries and keeps the grid scrollable', async () => {
    saveProject({
      slug: 'renovation-old',
      address: 'Altes Renovierungsprojekt',
      geocode: {
        lat: 48.1,
        lon: 11.5,
        displayName: 'Altes Renovierungsprojekt, Sampletown',
        utm32: { easting: 691000, northing: 5331000 },
        tileId: '514_5403',
      },
      sourceTile: '514_5403',
      candidates: [],
      confirmedIds: [],
      importedAt: '2026-05-20T08:00:00.000Z',
    });
    saveProjectHomeRecord(workshopProjectHomeRecord({
      projectId: 'ws-repaired-backup',
      siteId: 'site-repaired-backup',
      title: 'Repariertes Workshop-Backup',
      subtitle: 'Aus ZIP wiederhergestellt',
      location: 'Workshop-Campus Demo, 70569 Stuttgart',
      description: 'Workshop-Projekt',
      createdAt: '2026-05-21T12:00:00.000Z',
    }));

    const { container } = render(
      <ProjectHome
        onSelectBuiltin={vi.fn()}
        onSelectRenovation={vi.fn()}
        onNewProject={vi.fn()}
        onStartWorkshop={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    const grid = container.querySelector('.ph-project-grid');
    expect(grid).toHaveStyle({ maxHeight: '48rem' });

    const workshopCard = await screen.findByRole('button', { name: /Repariertes Workshop-Backup/i });
    const renovationCard = screen.getByRole('button', { name: /Altes Renovierungsprojekt/i });

    expect(workshopCard.compareDocumentPosition(renovationCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(workshopCard).toBeInTheDocument();
    expect(renovationCard).toBeInTheDocument();
  });

  it('shows a restore preview for a legacy workshop backup without envelope metadata', async () => {
    const { container } = render(
      <ProjectHome
        onSelectBuiltin={vi.fn()}
        onSelectRenovation={vi.fn()}
        onNewProject={vi.fn()}
        onStartWorkshop={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const workshopImportInput = inputs[0] as HTMLInputElement | undefined;
    expect(workshopImportInput).toBeDefined();

    const file = new File([JSON.stringify(LEGACY_WORKSHOP_BUNDLE)], 'workshop-legacy.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify(LEGACY_WORKSHOP_BUNDLE),
      configurable: true,
    });

    fireEvent.change(workshopImportInput!, {
      target: { files: [file] },
    });

    expect(await screen.findByText('Wiederherstellung prüfen')).toBeInTheDocument();
    expect(screen.getByText('Workshop-Backup · Legacy-JSON/ZIP')).toBeInTheDocument();
    expect(screen.getByText('Eiermann-Campus Stuttgart-Vaihingen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jetzt wiederherstellen' })).toBeEnabled();
  });

});
