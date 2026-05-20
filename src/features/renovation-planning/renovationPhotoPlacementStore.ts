import type { ExifGpsData } from '@/lib/studio-core/media/exif';
import {
  deriveOrientationConfidence,
  derivePlacementConfidence,
  derivePlacementSource,
  normalizeDegrees,
} from '@/lib/studio-core/spatial-reference/helpers';
import type {
  HiddenInfrastructureStatus,
  HistoricalPhotoMetadata,
  HistoricalShownState,
  PhotoPlacement,
  PhotoPlacementConfidence,
  PhotoPlacementSource,
  PhotoOrientationConfidence,
  RenovationPhotoEvidenceKind,
  RenovationPhotoEvidenceNote,
  RenovationPhotoImportSource,
  RenovationPhotoPlacementState,
  RenovationPhotoRecord,
  ViewDirectionLabel,
} from './renovationPhotoPlacementTypes';

const STORAGE_KEY_PREFIX = 'hauskompass.renovationPhotoPlacement.v1';

export interface CreateRenovationPhotoRegistrationInput {
  projectSlug: string;
  title: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  capturedAt?: string;
  sourceDeviceLabel?: string;
  importSource: RenovationPhotoImportSource;
  isHistorical: boolean;
  exif?: ExifGpsData | null;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  buildingElementId?: string;
  surfaceId?: string;
  mapPoint?: { lat: number; lon: number };
  planPoint?: { x: number; y: number };
  viewDirectionDegrees?: number;
  viewDirectionLabel?: ViewDirectionLabel;
  placementSource?: PhotoPlacementSource;
  placementConfidence?: PhotoPlacementConfidence;
  orientationConfidence?: PhotoOrientationConfidence;
  placementNotes?: string;
  estimatedDate?: string;
  exactDateKnown?: boolean;
  dateConfidence?: HistoricalPhotoMetadata['dateConfidence'];
  shownState?: HistoricalShownState;
  whatIsVisible?: string;
  whatMayHaveChanged?: string;
  sourceDescription?: string;
  decisionUsefulness?: HistoricalPhotoMetadata['decisionUsefulness'];
  relatedUtilityLineIds?: string[];
  relatedBuildingElementIds?: string[];
  relatedInspectionPointIds?: string[];
  historicalNotes?: string;
  evidenceNoteKind?: RenovationPhotoEvidenceKind;
  evidenceNoteText?: string;
  relatedToHiddenInfrastructure?: boolean;
  hiddenInfrastructureStatus?: HiddenInfrastructureStatus;
}

export interface RenovationPhotoRegistrationBundle {
  photo: RenovationPhotoRecord;
  placement: PhotoPlacement;
  historicalMetadata?: HistoricalPhotoMetadata;
  evidenceNote?: RenovationPhotoEvidenceNote;
}

export function storageKeyForRenovationPhotoPlacement(projectSlug: string): string {
  return `${STORAGE_KEY_PREFIX}.${projectSlug}`;
}

export function createEmptyRenovationPhotoPlacementState(projectSlug: string): RenovationPhotoPlacementState {
  return {
    projectSlug,
    photos: [],
    placements: [],
    historicalMetadata: [],
    evidenceNotes: [],
  };
}

export function parseRenovationPhotoPlacementState(projectSlug: string, raw: string | null): RenovationPhotoPlacementState {
  if (!raw) return createEmptyRenovationPhotoPlacementState(projectSlug);
  try {
    const parsed = JSON.parse(raw) as Partial<RenovationPhotoPlacementState>;
    return {
      projectSlug,
      photos: Array.isArray(parsed.photos) ? parsed.photos.filter(isProjectRecord(projectSlug)) : [],
      placements: Array.isArray(parsed.placements) ? parsed.placements.filter((item) => item?.projectSlug === projectSlug) : [],
      historicalMetadata: Array.isArray(parsed.historicalMetadata) ? parsed.historicalMetadata : [],
      evidenceNotes: Array.isArray(parsed.evidenceNotes) ? parsed.evidenceNotes.filter((item) => item?.projectSlug === projectSlug) : [],
    };
  } catch {
    return createEmptyRenovationPhotoPlacementState(projectSlug);
  }
}

export function loadRenovationPhotoPlacementState(projectSlug: string): RenovationPhotoPlacementState {
  if (typeof window === 'undefined') return createEmptyRenovationPhotoPlacementState(projectSlug);
  return parseRenovationPhotoPlacementState(projectSlug, window.localStorage.getItem(storageKeyForRenovationPhotoPlacement(projectSlug)));
}

export function saveRenovationPhotoPlacementState(state: RenovationPhotoPlacementState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKeyForRenovationPhotoPlacement(state.projectSlug), JSON.stringify(state, null, 2));
}

export function upsertRenovationPhotoPlacementState(
  state: RenovationPhotoPlacementState,
  bundle: RenovationPhotoRegistrationBundle,
): RenovationPhotoPlacementState {
  return {
    ...state,
    photos: upsertById(state.photos, bundle.photo, 'id'),
    placements: upsertById(state.placements, bundle.placement, 'photoPlacementId'),
    historicalMetadata: bundle.historicalMetadata
      ? upsertById(state.historicalMetadata, bundle.historicalMetadata, 'assetId')
      : state.historicalMetadata,
    evidenceNotes: bundle.evidenceNote
      ? upsertById(state.evidenceNotes, bundle.evidenceNote, 'id')
      : state.evidenceNotes,
  };
}

