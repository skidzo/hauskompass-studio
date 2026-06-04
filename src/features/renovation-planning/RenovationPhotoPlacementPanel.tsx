import type { ImportedProject } from '@/features/project-store/types';
import type { ExifGpsData } from '@/lib/studio-core/media/exif';
import { prepareStudioMediaSelection } from '@/lib/studio-core/media/intake';
import {
  deriveOrientationConfidence,
  derivePlacementConfidence,
  derivePlacementSource,
} from '@/lib/studio-core/spatial-reference/helpers';
import {
  formatBearingSummary,
  formatCaptureDate,
  formatExifEvidenceSummary,
  formatGpsPoint,
} from '@/lib/studio-core/spatial-reference/presentation';
import { AlertTriangle, Camera, FileImage, MapPin, Navigation, Plus, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createRenovationPhotoRegistration,
  loadRenovationPhotoPlacementState,
  saveRenovationPhotoPlacementState,
  upsertRenovationPhotoPlacementState,
} from './renovationPhotoPlacementStore';
import type {
  HiddenInfrastructureStatus,
  HistoricalDateConfidence,
  HistoricalDecisionUsefulness,
  HistoricalShownState,
  PhotoPlacementConfidence,
  PhotoPlacementSource,
  PhotoOrientationConfidence,
  RenovationPhotoEvidenceKind,
  RenovationPhotoImportSource,
  RenovationPhotoPlacementState,
  ViewDirectionLabel,
} from './renovationPhotoPlacementTypes';

const FLOOR_OPTIONS = ['ground', 'upper', 'attic', 'cellar', 'roof', 'unknown'];
const VIEW_DIRECTION_OPTIONS: ViewDirectionLabel[] = [
  'north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest',
  'towards_door', 'towards_window', 'towards_stair', 'along_wall', 'across_room', 'unknown',
];
const PLACEMENT_SOURCE_OPTIONS: PhotoPlacementSource[] = [
  'exif', 'manual', 'inferred_from_context', 'historical_note', 'imported_from_other_device', 'unknown',
];
const PLACEMENT_CONFIDENCE_OPTIONS: PhotoPlacementConfidence[] = ['verified', 'likely', 'approximate', 'uncertain', 'unknown'];
const ORIENTATION_CONFIDENCE_OPTIONS: PhotoOrientationConfidence[] = ['verified', 'likely', 'approximate', 'uncertain', 'unknown'];
const IMPORT_SOURCE_OPTIONS: RenovationPhotoImportSource[] = ['current_device', 'imported_from_other_device', 'historical_archive', 'unknown'];
const SHOWN_STATE_OPTIONS: HistoricalShownState[] = ['before', 'during', 'after', 'unknown'];
const DATE_CONFIDENCE_OPTIONS: HistoricalDateConfidence[] = ['exact', 'estimated', 'rough', 'unknown'];
const DECISION_USEFULNESS_OPTIONS: HistoricalDecisionUsefulness[] = ['high', 'medium', 'low', 'unknown'];
const NOTE_KIND_OPTIONS: RenovationPhotoEvidenceKind[] = ['observation', 'question'];
const HIDDEN_INFRA_OPTIONS: HiddenInfrastructureStatus[] = ['visible', 'historical_photo_only', 'inferred', 'unknown'];

interface DraftState {
  title: string;
  description: string;
  fileName: string;
  mimeType: string;
  capturedAt: string;
  sourceDeviceLabel: string;
  importSource: RenovationPhotoImportSource;
  isHistorical: boolean;
  buildingId: string;
  floorId: string;
  roomId: string;
  buildingElementId: string;
  surfaceId: string;
  mapLat: string;
  mapLon: string;
  planX: string;
  planY: string;
  viewDirectionDegrees: string;
  viewDirectionLabel: ViewDirectionLabel;
  placementSource: PhotoPlacementSource;
  placementConfidence: PhotoPlacementConfidence;
  orientationConfidence: PhotoOrientationConfidence;
  placementNotes: string;
  estimatedDate: string;
  exactDateKnown: boolean;
  dateConfidence: HistoricalDateConfidence;
  shownState: HistoricalShownState;
  whatIsVisible: string;
  whatMayHaveChanged: string;
  sourceDescription: string;
  decisionUsefulness: HistoricalDecisionUsefulness;
  relatedUtilityLineIds: string;
  relatedBuildingElementIds: string;
  relatedInspectionPointIds: string;
  historicalNotes: string;
  evidenceNoteKind: RenovationPhotoEvidenceKind;
  evidenceNoteText: string;
  relatedToHiddenInfrastructure: boolean;
  hiddenInfrastructureStatus: HiddenInfrastructureStatus;
}

