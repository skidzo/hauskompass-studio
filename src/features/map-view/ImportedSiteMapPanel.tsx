import type { ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import { utm32ToWgs84 } from '@/features/new-project/geocode';
import type { ImportedProject, Lod2Candidate } from '@/features/project-store/types';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre';

// OpenFreeMap Bright — free, no API key required
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

type LngLat = [number, number];
type BBox = [LngLat, LngLat];

function toRing(pts: readonly { e: number; n: number }[]): LngLat[] {
    const ring: LngLat[] = [];
    let invalidCount = 0;

    for (const p of pts) {
        const w = utm32ToWgs84(p.e, p.n);

        // Check for invalid coordinates (NaN, Infinity, or out-of-bounds)
        if (!isFinite(w.lon) || !isFinite(w.lat) || Math.abs(w.lon) > 180 || Math.abs(w.lat) > 90) {
            console.warn(`[toRing] Invalid coordinate from UTM (${p.e}, ${p.n}):`, w);
            invalidCount++;
            continue; // Skip invalid points
        }

        ring.push([w.lon, w.lat]);
    }

    if (invalidCount > 0) {
        console.warn(`[toRing] Skipped ${invalidCount} invalid points out of ${pts.length}`);
    }

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
        console.log(`[buildPolygonFeature] ${c.id}: REJECTED (no surface or <3 points)`, {
            surfaceCount: c.surfaces.ground.length,
            selectedSurface: surface?.id,
            pointsInSurface: surface?.points.length,
        });
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
        console.log(`[buildPolygonFeature] ${c.id}: REJECTED (span too large)`, {
            eSpan: eSpan.toFixed(0),
            nSpan: nSpan.toFixed(0),
            surfaceId: surface.id,
            points: pts.length,
        });
        return null;
    }

    // Convert to WGS84 ring
    const ring = toRing(pts);

    // Validate polygon geometry using Shoelace formula to detect self-intersecting rings
    // A ring that is self-intersecting will have areas that cancel out or be deformed
    function calculatePolygonArea(ring: LngLat[]): number {
        if (ring.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
            area += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
        }
        // Close the ring
        area += (ring[0][0] - ring[ring.length - 1][0]) * (ring[0][1] + ring[ring.length - 1][1]);
        return Math.abs(area) / 2;
    }

    const wgs84Area = calculatePolygonArea(ring);
    const expectedAreaM2 = surface?.areaM2 || 0;
    const areaRatio = expectedAreaM2 > 0 ? wgs84Area / expectedAreaM2 : 0;

    // REJECT self-intersecting rings: if WGS84 area is massively different from UTM area, 
    // the ring is likely self-intersecting or corrupted
    if (areaRatio > 100) {
        console.warn(`[buildPolygonFeature] ${c.id}: REJECTED (self-intersecting geometry)`, {
            expectedAreaM2: expectedAreaM2.toFixed(2),
            wgs84Area: wgs84Area.toFixed(8),
            areaRatio: areaRatio.toFixed(2),
            ringLength: ring.length,
            reason: 'Area mismatch suggests self-intersecting polygon',
        });
        return null;
    }

    // DEBUG: For the problematic building, dump everything
    if (c.id === 'DEBY_LOD2_6945465') {
        const eValsAll = pts.map((p) => p.e);
        const nValsAll = pts.map((p) => p.n);
        const lons = ring.map((p) => p[0]);
        const lats = ring.map((p) => p[1]);
        const lonSpan = Math.max(...lons) - Math.min(...lons);
        const latSpan = Math.max(...lats) - Math.min(...lats);

        // Also dump ALL point conversions to see if any are suspicious
        const pointConversions = pts.slice(0, 10).map((p, i) => {
            const w = utm32ToWgs84(p.e, p.n);
            return {
                idx: i,
                utm: { e: p.e, n: p.n },
                wgs84: { lon: w.lon.toFixed(6), lat: w.lat.toFixed(6) },
                valid: isFinite(w.lon) && isFinite(w.lat) && Math.abs(w.lon) <= 180 && Math.abs(w.lat) <= 90,
            };
        });

        console.warn('[PROBLEM-BUILDING-DEBUG] DEBY_LOD2_6945465 RAW DATA', {
            totalPoints: pts.length,
            utmBounds: {
                eMin: Math.min(...eValsAll),
                eMax: Math.max(...eValsAll),
                nMin: Math.min(...nValsAll),
                nMax: Math.max(...nValsAll),
                eSpan: eSpan.toFixed(0),
                nSpan: nSpan.toFixed(0),
            },
            firstPoint: pts[0],
            secondPoint: pts[1],
            lastPoint: pts[pts.length - 1],
            pointConversions,
            wgs84RingLength: ring.length,
            wgs84Bounds: {
                lonMin: Math.min(...lons).toFixed(6),
                lonMax: Math.max(...lons).toFixed(6),
                latMin: Math.min(...lats).toFixed(6),
                latMax: Math.max(...lats).toFixed(6),
                lonSpan: lonSpan.toFixed(6),
                latSpan: latSpan.toFixed(6),
            },
            wgs84First3: ring.slice(0, 3),
            wgs84Last2: ring.slice(-2),
            geometryAnalysis: {
                wgs84Area: wgs84Area.toFixed(8),
                expectedAreaM2: expectedAreaM2.toFixed(2),
                areaRatio: areaRatio.toFixed(4),
                suspiciousIfRatioBig: areaRatio > 100 ? 'YES — would be REJECTED!' : 'normal',
            },
        });
    }

    // Verify properties don't contain null values (could cause MapLibre errors)
    const nullProps = Object.entries(properties)
        .filter(([, v]) => v === null || v === undefined)
        .map(([k]) => k);
    if (nullProps.length > 0) {
        console.warn(`[buildPolygonFeature] ${c.id}: HAS NULL PROPERTIES — SANITIZING`, {
            nullProps,
            before: properties
        });
        // Sanitize: Replace null/undefined with safe defaults for numeric properties
        if (nullProps.includes('confirmed')) properties.confirmed = 0;
        if (nullProps.includes('label')) properties.label = '';
        console.warn(`[buildPolygonFeature] ${c.id}: After sanitize`, { after: properties });
    }

    // Guarantee ALL properties have safe values (defensive initialization)
    const safeProperties = {
        id: properties.id ?? '',
        confirmed: properties.confirmed ?? 0,
        label: properties.label ?? '',
    };

    const feature = {
        type: 'Feature' as const,
        properties: safeProperties,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
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
    const mapRef = useRef<any>(null);

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
        const allCandidatesToProcess = [...confirmed, ...surrounding];

        const stats = {
            total: allCandidatesToProcess.length,
            accepted: 0,
            rejected: 0,
            rejectionReasons: {} as Record<string, number>,
            suspiciousRectangles: [] as Array<{
                id: string;
                reason: string;
                surfaceCount: number;
                selectedAreaM2: number;
                pointCount: number;
                eSpan: number;
                nSpan: number;
            }>,
        };

        const geojson = {
            type: 'FeatureCollection' as const,
            features: allCandidatesToProcess
                .map((c) => {
                    const isConfirmed = confirmedSet.has(c.id);
                    const rank = confirmedIds.indexOf(c.id);
                    const feature = buildPolygonFeature(c, {
                        id: c.id,
                        confirmed: isConfirmed ? 1 : 0,
                        label: isConfirmed && rank >= 0 ? `T${rank + 1}` : '',
                    });

                    if (feature) {
                        stats.accepted++;
                        // Check if this might be the problematic rectangle
                        const selectedSurface = c.surfaces.ground.reduce<(typeof c.surfaces.ground)[0] | null>(
                            (best, s) => (!best || s.areaM2 > best.areaM2 ? s : best),
                            null,
                        );
                        if (selectedSurface) {
                            const pts = selectedSurface.points;
                            const eVals = pts.map((p) => p.e);
                            const nVals = pts.map((p) => p.n);
                            const eSpan = Math.max(...eVals) - Math.min(...eVals);
                            const nSpan = Math.max(...nVals) - Math.min(...nVals);

                            // Flag if this geometry looks suspicious (very elongated or large)
                            const aspectRatio = Math.max(eSpan, nSpan) / Math.max(Math.min(eSpan, nSpan), 1);
                            const area = eSpan * nSpan;
                            if (aspectRatio > 10 || area > 500000) {
                                stats.suspiciousRectangles.push({
                                    id: c.id,
                                    reason: `aspect=${aspectRatio.toFixed(1)}, area=${area.toFixed(0)}m²`,
                                    surfaceCount: c.surfaces.ground.length,
                                    selectedAreaM2: selectedSurface.areaM2,
                                    pointCount: pts.length,
                                    eSpan,
                                    nSpan,
                                });
                            }
                        }
                    } else {
                        stats.rejected++;
                    }

                    return feature;
                })
                .filter((f): f is NonNullable<typeof f> => f !== null),
        };

        // SPECIAL DIAGNOSTIC: Dump selected building geometry
        if (selectedId) {
            const selectedFeature = geojson.features.find(f => f.properties?.id === selectedId);
            const selectedCandidate = allCandidatesToProcess.find(c => c.id === selectedId);
            if (selectedFeature && selectedCandidate) {
                const ring = selectedFeature.geometry.coordinates[0] || [];
                const suspRectangle = stats.suspiciousRectangles.find(sr => sr.id === selectedId);

                // Get min/max bounds of WGS84 ring
                const lons = ring.map(p => p[0]);
                const lats = ring.map(p => p[1]);
                const lonMin = Math.min(...lons);
                const lonMax = Math.max(...lons);
                const latMin = Math.min(...lats);
                const latMax = Math.max(...lats);
                const lonSpan = lonMax - lonMin;
                const latSpan = latMax - latMin;

                console.warn('[DEBUG-SELECTED-BUILDING] ' + selectedId, {
                    isConfirmed: selectedCandidate && confirmedIds.includes(selectedCandidate.id),
                    ringLength: ring.length,
                    wgs84Bounds: { lonMin: lonMin.toFixed(6), lonMax: lonMax.toFixed(6), latMin: latMin.toFixed(6), latMax: latMax.toFixed(6) },
                    spanDegrees: { lon: lonSpan.toFixed(6), lat: latSpan.toFixed(6) },
                    isSuspicious: !!suspRectangle,
                    suspiciousReason: suspRectangle?.reason || 'none',
                    firstRingPoints: ring.slice(0, 5),
                    lastRingPoints: ring.slice(-3),
                });
            }
        }

        console.log('[allCandidatesGeoJSON] ANALYSIS:', {
            stats,
            selectedId,
            confirmedIds,
            totalFeatures: geojson.features.length,
            confirmedBuildings: geojson.features.filter(f => f.properties?.confirmed === 1).length,
            sampleFeatures: geojson.features.slice(0, 3).map(f => ({
                id: f.properties?.id,
                confirmed: f.properties?.confirmed,
                coordsLength: f.geometry.coordinates[0]?.length,
            })),
        });

        return geojson;
    }, [candidates, confirmedIds]);

    // Set up MapLibre source and layers directly via API (not react-map-gl components)
    // This bypasses potential react-map-gl bugs with Source/Layer components
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current.getMap?.();
        if (!map || !map.isStyleLoaded()) return;

        // Add or update source
        if (!map.getSource('buildings')) {
            map.addSource('buildings', {
                type: 'geojson',
                data: allCandidatesGeoJSON,
                promoteId: 'id',
            });
            console.log('[MapLibre] Source "buildings" created');
        } else {
            // Update existing source data
            (map.getSource('buildings') as any).setData(allCandidatesGeoJSON);
            console.log('[MapLibre] Source "buildings" updated');
        }

        // Add layers if they don't exist
        if (!map.getLayer('buildings-fill')) {
            map.addLayer({
                id: 'buildings-fill',
                type: 'fill',
                source: 'buildings',
                paint: {
                    'fill-color': '#3d9465',
                    'fill-opacity': 0.4,
                },
            });
            console.log('[MapLibre] Layer "buildings-fill" created');
        }

        if (!map.getLayer('buildings-outline')) {
            map.addLayer({
                id: 'buildings-outline',
                type: 'line',
                source: 'buildings',
                paint: {
                    'line-color': '#1a5c38',
                    'line-width': 1.5,
                },
            });
            console.log('[MapLibre] Layer "buildings-outline" created');
        }

        if (!map.getLayer('buildings-labels')) {
            map.addLayer({
                id: 'buildings-labels',
                type: 'symbol',
                source: 'buildings',
                filter: ['==', ['get', 'confirmed'], 1],
                layout: {
                    'text-field': ['get', 'label'],
                    'text-size': 13,
                    'text-font': ['Noto Sans Bold', 'Arial Unicode MS Bold'],
                    'text-anchor': 'center',
                },
                paint: {
                    'text-color': '#174837',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5,
                },
            });
            console.log('[MapLibre] Layer "buildings-labels" created');
        }
    }, [allCandidatesGeoJSON]);

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
                    ref={mapRef}
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
