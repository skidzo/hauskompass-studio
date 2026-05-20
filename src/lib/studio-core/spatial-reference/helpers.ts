import type { ExifGpsData } from '../media/exif';
import type { MediaOriginKind } from '../media/types';
import type {
  OrientationConfidence,
  PhotoPlacementReference,
  PlacementConfidence,
  SpatialReferenceSource,
} from './types';

export function normalizeDegrees(value?: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const normalized = ((value as number) % 360 + 360) % 360;
  return Number(normalized.toFixed(2));
}

export function derivePlacementSource(
  mediaOrigin: MediaOriginKind,
  exif?: ExifGpsData | null,
): SpatialReferenceSource {
  if (typeof exif?.lat === 'number' && typeof exif?.lon === 'number') return 'exif';
  if (mediaOrigin === 'imported_from_other_device') return 'imported_from_other_device';
  return 'manual';
}

export function derivePlacementConfidence(
  placementSource: SpatialReferenceSource,
  exif?: ExifGpsData | null,
): PlacementConfidence {
  if (placementSource === 'exif' && typeof exif?.lat === 'number' && typeof exif?.lon === 'number') return 'likely';
  if (placementSource === 'manual') return 'approximate';
  return 'unknown';
}

export function deriveOrientationConfidence(exif?: ExifGpsData | null): OrientationConfidence {
  return typeof exif?.bearing === 'number' ? 'likely' : 'unknown';
}

export function hasMeaningfulPlacement(
  placement: Pick<
    PhotoPlacementReference,
    'buildingId' | 'floorId' | 'roomId' | 'buildingElementId' | 'surfaceId' | 'mapPoint' | 'planPoint' | 'notes'
  >,
): boolean {
  return Boolean(
    placement.buildingId
      || placement.floorId
      || placement.roomId
      || placement.buildingElementId
      || placement.surfaceId
      || placement.mapPoint
      || placement.planPoint
      || placement.notes?.trim(),
  );
}
