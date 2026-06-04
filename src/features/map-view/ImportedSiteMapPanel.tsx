import type { ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import { utm32ToWgs84 } from '@/features/new-project/geocode';
import type { ImportedProject, Lod2Candidate } from '@/features/project-store/types';
import type { Feature } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';

// Stable raster fallback style without external sprite dependencies.
const MAP_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
        },
    },
    layers: [
        {
            id: 'osm-raster',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22,
        },
    ],
} as StyleSpecification;

type LngLat = [number, number];
type BBox = [LngLat, LngLat];
type PersistedMapView = {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
};

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

    if (ring.length > 0) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first); // close ring
        }
    }
    return ring;
}

function buildPolygonFeature(
    c: Lod2Candidate,
    properties: Record<string, unknown>,
): { feature: Feature | null; rejectionReason?: string } {
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
        return { feature: null, rejectionReason: 'no_surface_or_<3_points' };
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
        return { feature: null, rejectionReason: 'utm_span_>1000m' };
    }

    // Convert to WGS84 ring
    const ring = toRing(pts);

    // Reject degenerate rings early (MapLibre can produce rendering artifacts for these)
    if (ring.length < 4) {
        console.warn(`[buildPolygonFeature] ${c.id}: REJECTED (degenerate ring)`, {
            ringLength: ring.length,
            sourcePoints: pts.length,
        });
        return { feature: null, rejectionReason: 'degenerate_ring' };
    }

    const uniqueVertices = new Set(ring.slice(0, -1).map(([lon, lat]) => `${lon.toFixed(9)}:${lat.toFixed(9)}`));
    if (uniqueVertices.size < 3) {
        console.warn(`[buildPolygonFeature] ${c.id}: REJECTED (too few unique vertices)`, {
            uniqueVertices: uniqueVertices.size,
            ringLength: ring.length,
        });
        return { feature: null, rejectionReason: 'too_few_unique_vertices' };
    }

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

    // Check WGS84 bounding box span — single building should NEVER exceed ~0.01°
    // (which is ~1.1 km in latitude). Anything larger is corrupted geometry.
    const lons = ring.map(p => p[0]);
    const lats = ring.map(p => p[1]);
    const lonSpan = Math.max(...lons) - Math.min(...lons);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const maxSpan = Math.max(lonSpan, latSpan);

    if (maxSpan > 0.01) {
        console.warn(`[buildPolygonFeature] ${c.id}: REJECTED (WGS84 span too large)`, {
            lonSpan: lonSpan.toFixed(6),
            latSpan: latSpan.toFixed(6),
            maxSpan: maxSpan.toFixed(6),
            reason: `Span ${maxSpan.toFixed(6)}° is >0.01° (~1km) — suspected corrupted geometry`,
        });
        return { feature: null, rejectionReason: `wgs84_span_${maxSpan.toFixed(4)}°_>0.01°` };
    }

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
        return { feature: null, rejectionReason: 'self_intersecting_geometry' };
    }

    // Guarantee ALL properties have safe values FIRST (defensive initialization)
    // This MUST come before any usage to prevent null errors in MapLibre
    const confirmedRaw = Number(properties.confirmed ?? 0);
    const selectedRaw = Number(properties.selected ?? 0);
    const safeProperties = {
        id: String(properties.id ?? ''),
        confirmed: Number.isFinite(confirmedRaw) && confirmedRaw > 0 ? 1 : 0,
        selected: Number.isFinite(selectedRaw) && selectedRaw > 0 ? 1 : 0,
        label: String(properties.label ?? ''),
    };

    // FINAL VALIDATION: All properties must be non-null
    if (!safeProperties.id || safeProperties.confirmed === null || safeProperties.selected === null || safeProperties.label === null) {
        console.warn(`[buildPolygonFeature] ${c.id}: FAILED SANITIZATION`, {
            before: properties,
            after: safeProperties,
        });
        return { feature: null, rejectionReason: 'sanitization_failed' };
    }

    const feature: Feature = {
        type: 'Feature',
        properties: safeProperties,
        geometry: { type: 'Polygon', coordinates: [ring] },
    };

    return { feature, rejectionReason: undefined };
}

function mapViewStorageKey(projectSlug: string) {
    return `hauskompass.importedMapView.v1.${projectSlug}`;
}

function loadPersistedMapView(projectSlug: string): PersistedMapView | null {
    try {
        const raw = window.localStorage.getItem(mapViewStorageKey(projectSlug));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<PersistedMapView>;
        if (
            typeof parsed.longitude !== 'number' ||
            typeof parsed.latitude !== 'number' ||
            typeof parsed.zoom !== 'number' ||
            typeof parsed.bearing !== 'number' ||
            typeof parsed.pitch !== 'number'
        ) {
            return null;
        }
        return parsed as PersistedMapView;
    } catch {
        return null;
    }
}

function savePersistedMapView(projectSlug: string, view: PersistedMapView) {
    try {
        window.localStorage.setItem(mapViewStorageKey(projectSlug), JSON.stringify(view));
    } catch {
        // keep map usable even if persistence is unavailable
    }
}

