// @vitest-environment jsdom
import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';

import type { WorkshopBundlePayload } from '../src/features/workshop/db/workshopDb';
import {
  importWorkshopBundleZip,
  inspectWorkshopBundleZipFile,
  workshopDb,
} from '../src/features/workshop/db/workshopDb';

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
      description: 'Testzone',
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

describe('legacy Workshop ZIP import', () => {
  beforeEach(async () => {
    localStorage.clear();
    await workshopDb.delete();
    await workshopDb.open();
  });

  afterEach(async () => {
    await workshopDb.delete();
  });

  it('inspects a legacy Workshop ZIP as importable', async () => {
    const file = createLegacyWorkshopZipFile();
    const { inspection, photoEntries } = await inspectWorkshopBundleZipFile(file);

    expect(inspection.ok).toBe(true);
    expect(inspection.projectId).toBe('proj-eiermann-campus');
    expect(inspection.siteId).toBe('site-eiermann-campus');
    expect(inspection.title).toBe('Eiermann-Campus Stuttgart-Vaihingen');
    expect(inspection.expectedBlobCount).toBe(1);
    expect(inspection.providedBlobCount).toBe(1);
    expect(photoEntries).toHaveLength(1);
  });

  it('imports a legacy Workshop ZIP and restores both metadata and blob', async () => {
    const file = createLegacyWorkshopZipFile();

    const result = await importWorkshopBundleZip(file);

    expect(result).toEqual({
      projectId: 'proj-eiermann-campus',
      siteId: 'site-eiermann-campus',
      title: 'Eiermann-Campus Stuttgart-Vaihingen',
    });

    const storedProject = await workshopDb.projects.get('proj-eiermann-campus');
    const storedAsset = await workshopDb.assets.get('A-1');
    const storedBlobEntry = await workshopDb.assetBlobs.get('A-1');

    expect(storedProject?.title).toBe('Eiermann-Campus Stuttgart-Vaihingen');
    expect(storedAsset?.fileName).toBe('parkdeck.jpg');
    expect(storedAsset?.mimeType).toBe('image/jpeg');
    expect(storedBlobEntry?.id).toBe('A-1');
  });
});
