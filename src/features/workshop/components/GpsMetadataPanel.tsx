/**
 * GpsMetadataPanel — zeigt alle Foto-Assets des Projekts mit ihren GPS-Metadaten.
 *
 * Für Fotos ohne GPS-Daten: "GPS laden"-Button, der den gespeicherten Blob
 * re-parst und die DB-Record aktualisiert (keine erneute Hochladung nötig).
 */

import { fetchProjectJson } from '@/features/project-data/projectDataLoader';
import { readExifData } from '@/features/workshop/ingest/exifReader';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Camera, ImageIcon, Layers, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetRecord } from '../db/workshopDb';
import { getAssetObjectUrl, updateAssetSpatialContext, workshopDb } from '../db/workshopDb';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bearingLabel(deg: number): string {
    const dirs = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}

async function repairAssetGps(asset: AssetRecord): Promise<boolean> {
    const blobRecord = await workshopDb.assetBlobs.get(asset.id);
    if (!blobRecord) return false;

    const file = new File([blobRecord.blob], asset.title || 'photo.jpg', {
        type: blobRecord.blob.type || 'image/jpeg',
    });
    const exif = await readExifData(file);
    if (!exif) return false;

    const patch: Partial<AssetRecord> = {
        gpsLat: exif.lat,
        gpsLon: exif.lon,
    };
    if (typeof exif.alt === 'number') patch.gpsAlt = exif.alt;
    if (exif.capturedAt) patch.capturedAt = exif.capturedAt;
    if (typeof exif.bearing === 'number') patch.gpsBearing = exif.bearing;

    await workshopDb.assets.update(asset.id, patch);
    return true;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface GpsMetadataPanelProps {
    projectId: string;
    selectedZoneId?: string | null;
    selectedAssetId?: string | null;
    onFocusAsset?: (lat: number, lon: number) => void;
    onSelectZone?: (zoneId: string) => void;
    onSelectAsset?: (assetId: string) => void;
    onOpenAsset?: (asset: AssetRecord) => void;
}

interface CampusLocationOption {
    id: string;
    zoneId: string;
    label: string;
}

export function GpsMetadataPanel({
    projectId,
    selectedZoneId,
    selectedAssetId,
    onFocusAsset,
    onSelectZone,
    onSelectAsset,
    onOpenAsset,
}: GpsMetadataPanelProps) {
    const [repairing, setRepairing] = useState<Set<string>>(new Set());
    const [repairResults, setRepairResults] = useState<Record<string, boolean>>({});
    const [localSelectedAssetId, setLocalSelectedAssetId] = useState<string | null>(null);
    const [campusLocations, setCampusLocations] = useState<CampusLocationOption[]>([]);

    useEffect(() => {
        fetchProjectJson<CampusLocationOption[]>(projectId, 'campus_locations.json')
            .then((data) => setCampusLocations(data))
            .catch(() => setCampusLocations([]));
    }, [projectId]);

    const assets = useLiveQuery(
        () =>
            workshopDb.assets
                .where('projectId')
                .equals(projectId)
                .toArray()
                .then((all) =>
                    // Show photos first, placeholder assets last
                    all.sort((a, b) => {
                        const aHas = typeof a.gpsLat === 'number' ? 0 : 1;
                        const bHas = typeof b.gpsLat === 'number' ? 0 : 1;
                        return aHas - bHas;
                    }),
                ),
        [projectId],
        [],
    );

    const zones = useLiveQuery(() => workshopDb.zones.toArray(), [], []);
    const zoneMap = new globalThis.Map((zones ?? []).map((z) => [z.id, z.name]));

    const visibleAssets = useMemo(() => {
        if (!selectedZoneId) return assets ?? [];
        return (assets ?? []).filter((asset) => asset.zoneId === selectedZoneId);
    }, [assets, selectedZoneId]);

    const zoneCounts = useMemo(() => {
        const counts = new globalThis.Map<string, { total: number; gps: number }>();
        for (const asset of assets ?? []) {
            if (!asset.zoneId) continue;
            const next = counts.get(asset.zoneId) ?? { total: 0, gps: 0 };
            next.total += 1;
            if (typeof asset.gpsLat === 'number') next.gps += 1;
            counts.set(asset.zoneId, next);
        }
        return counts;
    }, [assets]);

    const hasGpsCount = (assets ?? []).filter((a) => typeof a.gpsLat === 'number').length;
    const total = assets?.length ?? 0;
    const missingCount = total - hasGpsCount;
    const activeSelectedAssetId = selectedAssetId !== undefined ? selectedAssetId : localSelectedAssetId;
    const selectedAsset = (assets ?? []).find((asset) => asset.id === activeSelectedAssetId)
        ?? visibleAssets.find((asset) => asset.assetType === 'photo')
        ?? null;

    useEffect(() => {
        if (selectedAssetId !== undefined) {
            setLocalSelectedAssetId(selectedAssetId);
        }
    }, [selectedAssetId]);

    useEffect(() => {
        if (!activeSelectedAssetId || visibleAssets.some((asset) => asset.id === activeSelectedAssetId)) return;
        setLocalSelectedAssetId(visibleAssets[0]?.id ?? null);
    }, [activeSelectedAssetId, visibleAssets]);

    async function handleRepairOne(asset: AssetRecord) {
        setRepairing((prev) => new Set([...prev, asset.id]));
        try {
            const ok = await repairAssetGps(asset);
            setRepairResults((prev) => ({ ...prev, [asset.id]: ok }));
        } finally {
            setRepairing((prev) => {
                const s = new Set(prev);
                s.delete(asset.id);
                return s;
            });
        }
    }

    async function handleRepairAll() {
        const missing = (assets ?? []).filter((a) => typeof a.gpsLat !== 'number');
        for (const asset of missing) {
            await handleRepairOne(asset);
        }
    }

    return (
        <div className="ws-gps-panel">
            {/* Header */}
            <div className="ws-gps-panel-header">
                <span className="ws-gps-panel-title">
                    <Camera size={13} />
                    Lage-Fotos
                </span>
                <span className="ws-gps-count">
                    {hasGpsCount}/{total} mit GPS
                </span>
                {missingCount > 0 && (
                    <button
                        className="ws-gps-repair-all-btn"
                        onClick={handleRepairAll}
                        title={`GPS für ${missingCount} Foto(s) aus Blob lesen`}
                        type="button"
                    >
                        <RefreshCw size={11} />
                        Alle GPS laden
                    </button>
                )}
            </div>

            <div className="ws-gps-coverage">
                <div className="ws-gps-coverage-title">
                    <Layers size={12} />
                    Zonenabdeckung
                </div>
                <div className="ws-gps-zone-strip">
                    <button
                        className={`ws-gps-zone-chip${!selectedZoneId ? ' active' : ''}`}
                        onClick={() => onSelectZone?.('')}
                        type="button"
                    >
                        Alle <strong>{total}</strong>
                    </button>
                    {(zones ?? []).map((zone) => {
                        const count = zoneCounts.get(zone.id);
                        if (!count) return null;
                        return (
                            <button
                                key={zone.id}
                                className={`ws-gps-zone-chip${selectedZoneId === zone.id ? ' active' : ''}`}
                                onClick={() => onSelectZone?.(zone.id)}
                                title={zone.name}
                                type="button"
                            >
                                {zone.name.replace(/^S\d+\s*[–-]\s*/, '')}
                                <strong>{count.gps}/{count.total}</strong>
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedAsset && (
                <GpsPhotoPreview
                    asset={selectedAsset}
                    zoneName={zoneMap.get(selectedAsset.zoneId ?? '')}
                    zoneMap={zoneMap}
                    zones={(zones ?? []).map((zone) => ({ id: zone.id, name: zone.name }))}
                    spatialObjects={campusLocations}
                    onFocusAsset={onFocusAsset}
                    onOpenAsset={onOpenAsset}
                />
                )}

            {/* List */}
            <div className="ws-gps-list">
                {total === 0 && (
                    <p className="ws-empty-state">Noch keine Fotos in diesem Projekt.</p>
                )}
                {total > 0 && visibleAssets.length === 0 && (
                    <p className="ws-empty-state">Keine Fotos in der ausgewählten Zone.</p>
                )}
                {visibleAssets.map((asset) => {
                    const hasGps = typeof asset.gpsLat === 'number';
                    const isRepairing = repairing.has(asset.id);
                    const repairFailed = repairResults[asset.id] === false;
                    const zoneName = zoneMap.get(asset.zoneId ?? '') ?? asset.zoneId ?? '–';
                    const isActive = selectedAsset?.id === asset.id;

                    return (
                        <div
                            key={asset.id}
                            className={`ws-gps-item${hasGps ? ' ws-gps-item-ok' : ' ws-gps-item-missing'}${isActive ? ' ws-gps-item-active' : ''}`}
                            onClick={() => {
                                setLocalSelectedAssetId(asset.id);
                                onSelectAsset?.(asset.id);
                                if (asset.zoneId) onSelectZone?.(asset.zoneId);
                                if (hasGps) onFocusAsset?.(asset.gpsLat!, asset.gpsLon!);
                            }}
                            title={hasGps ? 'Klicken um auf Karte zu zentrieren' : 'Foto auswählen'}
                        >
                            <GpsAssetThumbnail asset={asset} size="small" />
                            {/* Title row */}
                            <div className="ws-gps-item-body">
                                <div className="ws-gps-item-title">
                                    {hasGps
                                        ? <MapPin size={11} style={{ color: '#e65100', flexShrink: 0 }} />
                                        : <AlertCircle size={11} style={{ color: '#90a4ae', flexShrink: 0 }} />
                                    }
                                    <span className="ws-gps-item-name">{asset.title}</span>
                                </div>
                                <div className="ws-gps-item-zone">{zoneName}</div>
                                {formatSpatialAnchorSummary(asset, zoneMap) && (
                                    <div className="ws-gps-item-spatial">{formatSpatialAnchorSummary(asset, zoneMap)}</div>
                                )}

                                {/* GPS data or repair button */}
                                {hasGps ? (
                                    <dl className="ws-gps-coords">
                                        <div>
                                            <dt>Lat</dt>
                                            <dd>{asset.gpsLat!.toFixed(6)}°</dd>
                                        </div>
                                        <div>
                                            <dt>Lon</dt>
                                            <dd>{asset.gpsLon!.toFixed(6)}°</dd>
                                        </div>
                                        {typeof asset.gpsBearing === 'number' && (
                                            <div>
                                                <dt>Richtung</dt>
                                                <dd>{asset.gpsBearing.toFixed(0)}° {bearingLabel(asset.gpsBearing)}</dd>
                                            </div>
                                        )}
                                        {asset.capturedAt && (
                                            <div>
                                                <dt>Aufnahme</dt>
                                                <dd>{formatCaptureDate(asset.capturedAt)}</dd>
                                            </div>
                                        )}
                                    </dl>
                                ) : (
                                    <div className="ws-gps-repair-row">
                                        {repairFailed && (
                                            <span className="ws-gps-repair-error">Kein GPS im Foto</span>
                                        )}
                                        {!repairFailed && (
                                            <button
                                                className="ws-gps-repair-btn"
                                                disabled={isRepairing}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRepairOne(asset);
                                                }}
                                                type="button"
                                            >
                                                {isRepairing
                                                    ? <><RefreshCw size={10} className="ws-gps-spin" /> Lesen…</>
                                                    : 'GPS aus Foto lesen'
                                                }
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function formatCaptureDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    return d.toLocaleString('de-DE', {
        dateStyle: 'short',
        timeStyle: value.includes('T') ? 'short' : undefined,
    });
}

function formatSpatialAnchorSummary(asset: AssetRecord, zoneMap: Map<string, string>): string | null {
    const anchorLabel = asset.spatialAnchorType === 'viewpoint'
        ? 'Blickpunkt'
        : asset.spatialAnchorType === 'zone_reference'
            ? 'Zonenbezug'
            : asset.spatialAnchorType === 'path_reference'
                ? 'Wegebezug'
                : asset.spatialAnchorType === 'overview'
                    ? 'Übersicht'
                    : null;
    const targetZoneLabel = asset.targetZoneId
        ? zoneMap.get(asset.targetZoneId) ?? asset.targetZoneId
        : null;
    const bearingLabelText = asset.bearingConfidence === 'exif'
        ? 'Richtung aus EXIF'
        : asset.bearingConfidence === 'estimated'
            ? 'Richtung geschätzt'
            : asset.bearingConfidence === 'verified'
                ? 'Richtung verifiziert'
                : null;

    const parts = [anchorLabel, targetZoneLabel ? `Ziel: ${targetZoneLabel}` : null, bearingLabelText].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
}

function GpsPhotoPreview({
    asset,
    zoneName,
    zoneMap,
    zones,
    spatialObjects,
    onFocusAsset,
    onOpenAsset,
}: {
    asset: AssetRecord;
    zoneName?: string;
    zoneMap: Map<string, string>;
    zones: Array<{ id: string; name: string }>;
    spatialObjects: CampusLocationOption[];
    onFocusAsset?: (lat: number, lon: number) => void;
    onOpenAsset?: (asset: AssetRecord) => void;
}) {
    const hasGps = typeof asset.gpsLat === 'number' && typeof asset.gpsLon === 'number';
    const spatialSummary = formatSpatialAnchorSummary(asset, zoneMap);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
    const [form, setForm] = useState({
        spatialAnchorType: asset.spatialAnchorType ?? '',
        targetZoneId: asset.targetZoneId ?? '',
        linkedSpatialObjectId: asset.linkedSpatialObjectId ?? '',
        bearingConfidence: asset.bearingConfidence ?? '',
        spatialNotes: asset.spatialNotes ?? '',
    });

    useEffect(() => {
        setForm({
            spatialAnchorType: asset.spatialAnchorType ?? '',
            targetZoneId: asset.targetZoneId ?? '',
            linkedSpatialObjectId: asset.linkedSpatialObjectId ?? '',
            bearingConfidence: asset.bearingConfidence ?? '',
            spatialNotes: asset.spatialNotes ?? '',
        });
        setEditing(false);
        setSaveState('idle');
    }, [asset]);

    return (
        <div className="ws-gps-preview">
            <GpsAssetThumbnail asset={asset} size="large" />
            <div className="ws-gps-preview-meta">
                <strong>{asset.title}</strong>
                {zoneName && <span>{zoneName}</span>}
                {spatialSummary && <span>{spatialSummary}</span>}
                {asset.spatialNotes && <span>{asset.spatialNotes}</span>}
                <div className="ws-gps-preview-actions">
                    {hasGps && (
                        <button
                            className="ws-gps-preview-focus"
                            onClick={() => onFocusAsset?.(asset.gpsLat!, asset.gpsLon!)}
                            type="button"
                        >
                            <Navigation size={12} />
                            Auf Karte zeigen
                        </button>
                    )}
                    {asset.zoneId && onOpenAsset && (
                        <button
                            className="ws-gps-preview-open"
                            onClick={() => onOpenAsset(asset)}
                            type="button"
                        >
                            In Workshop öffnen
                        </button>
                    )}
                    <button
                        className="ws-gps-preview-open"
                        onClick={() => setEditing((current) => !current)}
                        type="button"
                    >
                        {editing ? 'Review schließen' : 'Raumbezug prüfen'}
                    </button>
                </div>
                {editing && (
                    <div className="ws-gps-spatial-review">
                        <label>
                            <span>Ankertyp</span>
                            <select
                                value={form.spatialAnchorType}
                                onChange={(event) => setForm((current) => ({ ...current, spatialAnchorType: event.target.value }))}
                            >
                                <option value="">Automatisch</option>
                                <option value="viewpoint">Blickpunkt</option>
                                <option value="zone_reference">Zonenbezug</option>
                                <option value="path_reference">Wegebezug</option>
                                <option value="overview">Übersicht</option>
                            </select>
                        </label>
                        <label>
                            <span>Zielzone</span>
                            <select
                                value={form.targetZoneId}
                                onChange={(event) => setForm((current) => ({ ...current, targetZoneId: event.target.value }))}
                            >
                                <option value="">Keine explizite Zielzone</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>Räumliches Objekt</span>
                            <select
                                value={form.linkedSpatialObjectId}
                                onChange={(event) => setForm((current) => ({ ...current, linkedSpatialObjectId: event.target.value }))}
                            >
                                <option value="">Kein verknüpftes Objekt</option>
                                {spatialObjects.map((item) => (
                                    <option key={item.id} value={item.id}>{item.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>Richtungs-Konfidenz</span>
                            <select
                                value={form.bearingConfidence}
                                onChange={(event) => setForm((current) => ({ ...current, bearingConfidence: event.target.value }))}
                            >
                                <option value="">Unbestimmt</option>
                                <option value="exif">EXIF</option>
                                <option value="estimated">Geschätzt</option>
                                <option value="verified">Verifiziert</option>
                            </select>
                        </label>
                        <label>
                            <span>Räumliche Notiz</span>
                            <textarea
                                rows={3}
                                value={form.spatialNotes}
                                onChange={(event) => setForm((current) => ({ ...current, spatialNotes: event.target.value }))}
                                placeholder="z. B. Nordfassade, Blick zur Kantine, Zugang von Osten"
                            />
                        </label>
                        <div className="ws-gps-spatial-review-actions">
                            <button
                                className="ws-gps-preview-focus"
                                disabled={saving}
                                onClick={async () => {
                                    setSaving(true);
                                    setSaveState('idle');
                                    try {
                                        await updateAssetSpatialContext(asset.id, {
                                            spatialAnchorType: form.spatialAnchorType ? form.spatialAnchorType as AssetRecord['spatialAnchorType'] : undefined,
                                            targetZoneId: form.targetZoneId,
                                            linkedSpatialObjectId: form.linkedSpatialObjectId,
                                            bearingConfidence: form.bearingConfidence ? form.bearingConfidence as AssetRecord['bearingConfidence'] : undefined,
                                            spatialNotes: form.spatialNotes,
                                        });
                                        setSaveState('saved');
                                        setEditing(false);
                                    } catch {
                                        setSaveState('error');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                type="button"
                            >
                                {saving ? 'Speichert…' : 'Raumbezug speichern'}
                            </button>
                            {saveState === 'saved' && <span className="ws-gps-spatial-review-state">Gespeichert</span>}
                            {saveState === 'error' && <span className="ws-gps-spatial-review-state ws-gps-spatial-review-state-error">Fehler beim Speichern</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function GpsAssetThumbnail({ asset, size }: { asset: AssetRecord; size: 'small' | 'large' }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const urlRef = useRef<string | null>(null);
    const src = asset.derivates?.thumbnail ?? objectUrl;

    useEffect(() => {
        if (asset.derivates?.thumbnail) return;
        let cancelled = false;
        if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
        }
        getAssetObjectUrl(asset.id).then((url) => {
            if (cancelled) {
                if (url) URL.revokeObjectURL(url);
                return;
            }
            urlRef.current = url;
            setObjectUrl(url);
        });
        return () => {
            cancelled = true;
            if (urlRef.current) {
                URL.revokeObjectURL(urlRef.current);
                urlRef.current = null;
            }
        };
    }, [asset.derivates?.thumbnail, asset.id]);

    if (src) {
        return <img className={`ws-gps-thumb ws-gps-thumb-${size}`} src={src} alt={asset.title} />;
    }
    return (
        <div className={`ws-gps-thumb ws-gps-thumb-${size} ws-gps-thumb-empty`}>
            <ImageIcon size={size === 'large' ? 24 : 16} />
        </div>
    );
}
