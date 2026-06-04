/**
 * field-readiness.test.ts
 *
 * Tests for the Field-Readiness Micro-Sprint:
 *   1. computeZoneDocLevel — pure function (no DB)
 *   2. computeAssetCompleteness — pure function (no DB)
 *   3. WorkshopBundleExport structure — using Dexie (fake-indexeddb)
 *   4. saveAsset without blob (placeholder) — does not throw
 */

// Polyfill IndexedDB for test environment (must be first import)
import 'fake-indexeddb/auto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    computeAssetCompleteness,
    computeZoneDocLevel,
} from '../src/features/workshop/completeness';
import {
    assetHasBlob,
    exportWorkshopBundle,
    inspectWorkshopBundleImport,
    saveAsset,
    updateAssetSpatialContext,
    workshopDb,
} from '../src/features/workshop/db/workshopDb';

// ---------------------------------------------------------------------------
// 1. computeZoneDocLevel — pure
// ---------------------------------------------------------------------------

describe('computeZoneDocLevel', () => {
    it('returns empty when no assets', () => {
        expect(computeZoneDocLevel(0, 0, 0)).toBe('empty');
    });

    it('returns assets_only when assets but no observations', () => {
        expect(computeZoneDocLevel(3, 0, 0)).toBe('assets_only');
    });

    it('returns observed when observations but no interpretations', () => {
        expect(computeZoneDocLevel(3, 2, 0)).toBe('observed');
    });

    it('returns interpreted when at least one interpretation', () => {
        expect(computeZoneDocLevel(3, 2, 1)).toBe('interpreted');
    });

    it('returns interpreted even without assets or observations if interp > 0', () => {
        // Edge case: interp added before assets (unusual but valid)
        expect(computeZoneDocLevel(0, 0, 1)).toBe('interpreted');
    });
});

// ---------------------------------------------------------------------------
// 2. computeAssetCompleteness — pure
// ---------------------------------------------------------------------------

describe('computeAssetCompleteness', () => {
    const fullAsset = {
        title: 'Parkdeck Ostseite',
        zoneId: 'z-parkdeck-1',
        sensitivityLevel: 'public' as const,
        publicationStatus: 'publishable' as const,
    };

    it('returns no warnings for a complete asset with blob', () => {
        expect(computeAssetCompleteness(fullAsset, true)).toEqual([]);
    });

    it('flags no_media for placeholder (no blob)', () => {
        const warnings = computeAssetCompleteness(fullAsset, false);
        expect(warnings).toContain('no_media');
        expect(warnings).not.toContain('missing_title');
    });

    it('flags missing_title when title is empty', () => {
        const warnings = computeAssetCompleteness({ ...fullAsset, title: '' }, true);
        expect(warnings).toContain('missing_title');
    });

    it('flags missing_title when title is whitespace', () => {
        const warnings = computeAssetCompleteness({ ...fullAsset, title: '   ' }, true);
        expect(warnings).toContain('missing_title');
    });

    it('flags missing_zone when zoneId is absent', () => {
        const warnings = computeAssetCompleteness({ ...fullAsset, zoneId: undefined }, true);
        expect(warnings).toContain('missing_zone');
    });

    it('flags missing_sensitivity when sensitivityLevel is unknown', () => {
        const warnings = computeAssetCompleteness({ ...fullAsset, sensitivityLevel: 'unknown' as const }, true);
        expect(warnings).toContain('missing_sensitivity');
    });

    it('flags missing_publication when publicationStatus is needs_review', () => {
        const warnings = computeAssetCompleteness({ ...fullAsset, publicationStatus: 'needs_review' as const }, true);
        expect(warnings).toContain('missing_publication');
    });

    it('returns multiple warnings for an empty placeholder', () => {
        const warnings = computeAssetCompleteness(
            { title: '', zoneId: undefined, sensitivityLevel: 'unknown' as const, publicationStatus: 'needs_review' as const },
            false,
        );
        expect(warnings).toContain('missing_title');
        expect(warnings).toContain('missing_zone');
        expect(warnings).toContain('missing_sensitivity');
        expect(warnings).toContain('no_media');
    });
});

// ---------------------------------------------------------------------------
// 3 + 4. DB-based tests: placeholder assets + export bundle
// ---------------------------------------------------------------------------

const TEST_PROJECT_ID = 'proj-field-readiness-test';
const TEST_SITE_ID = 'site-test';
const TEST_ZONE_ID = 'z-test-zone';

const placeholderAssetId = 'A-PLACEHOLDER-TEST-001';
const blobAssetId = 'A-BLOB-TEST-001';

