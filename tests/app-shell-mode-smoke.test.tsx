// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/project-home/ProjectHome', () => ({
  ProjectHome: ({ onSelectBuiltin, onNewProject }: any) => (
    <div>
      <button onClick={() => onSelectBuiltin({
        id: 'pascal-workshop',
        projectId: 'ws-pascal',
        siteId: 'site-pascal',
        title: 'Workshop-Campus Demo',
        subtitle: 'Fixe Release-Adresse',
        type: 'workshop',
        location: 'Workshop-Campus Demo, 70569 Stuttgart',
        description: 'Workshop smoke fixture',
      })}>
        Projekt Workshop-Campus Demo öffnen
      </button>
      <button onClick={onNewProject}>Neues Projekt anlegen</button>
    </div>
  ),
}));

vi.mock('../src/features/new-project/NewProjectWizard', () => ({
  NewProjectWizard: ({ onProjectActivated }: any) => (
    <div>
      <h1>Neues Projekt anlegen</h1>
      <button onClick={() => onProjectActivated('renovation-demo_20260522')}>
        Renovierungsprojekt aktivieren
      </button>
    </div>
  ),
}));

vi.mock('../src/features/workshop/WorkshopRoute', () => ({
  WorkshopRoute: ({ projectId, siteId }: any) => (
    <div>WorkshopRoute:{projectId}:{siteId}</div>
  ),
}));

vi.mock('../src/features/workshop/db/seedLoader', () => ({
  seedProject: vi.fn(async () => undefined),
}));

vi.mock('../src/features/workshop/hooks/useWorkshopData', () => ({
  useZones: vi.fn(() => []),
  useGpsAssets: vi.fn(() => []),
}));

vi.mock('../src/features/workshop/components/WorkshopMapPanel', () => ({ WorkshopMapPanel: () => <div>WorkshopMapPanel</div> }));
vi.mock('../src/features/workshop/components/Workshop3DPanel', () => ({ Workshop3DPanel: () => <div>Workshop3DPanel</div> }));
vi.mock('../src/features/workshop/components/GpsMetadataPanel', () => ({ GpsMetadataPanel: () => <div>GpsMetadataPanel</div> }));
vi.mock('../src/features/workshop/components/BulkImportPanel', () => ({ BulkImportPanel: () => <div>BulkImportPanel</div> }));
vi.mock('../src/features/workshop/WorkshopQuickStartDialog', () => ({ WorkshopQuickStartDialog: () => <div>WorkshopQuickStartDialog</div> }));

vi.mock('../src/features/map-view/ImportedSiteMapPanel', () => ({
  ImportedSiteMapPanel: ({ project }: any) => <div>ImportedSiteMapPanel:{project.address}</div>,
}));
vi.mock('../src/features/renovation-planning/RenovationPlanningPanel', () => ({
  RenovationPlanningPanel: ({ project }: any) => <div>RenovationPlanningPanel:{project?.address ?? 'none'}</div>,
}));
vi.mock('../src/features/ifc-viewer/IFCViewerPanel', () => ({ IFCViewerPanel: () => <div>IFCViewerPanel</div> }));
vi.mock('../src/features/three-viewer/LoD2SurfaceViewer', () => ({ LoD2SurfaceViewer: () => <div>LoD2SurfaceViewer</div> }));
vi.mock('../src/features/building-parts/Part1ElementPlanPanel', () => ({ Part1ElementPlanPanel: () => <div>Part1ElementPlanPanel</div> }));
vi.mock('../src/features/building-parts/Part1SectionDrawingsPanel', () => ({ Part1SectionDrawingsPanel: () => <div>Part1SectionDrawingsPanel</div> }));
vi.mock('../src/features/terrain/TerrainSamplingPanel', () => ({ TerrainSamplingPanel: () => <div>TerrainSamplingPanel</div> }));
vi.mock('../src/features/terrain/TerrainCrossSectionPanel', () => ({ TerrainCrossSectionPanel: () => <div>TerrainCrossSectionPanel</div> }));
vi.mock('../src/features/terrain/TerrainCrossSectionEWPanel', () => ({ TerrainCrossSectionEWPanel: () => <div>TerrainCrossSectionEWPanel</div> }));
vi.mock('../src/features/building-hull-import/BuildingEvidencePanel', () => ({ BuildingEvidencePanel: () => <div>BuildingEvidencePanel</div> }));
vi.mock('../src/features/building-hull-import/ConfirmedObjectPanel', () => ({ ConfirmedObjectPanel: () => <div>ConfirmedObjectPanel</div> }));
vi.mock('../src/features/building-hull-import/BuildingCandidateTable', () => ({ BuildingCandidateTable: () => <div>BuildingCandidateTable</div> }));
vi.mock('../src/features/building-hull-import/SurfaceMetricsTable', () => ({ SurfaceMetricsTable: () => <div>SurfaceMetricsTable</div> }));
vi.mock('../src/features/assessment/CombinedHullMetricsPanel', () => ({ CombinedHullMetricsPanel: () => <div>CombinedHullMetricsPanel</div> }));
vi.mock('../src/features/assessment/EvidenceInspectionPanel', () => ({ EvidenceInspectionPanel: () => <div>EvidenceInspectionPanel</div> }));
vi.mock('../src/features/data-inventory/DataInventoryPanel', () => ({ DataInventoryPanel: () => <div>DataInventoryPanel</div> }));
vi.mock('../src/features/renovation-dashboard/AssessmentReadinessPanel', () => ({ AssessmentReadinessPanel: () => <div>AssessmentReadinessPanel</div> }));
vi.mock('../src/features/renovation-dashboard/MissingMeasurementsPanel', () => ({ MissingMeasurementsPanel: () => <div>MissingMeasurementsPanel</div> }));
vi.mock('../src/features/scenarios/ScenarioRegistryPanel', () => ({ ScenarioRegistryPanel: () => <div>ScenarioRegistryPanel</div> }));
vi.mock('../src/features/metadata/MetadataExplorerPanel', () => ({ MetadataExplorerPanel: () => <div>MetadataExplorerPanel</div> }));
vi.mock('../src/features/deconstruction/InspectionShotListPanel', () => ({ InspectionShotListPanel: () => <div>InspectionShotListPanel</div> }));
vi.mock('../src/features/deconstruction/MaterialReusePanel', () => ({ MaterialReusePanel: () => <div>MaterialReusePanel</div> }));
vi.mock('../src/features/deconstruction/SolarPvPlanPanel', () => ({ SolarPvPlanPanel: () => <div>SolarPvPlanPanel</div> }));
vi.mock('../src/features/map-view/LocationContextPanel', () => ({ LocationContextPanel: () => <div>LocationContextPanel</div> }));
vi.mock('../src/features/showcase/ShowcaseRoute', () => ({ ShowcaseRoute: () => <div>ShowcaseRoute</div> }));

