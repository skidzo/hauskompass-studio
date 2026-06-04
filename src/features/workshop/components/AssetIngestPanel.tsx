/**
 * AssetIngestPanel — drag-and-drop + file picker + placeholder mode.
 *
 * Flow (file-based):
 *   1. User drops or picks files
 *   2. Each file gets auto-classified (MIME + filename heuristics)
 *   3. User reviews/edits per-file metadata (title, capturedAt, sensitivity override, tags)
 *   4. User clicks "Speichern" → blobs + metadata written to IndexedDB atomically
 *   5. Panel calls onClose — zone asset list refreshes via useLiveQuery
 *
 * Flow (placeholder):
 *   1. User clicks "Standort-Notiz" (no file required)
 *   2. User fills in title, description, sensitivity
 *   3. Asset is saved without a blob — marked as placeholder in the UI
 *   4. Blob can be attached later (future feature)
 *
 * No network call. Everything is local (IndexedDB / Dexie v3 schema).
 */

import type { PublicationStatus, SensitivityLevel } from '@/domain/workshop/types';
import type { AssetRecord } from '@/features/workshop/db/workshopDb';
import { saveAsset } from '@/features/workshop/db/workshopDb';
import {
    classifyAssetSensitivity,
    inferAssetType,
} from '@/features/workshop/ingest/sensitivityClassifier';
import { prepareStudioMediaSelection } from '@/lib/studio-core/media/intake';
import { formatFileSize, generateThumbnail } from '@/lib/studio-core/media/thumbnail';
import { AlertTriangle, Camera, CheckCircle2, Loader2, MapPin, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Per-file state while editing
// ---------------------------------------------------------------------------

interface IngestEntry {
    file: File | null;              // null for placeholder assets
    isPlaceholder: boolean;
    id: string;                     // generated on file pick / placeholder creation
    thumbnail: string | null;       // data-URL or null
    thumbnailLoading: boolean;
    title: string;
    description: string;            // used for placeholders
    capturedAt: string;             // ISO date string (date-only input)
    tags: string;                   // comma-separated raw input
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    sensitivityReason: string;
    sensitivitySource: 'auto' | 'user';
    /** GPS from EXIF — undefined if absent or not an image */
    gpsLat?: number;
    gpsLon?: number;
    gpsAlt?: number;
    /** Camera bearing from EXIF GPSImgDirection (0–360° True North) */
    gpsBearing?: number;
    saveStatus: 'pending' | 'saving' | 'saved' | 'error';
    errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssetIngestPanelProps {
    zoneId: string;
    projectId: string;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// ID generator (simple sequential, good enough for local DB)
// ---------------------------------------------------------------------------

function generateAssetId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `A-${ts}-${rnd}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetIngestPanel({ zoneId, projectId, onClose }: AssetIngestPanelProps) {
    const [entries, setEntries] = useState<IngestEntry[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // ── File intake ──────────────────────────────────────────────────────────

    const addFiles = useCallback(async (files: FileList | File[]) => {
        const today = new Date().toISOString().slice(0, 10);
        const prepared = await prepareStudioMediaSelection(files, { idPrefix: 'A' });

        const newEntries: IngestEntry[] = prepared.map((item) => {
            const classification = classifyAssetSensitivity(item.mimeType, item.file.name);
            return {
                file: item.file,
                isPlaceholder: false,
                id: item.id,
                thumbnail: null,
                thumbnailLoading: item.isImage,
                title: item.title,
                description: '',
                capturedAt: item.capturedAt || today,
                tags: '',
                sensitivityLevel: classification.sensitivityLevel,
                publicationStatus: defaultPublicationStatus(classification.sensitivityLevel),
                sensitivityReason: classification.reason,
                sensitivitySource: classification.source,
                gpsLat: item.exifData?.lat,
                gpsLon: item.exifData?.lon,
                gpsAlt: item.exifData?.alt,
                gpsBearing: item.exifData?.bearing,
                saveStatus: 'pending',
            };
        });

        setEntries((prev) => [...prev, ...newEntries]);

        for (const entry of newEntries) {
            if (!entry.file || !entry.file.type.startsWith('image/')) continue;
            const thumb = await generateThumbnail(entry.file);
            setEntries((prev) =>
                prev.map((e) => (
                    e.id === entry.id
                        ? { ...e, thumbnail: thumb, thumbnailLoading: false }
                        : e
                )),
            );
        }
    }, []);

    // ── Placeholder creation ─────────────────────────────────────────────────

    function addPlaceholder() {
        const today = new Date().toISOString().slice(0, 10);
        const entry: IngestEntry = {
            file: null,
            isPlaceholder: true,
            id: generateAssetId(),
            thumbnail: null,
            thumbnailLoading: false,
            title: '',
            description: '',
            capturedAt: today,
            tags: '',
            sensitivityLevel: 'internal',
            publicationStatus: 'internal_only',
            sensitivityReason: 'Platzhalter — kein Medium angehängt',
            sensitivitySource: 'auto',
            saveStatus: 'pending',
        };
        setEntries((prev) => [...prev, entry]);
    }

    // ── Drag & drop ──────────────────────────────────────────────────────────

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = () => setDragOver(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    };

    // ── Entry editing ────────────────────────────────────────────────────────

    function updateEntry(id: string, patch: Partial<IngestEntry>) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
    }

    function removeEntry(id: string) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }

    function onSensitivityChange(id: string, level: SensitivityLevel) {
        updateEntry(id, {
            sensitivityLevel: level,
            publicationStatus: defaultPublicationStatus(level),
            sensitivitySource: 'user',
            sensitivityReason: 'Manuell gesetzt',
        });
    }

    // ── Save all ─────────────────────────────────────────────────────────────

    async function saveAll() {
        if (entries.length === 0) return;
        setSaving(true);
        const now = new Date().toISOString();
        let hadError = false;

        for (const entry of entries) {
            if (entry.saveStatus === 'saved') continue;
            updateEntry(entry.id, { saveStatus: 'saving' });
            try {
                const record: AssetRecord = {
                    id: entry.id,
                    projectId,
                    zoneId,
                    assetType: entry.isPlaceholder
                        ? 'other'
                        : inferAssetType(entry.file!.type, entry.file!.name),
                    title: entry.title || (entry.isPlaceholder ? '(Standort-Notiz)' : entry.file!.name),
                    description: entry.description || undefined,
                    fileName: entry.file?.name,
                    fileSize: entry.file?.size,
                    mimeType: entry.file?.type,
                    derivates: entry.thumbnail ? { thumbnail: entry.thumbnail } : undefined,
                    capturedAt: entry.capturedAt ? `${entry.capturedAt}T00:00:00` : now,
                    gpsLat: entry.gpsLat,
                    gpsLon: entry.gpsLon,
                    gpsAlt: entry.gpsAlt,
                    gpsBearing: entry.gpsBearing,
                    tags: entry.tags.split(',').map((t) => t.trim()).filter(Boolean),
                    processingStatus: 'raw',
                    sensitivityLevel: entry.sensitivityLevel,
                    publicationStatus: entry.publicationStatus,
                    createdAt: now,
                    updatedAt: now,
                };
                if (entry.isPlaceholder || !entry.file) {
                    await saveAsset(record);
                } else {
                    await saveAsset(record, entry.file);
                }
                updateEntry(entry.id, { saveStatus: 'saved' });
            } catch (err) {
                hadError = true;
                updateEntry(entry.id, {
                    saveStatus: 'error',
                    errorMessage: err instanceof Error ? err.message : 'Unbekannter Fehler',
                });
            }
        }

        setSaving(false);
        if (!hadError) onClose();
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const pendingCount = entries.filter((e) => e.saveStatus === 'pending').length;
    const savedCount = entries.filter((e) => e.saveStatus === 'saved').length;

    return (
        <div className="ingest-panel">
            <div className="ingest-header">
                <h4 className="ingest-title">
                    <Upload size={15} />
                    Medien & Dokumente erfassen
                </h4>
                <button className="ingest-close-btn" onClick={onClose} type="button" title="Schließen">
                    <X size={16} />
                </button>
            </div>

            <div className="ingest-capture-row">
                <div
                    className={`ingest-dropzone ingest-dropzone-main ${dragOver ? 'ingest-dropzone-active' : ''}`}
                    onDragLeave={onDragLeave}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                    <Upload size={22} color="#23614b" />
                    <p>Dateien auswählen oder hierher ziehen</p>
                    <span className="ingest-hint">Fotos, Videos, Dokumente, CAD-Dateien</span>
                </div>
                <button
                    className="ingest-camera-btn"
                    onClick={() => cameraInputRef.current?.click()}
                    type="button"
                    title="Foto direkt aufnehmen (Kamera)"
                >
                    <Camera size={22} color="#23614b" />
                    <span>Foto aufnehmen</span>
                </button>
                <button
                    className="ingest-placeholder-btn"
                    onClick={addPlaceholder}
                    type="button"
                    title="Standort-Notiz ohne Medium (Platzhalter) erstellen"
                >
                    <MapPin size={22} color="#e65100" />
                    <span>Standort-Notiz</span>
                </button>
            </div>
            {/* Standard file picker */}
            <input
                accept="image/*,video/*,audio/*,application/pdf,.ifc,.step,.stp,.fcstd,.dxf,.dwg,.geojson"
                multiple
                onChange={(e) => e.target.files && addFiles(e.target.files)}
                ref={fileInputRef}
                style={{ display: 'none' }}
                type="file"
            />
            {/* Camera capture (opens camera app on mobile) */}
            <input
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
                ref={cameraInputRef}
                style={{ display: 'none' }}
                type="file"
            />

            {/* Entry list */}
            {entries.length > 0 && (
                <div className="ingest-list">
                    {entries.map((entry) => (
                        <IngestEntryRow
                            entry={entry}
                            key={entry.id}
                            onRemove={() => removeEntry(entry.id)}
                            onSensitivityChange={(level) => onSensitivityChange(entry.id, level)}
                            onUpdate={(patch) => updateEntry(entry.id, patch)}
                        />
                    ))}
                </div>
            )}

            {/* Footer actions */}
            {entries.length > 0 && (
                <div className="ingest-footer">
                    <span className="ingest-count">
                        {savedCount > 0 && <><CheckCircle2 size={13} color="#23614b" /> {savedCount} gespeichert · </>}
                        {pendingCount} ausstehend
                    </span>
                    <button
                        className="ingest-save-btn"
                        disabled={saving || pendingCount === 0}
                        onClick={saveAll}
                        type="button"
                    >
                        {saving ? <Loader2 size={14} className="spin" /> : null}
                        {saving ? 'Speichern …' : `${pendingCount} Datei${pendingCount !== 1 ? 'en' : ''} speichern`}
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// IngestEntryRow — per-file metadata editor
// ---------------------------------------------------------------------------

interface EntryRowProps {
    entry: IngestEntry;
    onUpdate: (patch: Partial<IngestEntry>) => void;
    onSensitivityChange: (level: SensitivityLevel) => void;
    onRemove: () => void;
}

function IngestEntryRow({ entry, onUpdate, onSensitivityChange, onRemove }: EntryRowProps) {
    return (
        <article className={`ingest-entry ingest-entry-${entry.saveStatus}${entry.isPlaceholder ? ' ingest-entry-placeholder' : ''}`}>
            {/* Thumbnail or file-type icon */}
            <div className="ingest-thumb">
                {entry.isPlaceholder ? (
                    <span className="ingest-thumb-placeholder" title="Platzhalter — kein Medium">📍</span>
                ) : entry.thumbnailLoading ? (
                    <Loader2 size={18} className="spin" color="#90a4ae" />
                ) : entry.thumbnail ? (
                    <img alt={entry.title} className="ingest-thumb-img" src={entry.thumbnail} />
                ) : (
                    <span className="ingest-thumb-type">{fileTypeLabel(entry.file?.type ?? '', entry.file?.name ?? '')}</span>
                )}
            </div>

            {/* Metadata fields */}
            <div className="ingest-entry-fields">
                {entry.isPlaceholder && (
                    <div className="ingest-placeholder-badge">
                        📍 Standort-Notiz (kein Medium) — Medium kann später hinzugefügt werden
                    </div>
                )}
                <div className="ingest-row">
                    <input
                        className="ingest-input ingest-input-title"
                        disabled={entry.saveStatus === 'saved'}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder={entry.isPlaceholder ? 'Beschreibung des Standorts / Motivs' : 'Titel'}
                        type="text"
                        value={entry.title}
                    />
                    {!entry.isPlaceholder && entry.file && (
                        <span className="ingest-filesize">{formatFileSize(entry.file.size)}</span>
                    )}
                </div>

                {entry.isPlaceholder && (
                    <div className="ingest-row">
                        <label className="ingest-label ingest-label-full">
                            Notiz / Kontext
                            <textarea
                                className="ingest-input ingest-textarea"
                                disabled={entry.saveStatus === 'saved'}
                                onChange={(e) => onUpdate({ description: e.target.value })}
                                placeholder="Was soll hier dokumentiert werden? Welches Medium soll nachgereicht werden?"
                                rows={2}
                                value={entry.description}
                            />
                        </label>
                    </div>
                )}

                <div className="ingest-row">
                    <label className="ingest-label">
                        {entry.isPlaceholder ? 'Datum' : 'Aufnahmedatum'}
                        <input
                            className="ingest-input ingest-input-date"
                            disabled={entry.saveStatus === 'saved'}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onUpdate({ capturedAt: e.target.value })}
                            type="date"
                            value={entry.capturedAt}
                        />
                    </label>

                    <label className="ingest-label">
                        Sensitivität
                        <div className="ingest-sensitivity-row">
                            <select
                                className={`ingest-select ingest-sensitivity-${entry.sensitivityLevel}`}
                                disabled={entry.saveStatus === 'saved'}
                                onChange={(e) => onSensitivityChange(e.target.value as SensitivityLevel)}
                                value={entry.sensitivityLevel}
                            >
                                <option value="public">Öffentlich</option>
                                <option value="internal">Intern</option>
                                <option value="sensitive_personal">Personenbezogen</option>
                                <option value="restricted">Vertraulich</option>
                                <option value="unknown">Unklassifiziert</option>
                            </select>
                            {entry.sensitivitySource === 'auto' && (
                                <span className="ingest-auto-badge" title={entry.sensitivityReason}>auto</span>
                            )}
                        </div>
                    </label>
                </div>

                <div className="ingest-row">
                    <label className="ingest-label ingest-label-full">
                        Tags (kommagetrennt)
                        <input
                            className="ingest-input"
                            disabled={entry.saveStatus === 'saved'}
                            onChange={(e) => onUpdate({ tags: e.target.value })}
                            placeholder="z. B. parkdeck, dach, 2026"
                            type="text"
                            value={entry.tags}
                        />
                    </label>
                </div>

                {/* Sensitivity warning for personal data */}
                {(entry.sensitivityLevel === 'sensitive_personal' || entry.sensitivityLevel === 'restricted') && (
                    <div className="ingest-warning">
                        <AlertTriangle size={12} />
                        {entry.sensitivityReason}
                    </div>
                )}

                {/* Save status */}
                {entry.saveStatus === 'error' && (
                    <div className="ingest-error">Fehler: {entry.errorMessage}</div>
                )}
                {entry.saveStatus === 'saved' && (
                    <div className="ingest-success"><CheckCircle2 size={12} /> Gespeichert</div>
                )}
            </div>

            {/* Remove button */}
            {entry.saveStatus !== 'saved' && (
                <button className="ingest-remove-btn" onClick={onRemove} title="Entfernen" type="button">
                    <X size={14} />
                </button>
            )}
        </article>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultPublicationStatus(level: SensitivityLevel): PublicationStatus {
    switch (level) {
        case 'public': return 'publishable';
        case 'internal': return 'internal_only';
        case 'sensitive_personal': return 'anonymize_before_use';
        case 'restricted': return 'do_not_publish';
        default: return 'needs_review';
    }
}

function fileTypeLabel(mimeType: string, fileName: string): string {
    if (mimeType.startsWith('image/')) return 'IMG';
    if (mimeType.startsWith('video/')) return 'VID';
    if (mimeType.startsWith('audio/')) return 'AUD';
    if (mimeType === 'application/pdf') return 'PDF';
    const ext = fileName.split('.').pop()?.toUpperCase() ?? 'DOC';
    return ext.slice(0, 4);
}
