import exifr from 'exifr';

export interface ExifGpsData {
  lat: number;
  lon: number;
  alt?: number;
  capturedAt?: string;
  bearing?: number;
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

    return result;
  } catch {
    return null;
  }
}
