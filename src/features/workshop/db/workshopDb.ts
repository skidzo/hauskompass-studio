/**
 * Workshop Assessment Database — Dexie (IndexedDB) schema.
 *
 * Version history:
 *   1 — initial schema: all 14 domain object tables
 *
 * Storage note:
 *   IndexedDB (via Dexie) supports several hundred MB for metadata.
 *   Raw media files are NOT stored here — only metadata + file path refs.
 *   A later migration to SQLite WASM (OPFS) would preserve all data via
 *   JSON export/import since all tables use stable string IDs.
 *
 * Vector embeddings:
 *   Assets, Claims and Observations can store an optional `embedding` field
 *   (Float32Array / number[]) for future semantic search via transformers.js.
 *   The Dexie index on `embedding` is intentionally absent — nearest-neighbour
 *   search will be done in-memory (HNSW or brute-force for small corpora).
 */

import type { SpatialScene } from '@/domain/spatial/types';
import type {
    Asset,
    CampusAssessment,
    Claim,
    EventPhase,
    Interpretation,
    Memory,
    Observation,
    Place,
    Question,
    Scenario,
    Site,
    WorkshopProject,
    WorkshopScene,
    Zone,
} from '@/domain/workshop/types';
import {
    countStringValues,
    createStudioBundleEnvelope,
    createValueSummary,
    inspectStudioBundleImport,
    isStudioBundleEnvelope
} from '@/lib/studio-core/backup/helpers';
import type { StudioBundleEnvelope } from '@/lib/studio-core/backup/types';
import Dexie, { type EntityTable } from 'dexie';
import { strFromU8, strToU8, unzip, zip } from 'fflate';
import { inferAssetSpatialSemantics } from '../spatial/assetSpatialSemantics';
import { loadWorkshopSpatialScene } from '../spatial/workshopSpatialScene';
import { QUICK_START_MARKER, getWorkshopSeedVersionKey } from './workshopProjectStorageKeys';

// ---------------------------------------------------------------------------
// Extended types with optional embedding for future vector search
// ---------------------------------------------------------------------------

export type AssetRecord = Asset & { embedding?: number[] };
export type ClaimRecord = Claim & { embedding?: number[] };
export type ObservationRecord = Observation & { embedding?: number[] };

// Re-export plain types for convenience
export type {
    CampusAssessment,
    EventPhase,
    Interpretation,
    Memory,
    Place,
    Question,
    Scenario,
    Site,
    WorkshopProject,
    WorkshopScene,
    Zone
};

// ---------------------------------------------------------------------------
// Asset blob — raw binary stored separately from metadata
// ---------------------------------------------------------------------------

export interface AssetBlob {
    /** Same ID as AssetRecord.id */
    id: string;
    blob: Blob;
    /** Cached object URL (revoked on unload) — not persisted */
    objectUrl?: string;
}

// ---------------------------------------------------------------------------
// Folder handle — stores a FileSystemDirectoryHandle for fs-reference assets
// ---------------------------------------------------------------------------

export interface FolderHandleRecord {
    /** `project:${projectId}` */
    id: string;
    projectId: string;
    /** The native FileSystemDirectoryHandle — serializable to IndexedDB. */
    handle: FileSystemDirectoryHandle;
    /** Human-readable folder name shown in the UI. */
    folderName: string;
    linkedAt: string;
}

export interface AssetSpatialContextPatch {
    spatialAnchorType?: Asset['spatialAnchorType'];
    targetZoneId?: string;
    linkedSpatialObjectId?: string;
    bearingConfidence?: Asset['bearingConfidence'];
    spatialNotes?: string;
}

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------

export class WorkshopDatabase extends Dexie {
    projects!: EntityTable<WorkshopProject, 'id'>;
    sites!: EntityTable<Site, 'id'>;
    zones!: EntityTable<Zone, 'id'>;
    places!: EntityTable<Place, 'id'>;
    assets!: EntityTable<AssetRecord, 'id'>;
    observations!: EntityTable<ObservationRecord, 'id'>;
    interpretations!: EntityTable<Interpretation, 'id'>;
    claims!: EntityTable<ClaimRecord, 'id'>;
    questions!: EntityTable<Question, 'id'>;
    memories!: EntityTable<Memory, 'id'>;
    eventPhases!: EntityTable<EventPhase, 'id'>;
    assessments!: EntityTable<CampusAssessment, 'id'>;
    scenarios!: EntityTable<Scenario, 'id'>;
    workshopScenes!: EntityTable<WorkshopScene, 'id'>;
    assetBlobs!: EntityTable<AssetBlob, 'id'>;
    folderHandles!: EntityTable<FolderHandleRecord, 'id'>;

