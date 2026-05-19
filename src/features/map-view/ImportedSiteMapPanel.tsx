import type { ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import { utm32ToWgs84 } from '@/features/new-project/geocode';
import type { ImportedProject, Lod2Candidate } from '@/features/project-store/types';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo, useState } from 'react';
import Map, { Layer, NavigationControl, ScaleControl, Source } from 'react-map-gl/maplibre';

// OpenFreeMap Bright — free, no API key required
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

type LngLat = [number, number];
type BBox = [LngLat, LngLat];

function toRing(pts: readonly { e: number; n: number }[]): LngLat[] {
    const ring = pts.map((p): LngLat => {
        const w = utm32ToWgs84(p.e, p.n);
        return [w.lon, w.lat];
    });
    if (ring.length > 0) ring.push(ring[0]); // close ring
    return ring;
}

function buildPolygonFeature(
    c: Lod2Candidate,
    properties: Record<string, unknown>,
) {
    // Use the single largest ground surface by AREA (not point count) — 
    // do NOT flatMap multiple surfaces into one ring, that creates a 
    // self-intersecting polygon which can cover the entire viewport as 
    // a large rectangle.
    const surface = c.surfaces.ground.reduce<(typeof c.surfaces.ground)[0] | null>(
        (best, s) => (!best || s.areaM2 > best.areaM2 ? s : best),
        null,
    );
    if (!surface || surface.points.length < 3) {
        console.log(`[buildPolygonFeature] ${c.id}: rejected (no surface or <3 points)`);
        return null;
    }

    const pts = surface.points;

    // Sanity-check: reject polygons whose UTM bounding box exceeds 1 km
    // (guards against corrupted GML placeholder / bbox-as-geometry entries)
    const eVals = pts.map((p) => p.e);
    const nVals = pts.map((p) => p.n);
    const eSpan = Math.max(...eVals) - Math.min(...eVals);
    const nSpan = Math.max(...nVals) - Math.min(...nVals);
    if (eSpan > 1000 || nSpan > 1000) {
        console.log(`[buildPolygonFeature] ${c.id}: rejected (span too large: e=${eSpan}, n=${nSpan})`);
        return null;
    }

    const feature = {
        type: 'Feature' as const,
        properties,
        geometry: { type: 'Polygon' as const, coordinates: [toRing(pts)] },
    };
    
    return feature;
}