beforeAll(async () => {
    // Seed a minimal project so exportWorkshopBundle has a project to reference
    await workshopDb.projects.put({
        id: TEST_PROJECT_ID,
        slug: 'field-readiness-test',
        title: 'Field Readiness Test Project',
        description: 'Automated test project',
        siteId: TEST_SITE_ID,
        projectMode: 'active',
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-01T00:00:00',
        version: '0.0.1',
        sensitivityDefault: 'internal',
        publicationDefault: 'internal_only',
    });

    await workshopDb.sites.put({
        id: TEST_SITE_ID,
        projectId: TEST_PROJECT_ID,
        name: 'Field Readiness Test Site',
        shortDescription: 'Automated test site',
        currentAccess: 'unknown',
        sensitivityLevel: 'internal',
        publicationStatus: 'internal_only',
    });

    // Save a placeholder asset (no blob)
    await saveAsset({
        id: placeholderAssetId,
        projectId: TEST_PROJECT_ID,
        zoneId: TEST_ZONE_ID,
        assetType: 'other',
        title: 'Standort-Notiz ohne Medium',
        tags: ['test'],
        processingStatus: 'raw',
        sensitivityLevel: 'internal',
        publicationStatus: 'internal_only',
        createdAt: '2026-05-17T10:00:00',
        updatedAt: '2026-05-17T10:00:00',
    }); // no blob argument

    // Save a real asset with a blob
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    await saveAsset({
        id: blobAssetId,
        projectId: TEST_PROJECT_ID,
        zoneId: TEST_ZONE_ID,
        assetType: 'photo',
        title: 'Test Foto mit Blob',
        tags: ['test'],
        processingStatus: 'raw',
        sensitivityLevel: 'public',
        publicationStatus: 'publishable',
        createdAt: '2026-05-17T10:01:00',
        updatedAt: '2026-05-17T10:01:00',
    }, blob);
});

afterAll(async () => {
    await workshopDb.assets.delete(placeholderAssetId);
    await workshopDb.assets.delete(blobAssetId);
    await workshopDb.assetBlobs.delete(blobAssetId);
    await workshopDb.sites.delete(TEST_SITE_ID);
    await workshopDb.projects.delete(TEST_PROJECT_ID);
});

describe('saveAsset without blob (placeholder)', () => {
    it('saves the asset metadata record', async () => {
        const stored = await workshopDb.assets.get(placeholderAssetId);
        expect(stored).toBeDefined();
        expect(stored?.title).toBe('Standort-Notiz ohne Medium');
    });

    it('does not create a blob entry', async () => {
        const hasBlob = await assetHasBlob(placeholderAssetId);
        expect(hasBlob).toBe(false);
    });

    it('does not fail when called without blob argument', async () => {
        // Idempotent re-save — should not throw
        await expect(
            saveAsset({
                id: placeholderAssetId,
                projectId: TEST_PROJECT_ID,
                zoneId: TEST_ZONE_ID,
                assetType: 'other',
                title: 'Re-saved placeholder',
                tags: [],
                processingStatus: 'raw',
                sensitivityLevel: 'internal',
                publicationStatus: 'internal_only',
                createdAt: '2026-05-17T10:00:00',
                updatedAt: '2026-05-17T10:05:00',
            }),
        ).resolves.toBeUndefined();
    });
});

describe('assetHasBlob', () => {
    it('returns false for placeholder asset', async () => {
        expect(await assetHasBlob(placeholderAssetId)).toBe(false);
    });

    it('returns true for asset with blob', async () => {
        expect(await assetHasBlob(blobAssetId)).toBe(true);
    });

    it('returns false for non-existent asset', async () => {
        expect(await assetHasBlob('nonexistent-id')).toBe(false);
    });
});

describe('updateAssetSpatialContext', () => {
    it('updates explicit spatial review fields on an existing asset', async () => {
        await updateAssetSpatialContext(blobAssetId, {
            targetZoneId: 'z-kantine-gemeinschaft',
            linkedSpatialObjectId: 'loc-kantine',
            bearingConfidence: 'verified',
            spatialNotes: 'Blick zur Kantine von der Suedseite',
        });
        const stored = await workshopDb.assets.get(blobAssetId);
        expect(stored?.targetZoneId).toBe('z-kantine-gemeinschaft');
        expect(stored?.linkedSpatialObjectId).toBe('loc-kantine');
        expect(stored?.bearingConfidence).toBe('verified');
        expect(stored?.spatialNotes).toBe('Blick zur Kantine von der Suedseite');
    });
});