interface PendingPhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
  exifData: ExifGpsData | null;
  draft: DraftState;
}

const DEFAULT_DRAFT: DraftState = {
  title: '',
  description: '',
  fileName: '',
  mimeType: '',
  capturedAt: '',
  sourceDeviceLabel: '',
  importSource: 'current_device',
  isHistorical: false,
  buildingId: '',
  floorId: 'unknown',
  roomId: '',
  buildingElementId: '',
  surfaceId: '',
  mapLat: '',
  mapLon: '',
  planX: '',
  planY: '',
  viewDirectionDegrees: '',
  viewDirectionLabel: 'unknown',
  placementSource: 'manual',
  placementConfidence: 'approximate',
  orientationConfidence: 'unknown',
  placementNotes: '',
  estimatedDate: '',
  exactDateKnown: false,
  dateConfidence: 'unknown',
  shownState: 'unknown',
  whatIsVisible: '',
  whatMayHaveChanged: '',
  sourceDescription: '',
  decisionUsefulness: 'unknown',
  relatedUtilityLineIds: '',
  relatedBuildingElementIds: '',
  relatedInspectionPointIds: '',
  historicalNotes: '',
  evidenceNoteKind: 'observation',
  evidenceNoteText: '',
  relatedToHiddenInfrastructure: false,
  hiddenInfrastructureStatus: 'unknown',
};