export function createRenovationPhotoRegistration(
  input: CreateRenovationPhotoRegistrationInput,
): RenovationPhotoRegistrationBundle {
  const now = new Date().toISOString();
  const assetId = createRecordId('rphoto');
  const placementId = createRecordId('placement');
  const noteId = createRecordId('note');
  const normalizedPlacementSource = input.placementSource ?? derivePlacementSource(input.importSource, input.exif);
  const normalizedPlacementConfidence = input.placementConfidence ?? derivePlacementConfidence(normalizedPlacementSource, input.exif);
  const normalizedOrientationConfidence = input.orientationConfidence ?? deriveOrientationConfidence(input.exif);
  const normalizedMapPoint = input.mapPoint ?? exifPoint(input.exif);

  const photo: RenovationPhotoRecord = {
    id: assetId,
    projectSlug: input.projectSlug,
    assetType: 'photo',
    title: input.title.trim() || input.fileName || 'Unbenanntes Foto',
    description: cleanOptional(input.description),
    fileName: cleanOptional(input.fileName),
    mimeType: cleanOptional(input.mimeType),
    capturedAt: cleanOptional(input.capturedAt ?? input.exif?.capturedAt),
    sourceDeviceLabel: cleanOptional(input.sourceDeviceLabel),
    importSource: input.importSource,
    isHistorical: input.isHistorical,
    exifGpsLat: input.exif?.lat,
    exifGpsLon: input.exif?.lon,
    exifBearing: input.exif?.bearing,
    createdAt: now,
    updatedAt: now,
  };

  const placement: PhotoPlacement = {
    photoPlacementId: placementId,
    assetId,
    projectSlug: input.projectSlug,
    buildingId: cleanOptional(input.buildingId),
    floorId: cleanOptional(input.floorId),
    roomId: cleanOptional(input.roomId),
    buildingElementId: cleanOptional(input.buildingElementId),
    surfaceId: cleanOptional(input.surfaceId),
    mapPoint: normalizedMapPoint,
    planPoint: sanitizePlanPoint(input.planPoint),
    viewDirectionDegrees: normalizeDegrees(input.viewDirectionDegrees ?? input.exif?.bearing),
    viewDirectionLabel: input.viewDirectionLabel ?? 'unknown',
    placementSource: normalizedPlacementSource,
    placementConfidence: normalizedPlacementConfidence,
    orientationConfidence: normalizedOrientationConfidence,
    notes: cleanOptional(input.placementNotes),
    createdAt: now,
    updatedAt: now,
  };

  const historicalMetadata = input.isHistorical || cleanOptional(input.whatIsVisible)
    ? {
        assetId,
        isHistorical: input.isHistorical,
        estimatedDate: cleanOptional(input.estimatedDate),
        exactDateKnown: Boolean(input.exactDateKnown),
        dateConfidence: input.dateConfidence ?? defaultDateConfidence(Boolean(input.exactDateKnown), input.estimatedDate),
        shownState: input.shownState ?? 'unknown',
        whatIsVisible: input.whatIsVisible?.trim() || 'Nicht beschrieben',
        whatMayHaveChanged: cleanOptional(input.whatMayHaveChanged),
        sourceDescription: cleanOptional(input.sourceDescription),
        decisionUsefulness: input.decisionUsefulness ?? 'unknown',
        relatedUtilityLineIds: sanitizeStringArray(input.relatedUtilityLineIds),
        relatedBuildingElementIds: sanitizeStringArray(input.relatedBuildingElementIds),
        relatedInspectionPointIds: sanitizeStringArray(input.relatedInspectionPointIds),
        notes: cleanOptional(input.historicalNotes),
      }
    : undefined;

  const evidenceText = cleanOptional(input.evidenceNoteText);
  const evidenceNote = evidenceText
    ? {
        id: noteId,
        assetId,
        projectSlug: input.projectSlug,
        kind: input.evidenceNoteKind ?? 'observation',
        text: evidenceText,
        createdAt: now,
        placementLinked: true,
        relatedToHiddenInfrastructure: Boolean(input.relatedToHiddenInfrastructure),
        hiddenInfrastructureStatus: input.hiddenInfrastructureStatus ?? 'unknown',
      }
    : undefined;

  return {
    photo,
    placement,
    historicalMetadata,
    evidenceNote,
  };
}

function isProjectRecord(projectSlug: string) {
  return (value: unknown): value is RenovationPhotoRecord => {
    return Boolean(value && typeof value === 'object' && (value as RenovationPhotoRecord).projectSlug === projectSlug);
  };
}

function upsertById<T>(items: T[], item: T, idKey: keyof T): T[] {
  const id = item[idKey];
  const index = items.findIndex((entry) => entry[idKey] === id);
  if (index === -1) return [...items, item];
  const next = [...items];
  next[index] = item;
  return next;
}

function createRecordId(prefix: string): string {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rnd}`;
}

function defaultDateConfidence(exactDateKnown: boolean, estimatedDate?: string): HistoricalPhotoMetadata['dateConfidence'] {
  if (exactDateKnown) return 'exact';
  if (cleanOptional(estimatedDate)) return 'estimated';
  return 'unknown';
}

function exifPoint(exif?: ExifGpsData | null): { lat: number; lon: number } | undefined {
  if (typeof exif?.lat !== 'number' || typeof exif?.lon !== 'number') return undefined;
  return { lat: exif.lat, lon: exif.lon };
}

function sanitizePlanPoint(value?: { x: number; y: number }): { x: number; y: number } | undefined {
  if (!value) return undefined;
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) return undefined;
  return { x: value.x, y: value.y };
}

function cleanOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sanitizeStringArray(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}
