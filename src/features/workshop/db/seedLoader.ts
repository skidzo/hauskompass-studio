/**
 * Seed loader — populates the WorkshopDatabase from project JSON seed files
 * on first run (idempotent: skips if project already exists in DB).
 *
 * Import and call `seedProject(projectId)` once at app start.
 */

import type { WorkshopProjectBundle } from '@/domain/workshop/types';
import { fetchProjectSeedJson, getProjectMediaManifestUrl, resolveRuntimeProjectConfig } from '@/features/project-data/projectDataLoader';
import { readExifData } from '@/features/workshop/ingest/exifReader';
import { generateThumbnail } from '@/features/workshop/ingest/thumbnailGenerator';
import { saveAsset, workshopDb, type AssetRecord } from './workshopDb';
import { getWorkshopMediaRestoreVersionKey, getWorkshopSeedVersionKey } from './workshopProjectStorageKeys';

async function fetchSeedBundle(projectId: string): Promise<WorkshopProjectBundle> {

    const [project, site, zones, observations, claims, questions, memories, eventPhases, workshopScenes] =
        await Promise.all([
            fetchProjectSeedJson(projectId, 'project.json'),
            fetchProjectSeedJson(projectId, 'site.json'),
            fetchProjectSeedJson(projectId, 'zones.json'),
            fetchProjectSeedJson(projectId, 'observations.json'),
            fetchProjectSeedJson(projectId, 'claims.json'),
            fetchProjectSeedJson(projectId, 'questions.json'),
            fetchProjectSeedJson(projectId, 'memories.json'),
            fetchProjectSeedJson(projectId, 'event_phases.json'),
            fetchProjectSeedJson(projectId, 'workshop_scenes.json'),
        ]);

    return {
        project,
        site,
        zones,
        places: [],
        assets: [],
        observations,
        interpretations: [],
        claims,
        questions,
        memories,
        eventPhases,
        assessments: [],
        scenarios: [],
        workshopScenes,
    } as unknown as WorkshopProjectBundle;
}

/**
 * Bump this version string whenever seed data changes.
 * On mismatch the existing seed is cleared and reloaded.
 */
const SEED_VERSION = '9';
const MEDIA_RESTORE_VERSION = '2';

/** Returns true if the given project is already in the database. */
export async function isProjectSeeded(projectId: string): Promise<boolean> {
    const existing = await workshopDb.projects.get(projectId);
    return !!existing;
}

/**
 * Load all project seed data into IndexedDB.
 * Re-seeds when SEED_VERSION changes (clears stale data first).
 */
export async function seedProject(projectId: string): Promise<void> {
    const seedVersionKey = getWorkshopSeedVersionKey(projectId);
    const storedVersion = localStorage.getItem(seedVersionKey);
    const alreadySeeded = await workshopDb.projects.get(projectId);

    if (alreadySeeded && storedVersion === SEED_VERSION) {
        await restoreProjectMediaFromManifest(projectId);
        return;
    }

    // Stale version: clear and re-seed
    if (alreadySeeded && storedVersion !== SEED_VERSION) {
        await clearProjectSeed(projectId);
    }

    // Cast seed data — JSON imports are plain objects matching our types
    const bundle = await fetchSeedBundle(projectId);

    // Use a single Dexie transaction for atomicity
    await workshopDb.transaction(
        'rw',
        [
            workshopDb.projects,
            workshopDb.sites,
            workshopDb.zones,
            workshopDb.places,
            workshopDb.assets,
            workshopDb.observations,
            workshopDb.interpretations,
            workshopDb.claims,
            workshopDb.questions,
            workshopDb.memories,
            workshopDb.eventPhases,
            workshopDb.assessments,
            workshopDb.scenarios,
            workshopDb.workshopScenes,
        ],
        async () => {
            await workshopDb.projects.put(bundle.project);
            await workshopDb.sites.put(bundle.site);
            await workshopDb.zones.bulkPut(bundle.zones);
            if (bundle.places.length) await workshopDb.places.bulkPut(bundle.places);
            if (bundle.assets.length) await workshopDb.assets.bulkPut(bundle.assets);
            if (bundle.observations.length) await workshopDb.observations.bulkPut(bundle.observations);
            if (bundle.interpretations.length) await workshopDb.interpretations.bulkPut(bundle.interpretations);
            await workshopDb.claims.bulkPut(bundle.claims);
            await workshopDb.questions.bulkPut(bundle.questions);
            if (bundle.memories.length) await workshopDb.memories.bulkPut(bundle.memories);
            await workshopDb.eventPhases.bulkPut(bundle.eventPhases);
            if (bundle.assessments.length) await workshopDb.assessments.bulkPut(bundle.assessments);
            if (bundle.scenarios.length) await workshopDb.scenarios.bulkPut(bundle.scenarios);
            await workshopDb.workshopScenes.bulkPut(bundle.workshopScenes);
        },
    );

    console.info('[WorkshopDB] Project seed loaded successfully.');
    localStorage.setItem(seedVersionKey, SEED_VERSION);
    await restoreProjectMediaFromManifest(projectId);
}

