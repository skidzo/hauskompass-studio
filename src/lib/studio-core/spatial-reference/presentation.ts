import type { ExifGpsData } from '../media/exif';
import { deriveExifEvidenceTrustLevel, type ExifEvidenceTrustLevel } from './helpers';

export function bearingLabel(deg: number): string {
  const dirs = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function formatBearingSummary(deg?: number, bearingRef?: 'T' | 'M'): string | null {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return null;
  const refLabel = bearingRef === 'T' ? ' (Wahrnorden)' : bearingRef === 'M' ? ' (Magnet)' : '';
  return `${deg.toFixed(0)}\u00b0 ${bearingLabel(deg)}${refLabel}`;
}

export function formatCaptureDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: value.includes('T') ? 'short' : undefined,
  });
}

export function formatGpsPoint(lat?: number, lon?: number, digits = 6): string | null {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`;
}

/**
 * Human-readable GPS position quality label.
 * Shows measured accuracy when available (GPSHPositioningError),
 * otherwise falls back to a heuristic trust label.
 */
export function formatExifTrustLabel(level: ExifEvidenceTrustLevel, exif?: ExifGpsData | null): string {
  if (level === 'none') return 'Keine nutzbaren EXIF-Lagedaten';
  if (typeof exif?.hAccuracyM === 'number') {
    const acc = exif.hAccuracyM < 10 ? exif.hAccuracyM.toFixed(1) : Math.round(exif.hAccuracyM).toString();
    const suffix = level === 'high' ? ' · höheres Vertrauen' : ' · mittleres Vertrauen';
    return `GPS ±${acc} m${suffix}`;
  }
  if (level === 'high') return 'EXIF vollständig · höheres Standardvertrauen';
  return 'EXIF teilweise vorhanden · mittleres Standardvertrauen';
}

export function formatExifEvidenceSummary(exif?: ExifGpsData | null): string[] {
  const trustLevel = deriveExifEvidenceTrustLevel(exif);
  if (!exif) return [formatExifTrustLabel(trustLevel)];
  const parts = [formatExifTrustLabel(trustLevel, exif)];
  const gpsPoint = formatGpsPoint(exif.lat, exif.lon);
  if (gpsPoint) parts.push(`GPS ${gpsPoint}`);
  const bearing = formatBearingSummary(exif.bearing, exif.bearingRef);
  if (bearing) parts.push(`Richtung ${bearing}`);
  const capturedAt = formatCaptureDate(exif.capturedAt);
  if (capturedAt) parts.push(`Aufnahme ${capturedAt}`);
  return parts;
}
