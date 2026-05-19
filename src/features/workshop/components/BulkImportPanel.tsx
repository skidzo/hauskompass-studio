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
import { saveAsset } from '@/features/workshop/db/workshopDb';
import { readExifData } from '@/features/workshop/ingest/exifReader';
import {
    classifyAssetSensitivity,
    inferAssetType,
} from '@/features/workshop/ingest/sensitivityClassifier';
import { generateThumbnail } from '@/features/workshop/ingest/thumbnailGenerator';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    suggestedZoneId: string | null;
    suggestedDistM: number | null;
    selectedZoneId: string;          // '' means skip
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    saveStatus: SaveStatus;
    errorMessage?: string;
}

function generateId(): string {
    return `A-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

export function BulkImportPanel({ projectId, zones }: BulkImportPanelProps) {
    const [entries, setEntries] = useState<BulkEntry[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [saving, setSaving] = useState(false);
    const [zoneCentroids, setZoneCentroids] = useState<ZoneCentroid[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProjectJson<{ features: GeoFeatureLite[] }>(projectId, 'zone_geometry.json')
            .then((d) => setZoneCentroids(computeCentroids(d.features)))
            .catch((e) => console.error('[BulkImport] zone_geometry load failed:', e));
    }, [projectId]);

    // Zone lookup: zoneId → zone name
    const zoneNameMap = new globalThis.Map(zones.map((z) => [z.id, z.name]));

    // ── File intake ─────────────────────────────────────────────────────────

    const addFiles = useCallback(async (files: FileList | File[]) => {
        const today = new Date().toISOString().slice(0, 10);
        const fileArr = Array.from(files).filter(
            (f) => f.type.startsWith('image/') || f.name.match(/\.(jpe?g|png|heic|webp|tiff?)$/i),
        );
        if (fileArr.length === 0) return;

        const newEntries: BulkEntry[] = fileArr.map((file) => {
            const cls = classifyAssetSensitivity(file.type, file.name);
            return {
                id: generateId(),
                file,
                thumbnail: null,
                thumbnailLoading: true,
                title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
                capturedAt: today,
                suggestedZoneId: null,
                suggestedDistM: null,
                selectedZoneId: '',
                sensitivityLevel: cls.sensitivityLevel,
                publicationStatus: defaultPubStatus(cls.sensitivityLevel),
                saveStatus: 'pending',
            };
        });

        setEntries((prev) => [...prev, ...newEntries]);

        // Async: thumbnails + EXIF
        for (const entry of newEntries) {
            const [thumb, exif] = await Promise.all([
                generateThumbnail(entry.file),
                readExifData(entry.file),
            ]);
            setEntries((prev) =>
                prev.map((e) => {
                    if (e.id !== entry.id) return e;
                    const patch: Partial<BulkEntry> = { thumbnail: thumb, thumbnailLoading: false };
                    if (exif) {
                        patch.gpsLat = exif.lat;
                        patch.gpsLon = exif.lon;
                        if (exif.alt !== undefined) patch.gpsAlt = exif.alt;
                        if (exif.bearing !== undefined) patch.gpsBearing = exif.bearing;
                        if (exif.capturedAt) patch.capturedAt = exif.capturedAt.slice(0, 10);
                        const nearest = nearestZoneId(exif.lat, exif.lon, zoneCentroids);
                        if (nearest) {
                            patch.suggestedZoneId = nearest.zoneId;
                            patch.suggestedDistM = nearest.distM;
                            patch.selectedZoneId = nearest.zoneId;
                        }
                    }
                    return { ...e, ...patch };
                }),
            );
        }
    }, []);

    // ── UI helpers ───────────────────────────────────────────────────────────

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
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
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await saveAsset(record, entry.file);
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
                        {noZoneCount > 0 && <span className="bulk-stat-warn">{noZoneCount} ohne Zone</span>}
                        {savedCount > 0 && <span className="bulk-stat-ok">{savedCount} gespeichert</span>}
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
            </div>

            {/* Drop zone */}
            <div
                className={`bulk-dropzone ${dragOver ? 'bulk-dropzone-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload size={22} />
                <span>Fotos hier ablegen oder klicken</span>
                <span className="bulk-dropzone-hint">GPS-Koordinaten werden automatisch ausgelesen</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
            </div>

            {/* Entry list */}
            {entries.length > 0 && (
                <div className="bulk-entry-list">
                    {entries.map((entry) => (
                        <BulkEntryRow
                            key={entry.id}
                            entry={entry}
                            zones={zones}
                            zoneNameMap={zoneNameMap}
                            onUpdate={(patch) => update(entry.id, patch)}
                            onRemove={() => removeEntry(entry.id)}
                        />
                    ))}
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