function candidateCenter(candidate: Lod2Candidate) {
    const center = utm32ToWgs84(
        (candidate.bboxUtm32.minE + candidate.bboxUtm32.maxE) / 2,
        (candidate.bboxUtm32.minN + candidate.bboxUtm32.maxN) / 2,
    );
    return { longitude: center.lon, latitude: center.lat };
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
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapRef = useRef<any>(null);
    const persistedViewRef = useRef<PersistedMapView | null>(loadPersistedMapView(project.slug));

    useEffect(() => {
        persistedViewRef.current = loadPersistedMapView(project.slug);
    }, [project.slug]);

    const confirmedCandidates = useMemo(
        () => candidates.filter((c) => confirmedIds.includes(c.id)),
        [candidates, confirmedIds],
    );

    const geocodePoint = useMemo(() => {
        const center = utm32ToWgs84(geocode.utm32.easting, geocode.utm32.northing);
        return { longitude: center.lon, latitude: center.lat };
    }, [geocode]);

    const confirmedMarkers = useMemo(
        () =>
            confirmedCandidates.map((candidate) => ({
                ...candidateCenter(candidate),
                id: candidate.id,
                label: `T${confirmedIds.indexOf(candidate.id) + 1}`,
                selected: candidate.id === selectedId,
            })),
        [confirmedCandidates, confirmedIds, selectedId],
    );

    // Single source for all buildings — confirmedSet built INSIDE useMemo
    // to avoid stale-closure issues; avoids visual flash when toggling
    const allCandidatesGeoJSON = useMemo(() => {
        const confirmedSet = new Set(confirmedIds);
        // Include ALL candidates (no 120-limit) to ensure consistent rendering
        const confirmed = candidates.filter((c) => confirmedSet.has(c.id));
        const surrounding = candidates.filter((c) => !confirmedSet.has(c.id));
        const allCandidatesToProcess = [...confirmed, ...surrounding];

        const stats = {
            total: allCandidatesToProcess.length,
            accepted: 0,
            rejected: 0,
            rejectionReasons: {} as Record<string, number>,
            rejectedDetails: [] as Array<{ id: string; reason: string }>,
            rejectedIds: [] as string[],
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
                    const result = buildPolygonFeature(c, {
                        id: c.id,
                        confirmed: isConfirmed ? 1 : 0,
                        selected: selectedId === c.id ? 1 : 0,
                        label: isConfirmed && rank >= 0 ? `T${rank + 1}` : '',
                    });

                    if (result.feature) {
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
                        stats.rejectedIds.push(c.id);
                        if (result.rejectionReason) {
                            stats.rejectionReasons[result.rejectionReason] = (stats.rejectionReasons[result.rejectionReason] ?? 0) + 1;
                            stats.rejectedDetails.push({ id: c.id, reason: result.rejectionReason });
                        }
                    }

                    return result.feature;
                })
                .filter((f): f is Feature => f !== null),
        };

        return geojson;
    }, [candidates, confirmedIds, selectedId]);

    const fallbackBounds = useMemo((): BBox => {
        const ctr = utm32ToWgs84(geocode.utm32.easting, geocode.utm32.northing);
        return [
            [ctr.lon - 0.0015, ctr.lat - 0.001],
            [ctr.lon + 0.0015, ctr.lat + 0.001],
        ];
    }, [geocode]);

    const focusBounds = useMemo((): BBox => {
        const selectedFeature = selectedId
            ? allCandidatesGeoJSON.features.find((feature) => feature.properties?.id === selectedId)
            : null;
        const preferredFeatures = selectedFeature
            ? [selectedFeature]
            : allCandidatesGeoJSON.features.filter((feature) => {
                const id = feature.properties?.id;
                return typeof id === 'string' && confirmedIds.includes(id);
            });
        const sourceFeatures = preferredFeatures.length > 0 ? preferredFeatures : allCandidatesGeoJSON.features;
        const coords = sourceFeatures
            .flatMap((feature) => (feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : []))
            .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

        if (coords.length === 0) {
            return fallbackBounds;
        }

        const lons = coords.map(([lon]) => lon);
        const lats = coords.map(([, lat]) => lat);
        return [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
        ];
    }, [allCandidatesGeoJSON, confirmedIds, fallbackBounds, selectedId]);

    const initialViewState = persistedViewRef.current
        ? {
            longitude: persistedViewRef.current.longitude,
            latitude: persistedViewRef.current.latitude,
            zoom: persistedViewRef.current.zoom,
            bearing: persistedViewRef.current.bearing,
            pitch: persistedViewRef.current.pitch,
        }
        : {
            bounds: focusBounds,
            fitBoundsOptions: { padding: 120, maxZoom: selectedId ? 18 : 17.25 },
        };

    // Set up MapLibre source and layers directly via API (not react-map-gl components)
    // This bypasses potential react-map-gl bugs with Source/Layer components
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current.getMap?.();
        if (!map) return;

        // WORKAROUND: Delete and recreate source/layers instead of using setData()
        // This seems to avoid a MapLibre rendering bug that happens with setData()
        try {
            // Remove layers (must remove in correct order due to dependencies)
            if (map.getLayer('buildings-outline')) map.removeLayer('buildings-outline');
            if (map.getLayer('buildings-fill')) map.removeLayer('buildings-fill');

            // Remove source
            if (map.getSource('buildings')) map.removeSource('buildings');

        } catch (err) {
            console.warn('[MapLibre] Error removing source/layers:', err);
        }

        // Now add fresh source and layers
        try {
            map.addSource('buildings', {
                type: 'geojson',
                data: allCandidatesGeoJSON,
                promoteId: 'id',
            });

            map.addLayer({
                id: 'buildings-fill',
                type: 'fill',
                source: 'buildings',
                paint: {
                    'fill-color': [
                        'case',
                        ['==', ['to-number', ['coalesce', ['get', 'selected'], 0]], 1],
                        '#295b88',
                        ['==', ['to-number', ['coalesce', ['get', 'confirmed'], 0]], 1],
                        '#3d9465',
                        '#cfd8d2',
                    ],
                    'fill-opacity': [
                        'case',
                        ['==', ['to-number', ['coalesce', ['get', 'selected'], 0]], 1],
                        0.62,
                        ['==', ['to-number', ['coalesce', ['get', 'confirmed'], 0]], 1],
                        0.42,
                        0.14,
                    ],
                },
            });

            map.addLayer({
                id: 'buildings-outline',
                type: 'line',
                source: 'buildings',
                paint: {
                    'line-color': [
                        'case',
                        ['==', ['to-number', ['coalesce', ['get', 'selected'], 0]], 1],
                        '#123a61',
                        ['==', ['to-number', ['coalesce', ['get', 'confirmed'], 0]], 1],
                        '#1a5c38',
                        '#8c9890',
                    ],
                    'line-width': [
                        'case',
                        ['==', ['to-number', ['coalesce', ['get', 'selected'], 0]], 1],
                        3,
                        ['==', ['to-number', ['coalesce', ['get', 'confirmed'], 0]], 1],
                        2,
                        1,
                    ],
                },
            });

        } catch (err) {
            console.error('[MapLibre] Error adding source/layers:', err);
        }
    }, [mapLoaded, allCandidatesGeoJSON]);

    // Re-fit bounds without fly animation when no persisted user view exists.
    useEffect(() => {
        if (persistedViewRef.current || !mapLoaded || !mapRef.current) return;
        const map = mapRef.current.getMap?.();
        if (!map || !map.getSource('buildings')) return;

        const timer = setTimeout(() => {
            map.resize();
            map.fitBounds(focusBounds, { padding: 120, maxZoom: selectedId ? 18 : 17.25, duration: 0 });
        }, 40);

        return () => clearTimeout(timer);
    }, [focusBounds, mapLoaded, selectedId]);

    /** Toggle a building's confirmed status and persist via onUpdateProject. */
    function handleMapClick(e: { features?: Array<{ properties?: Record<string, unknown> }> }) {
        const f = e.features?.[0];
        if (!f) return;
        const id = f.properties?.id as string | undefined;
        if (!id) return;
        const isConfirmed = (f.properties?.confirmed as number | undefined) === 1;

        onSelectCandidate?.(id);

        if (onUpdateProject) {
            const newConfirmedIds = isConfirmed
                ? confirmedIds.filter((cid) => cid !== id)   // abwählen
                : [...confirmedIds, id];                      // auswählen
            onUpdateProject({ ...project, confirmedIds: newConfirmedIds });
        }
    }

    return (
        <div className="imported-map-wrap">
            <div className="imported-map-gl">
                <Map
                    ref={mapRef}
                    initialViewState={initialViewState}
                    mapStyle={MAP_STYLE}
                    style={{ width: '100%', height: '100%', cursor }}
                    interactiveLayerIds={['buildings-fill']}
                    onClick={handleMapClick}
                    onLoad={() => setMapLoaded(true)}
                    onMoveEnd={(event) => {
                        const nextView = {
                            longitude: event.viewState.longitude,
                            latitude: event.viewState.latitude,
                            zoom: event.viewState.zoom,
                            bearing: event.viewState.bearing,
                            pitch: event.viewState.pitch,
                        };
                        persistedViewRef.current = nextView;
                        savePersistedMapView(project.slug, nextView);
                    }}
                    onMouseEnter={() => setCursor('pointer')}
                    onMouseLeave={() => setCursor('auto')}
                >
                    <Marker longitude={geocodePoint.longitude} latitude={geocodePoint.latitude} anchor="center">
                        <div aria-label="Adresse" className="imported-map-geocode-point" />
                    </Marker>
                    {confirmedMarkers.map((marker) => (
                        <Marker key={marker.id} longitude={marker.longitude} latitude={marker.latitude} anchor="center">
                            <button
                                className={`imported-map-marker${marker.selected ? ' imported-map-marker-selected' : ''}`}
                                onClick={() => onSelectCandidate?.(marker.id)}
                                type="button"
                            >
                                {marker.label}
                            </button>
                        </Marker>
                    ))}
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
