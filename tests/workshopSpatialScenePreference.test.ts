// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/project-data/projectDataLoader', () => ({
  fetchProjectJson: vi.fn(async (_projectId: string, fileName: string) => {
    if (fileName !== 'spatial_context.json') {
      throw new Error(`unexpected file ${fileName}`);
    }
    return {
      id: 'static-scene',
      projectId: 'proj-eiermann-campus',
      siteId: 'site-eiermann-campus',
      label: 'Static workshop scene',
      sources: [{ id: 'static-source', label: 'Static source', kind: 'lod2' }],
      terrain: [{
        id: 'terrain-static',
        label: 'Static terrain',
        sourceId: 'static-source',
        confidence: 'verified',
        verificationStatus: 'verified_geometry',
        bounds: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 0, z: 1 } },
        vertices: [{ x: -1, y: 0, z: -1 }, { x: 1, y: 0, z: -1 }, { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }],
        faces: [[0, 1, 2], [0, 2, 3]] as [number, number, number][],
      }],
      buildingHulls: [{
        id: 'hull-static',
        label: 'Static hull',
        zoneId: 'zone-1',
        sourceId: 'static-source',
        confidence: 'verified',
        verificationStatus: 'verified_geometry',
        levelOfDetail: 'lod2',
        footprint: [
          { x: 0, y: 0, z: 0 },
          { x: 5, y: 0, z: 0 },
          { x: 5, y: 0, z: 5 },
          { x: 0, y: 0, z: 5 },
        ],
        baseElevation: 0,
        height: 10,
      }],
      vegetation: [],
      evidenceLinks: [],
    };
  }),
}));

import type { Site, WorkshopProject, Zone } from '../src/domain/workshop/types';
import { fetchProjectJson } from '../src/features/project-data/projectDataLoader';
import { buildFallbackWorkshopCampusLocations, buildFallbackWorkshopZoneGeometry } from '../src/features/workshop/rendering/workshopMapAdapter';
import { buildRoughWorkshopSpatialScene, loadWorkshopSpatialScene, saveStoredWorkshopSpatialScene } from '../src/features/workshop/spatial/workshopSpatialScene';

