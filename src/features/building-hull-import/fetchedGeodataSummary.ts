/**
 * fetchedGeodataSummary.ts — generated project data
 * Replace with your project's geodata summary.
 * Generate using: python scripts/extract_lod2_candidates.py
 */
export const fetchedGeodataSummary = {
  address: '',
  geocoding: {
    source: 'Nominatim / OpenStreetMap',
    lat: 0,
    lon: 0,
    displayName: '',
  },
  coordinate: {
    crs: 'ETRS89 / UTM32',
    easting: 0,
    northing: 0,
  },
  lod2: {
    tile: '',
    path: '',
    targetExtractPath: '',
    sha256: '',
    format: 'CityGML 1.0',
  },
  dgm1: {
    tile: '',
    path: '',
    sha256: '',
    raster: '',
    heightReference: 'DHHN2016',
  },
  targetBuilding: {
    id: '',
    functionCode: '',
    roofTypeCode: '',
    measuredHeightM: 0,
    roofSurfaceCount: 0,
    wallSurfaceCount: 0,
    groundSurfaceCount: 0,
    bboxUtm32: { minE: 0, maxE: 0, minN: 0, maxN: 0, groundZ: 0 },
    centroidUtm32: { easting: 0, northing: 0 },
    bboxDistanceToGeocodeM: 0,
    centroidDistanceToGeocodeM: 0,
  },
  candidates: [] as Array<{
    id: string;
    functionCode: string;
    roofTypeCode: string;
    measuredHeightM: number;
    roofSurfaceCount: number;
    wallSurfaceCount: number;
    bboxDistanceToGeocodeM: number;
    centroidDistanceToGeocodeM: number;
    bboxUtm32: { minE: number; maxE: number; minN: number; maxN: number };
  }>,
};

export type FetchedGeodataSummary = typeof fetchedGeodataSummary;
