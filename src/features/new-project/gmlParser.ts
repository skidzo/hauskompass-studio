import type { Lod2Candidate, Lod2Surface, SurfacePoint, Utm32Point } from '../project-store/types';

const NS_BLDG = 'http://www.opengis.net/citygml/building/1.0';
const NS_GML = 'http://www.opengis.net/gml';

function getEl(parent: Element, ns: string, local: string): Element | null {
    return parent.getElementsByTagNameNS(ns, local)[0] ?? null;
}

function getAllEl(parent: Element, ns: string, local: string): Element[] {
    return Array.from(parent.getElementsByTagNameNS(ns, local));
}

function parsePosOrPosList(el: Element): SurfacePoint[] {
    const posList = getEl(el, NS_GML, 'posList');
    const text = posList?.textContent?.trim() ?? '';
    const vals = text.split(/\s+/).map(Number).filter((v) => !isNaN(v));
    if (vals.length < 9) return [];
    const pts: SurfacePoint[] = [];
    for (let i = 0; i + 2 < vals.length; i += 3) {
        pts.push({ e: vals[i], n: vals[i + 1], z: vals[i + 2] });
    }
    return pts;
}

function vec3(a: SurfacePoint, b: SurfacePoint): [number, number, number] {
    return [b.e - a.e, b.n - a.n, b.z - a.z];
}

function cross3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function norm3(v: [number, number, number]): number {
    return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

function area3d(pts: SurfacePoint[]): number {
    if (pts.length < 3) return 0;
    let total = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        total += norm3(cross3(vec3(pts[0], pts[i]), vec3(pts[0], pts[i + 1]))) / 2;
    }
    return total;
}

function pitch(pts: SurfacePoint[]): number {
    if (pts.length < 3) return 0;
    const n = cross3(vec3(pts[0], pts[1]), vec3(pts[0], pts[2]));
    const horiz = Math.sqrt(n[0] ** 2 + n[1] ** 2);
    // pitch = Winkel der Fläche gegen Horizontale (0° = flach, 90° = senkrecht)
    // Das Normalvektor-Elevation-Winkel ist komplementär: pitch = atan2(horiz, |nz|)
    return (Math.atan2(horiz, Math.abs(n[2])) * 180) / Math.PI;
}

function azimuth(pts: SurfacePoint[]): number {
    if (pts.length < 3) return 0;
    const n = cross3(vec3(pts[0], pts[1]), vec3(pts[0], pts[2]));
    return ((Math.atan2(n[0], n[1]) * 180) / Math.PI + 360) % 360;
}

function centroid2d(pts: SurfacePoint[]): Utm32Point {
    const e = pts.reduce((s, p) => s + p.e, 0) / pts.length;
    const n = pts.reduce((s, p) => s + p.n, 0) / pts.length;
    return { easting: e, northing: n };
}

function parseSurface(el: Element, kind: 'ground' | 'wall' | 'roof'): Lod2Surface | null {
    const id = el.getAttribute('gml:id') ?? el.getAttribute('id') ?? crypto.randomUUID();
    const polygon = getEl(el, NS_GML, 'Polygon');
    if (!polygon) return null;
    const pts = parsePosOrPosList(polygon);
    if (pts.length < 3) return null;
    return {
        id,
        kind,
        areaM2: Math.round(area3d(pts) * 100) / 100,
        pitchDeg: Math.round(pitch(pts) * 10) / 10,
        azimuthDeg: Math.round(azimuth(pts) * 10) / 10,
        points: pts,
    };
}

function bboxPts(pts: SurfacePoint[]): { minE: number; maxE: number; minN: number; maxN: number; minZ: number; maxZ: number } {
    const es = pts.map((p) => p.e);
    const ns = pts.map((p) => p.n);
    const zs = pts.map((p) => p.z);
    return {
        minE: Math.min(...es),
        maxE: Math.max(...es),
        minN: Math.min(...ns),
        maxN: Math.max(...ns),
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs),
    };
}

function dist2d(a: Utm32Point, b: Utm32Point): number {
    return Math.sqrt((a.easting - b.easting) ** 2 + (a.northing - b.northing) ** 2);
}

function bboxDist(
    bbox: { minE: number; maxE: number; minN: number; maxN: number },
    pt: Utm32Point,
): number {
    const dx = Math.max(bbox.minE - pt.easting, 0, pt.easting - bbox.maxE);
    const dy = Math.max(bbox.minN - pt.northing, 0, pt.northing - bbox.maxN);
    return Math.sqrt(dx ** 2 + dy ** 2);
}

/** Parse a CityGML string and extract Lod2Candidates ranked by distance to the geocoded point. */
export function parseCityGml(
    gmlText: string,
    tileName: string,
    addressUtm32: Utm32Point,
): { sourceTile: string; candidates: Lod2Candidate[] } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(gmlText, 'application/xml');

    const buildingEls = getAllEl(doc.documentElement, NS_BLDG, 'Building');

    const candidates: Lod2Candidate[] = [];

    for (const bldg of buildingEls) {
        const id = bldg.getAttribute('gml:id') ?? bldg.getAttribute('id') ?? crypto.randomUUID();

        // Extract function + roof type
        const funcEl = getEl(bldg, NS_BLDG, 'function');
        const roofEl = getEl(bldg, NS_BLDG, 'roofType');
        const heightEl = getEl(bldg, NS_BLDG, 'measuredHeight');

        const functionCode = funcEl?.textContent?.trim() ?? '';
        const roofTypeCode = roofEl?.textContent?.trim() ?? '';
        const measuredHeightM = parseFloat(heightEl?.textContent ?? '0') || 0;

        const grounds: Lod2Surface[] = [];
        const walls: Lod2Surface[] = [];
        const roofs: Lod2Surface[] = [];

        for (const surfEl of getAllEl(bldg, NS_BLDG, 'GroundSurface')) {
            const s = parseSurface(surfEl, 'ground');
            if (s) grounds.push(s);
        }
        for (const surfEl of getAllEl(bldg, NS_BLDG, 'WallSurface')) {
            const s = parseSurface(surfEl, 'wall');
            if (s) walls.push(s);
        }
        for (const surfEl of getAllEl(bldg, NS_BLDG, 'RoofSurface')) {
            const s = parseSurface(surfEl, 'roof');
            if (s) roofs.push(s);
        }

        if (grounds.length + walls.length + roofs.length === 0) continue;

        const allPts = [...grounds, ...walls, ...roofs].flatMap((s) => s.points);
        const bbox = bboxPts(allPts);
        const centroid = centroid2d(allPts);

        candidates.push({
            id,
            functionCode,
            roofTypeCode,
            measuredHeightM,
            bboxUtm32: bbox,
            centroidUtm32: centroid,
            bboxDistanceToGeocodeM: Math.round(bboxDist(bbox, addressUtm32) * 10) / 10,
            centroidDistanceToGeocodeM: Math.round(dist2d(centroid, addressUtm32) * 10) / 10,
            surfaces: { ground: grounds, wall: walls, roof: roofs },
        });
    }

    candidates.sort((a, b) => a.bboxDistanceToGeocodeM - b.bboxDistanceToGeocodeM);

    return { sourceTile: tileName, candidates };
}
