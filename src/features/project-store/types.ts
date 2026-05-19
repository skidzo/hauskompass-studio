/** Shared types for the runtime project system. */

export interface Utm32Point {
    easting: number;
    northing: number;
}

export interface BboxUtm32 {
    minE: number;
    maxE: number;
    minN: number;
    maxN: number;
    minZ: number;
    maxZ: number;
}

export interface SurfacePoint {
    e: number;
    n: number;
    z: number;
}

export interface Lod2Surface {
    id: string;
    kind: 'ground' | 'wall' | 'roof';
    areaM2: number;
    pitchDeg: number;
    azimuthDeg: number;
    points: SurfacePoint[];
}

export interface Lod2Candidate {
    id: string;
    functionCode: string;
    roofTypeCode: string;
    measuredHeightM: number;
    bboxUtm32: BboxUtm32;
    centroidUtm32: Utm32Point;
    bboxDistanceToGeocodeM: number;
    centroidDistanceToGeocodeM: number;
    surfaces: {
        ground: Lod2Surface[];
        wall: Lod2Surface[];
        roof: Lod2Surface[];
    };
}

export interface ProjectGeocodeResult {
    lat: number;
    lon: number;
    displayName: string;
    utm32: Utm32Point;
    tileId: string; // e.g. "514_5403"
    /** Bundesland aus Nominatim addressdetails (z.B. "Bayern", "Baden-Württemberg") */
    nominatimState?: string;
}

export interface ImportedProject {
    slug: string;
    address: string;
    geocode: ProjectGeocodeResult;
    sourceTile: string;
    candidates: Lod2Candidate[];
    confirmedIds: string[];
    importedAt: string; // ISO date
}
