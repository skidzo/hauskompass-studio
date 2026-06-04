// @vitest-environment jsdom
import 'fake-indexeddb/auto';

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';

vi.mock('../src/features/workshop/db/seedLoader', () => ({
  seedProject: vi.fn(async () => undefined),
}));

import type { WorkshopBundlePayload } from '../src/features/workshop/db/workshopDb';
import { importWorkshopBundleZip, workshopDb } from '../src/features/workshop/db/workshopDb';
import { WorkshopRoute } from '../src/features/workshop/WorkshopRoute';

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

describe('Workshop imported-project readiness', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(async () => {
    errorSpy.mockClear();
    warnSpy.mockClear();
    localStorage.clear();
    await workshopDb.delete();
    await workshopDb.open();
    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: vi.fn(() => 'blob:test-photo'),
        revokeObjectURL: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(async () => {
    cleanup();
    await workshopDb.delete();
  });

  afterAll(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('opens an imported legacy Workshop project and reaches the imported media in the real zone detail', async () => {
    await importWorkshopBundleZip(createLegacyWorkshopZipFile());

    render(<WorkshopRoute projectId="proj-eiermann-campus" siteId="site-eiermann-campus" />);

    const zoneButton = await screen.findByRole('button', { name: /Parkdeck/i });
    fireEvent.click(zoneButton);

    expect(await screen.findByText('Medien (1)')).toBeInTheDocument();
    expect(screen.getByText('Parkdeck Foto')).toBeInTheDocument();
    expect(screen.queryByText(/Noch keine Medien erfasst/i)).not.toBeInTheDocument();

    const blockedPatterns = [
      'No runtime config for projectId "proj-eiermann-campus"',
      '[WorkshopMap] zone_geometry load failed',
      '[WorkshopMap] campus_locations load failed',
      'seedProject failed',
    ];
    const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flatMap((call) => call.map((arg) => (typeof arg === 'string' ? arg : String(arg))));

    for (const pattern of blockedPatterns) {
      expect(messages.some((message) => message.includes(pattern))).toBe(false);
    }
  });
});
