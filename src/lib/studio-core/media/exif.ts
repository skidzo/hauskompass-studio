import exifr from 'exifr';

export interface ExifGpsData {
  lat: number;
  lon: number;
  alt?: number;
  capturedAt?: string;
  /** Compass heading in degrees clockwise from north (GPSImgDirection) */
  bearing?: number;
  /** 'T' = True North, 'M' = Magnetic North (GPSImgDirectionRef) */
  bearingRef?: 'T' | 'M';
  /** Horizontal position accuracy in meters (GPSHPositioningError) */
  hAccuracyM?: number;
}

export async function readExifData(file: File): Promise<ExifGpsData | null> {
  if (!file.type.startsWith('image/')) return null;

  try {
    const parsed = await exifr.parse(file, {
      gps: true,
      exif: true,
      tiff: false,
      xmp: false,
      iptc: false,
      icc: false,
      translateValues: true,
      translateKeys: true,
      reviveValues: true,
    });

    if (!parsed) return null;

    const lat: unknown = parsed.latitude;
    const lon: unknown = parsed.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

    const result: ExifGpsData = { lat, lon };

    if (typeof parsed.GPSAltitude === 'number') {
      result.alt = parsed.GPSAltitude;
    }

    const dt: unknown = parsed.DateTimeOriginal ?? parsed.CreateDate;
    if (dt instanceof Date && !isNaN(dt.getTime())) {
      result.capturedAt = dt.toISOString();
    }

    const bearing: unknown = parsed.GPSImgDirection;
    if (typeof bearing === 'number' && bearing >= 0 && bearing < 360) {
      result.bearing = bearing;
    }

    const bearingRef: unknown = parsed.GPSImgDirectionRef;
    if (bearingRef === 'T' || bearingRef === 'M') {
      result.bearingRef = bearingRef as 'T' | 'M';
    }

    const hAccuracy: unknown = parsed.GPSHPositioningError;
    if (typeof hAccuracy === 'number' && hAccuracy > 0) {
      result.hAccuracyM = hAccuracy;
    }

    return result;
  } catch {
    return null;
  }
}
