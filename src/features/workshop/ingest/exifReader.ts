/**
 * exifReader.ts — extracts GPS and capture-date metadata from image files.
 *
 * Uses the `exifr` library which parses EXIF/XMP/IPTC tags entirely in the
 * browser — no network call, no server required.
 *
 * Supports: JPEG, JPEG2000, TIFF, HEIC, PNG (with exif chunk), WebP.
 * Files without GPS tags return null (not an error).
 */

import exifr from 'exifr';

// ---------------------------------------------------------------------------
// Public type
// ---------------------------------------------------------------------------

export interface ExifGpsData {
    /** WGS-84 decimal degrees, positive = N */
    lat: number;
    /** WGS-84 decimal degrees, positive = E */
    lon: number;
    /** Meters above sea level (may be absent) */
    alt?: number;
    /** ISO-8601 datetime from EXIF DateTimeOriginal/CreateDate (more precise than file mtime) */
    capturedAt?: string;
    /** Camera bearing in degrees clockwise from True North (GPSImgDirection, 0–360) */
    bearing?: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Reads GPS and capture-date information from a File object.
 *
 * @returns ExifGpsData if GPS tags are present, null otherwise.
 */
export async function readExifData(file: File): Promise<ExifGpsData | null> {
    // Only image types carry EXIF GPS — skip audio, video, documents early
    if (!file.type.startsWith('image/')) return null;

    try {
        const parsed = await exifr.parse(file, {
            // Only parse the GPS and EXIF sub-IFDs — fastest option
            gps: true,
            exif: true,
            tiff: false,
            xmp: false,
            iptc: false,
            icc: false,
            // exifr resolves GPS refs automatically and returns decimal `latitude`/`longitude`
            translateValues: true,
            translateKeys: true,
            reviveValues: true,
        });

        if (!parsed) return null;

        // exifr exposes pre-resolved decimal degrees as `latitude` / `longitude`
        const lat: unknown = parsed.latitude;
        const lon: unknown = parsed.longitude;

        if (typeof lat !== 'number' || typeof lon !== 'number') return null;
        // Sanity-check valid WGS-84 range
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

        const result: ExifGpsData = { lat, lon };

        // Altitude (may be absent, may be 0)
        if (typeof parsed.GPSAltitude === 'number') {
            result.alt = parsed.GPSAltitude;
        }

        // Capture datetime — prefer DateTimeOriginal (camera shutter), fall back to CreateDate
        const dt: unknown = parsed.DateTimeOriginal ?? parsed.CreateDate;
        if (dt instanceof Date && !isNaN(dt.getTime())) {
            result.capturedAt = dt.toISOString();
        }

        // Camera bearing — GPSImgDirection is the compass direction the camera lens was pointing
        // exifr exposes this as a number (already converted from rational)
        const bearing: unknown = parsed.GPSImgDirection;
        if (typeof bearing === 'number' && bearing >= 0 && bearing < 360) {
            result.bearing = bearing;
        }

        return result;
    } catch {
        // Corrupt EXIF, unsupported format, etc. — not an error from the app's perspective
        return null;
    }
}