interface MediaManifestEntry {
    asset: AssetRecord;
    url: string;
}

interface MediaManifest {
    projectId: string;
    assets: MediaManifestEntry[];
}

async function restoreProjectMediaFromManifest(projectId: string): Promise<void> {
    if (typeof fetch !== "function") return;

    const mediaManifestUrl = await getProjectMediaManifestUrl(projectId);
    const mediaRestoreVersionKey = getWorkshopMediaRestoreVersionKey(projectId);
    const storedVersion = localStorage.getItem(mediaRestoreVersionKey);
    let manifest: MediaManifest | null = null;
    try {
        const response = await fetch(mediaManifestUrl, { cache: "no-store" });
        if (!response.ok) return;
        manifest = await response.json() as MediaManifest;
    } catch {
        return;
    }

    if (!manifest || manifest.projectId !== projectId) return;

    const projectAssets = await workshopDb.assets
        .where('projectId')
        .equals(projectId)
        .toArray();
    let missingBlobCount = 0;
    for (const asset of projectAssets) {
        if (!(await workshopDb.assetBlobs.get(asset.id))) missingBlobCount += 1;
    }

    let missingManifestBlobCount = 0;
    for (const entry of manifest.assets) {
        if (!(await workshopDb.assetBlobs.get(entry.asset.id))) missingManifestBlobCount += 1;
    }

    if (storedVersion === MEDIA_RESTORE_VERSION && missingBlobCount === 0 && missingManifestBlobCount === 0) return;

    let restored = 0;
    for (const entry of manifest.assets) {
        const existingBlob = await workshopDb.assetBlobs.get(entry.asset.id);
        if (existingBlob) continue;

        try {
            const response = await fetch(entry.url);
            if (!response.ok) continue;
            const blob = await response.blob();
            const file = new File([blob], entry.asset.fileName ?? `${entry.asset.id}.jpg`, {
                type: blob.type || entry.asset.mimeType || 'image/jpeg',
            });
            const [thumbnail, exif] = await Promise.all([
                generateThumbnail(file),
                readExifData(file),
            ]);

            const record: AssetRecord = {
                ...entry.asset,
                mimeType: blob.type || entry.asset.mimeType,
                fileSize: blob.size || entry.asset.fileSize,
                derivates: thumbnail ? { ...(entry.asset.derivates ?? {}), thumbnail } : entry.asset.derivates,
                gpsLat: exif?.lat ?? entry.asset.gpsLat,
                gpsLon: exif?.lon ?? entry.asset.gpsLon,
                gpsAlt: exif?.alt ?? entry.asset.gpsAlt,
                gpsBearing: exif?.bearing ?? entry.asset.gpsBearing,
                capturedAt: exif?.capturedAt ?? entry.asset.capturedAt,
                updatedAt: new Date().toISOString(),
            };

            await saveAsset(record, blob);
            restored += 1;
        } catch (error) {
            console.warn('[WorkshopDB] Could not restore media asset', entry.asset.id, error);
        }
    }

    if (restored > 0) {
        console.info(`[WorkshopDB] Restored ${restored} media blob(s) from local manifest.`);
    }
    localStorage.setItem(mediaRestoreVersionKey, MEDIA_RESTORE_VERSION);
}

/** Clear all data for a project (useful for dev/reset). */
export async function clearProjectSeed(projectId: string): Promise<void> {
    const siteId = (await resolveRuntimeProjectConfig(projectId)).siteId;
    await workshopDb.transaction(
        'rw',
        [
            workshopDb.projects, workshopDb.sites, workshopDb.zones,
            workshopDb.places, workshopDb.assets, workshopDb.observations,
            workshopDb.interpretations, workshopDb.claims, workshopDb.questions,
            workshopDb.memories, workshopDb.eventPhases, workshopDb.assessments,
            workshopDb.scenarios, workshopDb.workshopScenes,
        ],
        async () => {
            await workshopDb.projects.delete(projectId);
            await workshopDb.sites.where('projectId').equals(projectId).delete();
            await workshopDb.zones.where('siteId').equals(siteId).delete();
            await workshopDb.claims.where('projectId').equals(projectId).delete();
            await workshopDb.questions.where('projectId').equals(projectId).delete();
            await workshopDb.eventPhases.where('projectId').equals(projectId).delete();
            await workshopDb.workshopScenes.where('projectId').equals(projectId).delete();
        },
    );
}
