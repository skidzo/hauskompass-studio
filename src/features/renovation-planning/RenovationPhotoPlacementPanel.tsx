import type { ImportedProject } from '@/features/project-store/types';
import { readExifData, type ExifGpsData } from '@/lib/studio-core/media/exif';
import { Camera, FileImage, MapPin, Navigation, Plus, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  const [draft, setDraft] = useState<DraftState>(() => ({
    ...DEFAULT_DRAFT,
    buildingId: project?.confirmedIds[0] ?? project?.candidates[0]?.id ?? '',
  }));
  const [exifData, setExifData] = useState<ExifGpsData | null>(null);
  const [message, setMessage] = useState('Fotos bleiben lokale Evidenz. EXIF wird gelesen, aber nicht automatisch als Wahrheit behandelt.');

  useEffect(() => {
    const loaded = loadRenovationPhotoPlacementState(projectSlug);
    setState(loaded);
    setDraft((current) => ({
      ...DEFAULT_DRAFT,
      buildingId: project?.confirmedIds[0] ?? project?.candidates[0]?.id ?? current.buildingId,
      floorId: current.floorId,
    }));
    setExifData(null);
  }, [projectSlug, project]);

  useEffect(() => {
    saveRenovationPhotoPlacementState(state);
  }, [state]);

  const buildingOptions = useMemo(() => {
    if (!project) return [];
    return project.candidates.map((candidate) => ({
      id: candidate.id,
      label: `${candidate.id}${project.confirmedIds.includes(candidate.id) ? ' · bestätigt' : ''}`,
    }));
  }, [project]);

  const historicalCount = state.photos.filter((photo) => photo.isHistorical).length;

  async function handleFileSelection(file: File | null) {
    if (!file) return;
    const exif = await readExifData(file);
    setExifData(exif);
    setDraft((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
      fileName: file.name,
      mimeType: file.type,
      capturedAt: current.capturedAt || exif?.capturedAt?.slice(0, 10) || '',
      mapLat: exif?.lat !== undefined ? String(exif.lat) : current.mapLat,
      mapLon: exif?.lon !== undefined ? String(exif.lon) : current.mapLon,
      viewDirectionDegrees: exif?.bearing !== undefined ? String(Math.round(exif.bearing)) : current.viewDirectionDegrees,
      placementSource: exif?.lat !== undefined && exif?.lon !== undefined ? 'exif' : current.importSource === 'imported_from_other_device' ? 'imported_from_other_device' : 'manual',
      placementConfidence: exif?.lat !== undefined && exif?.lon !== undefined ? 'likely' : current.placementConfidence,
      orientationConfidence: exif?.bearing !== undefined ? 'likely' : current.orientationConfidence,
      importSource: current.importSource === 'historical_archive' ? 'historical_archive' : current.importSource,
    }));
    setMessage(exif
      ? 'EXIF-Daten gefunden. Bitte Lage und Blickrichtung trotzdem fachlich prüfen.'
      : 'Keine nutzbaren EXIF-Lagedaten gefunden. Manuelle Zuordnung ist erforderlich oder sinnvoll.');
  }

  function saveDraft() {
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
    setDraft({
      ...DEFAULT_DRAFT,
      buildingId: project?.confirmedIds[0] ?? project?.candidates[0]?.id ?? '',
    });
    setExifData(null);
    setMessage(`Foto-Eintrag ${bundle.photo.id} lokal gespeichert.`);
  }

  return (
    <section className="panel">
      <div className="panel-title">Foto-Platzierung & historische Bild-Evidenz</div>
      <p className="panel-copy">
        Renovierungsfotos koennen hier mit Raum-, Bauteil-, Karten- oder Planbezug registriert werden.
        Workshop-Szenen werden nicht verwendet. EXIF ist Hinweis, nicht Wahrheit.
      </p>

      <section className="planning-hero panel" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="eyebrow">Projektbezogene Evidenz</p>
          <h3>{project?.address ?? 'Demo-Renovierung'}</h3>
          <p>Lokale Registrierung fuer aktuelle und historische Fotos, inklusive Blickrichtung und Unsicherheit.</p>
        </div>
        <div className="planning-stat-grid">
          <div><strong>{state.photos.length}</strong><span>Fotos</span></div>
          <div><strong>{historicalCount}</strong><span>historisch</span></div>
          <div><strong>{state.placements.filter((item) => item.roomId).length}</strong><span>mit Raum</span></div>
          <div><strong>{state.evidenceNotes.length}</strong><span>Beob./Fragen</span></div>
        </div>
      </section>

      <div className="local-register-grid">
        <div>
          <label className="local-register-label" htmlFor="renovation-photo-file">Foto importieren</label>
          <input
            accept="image/*"
            id="renovation-photo-file"
            onChange={(event) => void handleFileSelection(event.target.files?.[0] ?? null)}
            type="file"
          />
          <p className="fine-print">Import registriert derzeit Metadaten lokal. Die Datei selbst wird in Renovation Mode noch nicht als Blob gespeichert.</p>

          <div className="planning-list" style={{ marginTop: '1rem' }}>
            <div><strong>EXIF-Quelle</strong><span>{exifData ? 'gefunden' : 'keine nutzbaren Daten'}</span></div>
            <div><strong>GPS</strong><span>{exifData ? `${exifData.lat.toFixed(6)}, ${exifData.lon.toFixed(6)}` : 'manuell oder unbekannt'}</span></div>
            <div><strong>Blickrichtung</strong><span>{typeof exifData?.bearing === 'number' ? `${Math.round(exifData.bearing)}°` : 'nicht vorhanden'}</span></div>
          </div>

          <div className="planning-card-grid" style={{ marginTop: '1rem' }}>
            <article className="planning-card">
              <strong><FileImage size={14} /> Fotostammdaten</strong>
              <label className="local-register-label">Titel</label>
              <input className="local-register-editor" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              <label className="local-register-label">Beschreibung</label>
              <textarea className="local-register-editor" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
              <label className="local-register-label">Importquelle</label>
              <select className="local-register-editor" value={draft.importSource} onChange={(event) => setDraft((current) => ({ ...current, importSource: event.target.value as RenovationPhotoImportSource }))}>
                {IMPORT_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Quellgeraet / Archiv</label>
              <input className="local-register-editor" value={draft.sourceDeviceLabel} onChange={(event) => setDraft((current) => ({ ...current, sourceDeviceLabel: event.target.value }))} />
              <label className="local-register-label">Aufnahmedatum</label>
              <input className="local-register-editor" type="date" value={draft.capturedAt} onChange={(event) => setDraft((current) => ({ ...current, capturedAt: event.target.value }))} />
              <label className="local-register-label"><input type="checkbox" checked={draft.isHistorical} onChange={(event) => setDraft((current) => ({ ...current, isHistorical: event.target.checked, importSource: event.target.checked ? 'historical_archive' : current.importSource }))} /> Historisches Foto</label>
            </article>

            <article className="planning-card">
              <strong><MapPin size={14} /> Platzierung</strong>
              <label className="local-register-label">Gebaeude</label>
              <select className="local-register-editor" value={draft.buildingId} onChange={(event) => setDraft((current) => ({ ...current, buildingId: event.target.value }))}>
                <option value="">unbekannt</option>
                {buildingOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <label className="local-register-label">Geschoss</label>
              <select className="local-register-editor" value={draft.floorId} onChange={(event) => setDraft((current) => ({ ...current, floorId: event.target.value }))}>
                {FLOOR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Raum</label>
              <input className="local-register-editor" value={draft.roomId} onChange={(event) => setDraft((current) => ({ ...current, roomId: event.target.value }))} />
              <label className="local-register-label">Bauteil</label>
              <input className="local-register-editor" value={draft.buildingElementId} onChange={(event) => setDraft((current) => ({ ...current, buildingElementId: event.target.value }))} />
              <label className="local-register-label">Oberflaeche</label>
              <input className="local-register-editor" value={draft.surfaceId} onChange={(event) => setDraft((current) => ({ ...current, surfaceId: event.target.value }))} />
              <label className="local-register-label">Platzierungsquelle</label>
              <select className="local-register-editor" value={draft.placementSource} onChange={(event) => setDraft((current) => ({ ...current, placementSource: event.target.value as PhotoPlacementSource }))}>
                {PLACEMENT_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Platzierungskonfidenz</label>
              <select className="local-register-editor" value={draft.placementConfidence} onChange={(event) => setDraft((current) => ({ ...current, placementConfidence: event.target.value as PhotoPlacementConfidence }))}>
                {PLACEMENT_CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </article>

            <article className="planning-card">
              <strong><Navigation size={14} /> Orientierung & Karte/Plan</strong>
              <label className="local-register-label">Blickrichtungslabel</label>
              <select className="local-register-editor" value={draft.viewDirectionLabel} onChange={(event) => setDraft((current) => ({ ...current, viewDirectionLabel: event.target.value as ViewDirectionLabel }))}>
                {VIEW_DIRECTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Blickrichtung (Grad)</label>
              <input className="local-register-editor" value={draft.viewDirectionDegrees} onChange={(event) => setDraft((current) => ({ ...current, viewDirectionDegrees: event.target.value }))} />
              <label className="local-register-label">Orientierungskonfidenz</label>
              <select className="local-register-editor" value={draft.orientationConfidence} onChange={(event) => setDraft((current) => ({ ...current, orientationConfidence: event.target.value as PhotoOrientationConfidence }))}>
                {ORIENTATION_CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Kartenpunkt (Lat)</label>
              <input className="local-register-editor" value={draft.mapLat} onChange={(event) => setDraft((current) => ({ ...current, mapLat: event.target.value }))} />
              <label className="local-register-label">Kartenpunkt (Lon)</label>
              <input className="local-register-editor" value={draft.mapLon} onChange={(event) => setDraft((current) => ({ ...current, mapLon: event.target.value }))} />
              <label className="local-register-label">Planpunkt X / Y</label>
              <div className="local-register-actions">
                <input className="local-register-editor" value={draft.planX} onChange={(event) => setDraft((current) => ({ ...current, planX: event.target.value }))} />
                <input className="local-register-editor" value={draft.planY} onChange={(event) => setDraft((current) => ({ ...current, planY: event.target.value }))} />
              </div>
              <label className="local-register-label">Platzierungsnotiz</label>
              <textarea className="local-register-editor" value={draft.placementNotes} onChange={(event) => setDraft((current) => ({ ...current, placementNotes: event.target.value }))} />
            </article>

            <article className="planning-card">
              <strong><Camera size={14} /> Historische Kontextdaten</strong>
              <label className="local-register-label">Sichtbarer Zustand</label>
              <select className="local-register-editor" value={draft.shownState} onChange={(event) => setDraft((current) => ({ ...current, shownState: event.target.value as HistoricalShownState }))}>
                {SHOWN_STATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Geschaetztes Datum</label>
              <input className="local-register-editor" type="date" value={draft.estimatedDate} onChange={(event) => setDraft((current) => ({ ...current, estimatedDate: event.target.value }))} />
              <label className="local-register-label"><input type="checkbox" checked={draft.exactDateKnown} onChange={(event) => setDraft((current) => ({ ...current, exactDateKnown: event.target.checked, dateConfidence: event.target.checked ? 'exact' : current.dateConfidence }))} /> Exaktes Datum bekannt</label>
              <label className="local-register-label">Datums-Konfidenz</label>
              <select className="local-register-editor" value={draft.dateConfidence} onChange={(event) => setDraft((current) => ({ ...current, dateConfidence: event.target.value as HistoricalDateConfidence }))}>
                {DATE_CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Was ist sichtbar?</label>
              <textarea className="local-register-editor" value={draft.whatIsVisible} onChange={(event) => setDraft((current) => ({ ...current, whatIsVisible: event.target.value }))} />
              <label className="local-register-label">Was koennte sich geaendert haben?</label>
              <textarea className="local-register-editor" value={draft.whatMayHaveChanged} onChange={(event) => setDraft((current) => ({ ...current, whatMayHaveChanged: event.target.value }))} />
              <label className="local-register-label">Quellbeschreibung</label>
              <input className="local-register-editor" value={draft.sourceDescription} onChange={(event) => setDraft((current) => ({ ...current, sourceDescription: event.target.value }))} />
              <label className="local-register-label">Entscheidungsnutzen</label>
              <select className="local-register-editor" value={draft.decisionUsefulness} onChange={(event) => setDraft((current) => ({ ...current, decisionUsefulness: event.target.value as HistoricalDecisionUsefulness }))}>
                {DECISION_USEFULNESS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </article>

            <article className="planning-card">
              <strong><ShieldAlert size={14} /> Beobachtung / Frage / verdeckte Infrastruktur</strong>
              <label className="local-register-label">Notiztyp</label>
              <select className="local-register-editor" value={draft.evidenceNoteKind} onChange={(event) => setDraft((current) => ({ ...current, evidenceNoteKind: event.target.value as RenovationPhotoEvidenceKind }))}>
                {NOTE_KIND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Notiztext</label>
              <textarea className="local-register-editor" value={draft.evidenceNoteText} onChange={(event) => setDraft((current) => ({ ...current, evidenceNoteText: event.target.value }))} />
              <label className="local-register-label"><input type="checkbox" checked={draft.relatedToHiddenInfrastructure} onChange={(event) => setDraft((current) => ({ ...current, relatedToHiddenInfrastructure: event.target.checked, hiddenInfrastructureStatus: event.target.checked ? current.hiddenInfrastructureStatus : 'unknown' }))} /> Bezieht sich auf verdeckte Leitungen / Hohlraeume</label>
              <label className="local-register-label">Infrastruktur-Status</label>
              <select className="local-register-editor" value={draft.hiddenInfrastructureStatus} onChange={(event) => setDraft((current) => ({ ...current, hiddenInfrastructureStatus: event.target.value as HiddenInfrastructureStatus }))}>
                {HIDDEN_INFRA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <label className="local-register-label">Utility IDs (CSV)</label>
              <input className="local-register-editor" value={draft.relatedUtilityLineIds} onChange={(event) => setDraft((current) => ({ ...current, relatedUtilityLineIds: event.target.value }))} />
              <label className="local-register-label">Bauteil-IDs (CSV)</label>
              <input className="local-register-editor" value={draft.relatedBuildingElementIds} onChange={(event) => setDraft((current) => ({ ...current, relatedBuildingElementIds: event.target.value }))} />
              <label className="local-register-label">Pruefpunkt-IDs (CSV)</label>
              <input className="local-register-editor" value={draft.relatedInspectionPointIds} onChange={(event) => setDraft((current) => ({ ...current, relatedInspectionPointIds: event.target.value }))} />
            </article>
          </div>

          <div className="local-register-actions" style={{ marginTop: '1rem' }}>
            <button className="filter-pill filter-pill-active" onClick={saveDraft} type="button"><Plus size={12} /> Lokal speichern</button>
          </div>
          <p className="fine-print">{message}</p>
        </div>

        <div className="planning-list">
          {state.photos.length === 0 && (
            <div>
              <strong>Noch keine Renovierungsfotos registriert</strong>
              <span>Importiere ein Foto oder erfasse es mit manueller Platzierung und Blickrichtung.</span>
            </div>
          )}
          {[...state.photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((photo) => {
            const placement = state.placements.find((item) => item.assetId === photo.id);
            const historical = state.historicalMetadata.find((item) => item.assetId === photo.id);
            const notes = state.evidenceNotes.filter((item) => item.assetId === photo.id);
            return (
              <div key={photo.id}>
                <strong>{photo.title}</strong>
                <span>{photo.fileName ?? 'ohne Dateiname'} · {photo.isHistorical ? 'historisch' : 'aktuell'}</span>
                <span>
                  {placement?.roomId ? `Raum: ${placement.roomId}` : 'Raum unbekannt'}
                  {placement?.buildingElementId ? ` · Bauteil: ${placement.buildingElementId}` : ''}
                </span>
                <span>
                  Quelle: {placement?.placementSource ?? 'unbekannt'} · Platzierung: {placement?.placementConfidence ?? 'unknown'} · Orientierung: {placement?.orientationConfidence ?? 'unknown'}
                </span>
                <small>
                  {placement?.mapPoint ? `Karte ${placement.mapPoint.lat.toFixed(5)}, ${placement.mapPoint.lon.toFixed(5)}` : 'keine Kartenposition'}
                  {placement?.viewDirectionLabel ? ` · Blick ${placement.viewDirectionLabel}` : ''}
                  {placement?.viewDirectionDegrees !== undefined ? ` (${placement.viewDirectionDegrees}°)` : ''}
                </small>
                {historical && <small>Historie: {historical.shownState} · Datum {historical.dateConfidence} · Sichtbar: {historical.whatIsVisible}</small>}
                {notes.map((note) => (
                  <small key={note.id}>{note.kind}: {note.text} · Infrastruktur: {note.hiddenInfrastructureStatus}</small>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <details className="local-register-export">
        <summary>Export local renovation photo placement JSON</summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>
    </section>
  );
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