import { App } from '../src/app/App';
import type { ImportedProject } from '../src/features/project-store/types';

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
  return {
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
    derivedData: {
      terrain: {
        sourceFingerprint: '{"sourceTile":"750_5480","confirmedIds":["c1"],"candidates":[{"id":"c1","bbox":{"minE":1,"maxE":2,"minN":3,"maxN":4,"minZ":0,"maxZ":8},"surfaceCounts":{"ground":0,"wall":0,"roof":0}}]}',
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
        sourceFingerprint: '{"sourceTile":"750_5480","confirmedIds":["c1"],"candidates":[{"id":"c1","bbox":{"minE":1,"maxE":2,"minN":3,"maxN":4,"minZ":0,"maxZ":8},"surfaceCounts":{"ground":0,"wall":0,"roof":0}}]}',
        generatedAt: '2026-05-22T10:05:00.000Z',
        generatorVersion: 'lod2-ifc-v1',
        payload: 'IFC-REVISIT-CONTENT',
      },
    },
  };
}


afterEach(() => {
  cleanup();
});

describe('App shell release smoke', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', hash: '' },
      configurable: true,
      writable: true,
    });
  });

  it('lands in Workshop mode when the fixed workshop project is selected from ProjectHome', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Projekt Workshop-Campus Demo öffnen' }));

    // After navigation the WorkshopMapPanel (default section 'map') should be visible
    await waitFor(() => {
      expect(screen.getByText('WorkshopMapPanel')).toBeInTheDocument();
    });
  });

  it('lands in Renovation mode after project activation from the wizard', async () => {
    const project = makeProject();
    localStorage.setItem('hk_project_list', JSON.stringify([project.slug]));
    localStorage.setItem(`hk_project_${project.slug}`, JSON.stringify(project));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Neues Projekt anlegen' }));
    expect(await screen.findByRole('heading', { name: 'Neues Projekt anlegen' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Renovierungsprojekt aktivieren' }));

    await waitFor(() => {
      expect(screen.getByText('ImportedSiteMapPanel:Demohaus BY 31, 92526 Beispielstadt')).toBeInTheDocument();
    });
    expect(screen.getByText('Lage — Demohaus BY 31, 92526 Beispielstadt')).toBeInTheDocument();
  });

  it('starts at Home screen even when an active saved project exists in localStorage', async () => {
    const project = makeProject();
    localStorage.setItem('hk_project_list', JSON.stringify([project.slug]));
    localStorage.setItem(`hk_project_${project.slug}`, JSON.stringify(project));
    localStorage.setItem('hk_active_project', project.slug);

    render(<App />);

    // App always starts at Home now; saved project does not auto-navigate
    expect(await screen.findByRole('button', { name: 'Projekt Workshop-Campus Demo öffnen' })).toBeInTheDocument();
    expect(screen.queryByText(/ImportedSiteMapPanel/)).not.toBeInTheDocument();
  });

  it('starts directly in Renovation mode when URL hash points to a saved project', async () => {
    const project = makeProject();
    localStorage.setItem('hk_project_list', JSON.stringify([project.slug]));
    localStorage.setItem(`hk_project_${project.slug}`, JSON.stringify(project));
    // Simulate URL: #/renovation/renovation-demo_20260522/site
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', hash: '#/renovation/renovation-demo_20260522/site' },
      configurable: true,
      writable: true,
    });

    render(<App />);

    expect(await screen.findByText('ImportedSiteMapPanel:Demohaus BY 31, 92526 Beispielstadt')).toBeInTheDocument();
  });
});
