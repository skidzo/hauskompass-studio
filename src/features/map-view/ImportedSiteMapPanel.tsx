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
    id: number,
    properties: Record<string, unknown>,
) {
    const pts = c.surfaces.ground.flatMap((s) => s.points);
    if (pts.length < 3) return null;
    return {
        type: 'Feature' as const,
        id,
        properties,
        geometry: { type: 'Polygon' as const, coordinates: [toRing(pts)] },
    };
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
    const confirmedSet = new Set(confirmedIds);

    const confirmedCandidates = useMemo(
        () => candidates.filter((c) => confirmedSet.has(c.id)),
        [candidates, confirmedIds],
    );
    const surroundingCandidates = useMemo(
        () => candidates.filter((c) => !confirmedSet.has(c.id)),
        [candidates, confirmedIds],
    );

    const confirmedGeoJSON = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: confirmedCandidates
                .map((c, idx) =>
                    buildPolygonFeature(c, idx, {
                        id: c.id,
                        label: `T${idx + 1}`,
                        // Use number 1/0 instead of boolean — MapLibre case-expressions
                        // with raw boolean false can silently fail in some versions.
                        selected: c.id === selectedId ? 1 : 0,
                        kind: 'confirmed',
                    }),
                )
                .filter((f): f is NonNullable<typeof f> => f !== null),
        }),
        [confirmedCandidates, selectedId],
    );

    const surroundingGeoJSON = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: surroundingCandidates
                .slice(0, 80)
                .map((c, idx) => buildPolygonFeature(c, idx, { id: c.id, kind: 'surrounding' }))
                .filter((f): f is NonNullable<typeof f> => f !== null),
        }),
        [surroundingCandidates],
    );

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
        const kind = f.properties?.kind as string | undefined;

        if (onUpdateProject) {
            // Toggle confirmed status
            const newConfirmedIds = kind === 'confirmed'
                ? confirmedIds.filter((cid) => cid !== id)   // remove
                : [...confirmedIds, id];                      // add
            onUpdateProject({ ...project, confirmedIds: newConfirmedIds });
        } else if (onSelectCandidate && kind === 'confirmed') {
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
                    interactiveLayerIds={['confirmed-fill', 'surrounding-fill']}
                    onClick={handleMapClick}
                    onMouseEnter={() => setCursor('pointer')}
                    onMouseLeave={() => setCursor('auto')}
                >
                    <NavigationControl position="top-right" showCompass visualizePitch />
                    <ScaleControl position="bottom-left" unit="metric" />

                    {/* Umgebungsgebäude aus LoD2 */}
                    <Source id="surrounding" type="geojson" data={surroundingGeoJSON}>
                        <Layer
                            id="surrounding-fill"
                            type="fill"
                            paint={{ 'fill-color': '#b8c5b2', 'fill-opacity': 0.25 }}
                        />
                        <Layer
                            id="surrounding-outline"
                            type="line"
                            paint={{ 'line-color': '#7a9084', 'line-width': 1 }}
                        />
                    </Source>

                    {/* Bestätigte Gebäude */}
                    <Source id="confirmed" type="geojson" data={confirmedGeoJSON}>
                        <Layer
                            id="confirmed-fill"
                            type="fill"
                            paint={{
                                'fill-color': [
                                    'case',
                                    ['==', ['get', 'selected'], 1],
                                    '#a8d5b5',
                                    '#cce4d3',
                                ],
                                'fill-opacity': 0.65,
                            }}
                        />
                        <Layer
                            id="confirmed-outline"
                            type="line"
                            paint={{
                                'line-color': '#23614b',
                                'line-width': ['case', ['==', ['get', 'selected'], 1], 3, 2],
                            }}
                        />
                        <Layer
                            id="confirmed-labels"
                            type="symbol"
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
                        <span className="map-hint-confirmed">■ Grün = bestätigt</span>
                        <span className="map-hint-sep">·</span>
                        <span>Klick → Gebäude hinzufügen / entfernen</span>
                    </div>
                )}
            </div>
            <div className="map-meta">
                <strong>{address}</strong>
                <span>
                    {candidates.length} Gebäude · {confirmedIds.length} bestätigt ·{' '}
                    E {geocode.utm32.easting.toFixed(0)} / N {geocode.utm32.northing.toFixed(0)} ·{' '}
                    {geocode.tileId}
                </span>
            </div>
        </div>
    );
}