export function RenovationPhotoPlacementPanel({ project }: { project?: ImportedProject | null }) {
  const projectSlug = project?.slug ?? 'demo-renovation';
  const [state, setState] = useState<RenovationPhotoPlacementState>(() => loadRenovationPhotoPlacementState(projectSlug));
  const [pending, setPending] = useState<PendingPhotoDraft[]>([]);
  const [activePendingId, setActivePendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('Fotos bleiben lokale Evidenz. EXIF wird gelesen, aber nicht automatisch als Wahrheit behandelt.');
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const loaded = loadRenovationPhotoPlacementState(projectSlug);
    setState(loaded);
    setPending((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setActivePendingId(null);
  }, [projectSlug]);

  useEffect(() => {
    saveRenovationPhotoPlacementState(state);
  }, [state]);

  useEffect(() => {
    const currentUrls = pending.map((item) => item.previewUrl);
    previewUrlsRef.current
      .filter((url) => !currentUrls.includes(url))
      .forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = currentUrls;
  }, [pending]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const buildingOptions = useMemo(() => {
    if (!project) return [];
    return project.candidates.map((candidate) => ({
      id: candidate.id,
      label: `${candidate.id}${project.confirmedIds.includes(candidate.id) ? ' · bestätigt' : ''}`,
    }));
  }, [project]);

  const historicalCount = state.photos.filter((photo) => photo.isHistorical).length;
  const activePending = pending.find((item) => item.id === activePendingId) ?? pending[0] ?? null;

  const unresolvedPendingCount = useMemo(
    () => pending.reduce((sum, item) => sum + intakeIssuesForDraft(item.draft).length, 0),
    [pending],
  );

  const savedPhotoEntries = useMemo(() => {
    return [...state.photos]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((photo) => {
        const placement = state.placements.find((item) => item.assetId === photo.id);
        const historical = state.historicalMetadata.find((item) => item.assetId === photo.id);
        const notes = state.evidenceNotes.filter((item) => item.assetId === photo.id);
        const issues = savedPhotoIssues({ photo, placement, historical, notes });
        return { photo, placement, historical, notes, issues };
      });
  }, [state]);

  async function handleFileSelection(files: FileList | null) {
    const selections = await prepareStudioMediaSelection(files ?? [], {
      idPrefix: 'pending',
      includePreviewUrl: true,
      inferOrigin: (file) => inferImportSource(file.name),
    });
    const additions = selections
      .filter((item) => item.isImage && item.previewUrl)
      .map((item) => ({
        id: item.id,
        file: item.file,
        previewUrl: item.previewUrl!,
        exifData: item.exifData,
        draft: createDraftFromSelection(item, project),
      } satisfies PendingPhotoDraft));
    if (additions.length === 0) return;

    setPending((current) => [...current, ...additions]);
    setActivePendingId((current) => current ?? additions[0]?.id ?? null);
    const foundExif = additions.filter((item) => item.exifData).length;
    setMessage(
      foundExif > 0
        ? `${additions.length} Fotos geladen. ${foundExif} mit EXIF-Hinweisen. Bitte Raum und Blickrichtung fachlich prüfen.`
        : `${additions.length} Fotos geladen. Keine nutzbaren EXIF-Lagedaten gefunden; manuelle Zuordnung ist erforderlich.`,
    );
  }

  function updateActiveDraft(updater: (draft: DraftState) => DraftState) {
    if (!activePending) return;
    setPending((current) => current.map((item) => (
      item.id === activePending.id ? { ...item, draft: updater(item.draft) } : item
    )));
  }

  function saveActivePending() {
    if (!activePending) {
      setMessage('Bitte zuerst Fotos importieren.');
      return;
    }

    const { draft, exifData } = activePending;
    if (!draft.title.trim() && !draft.fileName.trim()) {
      setMessage('Titel oder Dateiname ist erforderlich.');
      return;
    }

    const bundle = createRenovationPhotoRegistration({
      projectSlug,
      title: draft.title,
      description: draft.description,
      fileName: draft.fileName || undefined,
      mimeType: draft.mimeType || undefined,
      capturedAt: draft.capturedAt ? `${draft.capturedAt}T00:00:00` : undefined,
      sourceDeviceLabel: draft.sourceDeviceLabel,
      importSource: draft.importSource,
      isHistorical: draft.isHistorical,
      exif: exifData,
      buildingId: draft.buildingId,
      floorId: draft.floorId,
      roomId: draft.roomId,
      buildingElementId: draft.buildingElementId,
      surfaceId: draft.surfaceId,
      mapPoint: parseMapPoint(draft.mapLat, draft.mapLon),
      planPoint: parsePlanPoint(draft.planX, draft.planY),
      viewDirectionDegrees: parseOptionalNumber(draft.viewDirectionDegrees),
      viewDirectionLabel: draft.viewDirectionLabel,
      placementSource: draft.placementSource,
      placementConfidence: draft.placementConfidence,
      orientationConfidence: draft.orientationConfidence,
      placementNotes: draft.placementNotes,
      estimatedDate: draft.estimatedDate,
      exactDateKnown: draft.exactDateKnown,
      dateConfidence: draft.dateConfidence,
      shownState: draft.shownState,
      whatIsVisible: draft.whatIsVisible,
      whatMayHaveChanged: draft.whatMayHaveChanged,
      sourceDescription: draft.sourceDescription,
      decisionUsefulness: draft.decisionUsefulness,
      relatedUtilityLineIds: splitCsv(draft.relatedUtilityLineIds),
      relatedBuildingElementIds: splitCsv(draft.relatedBuildingElementIds),
      relatedInspectionPointIds: splitCsv(draft.relatedInspectionPointIds),
      historicalNotes: draft.historicalNotes,
      evidenceNoteKind: draft.evidenceNoteKind,
      evidenceNoteText: draft.evidenceNoteText,
      relatedToHiddenInfrastructure: draft.relatedToHiddenInfrastructure,
      hiddenInfrastructureStatus: draft.relatedToHiddenInfrastructure ? draft.hiddenInfrastructureStatus : 'unknown',
    });

    setState((current) => upsertRenovationPhotoPlacementState(current, bundle));
    setPending((current) => {
      const remaining = current.filter((item) => item.id !== activePending.id);
      setActivePendingId((currentActive) => currentActive === activePending.id ? remaining[0]?.id ?? null : currentActive);
      return remaining;
    });
    setMessage(`Foto-Eintrag ${bundle.photo.id} lokal gespeichert.`);
  }

  function removePendingPhoto(id: string) {
    setPending((current) => {
      const remaining = current.filter((item) => item.id !== id);
      setActivePendingId((currentActive) => currentActive === id ? remaining[0]?.id ?? null : currentActive);
      return remaining;
    });
  }

  return (
    <section className="panel">
      <div className="panel-title">Foto-Platzierung & historische Bild-Evidenz</div>
      <p className="panel-copy">
        Renovierungsfotos werden hier stapelweise aufgenommen, waehrend Bildinhalt, Raum, Blickrichtung und Unsicherheit sichtbar bleiben.
        EXIF ist Hinweis, nicht Wahrheit.
      </p>

      <section className="planning-hero panel" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="eyebrow">Projektbezogene Evidenz</p>
          <h3>{project?.address ?? 'Demo-Renovierung'}</h3>
          <p>Batch-Import fuer aktuelle und historische Fotos, mit schneller Raum-/Orientierungszuordnung und offener Nacharbeit.</p>
        </div>
        <div className="planning-stat-grid">
          <div><strong>{state.photos.length}</strong><span>Fotos</span></div>
          <div><strong>{historicalCount}</strong><span>historisch</span></div>
          <div><strong>{state.placements.filter((item) => item.roomId).length}</strong><span>mit Raum</span></div>
          <div><strong>{savedPhotoEntries.filter((item) => item.issues.length > 0).length}</strong><span>offen</span></div>
        </div>
      </section>

      <section className="renovation-photo-intake panel">
        <div className="renovation-photo-intake-header">
          <div>
            <p className="eyebrow">Fotos aufnehmen</p>
            <h3>Stapelimport mit sichtbarer Bildpruefung</h3>
            <p className="panel-copy">Das aktive Bild bleibt gross sichtbar. Die Metadaten liegen daneben, nicht darunter.</p>
          </div>
          <div className="renovation-photo-intake-controls">
            <label className="filter-pill filter-pill-active renovation-photo-upload" htmlFor="renovation-photo-file">
              <Plus size={12} /> Fotos laden
            </label>
            <input
              accept="image/*"
              id="renovation-photo-file"
              multiple
              onChange={(event) => {
                void handleFileSelection(event.target.files);
                event.target.value = '';
              }}
              type="file"
            />
            <p className="fine-print">Derzeit werden nur Metadaten gespeichert. Die Bilder selbst bleiben nur in dieser Sitzung sichtbar.</p>
          </div>
        </div>

        <div className="renovation-photo-issue-strip">
          <div><strong>{pending.length}</strong><span>im aktuellen Stapel</span></div>
          <div><strong>{unresolvedPendingCount}</strong><span>offene Zuordnungen im Stapel</span></div>
          <div><strong>{savedPhotoEntries.filter((item) => item.issues.length > 0).length}</strong><span>offene gespeicherte Fotos</span></div>
        </div>

        {pending.length > 0 && (
          <div className="renovation-photo-queue" role="list" aria-label="Geladene Fotos im Stapel">
            {pending.map((item) => {
              const issues = intakeIssuesForDraft(item.draft);
              const isActive = item.id === activePending?.id;
              return (
                <button
                  key={item.id}
                  className={`renovation-photo-queue-item${isActive ? ' renovation-photo-queue-item-active' : ''}`}
                  onClick={() => setActivePendingId(item.id)}
                  type="button"
                >
                  <img alt={item.draft.title || item.file.name} src={item.previewUrl} />
                  <strong>{item.draft.title || item.file.name}</strong>
                  <span>{item.draft.roomId || 'Raum offen'} · {item.draft.viewDirectionLabel || 'Blick offen'}</span>
                  <small>{issues.length > 0 ? `${issues.length} offene Punkte` : 'bereit zum Speichern'}</small>
                </button>
              );
            })}
          </div>
        )}

        <div className="renovation-photo-workbench">
          <div className="renovation-photo-preview-card">
            {activePending ? (
              <>
                <div className="renovation-photo-preview-meta">
                  <div>
                    <strong>{activePending.draft.title || activePending.file.name}</strong>
                    <span>{activePending.file.name} · {activePending.file.type || 'Bilddatei'}</span>
                  </div>
                  <div className="renovation-photo-preview-badges">
                    <span>{activePending.draft.isHistorical ? 'historisch' : 'aktuell'}</span>
                    <span>{activePending.exifData ? 'EXIF-Hinweise' : 'ohne EXIF-Lage'}</span>
                  </div>
                </div>
                <div className="renovation-photo-preview-frame">
                  <img alt={activePending.draft.title || activePending.file.name} className="renovation-photo-preview" src={activePending.previewUrl} />
                </div>
                <div className="planning-list renovation-photo-preview-list">
                  {formatExifEvidenceSummary(activePending.exifData).map((line) => (
                    <div key={line}><strong>EXIF</strong><span>{line}</span></div>
                  ))}
                </div>
              </>
            ) : (
              <div className="renovation-photo-empty-state">
                <FileImage size={20} />
                <strong>Noch keine Fotos im aktuellen Stapel</strong>
                <span>Lade mehrere Bilder gleichzeitig. Danach bleibt immer ein grosses Foto sichtbar, waehrend du Raum, Blickrichtung und Unsicherheit daneben pflegst.</span>
              </div>
            )}
          </div>

          <div className="renovation-photo-sidebar">
            {activePending ? (
              <>
                <div className="renovation-photo-sidebar-header">
                  <div>
                    <p className="eyebrow">Aktives Foto</p>
                    <h3>Metadaten neben dem Bild</h3>
                  </div>
                  <div className="renovation-photo-sidebar-actions">
                    <button className="filter-pill" onClick={() => removePendingPhoto(activePending.id)} type="button">Stapel-Eintrag entfernen</button>
                    <button className="filter-pill filter-pill-active" onClick={saveActivePending} type="button"><Plus size={12} /> Speichern & weiter</button>
                  </div>
                </div>

                <div className="renovation-photo-alerts">
                  {intakeIssuesForDraft(activePending.draft).length > 0 ? (
                    intakeIssuesForDraft(activePending.draft).map((issue) => (
                      <div key={issue} className="renovation-photo-alert"><AlertTriangle size={14} /> {issue}</div>
                    ))
                  ) : (
                    <div className="renovation-photo-alert renovation-photo-alert-ok">Keine offenen Pflichtpunkte fuer diese Aufnahme.</div>
                  )}
                </div>

                <div className="renovation-photo-sidebar-grid">
                  <article className="planning-card">
                    <strong><FileImage size={14} /> Foto</strong>
                    <label className="local-register-label">Titel</label>
                    <input className="local-register-editor" value={activePending.draft.title} onChange={(event) => updateActiveDraft((current) => ({ ...current, title: event.target.value }))} />
                    <label className="local-register-label">Beschreibung</label>
                    <textarea className="local-register-editor" value={activePending.draft.description} onChange={(event) => updateActiveDraft((current) => ({ ...current, description: event.target.value }))} />
                    <label className="local-register-label">Importquelle</label>
                    <select className="local-register-editor" value={activePending.draft.importSource} onChange={(event) => updateActiveDraft((current) => ({ ...current, importSource: event.target.value as RenovationPhotoImportSource }))}>
                      {IMPORT_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Quellgeraet / Archiv</label>
                    <input className="local-register-editor" value={activePending.draft.sourceDeviceLabel} onChange={(event) => updateActiveDraft((current) => ({ ...current, sourceDeviceLabel: event.target.value }))} />
                    <label className="local-register-label">Aufnahmedatum</label>
                    <input className="local-register-editor" type="date" value={activePending.draft.capturedAt} onChange={(event) => updateActiveDraft((current) => ({ ...current, capturedAt: event.target.value }))} />
                    <label className="local-register-label"><input type="checkbox" checked={activePending.draft.isHistorical} onChange={(event) => updateActiveDraft((current) => ({ ...current, isHistorical: event.target.checked, importSource: event.target.checked ? 'historical_archive' : current.importSource }))} /> Historisches Foto</label>
                  </article>

                  <article className="planning-card">
                    <strong><MapPin size={14} /> Lage</strong>
                    <label className="local-register-label">Gebaeude</label>
                    <select className="local-register-editor" value={activePending.draft.buildingId} onChange={(event) => updateActiveDraft((current) => ({ ...current, buildingId: event.target.value }))}>
                      <option value="">unbekannt</option>
                      {buildingOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    <label className="local-register-label">Geschoss</label>
                    <select className="local-register-editor" value={activePending.draft.floorId} onChange={(event) => updateActiveDraft((current) => ({ ...current, floorId: event.target.value }))}>
                      {FLOOR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Raum</label>
                    <input className="local-register-editor" value={activePending.draft.roomId} onChange={(event) => updateActiveDraft((current) => ({ ...current, roomId: event.target.value }))} />
                    <label className="local-register-label">Bauteil</label>
                    <input className="local-register-editor" value={activePending.draft.buildingElementId} onChange={(event) => updateActiveDraft((current) => ({ ...current, buildingElementId: event.target.value }))} />
                    <label className="local-register-label">Oberflaeche</label>
                    <input className="local-register-editor" value={activePending.draft.surfaceId} onChange={(event) => updateActiveDraft((current) => ({ ...current, surfaceId: event.target.value }))} />
                    <label className="local-register-label">Platzierungsquelle</label>
                    <select className="local-register-editor" value={activePending.draft.placementSource} onChange={(event) => updateActiveDraft((current) => ({ ...current, placementSource: event.target.value as PhotoPlacementSource }))}>
                      {PLACEMENT_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Platzierungskonfidenz</label>
                    <select className="local-register-editor" value={activePending.draft.placementConfidence} onChange={(event) => updateActiveDraft((current) => ({ ...current, placementConfidence: event.target.value as PhotoPlacementConfidence }))}>
                      {PLACEMENT_CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </article>

                  <article className="planning-card">
                    <strong><Navigation size={14} /> Blickrichtung & Referenz</strong>
                    <label className="local-register-label">Blickrichtungslabel</label>
                    <select className="local-register-editor" value={activePending.draft.viewDirectionLabel} onChange={(event) => updateActiveDraft((current) => ({ ...current, viewDirectionLabel: event.target.value as ViewDirectionLabel }))}>
                      {VIEW_DIRECTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Blickrichtung (Grad)</label>
                    <input className="local-register-editor" value={activePending.draft.viewDirectionDegrees} onChange={(event) => updateActiveDraft((current) => ({ ...current, viewDirectionDegrees: event.target.value }))} />
                    <label className="local-register-label">Orientierungskonfidenz</label>
                    <select className="local-register-editor" value={activePending.draft.orientationConfidence} onChange={(event) => updateActiveDraft((current) => ({ ...current, orientationConfidence: event.target.value as PhotoOrientationConfidence }))}>
                      {ORIENTATION_CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Kartenpunkt (Lat)</label>
                    <input className="local-register-editor" value={activePending.draft.mapLat} onChange={(event) => updateActiveDraft((current) => ({ ...current, mapLat: event.target.value }))} />
                    <label className="local-register-label">Kartenpunkt (Lon)</label>
                    <input className="local-register-editor" value={activePending.draft.mapLon} onChange={(event) => updateActiveDraft((current) => ({ ...current, mapLon: event.target.value }))} />
                    <label className="local-register-label">Planpunkt X / Y</label>
                    <div className="local-register-actions">
                      <input className="local-register-editor" value={activePending.draft.planX} onChange={(event) => updateActiveDraft((current) => ({ ...current, planX: event.target.value }))} />
                      <input className="local-register-editor" value={activePending.draft.planY} onChange={(event) => updateActiveDraft((current) => ({ ...current, planY: event.target.value }))} />
                    </div>
                    <label className="local-register-label">Platzierungsnotiz</label>
                    <textarea className="local-register-editor" value={activePending.draft.placementNotes} onChange={(event) => updateActiveDraft((current) => ({ ...current, placementNotes: event.target.value }))} />
                  </article>

                  <article className="planning-card">
                    <strong><Camera size={14} /> Historischer Kontext</strong>
                    <label className="local-register-label">Sichtbarer Zustand</label>
                    <select className="local-register-editor" value={activePending.draft.shownState} onChange={(event) => updateActiveDraft((current) => ({ ...current, shownState: event.target.value as HistoricalShownState }))}>
                      {SHOWN_STATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Geschaetztes Datum</label>
                    <input className="local-register-editor" type="date" value={activePending.draft.estimatedDate} onChange={(event) => updateActiveDraft((current) => ({ ...current, estimatedDate: event.target.value }))} />
                    <label className="local-register-label"><input type="checkbox" checked={activePending.draft.exactDateKnown} onChange={(event) => updateActiveDraft((current) => ({ ...current, exactDateKnown: event.target.checked, dateConfidence: event.target.checked ? 'exact' : current.dateConfidence }))} /> Exaktes Datum bekannt</label>
                    <label className="local-register-label">Datums-Konfidenz</label>
                    <select className="local-register-editor" value={activePending.draft.dateConfidence} onChange={(event) => updateActiveDraft((current) => ({ ...current, dateConfidence: event.target.value as HistoricalDateConfidence }))}>
                      {DATE_CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Was ist sichtbar?</label>
                    <textarea className="local-register-editor" value={activePending.draft.whatIsVisible} onChange={(event) => updateActiveDraft((current) => ({ ...current, whatIsVisible: event.target.value }))} />
                    <label className="local-register-label">Was koennte sich geaendert haben?</label>
                    <textarea className="local-register-editor" value={activePending.draft.whatMayHaveChanged} onChange={(event) => updateActiveDraft((current) => ({ ...current, whatMayHaveChanged: event.target.value }))} />
                    <label className="local-register-label">Quellbeschreibung</label>
                    <input className="local-register-editor" value={activePending.draft.sourceDescription} onChange={(event) => updateActiveDraft((current) => ({ ...current, sourceDescription: event.target.value }))} />
                    <label className="local-register-label">Entscheidungsnutzen</label>
                    <select className="local-register-editor" value={activePending.draft.decisionUsefulness} onChange={(event) => updateActiveDraft((current) => ({ ...current, decisionUsefulness: event.target.value as HistoricalDecisionUsefulness }))}>
                      {DECISION_USEFULNESS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </article>

                  <article className="planning-card">
                    <strong><ShieldAlert size={14} /> Beobachtung / Frage</strong>
                    <label className="local-register-label">Notiztyp</label>
                    <select className="local-register-editor" value={activePending.draft.evidenceNoteKind} onChange={(event) => updateActiveDraft((current) => ({ ...current, evidenceNoteKind: event.target.value as RenovationPhotoEvidenceKind }))}>
                      {NOTE_KIND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Notiztext</label>
                    <textarea className="local-register-editor" value={activePending.draft.evidenceNoteText} onChange={(event) => updateActiveDraft((current) => ({ ...current, evidenceNoteText: event.target.value }))} />
                    <label className="local-register-label"><input type="checkbox" checked={activePending.draft.relatedToHiddenInfrastructure} onChange={(event) => updateActiveDraft((current) => ({ ...current, relatedToHiddenInfrastructure: event.target.checked, hiddenInfrastructureStatus: event.target.checked ? current.hiddenInfrastructureStatus : 'unknown' }))} /> Bezieht sich auf verdeckte Leitungen / Hohlraeume</label>
                    <label className="local-register-label">Infrastruktur-Status</label>
                    <select className="local-register-editor" value={activePending.draft.hiddenInfrastructureStatus} onChange={(event) => updateActiveDraft((current) => ({ ...current, hiddenInfrastructureStatus: event.target.value as HiddenInfrastructureStatus }))}>
                      {HIDDEN_INFRA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <label className="local-register-label">Utility IDs (CSV)</label>
                    <input className="local-register-editor" value={activePending.draft.relatedUtilityLineIds} onChange={(event) => updateActiveDraft((current) => ({ ...current, relatedUtilityLineIds: event.target.value }))} />
                    <label className="local-register-label">Bauteil-IDs (CSV)</label>
                    <input className="local-register-editor" value={activePending.draft.relatedBuildingElementIds} onChange={(event) => updateActiveDraft((current) => ({ ...current, relatedBuildingElementIds: event.target.value }))} />
                    <label className="local-register-label">Pruefpunkt-IDs (CSV)</label>
                    <input className="local-register-editor" value={activePending.draft.relatedInspectionPointIds} onChange={(event) => updateActiveDraft((current) => ({ ...current, relatedInspectionPointIds: event.target.value }))} />
                  </article>
                </div>
              </>
            ) : (
              <div className="renovation-photo-empty-sidebar">
                <strong>Nach dem Laden startet die schnelle Metadatenpflege hier.</strong>
                <span>Raum, Blickrichtung, Konfidenz und offene Fragen werden pro Bild neben dem grossen Vorschaubild gepflegt.</span>
              </div>
            )}
          </div>
        </div>

        <p className="fine-print">{message}</p>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-title">Offene und gespeicherte Foto-Evidenz</div>
        <div className="planning-list renovation-photo-saved-list">
          {savedPhotoEntries.length === 0 && (
            <div>
              <strong>Noch keine Renovierungsfotos registriert</strong>
              <span>Importiere einen Stapel Fotos und speichere die Metadaten nacheinander.</span>
            </div>
          )}
          {savedPhotoEntries.map(({ photo, placement, historical, notes, issues }) => (
            <div key={photo.id} className="renovation-photo-saved-item">
              <div className="renovation-photo-saved-head">
                <strong>{photo.title}</strong>
                <span>{photo.fileName ?? 'ohne Dateiname'} · {photo.isHistorical ? 'historisch' : 'aktuell'}</span>
              </div>
              <span>
                {placement?.roomId ? `Raum: ${placement.roomId}` : 'Raum unbekannt'}
                {placement?.buildingElementId ? ` · Bauteil: ${placement.buildingElementId}` : ''}
                {placement?.surfaceId ? ` · Oberfläche: ${placement.surfaceId}` : ''}
              </span>
              <span>
                Quelle: {placement?.placementSource ?? 'unbekannt'} · Platzierung: {placement?.placementConfidence ?? 'unknown'} · Orientierung: {placement?.orientationConfidence ?? 'unknown'}
              </span>
              <small>
                {placement?.mapPoint ? `Karte ${formatGpsPoint(placement.mapPoint.lat, placement.mapPoint.lon, 5)}` : 'keine Kartenposition'}
                {placement?.viewDirectionLabel ? ` · Blick ${placement.viewDirectionLabel}` : ''}
                {placement?.viewDirectionDegrees !== undefined ? ` · ${formatBearingSummary(placement.viewDirectionDegrees)}` : ''}
              </small>
              {historical && <small>Historie: {historical.shownState} · Datum {historical.dateConfidence} · Aufnahme {formatCaptureDate(photo.capturedAt) ?? 'offen'} · Sichtbar: {historical.whatIsVisible || 'offen'}</small>}
              {notes.map((note) => (
                <small key={note.id}>{note.kind}: {note.text} · Infrastruktur: {note.hiddenInfrastructureStatus}</small>
              ))}
              {issues.length > 0 && (
                <div className="renovation-photo-saved-issues">
                  {issues.map((issue) => <span key={issue}>{issue}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <details className="local-register-export">
        <summary>Export local renovation photo placement JSON</summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>
    </section>
  );
}

function createDraftFromSelection(
  selection: Awaited<ReturnType<typeof prepareStudioMediaSelection>>[number],
  project?: ImportedProject | null,
): DraftState {
  const placementSource = derivePlacementSource(selection.origin, selection.exifData);
  return {
    ...DEFAULT_DRAFT,
    title: selection.title,
    fileName: selection.file.name,
    mimeType: selection.mimeType,
    capturedAt: selection.capturedAt || '',
    importSource: selection.origin,
    isHistorical: selection.origin === 'historical_archive',
    buildingId: project?.confirmedIds[0] ?? project?.candidates[0]?.id ?? '',
    mapLat: selection.exifData?.lat !== undefined ? String(selection.exifData.lat) : '',
    mapLon: selection.exifData?.lon !== undefined ? String(selection.exifData.lon) : '',
    viewDirectionDegrees: selection.exifData?.bearing !== undefined ? String(Math.round(selection.exifData.bearing)) : '',
    placementSource,
    placementConfidence: derivePlacementConfidence(placementSource, selection.exifData),
    orientationConfidence: deriveOrientationConfidence(selection.exifData),
  };
}

function inferImportSource(fileName: string): RenovationPhotoImportSource {
  const lower = fileName.toLowerCase();
  if (lower.includes('histor') || lower.includes('archiv') || lower.includes('scan')) return 'historical_archive';
  if (lower.startsWith('img_') || lower.startsWith('dsc_')) return 'imported_from_other_device';
  return 'current_device';
}

function intakeIssuesForDraft(draft: DraftState): string[] {
  const issues: string[] = [];
  if (!draft.roomId.trim()) issues.push('Raumzuordnung fehlt');
  if (draft.viewDirectionLabel === 'unknown' && !draft.viewDirectionDegrees.trim()) issues.push('Blickrichtung fehlt');
  if (draft.placementConfidence === 'unknown' || draft.placementConfidence === 'uncertain') issues.push('Platzierung ist noch unsicher');
  if (draft.orientationConfidence === 'unknown' || draft.orientationConfidence === 'uncertain') issues.push('Orientierung ist noch unsicher');
  if (draft.isHistorical && !draft.whatIsVisible.trim()) issues.push('Historisches Foto braucht sichtbaren Inhalt');
  if (draft.relatedToHiddenInfrastructure && !draft.evidenceNoteText.trim()) issues.push('Leitungs-/Hohlraumhinweis braucht Notiz');
  return issues;
}

function savedPhotoIssues({
  photo,
  placement,
  historical,
  notes,
}: {
  photo: RenovationPhotoPlacementState['photos'][number];
  placement: RenovationPhotoPlacementState['placements'][number] | undefined;
  historical: RenovationPhotoPlacementState['historicalMetadata'][number] | undefined;
  notes: RenovationPhotoPlacementState['evidenceNotes'];
}): string[] {
  const issues: string[] = [];
  if (!placement?.roomId) issues.push('Raum offen');
  if ((!placement?.viewDirectionDegrees) && (!placement?.viewDirectionLabel || placement.viewDirectionLabel === 'unknown')) issues.push('Blickrichtung offen');
  if (!placement || placement.placementConfidence === 'unknown' || placement.placementConfidence === 'uncertain') issues.push('Platzierung unsicher');
  if (!placement || placement.orientationConfidence === 'unknown' || placement.orientationConfidence === 'uncertain') issues.push('Orientierung unsicher');
  if (photo.isHistorical && !historical?.whatIsVisible) issues.push('Historischer Sichtinhalt fehlt');
  if (notes.some((note) => note.relatedToHiddenInfrastructure && !note.text.trim())) issues.push('Leitungshinweis ohne Notiz');
  return issues;
}

function parseOptionalNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMapPoint(lat: string, lon: string): { lat: number; lon: number } | undefined {
  const parsedLat = Number(lat);
  const parsedLon = Number(lon);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return undefined;
  return { lat: parsedLat, lon: parsedLon };
}

function parsePlanPoint(x: string, y: string): { x: number; y: number } | undefined {
  const parsedX = Number(x);
  const parsedY = Number(y);
  if (!Number.isFinite(parsedX) || !Number.isFinite(parsedY)) return undefined;
  return { x: parsedX, y: parsedY };
}

function splitCsv(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}