describe('Workshop spatial scene preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the rough backup geometry when no static spatial scene is available', async () => {
    vi.mocked(fetchProjectJson).mockRejectedValueOnce(new Error('missing spatial_context.json'));

    const project: WorkshopProject = {
      id: 'proj-eiermann-campus',
      slug: 'proj-eiermann-campus',
      title: 'Eiermann-Campus Stuttgart-Vaihingen',
      description: '',
      siteId: 'site-eiermann-campus',
      projectMode: 'active',
      createdAt: '2026-05-20T08:00:00.000Z',
      updatedAt: '2026-05-20T10:15:00.000Z',
      version: '1',
      sensitivityDefault: 'internal',
      publicationDefault: 'needs_review',
    };
    const site: Site = {
      id: 'site-eiermann-campus',
      projectId: 'proj-eiermann-campus',
      name: 'Eiermann-Campus',
      shortDescription: '',
      address: 'Workshop-Campus Demo, 70569 Stuttgart',
      historicalSummary: '',
      currentAccess: 'unknown',
      heritageStatus: 'unknown',
      externalRefs: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'needs_review',
    };
    const zones: Zone[] = [{
      id: 'zone-1',
      siteId: 'site-eiermann-campus',
      name: 'Parkdeck',
      description: 'Testzone',
      documentationPriority: 'medium',
      documentationStatus: 'partial',
      openQuestionIds: [],
      linkedAssetIds: [],
      linkedAssessmentIds: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'needs_review',
      sortOrder: 0,
    }];

    saveStoredWorkshopSpatialScene(project.id, buildRoughWorkshopSpatialScene(project, site, zones));

    const scene = await loadWorkshopSpatialScene(project.id);
    expect(scene).not.toBeNull();
    expect(scene?.label).toBe('Grobe 3D-Szene · Eiermann-Campus Stuttgart-Vaihingen');
    expect(scene?.sources[0]?.kind).toBe('derived');
    expect(scene?.buildingHulls).toHaveLength(1);
    expect(scene?.buildingHulls[0]?.levelOfDetail).toBe('workshop_sketch');
    expect(scene?.buildingHulls[0]?.verificationStatus).toBe('placeholder_geometry');
  });

  it('prefers fetched static scene data over a rough stored fallback', async () => {
    const project: WorkshopProject = {
      id: 'proj-eiermann-campus',
      slug: 'proj-eiermann-campus',
      title: 'Eiermann-Campus Stuttgart-Vaihingen',
      description: '',
      siteId: 'site-eiermann-campus',
      projectMode: 'active',
      createdAt: '2026-05-20T08:00:00.000Z',
      updatedAt: '2026-05-20T10:15:00.000Z',
      version: '1',
      sensitivityDefault: 'internal',
      publicationDefault: 'needs_review',
    };
    const site: Site = {
      id: 'site-eiermann-campus',
      projectId: 'proj-eiermann-campus',
      name: 'Eiermann-Campus',
      shortDescription: '',
      address: 'Workshop-Campus Demo, 70569 Stuttgart',
      historicalSummary: '',
      currentAccess: 'unknown',
      heritageStatus: 'unknown',
      externalRefs: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'needs_review',
    };
    const zones: Zone[] = [{
      id: 'zone-1',
      siteId: 'site-eiermann-campus',
      name: 'Parkdeck',
      description: 'Testzone',
      documentationPriority: 'medium',
      documentationStatus: 'partial',
      openQuestionIds: [],
      linkedAssetIds: [],
      linkedAssessmentIds: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'needs_review',
      sortOrder: 0,
    }];

    saveStoredWorkshopSpatialScene(project.id, buildRoughWorkshopSpatialScene(project, site, zones));

    const scene = await loadWorkshopSpatialScene(project.id);
    expect(scene).not.toBeNull();
    expect(scene?.label).toBe('Static workshop scene');
    expect(scene?.buildingHulls[0]?.levelOfDetail).toBe('lod2');
    expect(scene?.sources[0]?.kind).toBe('lod2');
  });

  it('derives zone centroids from a fetched static spatial scene', async () => {
    const scene = await loadWorkshopSpatialScene('proj-eiermann-campus');
    expect(scene).not.toBeNull();
    expect(scene?.label).toBe('Static workshop scene');

    const zones: Zone[] = [buildTestZone('zone-1', 'Static hull')];
    const anchor = { lon: 9, lat: 48 };
    const locs = buildFallbackWorkshopCampusLocations(scene!, zones, anchor);

    expect(locs).toHaveLength(1);
    expect(locs[0]?.zoneId).toBe('zone-1');
    expect(Number.isFinite(locs[0]?.lat)).toBe(true);
    expect(Number.isFinite(locs[0]?.lon)).toBe(true);
  });

  it('builds map polygons and campus markers from a fetched static scene', async () => {
    const scene = await loadWorkshopSpatialScene('proj-eiermann-campus');
    expect(scene).not.toBeNull();
    expect(scene?.label).toBe('Static workshop scene');

    const zones: Zone[] = [buildTestZone('zone-1', 'Static hull')];
    const anchor = { lon: 9, lat: 48 };

    const geojson = buildFallbackWorkshopZoneGeometry(scene!, zones, anchor);
    expect(geojson).not.toBeNull();
    expect(geojson!.features).toHaveLength(1);
    expect(geojson!.features[0]?.properties.zoneId).toBe('zone-1');

    const locations = buildFallbackWorkshopCampusLocations(scene!, zones, anchor);
    expect(locations).toHaveLength(1);
    expect(locations.every((l) => Number.isFinite(l.lat) && Number.isFinite(l.lon))).toBe(true);
    expect(locations[0]?.zoneId).toBe('zone-1');
  });
});

function buildTestZone(id: string, name: string): Zone {
  return {
    id,
    siteId: 'site-eiermann-campus',
    name,
    description: '',
    documentationPriority: 'medium',
    documentationStatus: 'partial',
    openQuestionIds: [],
    linkedAssetIds: [],
    linkedAssessmentIds: [],
    sensitivityLevel: 'internal',
    publicationStatus: 'needs_review',
    sortOrder: 0,
  };
}