    constructor() {
        super('WorkshopAssessmentDB');

        // Schema version 1
        this.version(1).stores({
            projects: 'id, slug, projectMode',
            sites: 'id, projectId',
            zones: 'id, siteId, documentationPriority, documentationStatus',
            places: 'id, zoneId, placeType',
            assets: 'id, projectId, zoneId, placeId, assetType, sensitivityLevel, publicationStatus, processingStatus, capturedAt',
            observations: 'id, projectId, zoneId, placeId, epistemic, confidence',
            interpretations: 'id, projectId, epistemic, confidence',
            claims: 'id, projectId, zoneId, eventId, claimType, epistemic, reviewStatus, sensitivityLevel',
            questions: 'id, projectId, zoneId, questionType, priority, status',
            memories: 'id, projectId, zoneId, eventId, releaseStatus, sensitivityLevel',
            eventPhases: 'id, projectId, phaseType, sortOrder',
            assessments: 'id, projectId, subjectId, subjectType',
            scenarios: 'id, projectId, status',
            workshopScenes: 'id, projectId, scenarioId, exportStatus, visibility, sortOrder',
        });

        // Schema version 3 — adds zoneId index to interpretations for zone-scoped queries
        this.version(3).stores({
            projects: 'id, slug, projectMode',
            sites: 'id, projectId',
            zones: 'id, siteId, documentationPriority, documentationStatus',
            places: 'id, zoneId, placeType',
            assets: 'id, projectId, zoneId, placeId, assetType, sensitivityLevel, publicationStatus, processingStatus, capturedAt',
            observations: 'id, projectId, zoneId, placeId, epistemic, confidence',
            interpretations: 'id, projectId, zoneId, epistemic, confidence',
            claims: 'id, projectId, zoneId, eventId, claimType, epistemic, reviewStatus, sensitivityLevel',
            questions: 'id, projectId, zoneId, questionType, priority, status',
            memories: 'id, projectId, zoneId, eventId, releaseStatus, sensitivityLevel',
            eventPhases: 'id, projectId, phaseType, sortOrder',
            assessments: 'id, projectId, subjectId, subjectType',
            scenarios: 'id, projectId, status',
            workshopScenes: 'id, projectId, scenarioId, exportStatus, visibility, sortOrder',
            assetBlobs: 'id',
        });

        // Schema version 4 — adds folderHandles table for File System Access API (fs-reference assets)
        this.version(4).stores({
            projects: 'id, slug, projectMode',
            sites: 'id, projectId',
            zones: 'id, siteId, documentationPriority, documentationStatus',
            places: 'id, zoneId, placeType',
            assets: 'id, projectId, zoneId, placeId, assetType, sensitivityLevel, publicationStatus, processingStatus, capturedAt',
            observations: 'id, projectId, zoneId, placeId, epistemic, confidence',
            interpretations: 'id, projectId, zoneId, epistemic, confidence',
            claims: 'id, projectId, zoneId, eventId, claimType, epistemic, reviewStatus, sensitivityLevel',
            questions: 'id, projectId, zoneId, questionType, priority, status',
            memories: 'id, projectId, zoneId, eventId, releaseStatus, sensitivityLevel',
            eventPhases: 'id, projectId, phaseType, sortOrder',
            assessments: 'id, projectId, subjectId, subjectType',
            scenarios: 'id, projectId, status',
            workshopScenes: 'id, projectId, scenarioId, exportStatus, visibility, sortOrder',
            assetBlobs: 'id',
            folderHandles: 'id, projectId',
        });
    }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const workshopDb = new WorkshopDatabase();

// ---------------------------------------------------------------------------
// Helper queries
// ---------------------------------------------------------------------------

/** All zones for a site, sorted by sortOrder. */
export async function getZonesBySite(siteId: string): Promise<Zone[]> {
    const zones = await workshopDb.zones.where('siteId').equals(siteId).toArray();
    return zones.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Create or update a zone record. */
export async function saveZone(zone: Zone): Promise<void> {
    await workshopDb.zones.put(zone);
}

/**
 * Delete a zone. Refuses silently if it has assets (caller should check
 * assetCount > 0 and warn the user before calling this).
 */
export async function deleteZone(zoneId: string): Promise<void> {
    await workshopDb.zones.delete(zoneId);
}

/** All claims for a zone. */
export async function getClaimsForZone(zoneId: string): Promise<ClaimRecord[]> {
    return workshopDb.claims.where('zoneId').equals(zoneId).toArray();
}

/** All open questions for a zone. */
export async function getQuestionsForZone(zoneId: string): Promise<Question[]> {
    return workshopDb.questions
        .where('zoneId').equals(zoneId)
        .and((q) => q.status === 'open' || q.status === 'in_progress')
        .toArray();
}

/** All assets for a zone. */
export async function getAssetsForZone(zoneId: string): Promise<AssetRecord[]> {
    return workshopDb.assets.where('zoneId').equals(zoneId).toArray();
}

/** Workshop scenes, sorted, internal + public. */
export async function getWorkshopScenes(projectId: string): Promise<WorkshopScene[]> {
    const scenes = await workshopDb.workshopScenes.where('projectId').equals(projectId).toArray();
    return scenes.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Upsert a workshop scene. */
export async function saveWorkshopScene(scene: WorkshopScene): Promise<void> {
    await workshopDb.workshopScenes.put(scene);
}

/** Event phases sorted by sortOrder. */
export async function getEventPhases(projectId: string): Promise<EventPhase[]> {
    const phases = await workshopDb.eventPhases.where('projectId').equals(projectId).toArray();
    return phases.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Count of assets per zone (for zone list overview). */
export async function getZoneAssetCounts(siteId: string): Promise<Record<string, number>> {
    const allAssets = await workshopDb.assets.toArray();
    const counts: Record<string, number> = {};
    for (const a of allAssets) {
        if (a.zoneId) counts[a.zoneId] = (counts[a.zoneId] ?? 0) + 1;
    }
    return counts;
}

/** All claims for the open-questions display (site-wide unassigned). */
export async function getSiteWideClaims(projectId: string): Promise<ClaimRecord[]> {
    return workshopDb.claims
        .where('projectId').equals(projectId)
        .and((c) => !c.zoneId)
        .toArray();
}

// ---------------------------------------------------------------------------
// Asset blob helpers
// ---------------------------------------------------------------------------

/**
 * Save an asset metadata record and optional blob.
 *
 * When `blob` is omitted the asset is stored as a **placeholder**:
 * metadata is written to the assets table but no entry is created in
 * assetBlobs. Use `assetHasBlob()` to distinguish placeholders from
 * fully-ingested assets.
 */
export async function saveAsset(record: AssetRecord, blob?: Blob): Promise<void> {
    const normalizedRecord: AssetRecord = {
        ...record,
        ...inferAssetSpatialSemantics(record),
    };
    if (blob !== undefined) {
        await workshopDb.transaction('rw', workshopDb.assets, workshopDb.assetBlobs, async () => {
            await workshopDb.assets.put(normalizedRecord);
            await workshopDb.assetBlobs.put({ id: normalizedRecord.id, blob: blob! });
        });
    } else {
        // Placeholder asset — no media attached yet
        await workshopDb.assets.put(normalizedRecord);
    }
}

export async function updateAssetSpatialContext(assetId: string, patch: AssetSpatialContextPatch): Promise<void> {
    const existing = await workshopDb.assets.get(assetId);
    if (!existing) throw new Error(`Asset not found: ${assetId}`);
    const normalizedRecord: AssetRecord = {
        ...existing,
        ...patch,
        targetZoneId: patch.targetZoneId === '' ? undefined : patch.targetZoneId,
        linkedSpatialObjectId: patch.linkedSpatialObjectId === '' ? undefined : patch.linkedSpatialObjectId,
        spatialNotes: patch.spatialNotes?.trim() ? patch.spatialNotes.trim() : undefined,
        ...inferAssetSpatialSemantics({
            ...existing,
            ...patch,
            targetZoneId: patch.targetZoneId === '' ? undefined : patch.targetZoneId,
        }),
        updatedAt: new Date().toISOString(),
    };
    await workshopDb.assets.put(normalizedRecord);
}

/** Returns true if the asset has a stored blob (i.e. is not a placeholder). */
export async function assetHasBlob(assetId: string): Promise<boolean> {
    const entry = await workshopDb.assetBlobs.get(assetId);
    return entry !== undefined;
}

/** Get an object URL for a stored blob. Caller is responsible for revoking it.
 *  Handles both 'blob' storage (IndexedDB) and 'fs-reference' (File System Access API).
 *  Automatically fixes legacy blobs stored with incorrect MIME type (application/octet-stream).
 */
export async function getAssetObjectUrl(assetId: string): Promise<string | null> {
    // Check if asset uses fs-reference storage (no blob in DB — file lives on disk)
    const record = await workshopDb.assets.get(assetId);
    if (record?.storageMode === 'fs-reference' && record.localPath) {
        return getObjectUrlFromFsRef(record.projectId, record.localPath);
    }

    const entry = await workshopDb.assetBlobs.get(assetId);
    if (!entry) return null;
    let { blob } = entry;
    const blobType = typeof blob.type === 'string' ? blob.type : '';
    const knownMimeType = blobType || record?.mimeType || '';

    // Fix legacy blobs with missing or wrong MIME (stored before magic-byte detection)
    if (!knownMimeType.startsWith('image/') && !knownMimeType.startsWith('video/')) {
        if (typeof blob.arrayBuffer !== 'function') return null;
        const ab = await blob.arrayBuffer();
        const b = new Uint8Array(ab);
        const detected =
            (b[0] === 0xFF && b[1] === 0xD8) ? 'image/jpeg' :
                (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) ? 'image/png' :
                    (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) ? 'image/gif' :
                        (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) ? 'image/webp' :
                            null;
        if (!detected) return null; // Unknown binary — cannot display as image
        blob = new Blob([ab], { type: detected });
        // Persist corrected blob and asset MIME so future loads are fast (fire-and-forget)
        workshopDb.assetBlobs.put({ id: assetId, blob }).catch(() => { });
        workshopDb.assets.update(assetId, { mimeType: detected }).catch(() => { });
    } else if (!blobType && knownMimeType && typeof blob.arrayBuffer === 'function') {
        const ab = await blob.arrayBuffer();
        blob = new Blob([ab], { type: knownMimeType });
        workshopDb.assetBlobs.put({ id: assetId, blob }).catch(() => { });
    }
    return URL.createObjectURL(blob);
}

/** Delete asset record + blob. */
export async function deleteAsset(assetId: string): Promise<void> {
    await workshopDb.transaction('rw', workshopDb.assets, workshopDb.assetBlobs, async () => {
        await workshopDb.assets.delete(assetId);
        await workshopDb.assetBlobs.delete(assetId);
    });
}

// ---------------------------------------------------------------------------
// File System Access API — folder handle helpers
// ---------------------------------------------------------------------------

/** Returns true if the File System Access API is available in this browser. */
export function isFsAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Persist a FileSystemDirectoryHandle for a project so fs-reference assets can be resolved. */
export async function saveFolderHandle(
    projectId: string,
    handle: FileSystemDirectoryHandle,
): Promise<void> {
    await workshopDb.folderHandles.put({
        id: `project:${projectId}`,
        projectId,
        handle,
        folderName: handle.name,
        linkedAt: new Date().toISOString(),
    });
}

/** Retrieve the stored FileSystemDirectoryHandle for a project. Returns null if not set. */
export async function getFolderHandle(projectId: string): Promise<FileSystemDirectoryHandle | null> {
    const rec = await workshopDb.folderHandles.get(`project:${projectId}`);
    return rec?.handle ?? null;
}

/**
 * Query and (if needed) request read permission for a handle.
 * Must be called from a user-gesture context when permission is 'prompt'.
 * Returns true when read access is granted.
 */
export async function verifyFolderPermission(
    handle: FileSystemDirectoryHandle,
    { requestIfNeeded = false }: { requestIfNeeded?: boolean } = {},
): Promise<boolean> {
    const status = handle.queryPermission ? await handle.queryPermission({ mode: 'read' }) : 'prompt';
    if (status === 'granted') return true;
    if (status === 'denied') return false;
    if (!requestIfNeeded || !handle.requestPermission) return false;
    const result = await handle.requestPermission({ mode: 'read' });
    return result === 'granted';
}

/**
 * Resolve a localPath within the stored folder handle and return an ObjectURL.
 * Returns null if the handle is missing, permission is denied, or the file is not found.
 * Caller is responsible for revoking the returned URL.
 */
export async function getObjectUrlFromFsRef(projectId: string, localPath: string): Promise<string | null> {
    const handle = await getFolderHandle(projectId);
    if (!handle) return null;
    const granted = await verifyFolderPermission(handle);
    if (!granted) return null;
    try {
        const parts = localPath.split('/');
        let dir: FileSystemDirectoryHandle = handle;
        for (const part of parts.slice(0, -1)) {
            dir = await dir.getDirectoryHandle(part);
        }
        const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch {
        return null;
    }
}

/**
 * Async generator that walks a FileSystemDirectoryHandle recursively,
 * yielding { file, path } for every image file found.
 * path is relative to the root handle, e.g. "Besprechungsraum/IMG_001.jpg"
 */
export async function* walkDirectoryHandle(
    dir: FileSystemDirectoryHandle,
    prefix = '',
): AsyncGenerator<{ file: File; path: string }> {
    for await (const [name, entry] of dir.entries()) {
        const rel = prefix ? `${prefix}/${name}` : name;
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (file.type.startsWith('image/') || /\.(jpe?g|png|heic|webp|tiff?)$/i.test(name)) {
                yield { file, path: rel };
            }
        } else if (entry.kind === 'directory') {
            yield* walkDirectoryHandle(entry as FileSystemDirectoryHandle, rel);
        }
    }
}

// ---------------------------------------------------------------------------
// Observation helpers
// ---------------------------------------------------------------------------

/** All observations for a zone, sorted newest first. */
export async function getObservationsForZone(zoneId: string): Promise<ObservationRecord[]> {
    const obs = await workshopDb.observations.where('zoneId').equals(zoneId).toArray();
    return obs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Upsert an observation. */
export async function saveObservation(obs: ObservationRecord): Promise<void> {
    await workshopDb.observations.put(obs);
}

/** Delete an observation by id. */
export async function deleteObservation(id: string): Promise<void> {
    await workshopDb.observations.delete(id);
}

// ---------------------------------------------------------------------------
// Memory helpers
// ---------------------------------------------------------------------------

/** All memories for a zone, sorted newest first. */
export async function getMemoriesForZone(zoneId: string): Promise<Memory[]> {
    const mem = await workshopDb.memories.where('zoneId').equals(zoneId).toArray();
    return mem.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Upsert a memory record. */
export async function saveMemory(memory: Memory): Promise<void> {
    await workshopDb.memories.put(memory);
}

/** Delete a memory by id. */
export async function deleteMemory(id: string): Promise<void> {
    await workshopDb.memories.delete(id);
}

// ---------------------------------------------------------------------------
// Interpretation helpers
// ---------------------------------------------------------------------------

/** All interpretations for a zone, sorted newest first. */
export async function getInterpretationsForZone(zoneId: string): Promise<Interpretation[]> {
    const items = await workshopDb.interpretations.where('zoneId').equals(zoneId).toArray();
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Upsert an interpretation. */
export async function saveInterpretation(interp: Interpretation): Promise<void> {
    await workshopDb.interpretations.put(interp);
}

/** Delete an interpretation by id. */
export async function deleteInterpretation(id: string): Promise<void> {
    await workshopDb.interpretations.delete(id);
}

// ---------------------------------------------------------------------------
// Cross-zone aggregate queries
// ---------------------------------------------------------------------------

/** Observation count per zone (for ZoneList display). */
export async function getZoneObservationCounts(_siteId: string): Promise<Record<string, number>> {
    const all = await workshopDb.observations.toArray();
    const counts: Record<string, number> = {};
    for (const o of all) {
        if (o.zoneId) counts[o.zoneId] = (counts[o.zoneId] ?? 0) + 1;
    }
    return counts;
}

/** All questions for a project (for Prüffragen-Board). */
export async function getAllQuestionsForProject(projectId: string): Promise<Question[]> {
    return workshopDb.questions.where('projectId').equals(projectId).toArray();
}

/** All memories for a project (site-wide unassigned or zone-assigned). */
export async function getSiteWideMemories(projectId: string): Promise<Memory[]> {
    return workshopDb.memories.where('projectId').equals(projectId).toArray();
}

/** Interpretation count per zone (for ZoneList completeness indicator). */
export async function getZoneInterpretationCounts(_siteId: string): Promise<Record<string, number>> {
    const all = await workshopDb.interpretations.toArray();
    const counts: Record<string, number> = {};
    for (const i of all) {
        if (i.zoneId) counts[i.zoneId] = (counts[i.zoneId] ?? 0) + 1;
    }
    return counts;
}

/**
 * Export all non-blob domain records as a JSON-serialisable bundle.
 * Binary blobs are never included; use `blobAssetIds` / `placeholderAssetIds`
 * to determine which assets have media attached.
 */
export async function exportWorkshopBundle(projectId: string): Promise<WorkshopBundleExport> {
    const [project, allSites, zones, places, assets, observations, interpretations,
        claims, questions, memories, eventPhases, assessments, scenarios, workshopScenes,
        allBlobs, spatialScene,
    ] = await Promise.all([
        workshopDb.projects.get(projectId),
        workshopDb.sites.where('projectId').equals(projectId).toArray(),
        workshopDb.zones.toArray(),
        workshopDb.places.toArray(),
        workshopDb.assets.where('projectId').equals(projectId).toArray(),
        workshopDb.observations.where('projectId').equals(projectId).toArray(),
        workshopDb.interpretations.where('projectId').equals(projectId).toArray(),
        workshopDb.claims.where('projectId').equals(projectId).toArray(),
        workshopDb.questions.where('projectId').equals(projectId).toArray(),
        workshopDb.memories.where('projectId').equals(projectId).toArray(),
        workshopDb.eventPhases.where('projectId').equals(projectId).toArray(),
        workshopDb.assessments.where('projectId').equals(projectId).toArray(),
        workshopDb.scenarios.where('projectId').equals(projectId).toArray(),
        workshopDb.workshopScenes.where('projectId').equals(projectId).toArray(),
        workshopDb.assetBlobs.toArray(),
        loadWorkshopSpatialScene(projectId),
    ]);

    const blobIdSet = new Set(allBlobs.map((b) => b.id));
    const assetIds = assets.map((a) => a.id);
    const blobAssetIds = assetIds.filter((id) => blobIdSet.has(id));
    const placeholderAssetIds = assetIds.filter((id) => !blobIdSet.has(id));

    const seedVersion = typeof localStorage !== 'undefined'
        ? (localStorage.getItem(getWorkshopSeedVersionKey(projectId)) ?? 'unknown')
        : 'unknown';

    const sensitivitySummary = createValueSummary(countStringValues([
        ...zones,
        ...assets,
        ...claims,
        ...questions,
        ...memories,
        ...workshopScenes,
    ], 'sensitivityLevel'));
    const publicationSummary = createValueSummary(countStringValues([
        ...zones,
        ...assets,
        ...claims,
        ...questions,
        ...memories,
        ...workshopScenes,
    ], 'publicationStatus'));

    return {
        ...createStudioBundleEnvelope({
            bundleIntent: 'full_backup',
            sourceAppVersion: '0.1.0',
            projectRef: {
                projectId,
                projectSlug: project?.slug,
                title: project?.title,
            },
            projectMode: 'workshop',
            payloadType: 'workshop_bundle',
            payloadVersion: 1,
            validation: {
                mediaComplete: blobAssetIds.length + placeholderAssetIds.length === assets.length,
            },
            sensitivitySummary,
            publicationSummary,
            counts: {
                zones: zones.length,
                places: places.length,
                assets: assets.length,
                observations: observations.length,
                interpretations: interpretations.length,
                claims: claims.length,
                questions: questions.length,
                memories: memories.length,
                eventPhases: eventPhases.length,
                assessments: assessments.length,
                scenarios: scenarios.length,
                workshopScenes: workshopScenes.length,
                blobAssets: blobAssetIds.length,
                placeholderAssets: placeholderAssetIds.length,
            },
            warnings: placeholderAssetIds.length > 0 ? ['placeholder_assets_present'] : [],
            mediaTransport: 'manifest_only',
        }),
        seedVersion,
        projectId,
        project,
        site: allSites[0],
        zones,
        places,
        assets,
        observations,
        interpretations,
        claims,
        questions,
        memories,
        eventPhases,
        assessments,
        scenarios,
        workshopScenes,
        spatialScene,
        blobAssetIds,
        placeholderAssetIds,
    };
}

export interface WorkshopBundlePayload {
    seedVersion: string;
    projectId: string;
    project: WorkshopProject | undefined;
    site: Site | undefined;
    zones: Zone[];
    places: Place[];
    /** Asset metadata only — blobs not included. */
    assets: AssetRecord[];
    observations: ObservationRecord[];
    interpretations: Interpretation[];
    claims: ClaimRecord[];
    questions: Question[];
    memories: Memory[];
    eventPhases: EventPhase[];
    assessments: CampusAssessment[];
    scenarios: Scenario[];
    workshopScenes: WorkshopScene[];
    spatialScene?: SpatialScene | null;
    /** Asset IDs that have a stored blob. */
    blobAssetIds: string[];
    /** Asset IDs without a blob (placeholder assets). */
    placeholderAssetIds: string[];
}

export interface WorkshopBundleExport extends StudioBundleEnvelope, WorkshopBundlePayload { }

export interface WorkshopBundleImportInspection {
    ok: boolean;
    warnings: string[];
    errors: string[];
    projectId?: string;
    siteId?: string;
    title?: string;
    expectedBlobCount?: number;
    providedBlobCount?: number;
}

export interface WorkshopBundleZipInspection {
    bundle: WorkshopBundleExport;
    inspection: WorkshopBundleImportInspection;
    photoEntries: Array<[string, Uint8Array]>;
}

function createWorkshopBundlePayload(bundle: WorkshopBundleExport | WorkshopBundlePayload): WorkshopBundlePayload {
    if ('projectId' in bundle && 'assets' in bundle) {
        return {
            seedVersion: bundle.seedVersion,
            projectId: bundle.projectId,
            project: bundle.project,
            site: bundle.site,
            zones: bundle.zones,
            places: bundle.places,
            assets: bundle.assets,
            observations: bundle.observations,
            interpretations: bundle.interpretations,
            claims: bundle.claims,
            questions: bundle.questions,
            memories: bundle.memories,
            eventPhases: bundle.eventPhases,
            assessments: bundle.assessments,
            scenarios: bundle.scenarios,
            workshopScenes: bundle.workshopScenes,
            spatialScene: bundle.spatialScene,
            blobAssetIds: bundle.blobAssetIds,
            placeholderAssetIds: bundle.placeholderAssetIds,
        };
    }
    throw new Error('Ungültiges Workshop-Backup: Nutzdaten fehlen.');
}

export function inspectWorkshopBundleImport(
    bundle: WorkshopBundleExport | WorkshopBundlePayload,
    providedBlobCount?: number,
): WorkshopBundleImportInspection {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (isStudioBundleEnvelope(bundle)) {
        const check = inspectStudioBundleImport(bundle, 'workshop', 'workshop_bundle');
        warnings.push(...check.warnings);
        errors.push(...check.errors);
    }

    let payload: WorkshopBundlePayload;
    try {
        payload = createWorkshopBundlePayload(bundle);
    } catch (error) {
        return {
            ok: false,
            warnings,
            errors: [...errors, error instanceof Error ? error.message : 'Ungültiges Workshop-Backup.'],
        };
    }

    if (!payload.project?.id || !payload.site?.id) {
        errors.push('Keine gültige Backup-Datei: Projekt oder Standort fehlt.');
    }

    if (providedBlobCount !== undefined && payload.blobAssetIds.length !== providedBlobCount) {
        warnings.push(`ZIP-Inhalt unvollständig: erwartet ${payload.blobAssetIds.length} Blob-Dateien, gefunden ${providedBlobCount}.`);
    }

    return {
        ok: errors.length === 0,
        warnings,
        errors,
        projectId: payload.project?.id,
        siteId: payload.site?.id,
        title: payload.project?.title ?? payload.project?.id,
        expectedBlobCount: payload.blobAssetIds.length,
        providedBlobCount,
    };
}

export async function inspectWorkshopBundleZipFile(file: File): Promise<WorkshopBundleZipInspection> {
    const buf = await file.arrayBuffer();

    const extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(new Uint8Array(buf), (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });

    const jsonBytes = extracted['backup.json'];
    if (!jsonBytes) throw new Error('Keine backup.json in der ZIP-Datei gefunden.');

    const bundle = JSON.parse(strFromU8(jsonBytes)) as WorkshopBundleExport;
    const photoEntries = Object.entries(extracted).filter(([name]) => name.startsWith('photos/'));
    const inspection = inspectWorkshopBundleImport(bundle, photoEntries.length);
    return { bundle, inspection, photoEntries };
}

// ---------------------------------------------------------------------------
// Quick-Start: Leeres Workshop-Projekt direkt in IndexedDB anlegen
// ---------------------------------------------------------------------------

const DEFAULT_ZONES: { name: string; description: string; sortOrder: number }[] = [
    { name: 'Eingang / Empfang', description: 'Eingangsbereich, Foyer, Erschließung', sortOrder: 0 },
    { name: 'Erdgeschoss', description: 'Räume im Erdgeschoss', sortOrder: 1 },
    { name: 'Obergeschoss', description: 'Räume im Obergeschoss', sortOrder: 2 },
    { name: 'Außenbereich', description: 'Fassade, Hof, Freiflächen', sortOrder: 3 },
    { name: 'Technik / Lager', description: 'Heizung, Lager, Nebenräume', sortOrder: 4 },
    { name: 'Diverses', description: 'Sonstiges und Allgemeines', sortOrder: 5 },
];

export interface QuickStartResult {
    projectId: string;
    siteId: string;
    title: string;
}

/**
 * Legt ein leeres Workshop-Projekt direkt in IndexedDB an — keine Seed-Dateien,
 * keine Python-Pipeline, kein Geodaten-Setup erforderlich.
 *
 * @param name  Anzeigename des Projekts (z.B. "Gebäude-Workshop Mai 2026")
 * @returns     projectId + siteId für die Navigation zu WorkshopRoute
 */
export async function createQuickStartWorkshop(name: string): Promise<QuickStartResult> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Projektname darf nicht leer sein.');

    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 7);
    const pid = `ws-qs-${ts}-${rnd}`;
    const sid = `site-${pid}`;
    const now = new Date().toISOString();

    const project: WorkshopProject = {
        id: pid,
        slug: pid,
        title: trimmed,
        description: '',
        siteId: sid,
        projectMode: 'active',
        createdAt: now,
        updatedAt: now,
        version: '1',
        sensitivityDefault: 'internal',
        publicationDefault: 'needs_review',
    };

    const site: Site = {
        id: sid,
        projectId: pid,
        name: trimmed,
        shortDescription: '',
        currentAccess: 'unknown',
        sensitivityLevel: 'internal',
        publicationStatus: 'needs_review',
    };

    const zones: Zone[] = DEFAULT_ZONES.map((z, i) => ({
        id: `${pid}-z${i}`,
        siteId: sid,
        name: z.name,
        description: z.description,
        documentationPriority: 'medium',
        documentationStatus: 'not_started',
        openQuestionIds: [],
        linkedAssetIds: [],
        linkedAssessmentIds: [],
        sensitivityLevel: 'internal',
        publicationStatus: 'needs_review',
        sortOrder: z.sortOrder,
    }));

    await workshopDb.transaction('rw',
        workshopDb.projects,
        workshopDb.sites,
        workshopDb.zones,
        async () => {
            await workshopDb.projects.put(project);
            await workshopDb.sites.put(site);
            await workshopDb.zones.bulkPut(zones);
        },
    );

    // Mark as quick-start so seedProject() never overwrites this project
    localStorage.setItem(getWorkshopSeedVersionKey(pid), QUICK_START_MARKER);

    return { projectId: pid, siteId: sid, title: trimmed };
}

// ---------------------------------------------------------------------------
// Import: Backup-JSON vollständig in IndexedDB schreiben
// ---------------------------------------------------------------------------

/**
 * Import a previously exported WorkshopBundleExport into IndexedDB.
 * Overwrites any existing records for the same projectId.
 * Does NOT import binary blobs (photos) — only metadata.
 */
export async function importWorkshopBundle(bundle: WorkshopBundleExport): Promise<void> {
    const inspection = inspectWorkshopBundleImport(bundle);
    if (!inspection.ok) {
        throw new Error(inspection.errors.join(' '));
    }

    const payload = createWorkshopBundlePayload(bundle);
    const { project, site, zones = [], places = [], assets = [],
        observations = [], interpretations = [], claims = [],
        questions = [], memories = [], eventPhases = [],
        assessments = [], scenarios = [], workshopScenes = [],
        seedVersion,
    } = payload;

    if (!project || !site) throw new Error('Backup enthält kein gültiges Projekt oder keinen Standort.');

    await workshopDb.transaction('rw', [
        workshopDb.projects, workshopDb.sites, workshopDb.zones,
        workshopDb.places, workshopDb.assets, workshopDb.observations,
        workshopDb.interpretations, workshopDb.claims, workshopDb.questions,
        workshopDb.memories, workshopDb.eventPhases, workshopDb.assessments,
        workshopDb.scenarios, workshopDb.workshopScenes,
    ], async () => {
        await workshopDb.projects.put(project);
        await workshopDb.sites.put(site);
        if (zones.length) await workshopDb.zones.bulkPut(zones);
        if (places.length) await workshopDb.places.bulkPut(places);
        if (assets.length) await workshopDb.assets.bulkPut(assets);
        if (observations.length) await workshopDb.observations.bulkPut(observations);
        if (interpretations.length) await workshopDb.interpretations.bulkPut(interpretations);
        if (claims.length) await workshopDb.claims.bulkPut(claims);
        if (questions.length) await workshopDb.questions.bulkPut(questions);
        if (memories.length) await workshopDb.memories.bulkPut(memories);
        if (eventPhases.length) await workshopDb.eventPhases.bulkPut(eventPhases);
        if (assessments.length) await workshopDb.assessments.bulkPut(assessments);
        if (scenarios.length) await workshopDb.scenarios.bulkPut(scenarios);
        if (workshopScenes.length) await workshopDb.workshopScenes.bulkPut(workshopScenes);
    });

    // Store seed version so seedProject() won't overwrite imported data
    localStorage.setItem(getWorkshopSeedVersionKey(project.id), seedVersion ?? QUICK_START_MARKER);

    if (bundle.spatialScene) {
        try {
            localStorage.setItem(`hk_workshop_spatial_scene_${project.id}`, JSON.stringify(bundle.spatialScene, null, 2));
        } catch {
            // Ignore scene persistence failures; the project itself still imported successfully.
        }
    }
}

// ---------------------------------------------------------------------------
// ZIP export — metadata + all photo blobs in one archive
// ---------------------------------------------------------------------------

function mimeToExt(mimeType?: string): string {
    switch (mimeType) {
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/webp': return 'webp';
        case 'image/gif': return 'gif';
        case 'image/heic': return 'heic';
        case 'image/tiff': return 'tiff';
        default: return 'bin';
    }
}

async function readBlobBuffer(blob: Blob | { arrayBuffer?: () => Promise<ArrayBuffer>; buffer?: ArrayBuffer | ArrayBufferLike | Uint8Array }): Promise<ArrayBufferLike> {
    if (typeof (blob as Blob).arrayBuffer === 'function') {
        return (blob as Blob).arrayBuffer();
    }
    try {
        return await new Response(blob as BodyInit).arrayBuffer();
    } catch {
        // fall through to object-shape fallbacks
    }
    const fallback = blob as { buffer?: ArrayBuffer | ArrayBufferLike | Uint8Array };
    if (fallback.buffer instanceof ArrayBuffer) return fallback.buffer;
    if (fallback.buffer && ArrayBuffer.isView(fallback.buffer)) {
        const view = fallback.buffer as ArrayBufferView;
        return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    }
    if (fallback.buffer && typeof fallback.buffer === 'object' && 'byteLength' in fallback.buffer) {
        const candidate = fallback.buffer as ArrayBufferLike;
        if (typeof candidate.slice === 'function') return candidate.slice(0);
    }
    throw new TypeError('asset blob cannot be serialised');
}

/**
 * Export all metadata + binary photo blobs as a ZIP archive.
 * Structure:
 *   backup.json          — all domain records (WorkshopBundleExport)
 *   photos/<id>.<ext>    — raw blobs for each asset that has one
 */
export async function exportWorkshopBundleZip(projectId: string): Promise<Blob> {
    const bundle = await exportWorkshopBundle(projectId);
    const { assets } = bundle;

    // Collect all blobs for this project's assets
    const blobEntries = await workshopDb.assetBlobs
        .where('id').anyOf(assets.map((a) => a.id))
        .toArray();

    const files: Record<string, Uint8Array> = {
        'backup.json': strToU8(JSON.stringify(bundle, null, 2)),
    };

    for (const entry of blobEntries) {
        const asset = assets.find((a) => a.id === entry.id);
        const ext = mimeToExt(asset?.mimeType);
        const buf = await readBlobBuffer(entry.blob);
        files[`photos/${entry.id}.${ext}`] = new Uint8Array(buf as ArrayBufferLike);
    }

    return new Promise((resolve, reject) => {
        zip(files, { level: 0 }, (err, data) => {
            if (err) reject(err);
            else resolve(new Blob([data], { type: 'application/zip' }));
        });
    });
}

// ---------------------------------------------------------------------------
// ZIP import — restore metadata + blobs from archive
// ---------------------------------------------------------------------------

/**
 * Import a ZIP archive previously created by exportWorkshopBundleZip().
 * Writes all metadata records and photo blobs back to IndexedDB.
 */
export async function importWorkshopBundleZip(file: File): Promise<{ projectId: string; siteId: string; title: string }> {
    const { bundle, inspection, photoEntries } = await inspectWorkshopBundleZipFile(file);
    if (!inspection.ok) throw new Error(inspection.errors.join(' '));

    // Import metadata
    await importWorkshopBundle(bundle);

    // Import blobs
    if (photoEntries.length > 0) {

        await workshopDb.transaction('rw', workshopDb.assetBlobs, workshopDb.assets, async () => {
            for (const [name, data] of photoEntries) {
                // photos/<id>.<ext> → extract id
                const filename = name.replace('photos/', '');
                const dotIdx = filename.lastIndexOf('.');
                const assetId = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
                const ext = dotIdx >= 0 ? filename.slice(dotIdx + 1).toLowerCase() : 'bin';
                const mimeMap: Record<string, string> = {
                    jpg: 'image/jpeg', jpeg: 'image/jpeg',
                    png: 'image/png', webp: 'image/webp',
                    gif: 'image/gif', heic: 'image/heic', tiff: 'image/tiff',
                };
                let mimeType = mimeMap[ext];
                if (!mimeType) {
                    // Detect from magic bytes for blobs stored with generic .bin extension
                    // (e.g. camera-captured assets exported before mimeType was persisted)
                    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
                        mimeType = 'image/jpeg';
                    } else if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
                        mimeType = 'image/png';
                    } else if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
                        mimeType = 'image/gif';
                    } else if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
                        mimeType = 'image/webp';
                    } else {
                        mimeType = 'application/octet-stream';
                    }
                }
                const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
                await workshopDb.assetBlobs.put({ id: assetId, blob });

                // Heal asset records that are missing mimeType or fileName
                // (can happen with camera-captured assets from older exports)
                if (mimeType !== 'application/octet-stream') {
                    const asset = await workshopDb.assets.get(assetId);
                    if (asset && (!asset.mimeType || !asset.fileName)) {
                        await workshopDb.assets.put({
                            ...asset,
                            mimeType: asset.mimeType ?? mimeType,
                            fileName: asset.fileName ?? `${assetId}.${mimeToExt(mimeType)}`,
                        });
                    }
                }
            }
        });
    }

    return {
        projectId: inspection.projectId!,
        siteId: inspection.siteId!,
        title: inspection.title!,
    };
}

// ---------------------------------------------------------------------------
// Merge — add records from another user's backup without overwriting existing
// ---------------------------------------------------------------------------

export interface MergeResult {
    /** Total number of new records added across all tables. */
    added: number;
}

/**
 * Merge a backup bundle into the current database.
 * Existing records (by primary key) are never overwritten.
 * Project and Site records are intentionally skipped — the user keeps their own.
 */
export async function mergeWorkshopBundle(bundle: WorkshopBundleExport): Promise<MergeResult> {
    const inspection = inspectWorkshopBundleImport(bundle);
    if (!inspection.ok) {
        throw new Error(inspection.errors.join(' '));
    }

    const payload = createWorkshopBundlePayload(bundle);
    if (!payload.project || !payload.site) throw new Error('Keine gültige Backup-Datei.');

    const {
        zones = [], places = [], assets = [],
        observations = [], interpretations = [], claims = [],
        questions = [], memories = [], eventPhases = [],
        assessments = [], scenarios = [], workshopScenes = [],
    } = payload;

    // Add-only helper: inserts items whose ID is not yet in the table.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function addIfNew(table: Dexie.Table<any, string>, items: Array<{ id: string }>): Promise<number> {
        if (!items.length) return 0;
        const existing = await table.bulkGet(items.map((i) => i.id));
        const newItems = items.filter((_, idx) => existing[idx] === undefined);
        if (newItems.length) await table.bulkAdd(newItems);
        return newItems.length;
    }