export function ImportedSiteMapPanel({
    project,
    terrainData: _terrainData,
    selectedId,
    onSelectCandidate,
    onUpdateProject,
}: {
    project: ImportedProject;
    terrainData: ImportedTerrainData | null;
    selectedId?: string;
    onSelectCandidate?: (id: string) => void;
    onUpdateProject?: (project: ImportedProject) => void;
}) {
    const { candidates, confirmedIds, address, geocode } = project;
    const [cursor, setCursor] = useState<'auto' | 'pointer'>('auto');

    const confirmedCandidates = useMemo(
        () => candidates.filter((c) => confirmedIds.includes(c.id)),
        [candidates, confirmedIds],
    );

    // Single source for all buildings — confirmedSet built INSIDE useMemo
    // to avoid stale-closure issues; avoids visual flash when toggling
    const allCandidatesGeoJSON = useMemo(() => {
        const confirmedSet = new Set(confirmedIds);
        // Always include all confirmed + up to 120 surrounding (performance)
        const surrounding = candidates.filter((c) => !confirmedSet.has(c.id)).slice(0, 120);
        const confirmed = candidates.filter((c) => confirmedSet.has(c.id));
        const geojson = {
            type: 'FeatureCollection' as const,
            features: [...confirmed, ...surrounding]
                .map((c) => {
                    const isConfirmed = confirmedSet.has(c.id);
                    const rank = confirmedIds.indexOf(c.id);
                    return buildPolygonFeature(c, {
                        id: c.id,
                        confirmed: isConfirmed ? 1 : 0,
                        selected: c.id === selectedId ? 1 : 0,
                        label: isConfirmed && rank >= 0 ? `T${rank + 1}` : '',
                    });
                })
                .filter((f): f is NonNullable<typeof f> => f !== null),
        };
        
        return geojson;
    }, [candidates, confirmedIds, selectedId]);

    // Initial map bounds: fit all confirmed buildings
    const initialBounds = useMemo((): BBox => {
        const allPts = confirmedCandidates.flatMap((c) =>
            c.surfaces.ground.flatMap((s) => s.points),
        );
        if (allPts.length === 0) {
            const ctr = utm32ToWgs84(geocode.utm32.easting, geocode.utm32.northing);
            return [
                [ctr.lon - 0.0015, ctr.lat - 0.001],
                [ctr.lon + 0.0015, ctr.lat + 0.001],
            ];
        }
        const wgs = allPts.map((p) => utm32ToWgs84(p.e, p.n));
        const lons = wgs.map((p) => p.lon);
        const lats = wgs.map((p) => p.lat);
        return [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
        ];
    }, [confirmedCandidates, geocode]);

    /** Toggle a building's confirmed status and persist via onUpdateProject. */
    function handleMapClick(e: { features?: Array<{ properties?: Record<string, unknown> }> }) {
        const f = e.features?.[0];
        if (!f) return;
        const id = f.properties?.id as string | undefined;
        if (!id) return;
        const isConfirmed = (f.properties?.confirmed as number | undefined) === 1;

        if (onUpdateProject) {
            const newConfirmedIds = isConfirmed
                ? confirmedIds.filter((cid) => cid !== id)   // abwählen
                : [...confirmedIds, id];                      // auswählen
            onUpdateProject({ ...project, confirmedIds: newConfirmedIds });
        } else if (onSelectCandidate && isConfirmed) {
            onSelectCandidate(id);
        }
    }

    return (
        <div className="imported-map-wrap">
            <div className="imported-map-gl">
                <Map
                    initialViewState={{
                        bounds: initialBounds,
                        fitBoundsOptions: { padding: 80, maxZoom: 19 },
                    }}
                    mapStyle={MAP_STYLE}
                    style={{ width: '100%', height: '100%', cursor }}
                    interactiveLayerIds={['buildings-fill']}
                    onClick={handleMapClick}
                    onMouseEnter={() => setCursor('pointer')}
                    onMouseLeave={() => setCursor('auto')}
                >
                    <NavigationControl position="top-right" showCompass visualizePitch />
                    <ScaleControl position="bottom-left" unit="metric" />

                    {/* Alle LoD2-Gebäude — promoteId='id' sorgt für stabile Feature-Identität
                        beim setData()-Update, verhindert Re-Render-Flash */}
                    <Source id="buildings" type="geojson" data={allCandidatesGeoJSON} promoteId="id">
                        <Layer
                            id="buildings-fill"
                            type="fill"
                            paint={{
                                'fill-color': [
                                    'case',
                                    ['all', ['==', ['get', 'confirmed'], 1], ['==', ['get', 'selected'], 1]],
                                    '#2d7a52',
                                    ['==', ['get', 'confirmed'], 1],
                                    '#3d9465',
                                    '#b8c5b2',
                                ],
                                'fill-opacity': [
                                    'case',
                                    ['==', ['get', 'confirmed'], 1],
                                    0.6,
                                    0.3,
                                ],
                            }}
                        />
                        <Layer
                            id="buildings-outline"
                            type="line"
                            paint={{
                                'line-color': [
                                    'case',
                                    ['==', ['get', 'confirmed'], 1],
                                    '#1a5c38',
                                    '#7a9084',
                                ],
                                'line-width': [
                                    'case',
                                    ['all', ['==', ['get', 'confirmed'], 1], ['==', ['get', 'selected'], 1]],
                                    4,
                                    ['==', ['get', 'confirmed'], 1],
                                    2.5,
                                    1,
                                ],
                            }}
                        />
                        <Layer
                            id="buildings-labels"
                            type="symbol"
                            filter={['==', ['get', 'confirmed'], 1]}
                            layout={{
                                'text-field': ['get', 'label'],
                                'text-size': 13,
                                'text-font': ['Noto Sans Bold', 'Arial Unicode MS Bold'],
                                'text-anchor': 'center',
                            }}
                            paint={{
                                'text-color': '#174837',
                                'text-halo-color': '#ffffff',
                                'text-halo-width': 1.5,
                            }}
                        />
                    </Source>
                </Map>

                {onUpdateProject && (
                    <div className="map-edit-hint">
                        <span className="map-hint-confirmed">■ Grün = ausgewählt</span>
                        <span className="map-hint-sep">·</span>
                        <span>Klick → auswählen / abwählen</span>
                    </div>
                )}
            </div>
            <div className="map-meta">
                <strong>{address}</strong>
                <span>
                    {candidates.length} Gebäude · {confirmedIds.length} ausgewählt ·{' '}
                    E {geocode.utm32.easting.toFixed(0)} / N {geocode.utm32.northing.toFixed(0)} ·{' '}
                    {geocode.tileId}
                </span>
            </div>
        </div>
    );
}
