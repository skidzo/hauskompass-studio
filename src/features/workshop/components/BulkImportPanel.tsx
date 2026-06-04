/**
 * BulkImportPanel — Mehrere Fotos auf einmal importieren mit GPS-basierter
 * Auto-Zonen-Zuweisung.
 *
 * Flow:
 *   1. Dateien auswählen / per Drag&Drop hinzufügen
 *   2. EXIF wird ausgelesen (GPS, Aufnahmedatum, Bearing)
 *   3. Falls GPS vorhanden → nächste Zone automatisch vorgeschlagen
 *   4. Nutzer kann Zone je Foto anpassen
 *   5. "Alle speichern" → AsyncIndexedDB via saveAsset()
 */

import type { PublicationStatus, SensitivityLevel } from '@/domain/workshop/types';
import { fetchProjectJson } from '@/features/project-data/projectDataLoader';
import type { AssetRecord, Zone } from '@/features/workshop/db/workshopDb';
import {
    isFsAccessSupported,
    saveAsset,
    saveFolderHandle,
    walkDirectoryHandle,
} from '@/features/workshop/db/workshopDb';
import {
    classifyAssetSensitivity,
    inferAssetType,
} from '@/features/workshop/ingest/sensitivityClassifier';
import { buildFallbackWorkshopCampusLocations } from '@/features/workshop/rendering/workshopMapAdapter';
import { loadWorkshopSpatialScene } from '@/features/workshop/spatial/workshopSpatialScene';
import { prepareStudioMediaSelection } from '@/lib/studio-core/media/intake';
import { generateThumbnail } from '@/lib/studio-core/media/thumbnail';
import { AlertTriangle, CheckCircle2, FolderOpen, HardDrive, Loader2, MapPin, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Recursive folder-entry traversal for drag-and-drop of directories
// ---------------------------------------------------------------------------
async function collectFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
    if (entry.isFile) {
        return new Promise<File[]>((resolve) => {
            (entry as FileSystemFileEntry).file((f) => resolve([f]), () => resolve([]));
        });
    }
    if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const allFiles: File[] = [];
        // readEntries may return results in batches — loop until empty
        await new Promise<void>((resolve) => {
            function readBatch() {
                reader.readEntries(async (batch) => {
                    if (batch.length === 0) { resolve(); return; }
                    for (const sub of batch) allFiles.push(...await collectFilesFromEntry(sub));
                    readBatch();
                }, () => resolve());
            }
            readBatch();
        });
        return allFiles;
    }
    return [];
}
// ---------------------------------------------------------------------------
// Zone centroid computation (loaded async from public/)
// ---------------------------------------------------------------------------

type GeoFeatureLite = {
    properties: { zoneId?: string; name?: string } | null;
    geometry: { type: string; coordinates: number[][][] };
};

type ZoneCentroid = { zoneId: string; lat: number; lon: number };

function computeCentroids(features: GeoFeatureLite[]): ZoneCentroid[] {
    return features
        .filter((f) => f.properties?.zoneId && f.geometry.type === 'Polygon')
        .map((f) => {
            const ring = f.geometry.coordinates[0];
            const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
            const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
            return { zoneId: f.properties!.zoneId!, lat, lon };
        });
}

