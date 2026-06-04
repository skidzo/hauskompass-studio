import type { ExifGpsData } from '../media/exif';
import type { MediaOriginKind } from '../media/types';
import type {
  OrientationConfidence,
  PhotoPlacementReference,
  PlacementConfidence,
  SpatialReferenceSource,
} from './types';

export type ExifEvidenceTrustLevel = 'none' | 'medium' | 'high';

type ExifEvidenceLike = Pick<ExifGpsData, 'lat' | 'lon' | 'bearing' | 'capturedAt'> | null | undefined;

export function normalizeDegrees(value?: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const normalized = ((value as number) % 360 + 360) % 360;
  return Number(normalized.toFixed(2));
}

export function hasExifCoordinates(exif?: ExifEvidenceLike): boolean {
  return typeof exif?.lat === 'number' && typeof exif?.lon === 'number';
}

export function hasExifBearing(exif?: ExifEvidenceLike): boolean {
  return typeof exif?.bearing === 'number' && Number.isFinite(exif.bearing);
}

export function hasExifCapturedAt(exif?: ExifEvidenceLike): boolean {
  return typeof exif?.capturedAt === 'string' && exif.capturedAt.trim().length > 0;
}

export function deriveExifEvidenceTrustLevel(exif?: ExifEvidenceLike): ExifEvidenceTrustLevel {
  if (!hasExifCoordinates(exif)) return 'none';
  if (hasExifBearing(exif) && hasExifCapturedAt(exif)) return 'high';
  return 'medium';
}

/**
 * Compute position confidence from EXIF accuracy metadata.
 * Uses GPSHPositioningError when available; falls back to trust-level heuristic.
 *   verified  ≤ 5 m  (sub-5m GPS, typical for clear-sky modern phones)
 *   likely    ≤ 15 m (normal urban GPS)
 *   approximate ≤ 50 m (weak signal / assisted GPS)
 *   uncertain > 50 m
 */
export function computePositionConfidenceFromExif(exif: ExifGpsData | null | undefined): PlacementConfidence {
  if (!exif?.lat || !exif?.lon) return 'unknown';
  if (typeof exif.hAccuracyM === 'number') {
    if (exif.hAccuracyM <= 5) return 'verified';
    if (exif.hAccuracyM <= 15) return 'likely';
    if (exif.hAccuracyM <= 50) return 'approximate';
    return 'uncertain';
  }
  // No accuracy field — use presence of bearing+timestamp as proxy for GPS quality
  return deriveExifEvidenceTrustLevel(exif) === 'high' ? 'likely' : 'approximate';
}

/**
 * Compute bearing confidence from EXIF.
 *   verified  — GPSImgDirectionRef = 'T' (True North, absolute)
 *   likely    — bearing present, reference unknown or magnetic
 *   unknown   — no bearing
 *
 * Note on quaternions: phone cameras only expose yaw (heading). Pitch and roll
 * are not in standard EXIF — they would require IMU/gyroscope data exported
 * from video metadata (e.g. MP4 camm/tmcd tracks). For still photos, a
 * quaternion can be constructed as q = Rz(bearing) with pitch=roll=0,
 * which is what gpsBearing encodes.
 */
export function computeBearingConfidenceFromExif(exif: ExifGpsData | null | undefined): OrientationConfidence {
  if (!hasExifBearing(exif)) return 'unknown';
  if ((exif as ExifGpsData).bearingRef === 'T') return 'verified'; // Absolute True North reference
  return 'likely'; // Compass bearing, unknown or magnetic reference
}

export function derivePlacementSource(
  mediaOrigin: MediaOriginKind,
  exif?: ExifGpsData | null,
): SpatialReferenceSource {
  if (hasExifCoordinates(exif)) return 'exif';
  if (mediaOrigin === 'imported_from_other_device') return 'imported_from_other_device';
  return 'manual';
}

export function derivePlacementConfidence(
  placementSource: SpatialReferenceSource,
  exif?: ExifGpsData | null,
): PlacementConfidence {
  if (placementSource === 'exif' && hasExifCoordinates(exif)) {
    return deriveExifEvidenceTrustLevel(exif) === 'high' ? 'verified' : 'likely';
  }
  if (placementSource === 'manual') return 'approximate';
  return 'unknown';
}

export function deriveOrientationConfidence(exif?: ExifGpsData | null): OrientationConfidence {
  if (!hasExifBearing(exif)) return 'unknown';
  return deriveExifEvidenceTrustLevel(exif) === 'high' ? 'verified' : 'likely';
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