    let added = 0;

    await workshopDb.transaction('rw', [
        workshopDb.zones, workshopDb.places, workshopDb.assets,
        workshopDb.observations, workshopDb.interpretations, workshopDb.claims,
        workshopDb.questions, workshopDb.memories, workshopDb.eventPhases,
        workshopDb.assessments, workshopDb.scenarios, workshopDb.workshopScenes,
    ], async () => {
        added += await addIfNew(workshopDb.zones, zones);
        added += await addIfNew(workshopDb.places, places);
        added += await addIfNew(workshopDb.assets, assets);
        added += await addIfNew(workshopDb.observations, observations);
        added += await addIfNew(workshopDb.interpretations, interpretations);
        added += await addIfNew(workshopDb.claims, claims);
        added += await addIfNew(workshopDb.questions, questions);
        added += await addIfNew(workshopDb.memories, memories);
        added += await addIfNew(workshopDb.eventPhases, eventPhases);
        added += await addIfNew(workshopDb.assessments, assessments);
        added += await addIfNew(workshopDb.scenarios, scenarios);
        added += await addIfNew(workshopDb.workshopScenes, workshopScenes);
    });

    return { added };
}

/**
 * Parse a ZIP archive from another user and merge its contents (same as mergeWorkshopBundle
 * for metadata, plus photo blobs that aren't already stored locally).
 */
