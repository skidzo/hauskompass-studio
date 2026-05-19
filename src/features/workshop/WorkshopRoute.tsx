/**
 * WorkshopRoute — main entry point for the Workshop Assessment section.
 *
 * Layout:
 *   Left panel:  tabs (Zonen | Timeline | Szenen)
 *   Right panel: selected zone detail / scene detail
 */

import { seedProject } from '@/features/workshop/db/seedLoader';
import {
    useAllQuestions,
    useEventPhases,
    useInterpretations,
    useMemories,
    useObservations,
    useWorkshopScenes,
    useZone,
    useZoneAssetCounts,
    useZoneDetail,
    useZoneInterpretationCounts,
    useZoneObservationCounts,
    useZones
} from '@/features/workshop/hooks/useWorkshopData';
import { Camera, ChevronLeft, ChevronRight, Database, Download, Eye, HelpCircle, Layers, MapPin, MapPinned, MessageSquare, Navigation, PlusCircle, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ASSET_WARNING_LABEL, computeAssetCompleteness } from './completeness';
import { AssetIngestPanel } from './components/AssetIngestPanel';
import { SensitivityBadge } from './components/Badges';
import { ClaimCard, QuestionCard } from './components/Cards';
import { InterpretationPanel } from './components/InterpretationPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { ObservationPanel } from './components/ObservationPanel';
import { QuestionsBoard } from './components/QuestionsBoard';
import { Timeline } from './components/Timeline';
import { WorkshopSceneEditor } from './components/WorkshopSceneEditor';
import { WorkshopSceneCard, WorkshopSceneDetail } from './components/WorkshopSceneViewer';
import { ZoneList } from './components/ZoneList';
import type { MergeResult, ObservationRecord, WorkshopBundleExport } from './db/workshopDb';
import { deleteAsset, exportWorkshopBundle, exportWorkshopBundleZip, getAssetObjectUrl, mergeWorkshopBundle, mergeWorkshopBundleZip, saveObservation } from './db/workshopDb';
import type { ExportMode } from './export/workshopExport';
import { buildExportBlob, buildExportFilename, downloadExportBlob } from './export/workshopExport';

type WorkshopTab = 'zones' | 'timeline' | 'questions' | 'scenes';

export type WorkshopFocusKind = 'asset' | 'observation' | 'interpretation' | 'claim' | 'question' | 'scene';

export interface WorkshopFocusRequest {
    kind: WorkshopFocusKind;
    id: string;
    zoneId?: string;
    nonce: number;
}

export interface WorkshopRouteProps {
    focusRequest?: WorkshopFocusRequest | null;
    projectId?: string;
    siteId?: string;
}