describe('exportWorkshopBundle', () => {
    it('returns expected top-level keys', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        expect(bundle).toHaveProperty('exportedAt');
        expect(bundle).toHaveProperty('projectId', TEST_PROJECT_ID);
        expect(bundle).toHaveProperty('assets');
        expect(bundle).toHaveProperty('blobAssetIds');
        expect(bundle).toHaveProperty('placeholderAssetIds');
        expect(bundle).toHaveProperty('zones');
        expect(bundle).toHaveProperty('observations');
        expect(bundle).toHaveProperty('interpretations');
        expect(bundle).toHaveProperty('memories');
        expect(bundle).toHaveProperty('format', 'hauskompass.bundle');
        expect(bundle).toHaveProperty('bundleIntent', 'full_backup');
        expect(bundle).toHaveProperty('projectMode', 'workshop');
        expect(bundle).toHaveProperty('payloadType', 'workshop_bundle');
    });

    it('includes placeholder asset in assets array', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        const ids = bundle.assets.map((a) => a.id);
        expect(ids).toContain(placeholderAssetId);
    });

    it('correctly classifies placeholder vs blob assets', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        expect(bundle.placeholderAssetIds).toContain(placeholderAssetId);
        expect(bundle.blobAssetIds).toContain(blobAssetId);
        expect(bundle.placeholderAssetIds).not.toContain(blobAssetId);
        expect(bundle.blobAssetIds).not.toContain(placeholderAssetId);
    });

    it('does not include blob binary data in bundle', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        // Verify no blob data is embedded (only metadata)
        for (const asset of bundle.assets) {
            expect(asset).not.toHaveProperty('blob');
        }
        // The bundle itself should not have a blobs array with data
        expect(bundle).not.toHaveProperty('blobs');
    });

    it('exports project metadata', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        expect(bundle.project?.id).toBe(TEST_PROJECT_ID);
        expect(bundle.project?.title).toBe('Field Readiness Test Project');
        expect(bundle.projectRef.projectId).toBe(TEST_PROJECT_ID);
        expect(bundle.projectRef.title).toBe('Field Readiness Test Project');
    });

    it('exportedAt is a valid ISO string', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        expect(() => new Date(bundle.exportedAt)).not.toThrow();
        expect(new Date(bundle.exportedAt).getFullYear()).toBeGreaterThan(2024);
    });

    it('inspects valid workshop bundles with project metadata', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        const inspection = inspectWorkshopBundleImport(bundle, bundle.blobAssetIds.length);
        expect(inspection.ok).toBe(true);
        expect(inspection.projectId).toBe(TEST_PROJECT_ID);
        expect(inspection.siteId).toBe(TEST_SITE_ID);
        expect(inspection.title).toBe('Field Readiness Test Project');
    });

    it('warns when zip photo blobs are missing from inspection', async () => {
        const bundle = await exportWorkshopBundle(TEST_PROJECT_ID);
        const inspection = inspectWorkshopBundleImport(bundle, 0);
        expect(inspection.ok).toBe(true);
        expect(inspection.warnings.join(' ')).toContain('ZIP-Inhalt unvollständig');
    });
});

// ---------------------------------------------------------------------------
// 5. Completeness summary aggregation — pure logic
// ---------------------------------------------------------------------------

describe('zone completeness summary', () => {
    it('counts all zones correctly across doc levels', () => {
        const zones = [
            { id: 'z-a', assets: 0, obs: 0, interp: 0 },
            { id: 'z-b', assets: 3, obs: 0, interp: 0 },
            { id: 'z-c', assets: 3, obs: 2, interp: 0 },
            { id: 'z-d', assets: 3, obs: 2, interp: 1 },
        ];
        const counts: Record<string, number> = { empty: 0, assets_only: 0, observed: 0, interpreted: 0 };
        for (const z of zones) {
            const lvl = computeZoneDocLevel(z.assets, z.obs, z.interp);
            counts[lvl]++;
        }
        expect(counts.empty).toBe(1);
        expect(counts.assets_only).toBe(1);
        expect(counts.observed).toBe(1);
        expect(counts.interpreted).toBe(1);
    });

    it('all-empty project has 100% empty', () => {
        const counts: Record<string, number> = { empty: 0, assets_only: 0, observed: 0, interpreted: 0 };
        for (let i = 0; i < 15; i++) {
            counts[computeZoneDocLevel(0, 0, 0)]++;
        }
        expect(counts.empty).toBe(15);
        expect(counts.assets_only + counts.observed + counts.interpreted).toBe(0);
    });
});