function nearestZoneId(
    lat: number,
    lon: number,
    centroids: ZoneCentroid[],
): { zoneId: string; distM: number } | null {
    if (centroids.length === 0) return null;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    let best = centroids[0];
    let bestDist = Infinity;
    for (const c of centroids) {
        const dy = (lat - c.lat) * 111_320;
        const dx = (lon - c.lon) * 111_320 * cosLat;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { best = c; bestDist = d; }
    }
    return { zoneId: best.zoneId, distM: Math.round(bestDist) };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaveStatus = 'pending' | 'saving' | 'saved' | 'error' | 'skipped';

interface BulkEntry {
    id: string;
    file: File;
    thumbnail: string | null;
    thumbnailLoading: boolean;
    title: string;
    capturedAt: string;
    gpsLat?: number;
    gpsLon?: number;
    gpsAlt?: number;
    gpsBearing?: number;
    gpsBearingRef?: 'T' | 'M';
    gpsHAccuracyM?: number;
    suggestedZoneId: string | null;
    suggestedDistM: number | null;
    selectedZoneId: string;          // '' means skip
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    saveStatus: SaveStatus;
    errorMessage?: string;
    /** 'blob' = full binary in IndexedDB; 'fs-reference' = only metadata stored, file stays on disk */
    storageMode: 'blob' | 'fs-reference';
    /** Relative path within the linked directory handle (only for fs-reference). */
    localPath?: string;
}

function defaultPubStatus(s: SensitivityLevel): PublicationStatus {
    return s === 'public' ? 'needs_review' : 'internal_only';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BulkImportPanelProps {
    projectId: string;
    zones: Zone[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SIZE_WARN_MB = 500;

export function BulkImportPanel({ projectId, zones }: BulkImportPanelProps) {
    const [entries, setEntries] = useState<BulkEntry[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [saving, setSaving] = useState(false);
    const [zoneCentroids, setZoneCentroids] = useState<ZoneCentroid[]>([]);
    const [linkedFolder, setLinkedFolder] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [showAllEntries, setShowAllEntries] = useState(false);
    const [bulkZoneId, setBulkZoneId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProjectJson<{ features: GeoFeatureLite[] }>(projectId, 'zone_geometry.json')
            .then((d) => setZoneCentroids(computeCentroids(d.features)))
            .catch(() => {
                // Fallback: derive zone centroids from the spatial scene when
                // zone_geometry.json is unavailable (e.g. built-in Eiermann project).
                loadWorkshopSpatialScene(projectId)
                    .then((scene) => {
                        if (!scene) return;
                        const anchor = scene.mapAnchor ?? { lon: 9.0738, lat: 48.7262 };
                        const locs = buildFallbackWorkshopCampusLocations(scene, zones, anchor);
                        setZoneCentroids(locs.map((loc) => ({ zoneId: loc.zoneId, lat: loc.lat, lon: loc.lon })));
                    })
                    .catch(() => { }); // GPS suggestions unavailable — silent fallback
            });
    }, [projectId, zones]);

    // Zone lookup: zoneId → zone name
    const zoneNameMap = new globalThis.Map(zones.map((z) => [z.id, z.name]));

    // ── File intake ─────────────────────────────────────────────────────────

    /**
     * Add files in 'blob' mode (standard file picker or drag-and-drop).
     * Full binary will be written to IndexedDB on save.
     */
    const addFiles = useCallback(async (files: FileList | File[]) => {
        const today = new Date().toISOString().slice(0, 10);
        const prepared = await prepareStudioMediaSelection(files, { idPrefix: 'A' });
        const usable = prepared.filter(
            (item) => item.isImage || item.file.name.match(/\.(jpe?g|png|heic|webp|tiff?)$/i),
        );
        if (usable.length === 0) return;

        const newEntries: BulkEntry[] = usable.map((item) => {
            const cls = classifyAssetSensitivity(item.mimeType, item.file.name);
            const nearest = item.exifData ? nearestZoneId(item.exifData.lat, item.exifData.lon, zoneCentroids) : null;
            return {
                id: item.id,
                file: item.file,
                thumbnail: null,
                thumbnailLoading: item.isImage,
                title: item.title,
                capturedAt: item.capturedAt || today,
                gpsLat: item.exifData?.lat,
                gpsLon: item.exifData?.lon,
                gpsAlt: item.exifData?.alt,
                gpsBearing: item.exifData?.bearing,
                gpsBearingRef: item.exifData?.bearingRef,
                gpsHAccuracyM: item.exifData?.hAccuracyM,
                suggestedZoneId: nearest?.zoneId ?? null,
                suggestedDistM: nearest?.distM ?? null,
                selectedZoneId: nearest?.zoneId ?? '',
                sensitivityLevel: cls.sensitivityLevel,
                publicationStatus: defaultPubStatus(cls.sensitivityLevel),
                saveStatus: 'pending',
                storageMode: 'blob',
            };
        });

        setEntries((prev) => [...prev, ...newEntries]);
        await generateThumbnailBatched(newEntries);
    }, [zoneCentroids]);

    /**
     * Open a directory via File System Access API.
     * Files are scanned from the handle and queued as 'fs-reference' —
     * only metadata + thumbnail will be written to IndexedDB, the actual
     * images stay on disk and are read on-demand via the stored handle.
     */
    const openDirectory = useCallback(async () => {
        if (!isFsAccessSupported()) {
            folderInputRef.current?.click();
            return;
        }
        let dirHandle: FileSystemDirectoryHandle;
        try {
            dirHandle = await (window as Window & typeof globalThis & {
                showDirectoryPicker: (opts?: object) => Promise<FileSystemDirectoryHandle>;
            }).showDirectoryPicker({ mode: 'read' });
        } catch {
            return; // user cancelled
        }
        setScanning(true);
        try {
            await saveFolderHandle(projectId, dirHandle);
            setLinkedFolder(dirHandle.name);

            const today = new Date().toISOString().slice(0, 10);
            const newEntries: BulkEntry[] = [];
            for await (const { file, path } of walkDirectoryHandle(dirHandle)) {
                const prepared = await prepareStudioMediaSelection([file], { idPrefix: 'A' });
                if (prepared.length === 0) continue;
                const item = prepared[0];
                const cls = classifyAssetSensitivity(item.mimeType, item.file.name);
                const nearest = item.exifData ? nearestZoneId(item.exifData.lat, item.exifData.lon, zoneCentroids) : null;
                newEntries.push({
                    id: item.id,
                    file: item.file,
                    thumbnail: null,
                    thumbnailLoading: item.isImage,
                    title: item.title,
                    capturedAt: item.capturedAt || today,
                    gpsLat: item.exifData?.lat,
                    gpsLon: item.exifData?.lon,
                    gpsAlt: item.exifData?.alt,
                    gpsBearing: item.exifData?.bearing,
                    gpsBearingRef: item.exifData?.bearingRef,
                    gpsHAccuracyM: item.exifData?.hAccuracyM,
                    suggestedZoneId: nearest?.zoneId ?? null,
                    suggestedDistM: nearest?.distM ?? null,
                    selectedZoneId: nearest?.zoneId ?? '',
                    sensitivityLevel: cls.sensitivityLevel,
                    publicationStatus: defaultPubStatus(cls.sensitivityLevel),
                    saveStatus: 'pending',
                    storageMode: 'fs-reference',
                    localPath: path,
                });
                // Flush to UI every 20 entries so the list appears progressively
                if (newEntries.length % 20 === 0) {
                    const slice = newEntries.slice(-20);
                    setEntries((prev) => [...prev, ...slice]);
                }
            }
            // Flush remaining
            const alreadyFlushed = Math.floor(newEntries.length / 20) * 20;
            if (newEntries.length > alreadyFlushed) {
                setEntries((prev) => [...prev, ...newEntries.slice(alreadyFlushed)]);
            }
            await generateThumbnailBatched(newEntries);
        } finally {
            setScanning(false);
        }
    }, [projectId, zoneCentroids]);

    /** Generate thumbnails in parallel batches of 8 and flush state updates per batch. */
    async function generateThumbnailBatched(entriesToProcess: BulkEntry[]) {
        const imageEntries = entriesToProcess.filter(e => e.file.type.startsWith('image/'));
        const BATCH_SIZE = 8;
        for (let i = 0; i < imageEntries.length; i += BATCH_SIZE) {
            const batch = imageEntries.slice(i, i + BATCH_SIZE);
            const thumbs = await Promise.all(batch.map(e => generateThumbnail(e.file)));
            const thumbMap = new Map(batch.map((e, idx) => [e.id, thumbs[idx]]));
            setEntries((prev) =>
                prev.map((e) =>
                    thumbMap.has(e.id)
                        ? { ...e, thumbnail: thumbMap.get(e.id) ?? null, thumbnailLoading: false }
                        : e,
                ),
            );
        }
    }

    // ── UI helpers ───────────────────────────────────────────────────────────

    const onDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        // Prefer DataTransferItems for recursive folder support
        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            const allFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind !== 'file') continue;
                const entry = item.webkitGetAsEntry?.();
                if (entry) {
                    allFiles.push(...await collectFilesFromEntry(entry));
                } else {
                    const f = item.getAsFile();
                    if (f) allFiles.push(f);
                }
            }
            if (allFiles.length > 0) { addFiles(allFiles); return; }
        }
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    }, [addFiles]);

    function update(id: string, patch: Partial<BulkEntry>) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
    }

    function removeEntry(id: string) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    async function saveAll() {
        const toSave = entries.filter((e) => e.saveStatus === 'pending' && e.selectedZoneId);
        if (toSave.length === 0) return;
        setSaving(true);

        for (const entry of toSave) {
            update(entry.id, { saveStatus: 'saving' });
            try {
                const record: AssetRecord = {
                    id: entry.id,
                    projectId,
                    zoneId: entry.selectedZoneId,
                    placeId: undefined,
                    assetType: inferAssetType(entry.file.type, entry.file.name),
                    title: entry.title || entry.file.name,
                    description: '',
                    fileName: entry.file.name,
                    fileSize: entry.file.size,
                    mimeType: entry.file.type,
                    derivates: entry.thumbnail ? { thumbnail: entry.thumbnail } : undefined,
                    tags: [],
                    sensitivityLevel: entry.sensitivityLevel,
                    publicationStatus: entry.publicationStatus,
                    processingStatus: 'raw',
                    capturedAt: entry.capturedAt || undefined,
                    gpsLat: entry.gpsLat,
                    gpsLon: entry.gpsLon,
                    gpsAlt: entry.gpsAlt,
                    gpsBearing: entry.gpsBearing,
                    gpsBearingRef: entry.gpsBearingRef,
                    gpsHAccuracyM: entry.gpsHAccuracyM,
                    storageMode: entry.storageMode,
                    localPath: entry.localPath,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                // fs-reference: only metadata stored, file stays on user's disk
                const blob = entry.storageMode === 'fs-reference' ? undefined : entry.file;
                await saveAsset(record, blob);
                update(entry.id, { saveStatus: 'saved' });
            } catch (err) {
                update(entry.id, {
                    saveStatus: 'error',
                    errorMessage: err instanceof Error ? err.message : String(err),
                });
            }
        }

        setSaving(false);
    }

    // ── Counts ───────────────────────────────────────────────────────────────

    const pendingCount = entries.filter((e) => e.saveStatus === 'pending' && e.selectedZoneId).length;
    const noZoneCount = entries.filter((e) => e.saveStatus === 'pending' && !e.selectedZoneId).length;
    const savedCount = entries.filter((e) => e.saveStatus === 'saved').length;
    const gpsCount = entries.filter((e) => typeof e.gpsLat === 'number').length;

    function applyBulkZone() {
        if (!bulkZoneId) return;
        setEntries((prev) =>
            prev.map((e) =>
                e.saveStatus === 'pending' && !e.selectedZoneId
                    ? { ...e, selectedZoneId: bulkZoneId }
                    : e,
            ),
        );
        setBulkZoneId('');
    }
    const refCount = entries.filter((e) => e.storageMode === 'fs-reference').length;
    const blobPendingMB = entries
        .filter((e) => e.saveStatus === 'pending' && e.storageMode === 'blob')
        .reduce((s, e) => s + e.file.size, 0) / (1024 * 1024);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="bulk-import-panel">
            {/* Header */}
            <div className="bulk-import-header">
                <h2 className="bulk-import-title">
                    <Upload size={16} />
                    Bulk-Import
                </h2>
                {entries.length > 0 && (
                    <div className="bulk-import-stats">
                        <span>{entries.length} Fotos</span>
                        <span className="bulk-stat-gps">{gpsCount} mit GPS</span>
                        {refCount > 0 && <span className="bulk-stat-ref"><HardDrive size={11} /> {refCount} Referenz</span>}
                        {noZoneCount > 0 && <span className="bulk-stat-warn">{noZoneCount} ohne Zone</span>}
                        {savedCount > 0 && <span className="bulk-stat-ok">{savedCount} gespeichert</span>}
                        {blobPendingMB > 0 && <span className="bulk-stat-size">{blobPendingMB < 1000 ? `${blobPendingMB.toFixed(0)} MB` : `${(blobPendingMB / 1024).toFixed(1)} GB`} Kopie</span>}
                    </div>
                )}
                {blobPendingMB > SIZE_WARN_MB && (
                    <div className="bulk-size-warning">
                        <AlertTriangle size={14} />
                        {blobPendingMB.toFixed(0)} MB werden in IndexedDB gespeichert. Für große Mengen lieber &ldquo;Verzeichnis verknüpfen&rdquo; verwenden — dann bleiben Fotos auf der Festplatte.
                    </div>
                )}
                {pendingCount > 0 && (
                    <button
                        className="bulk-import-save-btn"
                        disabled={saving}
                        onClick={saveAll}
                        type="button"
                    >
                        {saving
                            ? <><Loader2 size={14} className="bulk-spin" /> Speichern…</>
                            : <><CheckCircle2 size={14} /> {pendingCount} speichern</>
                        }
                    </button>
                )}
                {noZoneCount > 0 && (
                    <span className="bulk-zone-assign-inline">
                        <select
                            className="bulk-zone-assign-select"
                            value={bulkZoneId}
                            onChange={(e) => setBulkZoneId(e.target.value)}
                            aria-label="Zone für alle ohne Zuweisung"
                        >
                            <option value="">Alle ohne Zone → …</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="bulk-zone-assign-btn"
                            disabled={!bulkZoneId}
                            onClick={applyBulkZone}
                        >
                            Zuweisen
                        </button>
                    </span>
                )}
            </div>

            {/* Drop zone */}
            <div
                className={`bulk-dropzone ${dragOver ? 'bulk-dropzone-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
            >
                {scanning
                    ? <><Loader2 size={22} className="bulk-spin" /><span>Ordner wird gescannt…</span></>
                    : <><Upload size={22} /><span>Fotos oder Ordner hier ablegen</span></>
                }
                {linkedFolder && (
                    <div className="bulk-folder-linked">
                        <HardDrive size={13} />
                        <span>{linkedFolder}</span>
                        <span className="bulk-folder-mode">Referenz-Modus · keine Kopie</span>
                    </div>
                )}
                <div className="bulk-dropzone-actions">
                    <button type="button" className="bulk-dropzone-btn bulk-dropzone-btn-primary" onClick={openDirectory} disabled={scanning}>
                        <FolderOpen size={14} /> Verzeichnis verknüpfen
                    </button>
                    <button type="button" className="bulk-dropzone-btn" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
                        <Upload size={14} /> Dateien kopieren
                    </button>
                </div>
                <span className="bulk-dropzone-hint">
                    Verzeichnis verknüpfen = Fotos bleiben auf der Festplatte (empfohlen für &gt;100 Bilder)
                </span>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
                />
                {/* Fallback for browsers without showDirectoryPicker */}
                <input
                    ref={folderInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    // @ts-expect-error webkitdirectory is non-standard but widely supported
                    webkitdirectory=""
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
                />
            </div>

            {/* Entry list — truncated at 50 for performance; reveal on demand */}
            {entries.length > 0 && (
                <div className="bulk-entry-list">
                    {(showAllEntries ? entries : entries.slice(0, 50)).map((entry) => (
                        <BulkEntryRow
                            key={entry.id}
                            entry={entry}
                            zones={zones}
                            zoneNameMap={zoneNameMap}
                            onUpdate={(patch) => update(entry.id, patch)}
                            onRemove={() => removeEntry(entry.id)}
                        />
                    ))}
                    {!showAllEntries && entries.length > 50 && (
                        <button
                            type="button"
                            className="bulk-show-all-btn"
                            onClick={() => setShowAllEntries(true)}
                        >
                            Weitere {entries.length - 50} Fotos einblenden (gesamt: {entries.length})
                        </button>
                    )}
                </div>
            )}

            {entries.length === 0 && (
                <p className="ws-empty-state" style={{ padding: '24px 0', textAlign: 'center' }}>
                    Noch keine Fotos ausgewählt.<br />
                    <small>Fotos mit GPS-Daten werden automatisch der nächsten Zone zugewiesen.</small>
                </p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Single entry row
// ---------------------------------------------------------------------------

interface BulkEntryRowProps {
    entry: BulkEntry;
    zones: Zone[];
    zoneNameMap: Map<string, string>;
    onUpdate: (patch: Partial<BulkEntry>) => void;
    onRemove: () => void;
}

function BulkEntryRow({ entry, zones, zoneNameMap, onUpdate, onRemove }: BulkEntryRowProps) {
    const hasGps = typeof entry.gpsLat === 'number';
    const isSaved = entry.saveStatus === 'saved';
    const isError = entry.saveStatus === 'error';
    const isSaving = entry.saveStatus === 'saving';

    return (
        <div className={`bulk-entry ${isSaved ? 'bulk-entry-saved' : ''} ${isError ? 'bulk-entry-error' : ''}`}>
            {/* Thumbnail */}
            <div className="bulk-entry-thumb">
                {entry.thumbnailLoading ? (
                    <Loader2 size={16} className="bulk-spin" />
                ) : entry.thumbnail ? (
                    <img src={entry.thumbnail} alt={entry.title} />
                ) : (
                    <div className="bulk-entry-thumb-placeholder">📄</div>
                )}
            </div>

            {/* Main content */}
            <div className="bulk-entry-body">
                {/* Title */}
                <input
                    className="bulk-entry-title-input"
                    disabled={isSaved || isSaving}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="Titel"
                    type="text"
                    value={entry.title}
                />

                {/* GPS info */}
                <div className="bulk-entry-gps">
                    {hasGps ? (
                        <>
                            <MapPin size={10} style={{ color: '#e65100' }} />
                            <span className="bulk-gps-coords">
                                {entry.gpsLat!.toFixed(5)}, {entry.gpsLon!.toFixed(5)}
                            </span>
                            {entry.gpsAlt !== undefined && (
                                <span className="bulk-gps-alt">{entry.gpsAlt.toFixed(0)} m</span>
                            )}
                            {entry.gpsBearing !== undefined && (
                                <span className="bulk-gps-bearing">↗ {entry.gpsBearing.toFixed(1)}°</span>
                            )}
                        </>
                    ) : (
                        <span className="bulk-gps-missing">
                            <AlertTriangle size={10} />
                            Kein GPS
                        </span>
                    )}
                </div>

                {/* Zone selector */}
                <div className="bulk-entry-zone-row">
                    <label className="bulk-zone-label">Zone</label>
                    <select
                        className={`bulk-zone-select ${entry.selectedZoneId === entry.suggestedZoneId && entry.suggestedZoneId ? 'bulk-zone-auto' : ''}`}
                        disabled={isSaved || isSaving}
                        onChange={(e) => onUpdate({ selectedZoneId: e.target.value })}
                        value={entry.selectedZoneId}
                    >
                        <option value="">— Zone wählen —</option>
                        {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                                {z.name}{entry.suggestedZoneId === z.id && entry.suggestedDistM != null
                                    ? ` ✓ (~${entry.suggestedDistM}m)`
                                    : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Capture date */}
                <div className="bulk-entry-date-row">
                    <label className="bulk-zone-label">Datum</label>
                    <input
                        className="bulk-date-input"
                        disabled={isSaved || isSaving}
                        onChange={(e) => onUpdate({ capturedAt: e.target.value })}
                        type="date"
                        value={entry.capturedAt}
                    />
                </div>
            </div>

            {/* Status / actions */}
            <div className="bulk-entry-actions">
                {isSaved && <CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
                {isSaving && <Loader2 size={16} className="bulk-spin" />}
                {isError && (
                    <span className="bulk-entry-error-msg" title={entry.errorMessage}>
                        <AlertTriangle size={14} style={{ color: '#ef5350' }} />
                    </span>
                )}
                {!isSaved && !isSaving && (
                    <button
                        className="bulk-entry-remove"
                        onClick={onRemove}
                        title="Entfernen"
                        type="button"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}
