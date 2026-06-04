// @vitest-environment jsdom
import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';

vi.mock('../src/features/project-data/projectDataLoader', () => ({
  fetchProjectJson: vi.fn(async () => {
    throw new Error('missing spatial_context.json');
  }),
}));

import type { WorkshopBundlePayload } from '../src/features/workshop/db/workshopDb';
import { exportWorkshopBundle, importWorkshopBundleZip, workshopDb } from '../src/features/workshop/db/workshopDb';
import {
  buildRoughWorkshopSpatialScene,
  loadStoredWorkshopSpatialScene,
  loadWorkshopSpatialScene,
} from '../src/features/workshop/spatial/workshopSpatialScene';

const LEGACY_WORKSHOP_PAYLOAD: WorkshopBundlePayload = {
  seedVersion: '9',
  projectId: 'proj-eiermann-campus',
  project: {
    id: 'proj-eiermann-campus',
    slug: 'eiermann-campus',
    title: 'Eiermann-Campus Stuttgart-Vaihingen',
    description: '',
    siteId: 'site-eiermann-campus',
    projectMode: 'active',
    createdAt: '2026-05-20T08:00:00.000Z',
    updatedAt: '2026-05-20T10:15:00.000Z',
    version: '1',
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
    historicalSummary: '',
    currentAccess: 'unknown',
    heritageStatus: 'unknown',
    externalRefs: [],
    sensitivityLevel: 'internal',
    publicationStatus: 'needs_review',
  },
  zones: [
    {
      id: 'zone-1',
      siteId: 'site-eiermann-campus',
      name: 'Parkdeck',
      description: 'Testzone fuer importierten Workshop',
      documentationPriority: 'medium',
      documentationStatus: 'partial',
      openQuestionIds: [],
      linkedAssetIds: ['A-1'],
      linkedAssessmentIds: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'needs_review',
      sortOrder: 0,
    },
  ],
  places: [],
  assets: [
    {
      id: 'A-1',
      projectId: 'proj-eiermann-campus',
      zoneId: 'zone-1',
      assetType: 'photo',
      title: 'Parkdeck Foto',
      fileName: 'parkdeck.jpg',
      fileSize: 3,
      mimeType: 'image/jpeg',
      tags: ['test'],
      processingStatus: 'raw',
      sensitivityLevel: 'internal',
      publicationStatus: 'needs_review',
      createdAt: '2026-05-20T08:30:00.000Z',
      updatedAt: '2026-05-20T08:30:00.000Z',
    },
  ],
  observations: [],
  interpretations: [],
  claims: [],
  questions: [],
  memories: [],
  eventPhases: [],
  assessments: [],
  scenarios: [],
  workshopScenes: [],
  blobAssetIds: ['A-1'],
  placeholderAssetIds: [],
};

function createLegacyWorkshopZipFile() {
  const archive = zipSync({
    'backup.json': strToU8(JSON.stringify(LEGACY_WORKSHOP_PAYLOAD)),
    'photos/A-1.jpg': new Uint8Array([1, 2, 3]),
  });
  const file = new File([archive], 'workshop-legacy.zip', { type: 'application/zip' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
    configurable: true,
  });
  return file;
}

describe('Workshop spatial scene fallback', () => {
  beforeEach(async () => {
    localStorage.clear();
    await workshopDb.delete();
    await workshopDb.open();
  });

  afterEach(async () => {
    await workshopDb.delete();
  });

  it('derives a rough spatial scene for imported legacy Workshop backups without bundled spatial data', async () => {
    await importWorkshopBundleZip(createLegacyWorkshopZipFile());

    const scene = await loadWorkshopSpatialScene('proj-eiermann-campus');
    expect(scene).not.toBeNull();
    expect(scene?.label).toContain('Eiermann-Campus');
    expect(scene?.sources[0]?.kind).toBe('derived');
    expect(scene?.terrain).toHaveLength(1);
    expect(scene?.buildingHulls).toHaveLength(1);
    expect(scene?.buildingHulls[0]?.levelOfDetail).toBe('workshop_sketch');
    expect(scene?.buildingHulls[0]?.verificationStatus).toBe('placeholder_geometry');

    const stored = loadStoredWorkshopSpatialScene('proj-eiermann-campus');
    expect(stored?.id).toBe(scene?.id);
  });

  it('can build a rough scene directly from imported workshop data', async () => {
    await importWorkshopBundleZip(createLegacyWorkshopZipFile());
    const project = await workshopDb.projects.get('proj-eiermann-campus');
    const site = await workshopDb.sites.get('site-eiermann-campus');
    const zones = site ? await workshopDb.zones.where('siteId').equals(site.id).toArray() : [];
    if (!project || !site) throw new Error('missing workshop import fixture');

    const scene = buildRoughWorkshopSpatialScene(project, site, zones);
    expect(scene.sources[0]?.kind).toBe('derived');
    expect(scene.buildingHulls[0]?.verificationStatus).toBe('placeholder_geometry');
    expect(scene.terrain[0]?.label).toContain('Workshop-Campus Demo');
  });

  it('round-trips the derived rough spatial scene in a Workshop backup', async () => {
    await importWorkshopBundleZip(createLegacyWorkshopZipFile());
    const before = await loadWorkshopSpatialScene('proj-eiermann-campus');
    expect(before).not.toBeNull();

    const exported = await exportWorkshopBundle('proj-eiermann-campus');
    expect(exported.spatialScene?.buildingHulls).toHaveLength(before?.buildingHulls.length ?? 0);
    expect(exported.spatialScene?.sources[0]?.kind).toBe('derived');

    const archive = zipSync({
      'backup.json': strToU8(JSON.stringify(exported)),
    });
    const roundTrippedFile = new File([archive], 'workshop-backup.zip', { type: 'application/zip' });
    Object.defineProperty(roundTrippedFile, 'arrayBuffer', {
      value: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
      configurable: true,
    });
    await workshopDb.delete();
    localStorage.clear();
    await workshopDb.open();
    await importWorkshopBundleZip(roundTrippedFile);

    const after = await loadWorkshopSpatialScene('proj-eiermann-campus');
    expect(after).not.toBeNull();
    expect(after?.buildingHulls).toHaveLength(before?.buildingHulls.length ?? 0);
    expect(after?.sources[0]?.kind).toBe('derived');
  });
});