export async function mergeWorkshopBundleZip(file: File): Promise<MergeResult> {
    const buf = await file.arrayBuffer();

    const extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(new Uint8Array(buf), (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });

    const jsonBytes = extracted['backup.json'];
    if (!jsonBytes) throw new Error('Keine backup.json in der ZIP-Datei gefunden.');

    const bundle = JSON.parse(strFromU8(jsonBytes)) as WorkshopBundleExport;
    const photoEntries = Object.entries(extracted).filter(([name]) => name.startsWith('photos/'));
    const inspection = inspectWorkshopBundleImport(bundle, photoEntries.length);
    if (!inspection.ok) throw new Error(inspection.errors.join(' '));
    const result = await mergeWorkshopBundle(bundle);

    // Merge photo blobs — only add if not already present locally
    let addedBlobs = 0;
    if (photoEntries.length > 0) {
        await workshopDb.transaction('rw', workshopDb.assetBlobs, async () => {
            for (const [name, data] of photoEntries) {
                const filename = name.replace('photos/', '');
                const dotIdx = filename.lastIndexOf('.');
                const assetId = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
                const existing = await workshopDb.assetBlobs.get(assetId);
                if (!existing && assetId) {
                    const ext = dotIdx >= 0 ? filename.slice(dotIdx + 1) : 'bin';
                    const mimeMap: Record<string, string> = {
                        jpg: 'image/jpeg', jpeg: 'image/jpeg',
                        png: 'image/png', webp: 'image/webp',
                        gif: 'image/gif', heic: 'image/heic', tiff: 'image/tiff',
                    };
                    const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeMap[ext] ?? 'application/octet-stream' });
                    await workshopDb.assetBlobs.add({ id: assetId, blob });
                    addedBlobs++;
                }
            }
        });
    }

    return { added: result.added + addedBlobs };
}