export function WorkshopRoute({
    focusRequest,
    projectId: PROJECT_ID = '',
    siteId: SITE_ID = '',
}: WorkshopRouteProps) {
    const [seeded, setSeeded] = useState(false);
    const [tab, setTab] = useState<WorkshopTab>('zones');
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    const [editingSceneId, setEditingSceneId] = useState<string | 'new' | null>(null);

    useEffect(() => {
        if (!PROJECT_ID) return;
        seedProject(PROJECT_ID)
            .then(() => setSeeded(true))
            .catch((err) => { console.error('seedProject failed:', err); setSeeded(true); });
    }, [PROJECT_ID]);

    const zones = useZones(SITE_ID);
    const assetCounts = useZoneAssetCounts(SITE_ID);
    const obsCounts = useZoneObservationCounts(SITE_ID);
    const interpCounts = useZoneInterpretationCounts(SITE_ID);
    const scenes = useWorkshopScenes(PROJECT_ID);
    const phases = useEventPhases(PROJECT_ID);
    const allQuestions = useAllQuestions(PROJECT_ID);
    const sceneEditorAssets = useProjectAssets(PROJECT_ID);
    const sceneEditorObservations = useProjectObservations(PROJECT_ID);
    const sceneEditorClaims = useProjectClaims(PROJECT_ID);

    // Per-zone counts for list display
    const claimCountsByZone = useZoneClaimCounts(PROJECT_ID);
    const questionCountsByZone = useZoneQuestionCounts();

    const selectedScene = scenes?.find((s) => s.id === selectedSceneId) ?? null;

    useEffect(() => {
        if (!focusRequest) return;
        if (focusRequest.kind === 'scene') {
            setTab('scenes');
            setSelectedSceneId(focusRequest.id);
            setSelectedZoneId(null);
            setEditingSceneId(null);
            return;
        }
        if (focusRequest.zoneId) {
            setTab('zones');
            setSelectedZoneId(focusRequest.zoneId);
            setSelectedSceneId(null);
            setEditingSceneId(null);
        }
    }, [focusRequest]);

    if (!seeded) {
        return <div className="ws-loading">Datenbank wird initialisiert …</div>;
    }

    return (
        <div className="ws-layout">
            {/* ── Left panel: list + tabs ── */}
            <div className="ws-left-panel">
                <div className="tab-strip ws-tabs">
                    <button
                        className={`tab-btn ${tab === 'zones' ? 'tab-btn-active' : ''}`}
                        onClick={() => { setTab('zones'); setSelectedSceneId(null); }}
                        type="button"
                    >
                        Zonen
                    </button>
                    <button
                        className={`tab-btn ${tab === 'timeline' ? 'tab-btn-active' : ''}`}
                        onClick={() => { setTab('timeline'); setSelectedZoneId(null); setSelectedSceneId(null); }}
                        type="button"
                    >
                        Timeline
                    </button>
                    <button
                        className={`tab-btn ${tab === 'questions' ? 'tab-btn-active' : ''}`}
                        onClick={() => { setTab('questions'); setSelectedZoneId(null); setSelectedSceneId(null); }}
                        type="button"
                    >
                        Prüffragen
                    </button>
                    <button
                        className={`tab-btn ${tab === 'scenes' ? 'tab-btn-active' : ''}`}
                        onClick={() => { setTab('scenes'); setSelectedZoneId(null); }}
                        type="button"
                    >
                        Workshop-Szenen
                    </button>
                </div>

                {/* List content */}
                <div className="ws-list-scroll">
                    {tab === 'zones' && (
                        <ZoneList
                            zones={zones ?? []}
                            assetCounts={assetCounts ?? {}}
                            claimCountsByZone={claimCountsByZone}
                            questionCountsByZone={questionCountsByZone}
                            observationCountsByZone={obsCounts ?? {}}
                            interpretationCountsByZone={interpCounts ?? {}}
                            selectedZoneId={selectedZoneId}
                            onSelectZone={(id) => { setSelectedZoneId(id); setSelectedSceneId(null); }}
                        />
                    )}
                    {tab === 'timeline' && (
                        <Timeline phases={phases ?? []} />
                    )}
                    {tab === 'questions' && (
                        <QuestionsBoard
                            questions={allQuestions ?? []}
                            zones={zones ?? []}
                            onSelectZone={(id) => { setSelectedZoneId(id); setSelectedSceneId(null); setTab('zones'); }}
                        />
                    )}
                    {tab === 'scenes' && (
                        <div className="ws-zone-list">
                            {(scenes ?? []).map((scene) => (
                                <WorkshopSceneCard
                                    key={scene.id}
                                    scene={scene}
                                    isSelected={scene.id === selectedSceneId}
                                    onClick={() => { setSelectedSceneId(scene.id); setSelectedZoneId(null); setEditingSceneId(null); }}
                                />
                            ))}
                            <button
                                className="ws-add-scene-btn"
                                onClick={() => { setEditingSceneId('new'); setSelectedSceneId(null); setSelectedZoneId(null); }}
                                type="button"
                            >
                                <PlusCircle size={14} /> Neue Szene
                            </button>
                            {scenes?.length === 0 && (
                                <p className="ws-empty-state">Keine Workshop-Szenen vorhanden.</p>
                            )}
                            {(scenes ?? []).length > 0 && (
                                <WorkshopExportBar
                                    scenes={scenes ?? []}
                                    projectTitle={PROJECT_ID}
                                />
                            )}
                        </div>
                    )}
                </div>
                <DataBackupBar projectId={PROJECT_ID} projectTitle={PROJECT_ID} />
            </div>

            {/* ── Right panel ── */}
            <div className="ws-right-panel">
                <>
                    {editingSceneId && (
                        <WorkshopSceneEditor
                            projectId={PROJECT_ID}
                            scene={editingSceneId === 'new' ? null : (scenes?.find((s) => s.id === editingSceneId) ?? null)}
                            scenes={scenes ?? []}
                            assets={sceneEditorAssets}
                            observations={sceneEditorObservations}
                            claims={sceneEditorClaims}
                            questions={allQuestions ?? []}
                            onCancel={() => setEditingSceneId(null)}
                            onSaved={(sceneId) => { setEditingSceneId(null); setSelectedSceneId(sceneId); setTab('scenes'); }}
                        />
                    )}
                    {selectedScene && !editingSceneId && (
                        <WorkshopSceneDetail
                            scene={selectedScene}
                            onBack={() => setSelectedSceneId(null)}
                            onEdit={() => setEditingSceneId(selectedScene.id)}
                        />
                    )}
                    {selectedZoneId && !selectedScene && !editingSceneId && (
                        <ZoneDetailPanel
                            zoneId={selectedZoneId}
                            projectId={PROJECT_ID}
                            focusRequest={focusRequest}
                            onClose={() => setSelectedZoneId(null)}
                        />
                    )}
                    {!selectedZoneId && !selectedScene && !editingSceneId && (
                        <WorkshopWelcome tab={tab} zoneCount={zones?.length ?? 0} sceneCount={scenes?.length ?? 0} />
                    )}
                </>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ZoneDetailPanel
// ---------------------------------------------------------------------------

function ZoneDetailPanel({
    zoneId,
    projectId,
    focusRequest,
    onClose,
}: {
    zoneId: string;
    projectId: string;
    focusRequest?: WorkshopFocusRequest | null;
    onClose: () => void;
}) {
    const zone = useZone(zoneId);
    const { claims, questions, assets } = useZoneDetail(zoneId, projectId);
    const observations = useObservations(zoneId);
    const interpretations = useInterpretations(zoneId);
    const memories = useMemories(zoneId);
    const [showIngest, setShowIngest] = useState(false);
    const [viewerAssetId, setViewerAssetId] = useState<string | null>(null);
    const focusedKind = focusRequest?.zoneId === zoneId ? focusRequest.kind : null;
    const focusedId = focusRequest?.zoneId === zoneId ? focusRequest.id : null;

    // Only photos are viewable in the lightbox
    const photoAssets = (assets ?? []).filter((a) => a.assetType === 'photo');

    useEffect(() => {
        if (!focusRequest || focusRequest.zoneId !== zoneId || focusRequest.kind !== 'asset') return;
        const asset = (assets ?? []).find((item) => item.id === focusRequest.id);
        if (asset?.assetType === 'photo') setViewerAssetId(asset.id);
    }, [assets, focusRequest, zoneId]);

    useEffect(() => {
        if (!focusedKind || focusedKind === 'asset') return;
        window.setTimeout(() => {
            document.querySelector('.ws-focused-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
    }, [focusedId, focusedKind]);

    if (!zone) return <div className="ws-loading">Zone wird geladen …</div>;

    return (
        <div className="ws-zone-detail">
            <button className="ws-back-btn" onClick={onClose} type="button">← Zurück</button>

            <div className="ws-zone-detail-header">
                <h3 className="ws-zone-detail-name">{zone.name}</h3>
                <div className="ws-card-badges">
                    <SensitivityBadge level={zone.sensitivityLevel} />
                    <span style={{ fontSize: '0.68rem', color: '#90a4ae' }}>
                        {zone.documentationStatus === 'not_started' ? 'Nicht begonnen'
                            : zone.documentationStatus === 'partial' ? 'Teilweise dokumentiert'
                                : 'Vollständig'}
                    </span>
                </div>
                <p className="ws-zone-detail-desc">{zone.description}</p>
                {focusedKind && focusedId && (
                    <div className="ws-focus-banner">
                        Fokus aus 3D: {focusLabel(focusedKind)} <strong>{focusedId}</strong>
                    </div>
                )}
            </div>

            {/* Assets */}
            <section className="ws-detail-section">
                <div className="ws-detail-heading-row">
                    <h4 className="ws-detail-heading">
                        <Camera size={14} /> Medien ({assets?.length ?? 0})
                    </h4>
                    <button
                        className="ws-add-btn"
                        onClick={() => setShowIngest((v) => !v)}
                        type="button"
                        title="Medien hinzufügen"
                    >
                        <PlusCircle size={14} />
                        {showIngest ? 'Schließen' : 'Hinzufügen'}
                    </button>
                </div>

                {showIngest && (
                    <AssetIngestPanel
                        zoneId={zoneId}
                        projectId={projectId}
                        onClose={() => setShowIngest(false)}
                    />
                )}

                {assets && assets.length > 0 ? (
                    <div className="ws-asset-grid">
                        {assets.map((a) => (
                            <AssetCard
                                key={a.id}
                                asset={a}
                                focused={focusedKind === 'asset' && focusedId === a.id}
                                onOpen={a.assetType === 'photo' ? () => setViewerAssetId(a.id) : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    !showIngest && (
                        <p className="ws-empty-state">
                            Noch keine Medien erfasst. Fotos, Dokumente oder Scans über „Hinzufügen" erfassen.
                        </p>
                    )
                )}
            </section>

            {/* Observations */}
            <ObservationPanel
                zoneId={zoneId}
                projectId={projectId}
                observations={observations ?? []}
                focusedObservationId={focusedKind === 'observation' ? focusedId ?? undefined : undefined}
            />

            {/* Interpretations — evidence chain: Observations → Interpretations → Claims */}
            <InterpretationPanel
                zoneId={zoneId}
                projectId={projectId}
                interpretations={interpretations ?? []}
                observations={observations ?? []}
                focusedInterpretationId={focusedKind === 'interpretation' ? focusedId ?? undefined : undefined}
            />

            {/* Memories */}
            <MemoryPanel
                zoneId={zoneId}
                projectId={projectId}
                memories={memories ?? []}
            />

            {/* Claims */}
            <section className="ws-detail-section">
                <h4 className="ws-detail-heading">
                    <MessageSquare size={14} /> Aussagen ({claims?.length ?? 0})
                </h4>
                {claims && claims.length > 0
                    ? claims.map((c) => (
                        <div className={focusedKind === 'claim' && focusedId === c.id ? 'ws-focused-evidence' : ''} key={c.id}>
                            <ClaimCard claim={c} />
                        </div>
                    ))
                    : <p className="ws-empty-state">Keine Aussagen für diese Zone.</p>}
            </section>

            {/* Questions */}
            <section className="ws-detail-section">
                <h4 className="ws-detail-heading">
                    <HelpCircle size={14} /> Offene Fragen ({questions?.length ?? 0})
                </h4>
                {questions && questions.length > 0
                    ? questions.map((q) => (
                        <div className={focusedKind === 'question' && focusedId === q.id ? 'ws-focused-evidence' : ''} key={q.id}>
                            <QuestionCard question={q} />
                        </div>
                    ))
                    : <p className="ws-empty-state">Keine offenen Fragen für diese Zone.</p>}
            </section>

            {/* Lightbox */}
            {viewerAssetId && (
                <PhotoViewer
                    assets={photoAssets}
                    initialId={viewerAssetId}
                    zoneId={zoneId}
                    projectId={projectId}
                    onClose={() => setViewerAssetId(null)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// PhotoViewer — fullscreen lightbox for photo assets
// ---------------------------------------------------------------------------

type ObsConf = 'high' | 'medium' | 'low';

function generateObsId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `OBS-${ts}-${rnd}`;
}

function PhotoViewer({
    assets,
    initialId,
    zoneId,
    projectId,
    onClose,
}: {
    assets: import('./db/workshopDb').AssetRecord[];
    initialId: string;
    zoneId: string;
    projectId: string;
    onClose: () => void;
}) {
    const [currentId, setCurrentId] = useState(initialId);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const urlRef = useRef<string | null>(null);

    // Inline observation form state
    const [showObsForm, setShowObsForm] = useState(false);
    const [obsText, setObsText] = useState('');
    const [obsConf, setObsConf] = useState<ObsConf>('medium');
    const [obsSaving, setObsSaving] = useState(false);
    const [obsSaved, setObsSaved] = useState(false);

    // Reset obs form when navigating to another photo
    useEffect(() => {
        setShowObsForm(false);
        setObsText('');
        setObsSaved(false);
    }, [currentId]);

    const idx = assets.findIndex((a) => a.id === currentId);
    const current = assets[idx] ?? assets[0];
    const hasPrev = idx > 0;
    const hasNext = idx < assets.length - 1;

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setObjectUrl(null);
        if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
        getAssetObjectUrl(current.id).then((url) => {
            if (cancelled) return;
            urlRef.current = url;
            setObjectUrl(url);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [current.id]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
    }, []);

    // Keyboard navigation
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && hasPrev) setCurrentId(assets[idx - 1].id);
            if (e.key === 'ArrowRight' && hasNext) setCurrentId(assets[idx + 1].id);
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [idx, hasPrev, hasNext, assets, onClose]);

    return (
        <div className="ws-photo-viewer" onClick={onClose} role="dialog" aria-modal="true">
            {/* Backdrop click closes; inner clicks don't */}
            <div className="ws-photo-viewer-inner" onClick={(e) => e.stopPropagation()}>
                {/* Close */}
                <button className="ws-photo-viewer-close" onClick={onClose} type="button" aria-label="Schließen">
                    <X size={20} />
                </button>

                {/* Image */}
                <div className="ws-photo-viewer-img-wrap">
                    {loading && <span className="ws-photo-viewer-spinner">⏳</span>}
                    {objectUrl && (
                        <img
                            src={objectUrl}
                            alt={current.title}
                            className="ws-photo-viewer-img"
                        />
                    )}
                    {!loading && !objectUrl && (
                        <div className="ws-photo-viewer-noimg">Kein Bild verfügbar</div>
                    )}
                </div>

                {/* Prev / Next */}
                {hasPrev && (
                    <button
                        className="ws-photo-viewer-nav ws-photo-viewer-prev"
                        onClick={() => setCurrentId(assets[idx - 1].id)}
                        type="button"
                        aria-label="Vorheriges Foto"
                    >
                        <ChevronLeft size={28} />
                    </button>
                )}
                {hasNext && (
                    <button
                        className="ws-photo-viewer-nav ws-photo-viewer-next"
                        onClick={() => setCurrentId(assets[idx + 1].id)}
                        type="button"
                        aria-label="Nächstes Foto"
                    >
                        <ChevronRight size={28} />
                    </button>
                )}

                {/* Inline observation form */}
                {showObsForm && (
                    <div className="ws-photo-obs-form" onClick={(e) => e.stopPropagation()}>
                        <p className="ws-photo-obs-form-label"><Eye size={12} /> Beobachtung zu diesem Foto</p>
                        <textarea
                            className="ws-photo-obs-textarea"
                            rows={3}
                            placeholder="Was ist sichtbar? Befund, Materialzustand, Auffälligkeit …"
                            value={obsText}
                            onChange={(e) => setObsText(e.target.value)}
                            autoFocus
                        />
                        <div className="ws-photo-obs-conf-row">
                            <span className="ws-photo-obs-conf-label">Konfidenz:</span>
                            {(['high', 'medium', 'low'] as ObsConf[]).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`ws-photo-obs-conf-btn${obsConf === c ? ' active' : ''}`}
                                    onClick={() => setObsConf(c)}
                                >
                                    {c === 'high' ? 'Hoch' : c === 'medium' ? 'Mittel' : 'Niedrig'}
                                </button>
                            ))}
                        </div>
                        <div className="ws-photo-obs-actions">
                            {obsSaved ? (
                                <span className="ws-photo-obs-saved">✓ Gespeichert</span>
                            ) : (
                                <button
                                    type="button"
                                    className="ws-photo-obs-save-btn"
                                    disabled={obsSaving || !obsText.trim()}
                                    onClick={async () => {
                                        if (!obsText.trim()) return;
                                        setObsSaving(true);
                                        const now = new Date().toISOString();
                                        const obs: ObservationRecord = {
                                            id: generateObsId(),
                                            projectId,
                                            zoneId,
                                            text: obsText.trim(),
                                            observedAt: now,
                                            linkedAssetIds: [current.id],
                                            epistemic: 'observation',
                                            confidence: obsConf,
                                            sensitivityLevel: 'internal',
                                            publicationStatus: 'needs_review',
                                            createdAt: now,
                                        };
                                        await saveObservation(obs);
                                        setObsSaving(false);
                                        setObsSaved(true);
                                        setObsText('');
                                        setTimeout(() => { setShowObsForm(false); setObsSaved(false); }, 1200);
                                    }}
                                >
                                    {obsSaving ? '…' : 'Speichern'}
                                </button>
                            )}
                            <button
                                type="button"
                                className="ws-photo-obs-cancel-btn"
                                onClick={() => { setShowObsForm(false); setObsText(''); }}
                            >
                                Abbrechen
                            </button>
                        </div>
                    </div>
                )}

                {/* Meta bar */}
                <div className="ws-photo-viewer-meta">
                    <span className="ws-photo-viewer-title">{current.title}</span>
                    <span className="ws-photo-viewer-counter">{idx + 1} / {assets.length}</span>
                    {current.capturedAt && (
                        <span className="ws-photo-viewer-date">{current.capturedAt.slice(0, 10)}</span>
                    )}
                    {current.gpsLat != null && current.gpsLon != null && (
                        <span className="ws-photo-viewer-gps">
                            <MapPinned size={12} />
                            {current.gpsLat.toFixed(5)}, {current.gpsLon.toFixed(5)}
                            {current.gpsAlt != null && ` · ${Math.round(current.gpsAlt)} m`}
                        </span>
                    )}
                    {current.gpsBearing != null && (
                        <span className="ws-photo-viewer-bearing">
                            <Navigation size={12} /> {Math.round(current.gpsBearing)}°
                        </span>
                    )}
                    <button
                        type="button"
                        className={`ws-photo-obs-toggle${showObsForm ? ' active' : ''}`}
                        onClick={() => setShowObsForm((v) => !v)}
                        title="Beobachtung zu diesem Foto erfassen"
                    >
                        <Eye size={13} /> Beobachtung
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AssetCard — thumbnail for images, file-type icon otherwise
// ---------------------------------------------------------------------------

function AssetCard({ asset, focused, onOpen }: { asset: import('./db/workshopDb').AssetRecord; focused?: boolean; onOpen?: () => void }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [blobLoaded, setBlobLoaded] = useState(false);
    const urlRef = useRef<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const thumbnailUrl = asset.derivates?.thumbnail ?? objectUrl;

    useEffect(() => {
        let cancelled = false;
        getAssetObjectUrl(asset.id).then((url) => {
            if (cancelled) return;
            urlRef.current = url;
            setObjectUrl(url);
            setBlobLoaded(true);
        });
        return () => {
            cancelled = true;
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        };
    }, [asset.id]);

    const isPlaceholder = blobLoaded && !objectUrl;

    async function handleDelete() {
        if (!confirming) { setConfirming(true); return; }
        await deleteAsset(asset.id);
    }

    return (
        <div className={`ws-asset-card${isPlaceholder ? ' ws-asset-card-placeholder' : ''}${focused ? ' ws-focused-evidence' : ''}`}>
            <div className="ws-asset-thumb-wrap">
                {isPlaceholder ? (
                    <span className="ws-asset-placeholder-icon" title="Kein Medium — Platzhalter">
                        <MapPin size={22} color="#e65100" />
                    </span>
                ) : thumbnailUrl && asset.assetType === 'photo' ? (
                    <img
                        alt={asset.title}
                        className={`ws-asset-thumb${onOpen ? ' ws-asset-thumb-clickable' : ''}`}
                        src={thumbnailUrl}
                        onClick={onOpen}
                        title="Foto vergrößern"
                    />
                ) : (
                    <span className="ws-asset-type-icon">{assetTypeIcon(asset.assetType)}</span>
                )}
                <button
                    className={`ws-asset-delete-btn ${confirming ? 'ws-asset-delete-confirm' : ''}`}
                    onClick={handleDelete}
                    onBlur={() => setConfirming(false)}
                    type="button"
                    title={confirming ? 'Nochmal klicken zum Bestätigen' : 'Medium entfernen'}
                >
                    <Trash2 size={11} />
                    {confirming ? '?' : ''}
                </button>
            </div>
            <p className="ws-asset-title">{asset.title}</p>
            {isPlaceholder && (
                <p className="ws-asset-placeholder-label">📍 Kein Medium</p>
            )}
            {asset.description && (
                <p className="ws-asset-desc-small">{asset.description}</p>
            )}
            {(() => {
                const warnings = computeAssetCompleteness(
                    { title: asset.title, zoneId: asset.zoneId, sensitivityLevel: asset.sensitivityLevel, publicationStatus: asset.publicationStatus },
                    !isPlaceholder,
                );
                return warnings.length > 0 ? (
                    <ul className="ws-asset-warnings">
                        {warnings.map((w) => (
                            <li key={w} className="ws-asset-warning-item">{ASSET_WARNING_LABEL[w]}</li>
                        ))}
                    </ul>
                ) : null;
            })()}
            <div className="ws-asset-meta">
                <SensitivityBadge level={asset.sensitivityLevel} />
                {asset.capturedAt && (
                    <span className="ws-asset-date">{asset.capturedAt.slice(0, 10)}</span>
                )}
            </div>
        </div>
    );
}

function focusLabel(kind: WorkshopFocusKind): string {
    const labels: Record<WorkshopFocusKind, string> = {
        asset: 'Medium',
        observation: 'Beobachtung',
        interpretation: 'Deutung',
        claim: 'Aussage',
        question: 'Frage',
        scene: 'Szene',
    };
    return labels[kind];
}

function assetTypeIcon(type: import('@/domain/workshop/types').AssetType): string {
    const icons: Record<string, string> = {
        photo: '📷', video: '🎬', audio: '🎙️', document: '📄',
        scan: '📡', model: '🏗️', map: '🗺️', sketch: '✏️',
        screenshot: '🖥️', transcript: '📝', other: '📎',
    };
    return icons[type] ?? '📎';
}

// ---------------------------------------------------------------------------
// Welcome screen
// ---------------------------------------------------------------------------

function WorkshopWelcome({
    tab, zoneCount, sceneCount,
}: { tab: WorkshopTab; zoneCount: number; sceneCount: number }) {
    return (
        <div className="ws-welcome">
            <Layers size={32} color="#23614b" />
            <h3>Workshop-Modell</h3>
            <p>
                {tab === 'zones'
                    ? `${zoneCount} Zonen geladen. Zone auswählen, um Medien, Aussagen und offene Fragen zu sehen.`
                    : tab === 'timeline'
                        ? 'Historische Phasen des Campus werden in der Timeline links angezeigt.'
                        : tab === 'questions'
                            ? 'Alle offenen Prüffragen über alle Zonen, nach Priorität sortiert.'
                            : `${sceneCount} Workshop-Szenen bereit. Szene auswählen für Details und Diskussionsprompt.`}
            </p>
            <p className="ws-welcome-hint">
                Medien werden nach der Vor-Ort-Erfassung mit Zonen verknüpft (Asset-Ingest, Sprint 1).
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WorkshopExportBar — export button in scenes tab
// ---------------------------------------------------------------------------

function WorkshopExportBar({
    scenes,
    projectTitle,
}: {
    scenes: import('./db/workshopDb').WorkshopScene[];
    projectTitle: string;
}) {
    const [exporting, setExporting] = useState(false);

    async function handleExport(mode: ExportMode) {
        setExporting(true);
        const blob = buildExportBlob(scenes, { mode, projectTitle });
        downloadExportBlob(blob, buildExportFilename(projectTitle, mode));
        setExporting(false);
    }

    return (
        <div className="ws-export-bar">
            <span className="ws-export-label">
                <Download size={13} /> Export
            </span>
            <button
                className="ws-export-btn ws-export-btn-public"
                onClick={() => handleExport('public')}
                disabled={exporting}
                type="button"
                title="Nur veröffentlichbare Szenen exportieren"
            >
                Öffentliche Mappe
            </button>
            <button
                className="ws-export-btn ws-export-btn-internal"
                onClick={() => handleExport('internal')}
                disabled={exporting}
                type="button"
                title="Alle Szenen inkl. internen exportieren"
            >
                Interne Arbeitsmappe
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Internal helper hooks for count maps
// ---------------------------------------------------------------------------

import { useLiveQuery } from 'dexie-react-hooks';
import { workshopDb } from './db/workshopDb';

function useZoneClaimCounts(projectId: string): Record<string, number> {
    return useLiveQuery(async () => {
        const all = await workshopDb.claims.where('projectId').equals(projectId).toArray();
        const counts: Record<string, number> = {};
        for (const c of all) {
            if (c.zoneId) counts[c.zoneId] = (counts[c.zoneId] ?? 0) + 1;
        }
        return counts;
    }, [projectId], {} as Record<string, number>) ?? {};
}

function useZoneQuestionCounts(): Record<string, number> {
    return useLiveQuery(async () => {
        const all = await workshopDb.questions.toArray();
        const counts: Record<string, number> = {};
        for (const q of all) {
            if (q.zoneId) counts[q.zoneId] = (counts[q.zoneId] ?? 0) + 1;
        }
        return counts;
    }, [], {} as Record<string, number>) ?? {};
}

function useProjectAssets(projectId: string): import('./db/workshopDb').AssetRecord[] {
    return useLiveQuery(
        () => workshopDb.assets.where('projectId').equals(projectId).toArray(),
        [projectId],
        [] as import('./db/workshopDb').AssetRecord[],
    ) ?? [];
}

function useProjectObservations(projectId: string): ObservationRecord[] {
    return useLiveQuery(
        () => workshopDb.observations.where('projectId').equals(projectId).toArray(),
        [projectId],
        [] as ObservationRecord[],
    ) ?? [];
}

function useProjectClaims(projectId: string): import('./db/workshopDb').ClaimRecord[] {
    return useLiveQuery(
        () => workshopDb.claims.where('projectId').equals(projectId).toArray(),
        [projectId],
        [] as import('./db/workshopDb').ClaimRecord[],
    ) ?? [];
}

// ---------------------------------------------------------------------------
// DataBackupBar — export all domain records as JSON or ZIP bundle
// ---------------------------------------------------------------------------

function DataBackupBar({
    projectId,
    projectTitle,
}: {
    projectId: string;
    projectTitle: string;
}) {
    const [exporting, setExporting] = useState<null | 'json' | 'zip'>(null);
    const [merging, setMerging] = useState(false);
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const mergeFileRef = useRef<HTMLInputElement>(null);

    async function handleMergeFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setMerging(true);
        setMergeResult(null);
        setMergeError(null);
        try {
            let result: MergeResult;
            if (file.name.endsWith('.zip')) {
                result = await mergeWorkshopBundleZip(file);
            } else {
                const text = await file.text();
                const bundle = JSON.parse(text) as WorkshopBundleExport;
                result = await mergeWorkshopBundle(bundle);
            }
            setMergeResult(result);
        } catch (err) {
            setMergeError(err instanceof Error ? err.message : 'Zusammenführen fehlgeschlagen.');
        } finally {
            setMerging(false);
            if (mergeFileRef.current) mergeFileRef.current.value = '';
        }
    }

    async function handleJsonBackup() {
        setExporting('json');
        try {
            const bundle = await exportWorkshopBundle(projectId);
            const json = JSON.stringify(bundle, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const date = new Date().toISOString().slice(0, 10);
            triggerDownload(blob, `${projectTitle}-backup-${date}.json`);
        } finally {
            setExporting(null);
        }
    }

    async function handleZipBackup() {
        setExporting('zip');
        try {
            const blob = await exportWorkshopBundleZip(projectId);
            const date = new Date().toISOString().slice(0, 10);
            triggerDownload(blob, `${projectTitle}-backup-${date}.zip`);
        } finally {
            setExporting(null);
        }
    }

    return (
        <div className="ws-backup-bar">
            <span className="ws-backup-label">
                <Database size={13} /> Datensicherung
            </span>
            <button
                className="ws-backup-btn"
                onClick={handleZipBackup}
                disabled={exporting !== null || merging}
                type="button"
                title="Metadaten + alle Fotos als ZIP sichern"
            >
                {exporting === 'zip' ? 'Exportiert …' : 'ZIP-Backup (mit Fotos)'}
            </button>
            <button
                className="ws-backup-btn ws-backup-btn-secondary"
                onClick={handleJsonBackup}
                disabled={exporting !== null || merging}
                type="button"
                title="Nur Metadaten als JSON sichern (keine Fotos)"
            >
                {exporting === 'json' ? 'Exportiert …' : 'JSON (nur Metadaten)'}
            </button>
            <input
                ref={mergeFileRef}
                type="file"
                accept=".zip,.json,application/zip,application/json"
                style={{ display: 'none' }}
                onChange={handleMergeFile}
            />
            <button
                className="ws-backup-btn ws-backup-btn-merge"
                onClick={() => { setMergeResult(null); setMergeError(null); mergeFileRef.current?.click(); }}
                disabled={exporting !== null || merging}
                type="button"
                title="Backup einer anderen Person einlesen und zusammenführen (bestehende Einträge bleiben erhalten)"
            >
                <UserPlus size={12} />
                {merging ? 'Zusammengeführt …' : 'Zusammenführen'}
            </button>
            {mergeResult !== null && (
                <span className="ws-merge-result">
                    {mergeResult.added === 0
                        ? 'Keine neuen Einträge — alles bereits vorhanden.'
                        : `${mergeResult.added} neue Einträge hinzugefügt.`}
                </span>
            )}
            {mergeError && <span className="ws-merge-error">{mergeError}</span>}
        </div>
    );
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
