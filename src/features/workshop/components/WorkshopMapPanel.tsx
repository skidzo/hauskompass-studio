/**
 * WorkshopMapPanel — interactive campus zone map.
 *
 * Shows approximate zone polygons from zone_geometry.geojson on a MapLibre
 * base map. Zones are colored by documentation priority / status. Clicking
 * a zone polygon selects it in the right panel.
 *
 * Geometry accuracy: rough approximation (~±20 m). Polygons must be verified
 * and corrected during/after site visits using the AssetIngestPanel GPS data
 * or a dedicated surveying workflow.
 */

import { fetchProjectJson } from '@/features/project-data/projectDataLoader';
import type { Zone } from '@/features/workshop/db/workshopDb';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapGeoJSONFeature, MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source } from 'react-map-gl/maplibre';

// Minimal inline GeoJSON types (avoids transitive @types/geojson dependency)
type LngLatCoord = [number, number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoFeature = { type: 'Feature'; id?: any; properties: Record<string, any> | null; geometry: { type: string; coordinates: LngLatCoord[][] } };
type GeoFC = { type: 'FeatureCollection'; features: GeoFeature[] };
type CampusLocation = {
    id: string;
    zoneId: string;
    label: string;
    kind: 'pavilion' | 'plannedPavilion' | 'canteen' | 'parkingDeck' | 'parkingArea' | 'visitorParking';
    lat: number;
    lon: number;
    source: string;
};

// Free tile style — no API key required
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

// Campus center — kalibriert aus EXIF-GPS-Daten (April 2026, 9 Fotos)
// Korrektur: alter Wert lon=9.0947 war 1379m zu weit östlich!
const CAMPUS_CENTER = { lon: 9.075894, lat: 48.726961 };

// Priority → fill color
const PRIORITY_FILL: Record<string, string> = {
    critical: '#ef5350',   // red
    high: '#ff9800',       // orange
    medium: '#42a5f5',     // blue
    low: '#90a4ae',        // grey
};

const PRIORITY_FILL_SELECTED = '#23614b'; // dark green when selected

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AssetMarker {
    id: string;
    lat: number;
    lon: number;
    title: string;
    zoneId?: string;
    capturedAt?: string;
    isPlaceholder?: boolean;
    /** Camera bearing in degrees clockwise from True North (EXIF GPSImgDirection) */
    bearing?: number;
}

export interface WorkshopMapPanelProps {
    projectId: string;
    zones: Zone[];
    selectedZoneId: string | null;
    selectedAssetId?: string | null;
    onSelectZone: (zoneId: string) => void;
    onSelectAsset?: (assetId: string) => void;
    assetMarkers?: AssetMarker[];
    /** When set, the map flies to this position */
    flyToPosition?: { lat: number; lon: number } | null;
}

// ---------------------------------------------------------------------------
// Camera frustum geometry (view-cone as GeoJSON)
// ---------------------------------------------------------------------------

/**
 * Builds a GeoJSON FeatureCollection of camera view-cone polygons.
 * Each cone is a triangle: camera position + two endpoints at (bearing ± halfFov)
 * projected to a fixed ground distance.
 */
function buildFrustumGeoJSON(markers: AssetMarker[]): GeoFC {
    const DEG = Math.PI / 180;
    const HALF_FOV = 30;  // degrees — roughly smartphone camera horizontal half-FOV
    const LENGTH_M = 28;  // meters to project in each direction

    const features: GeoFeature[] = markers
        .filter((m) => typeof m.bearing === 'number')
        .map((m) => {
            const b = m.bearing!;
            const lat = m.lat;
            const lon = m.lon;
            // Project a point at `dist` meters in direction `bearingDeg`
            function project(bearingDeg: number, dist: number): LngLatCoord {
                const brRad = bearingDeg * DEG;
                const dlat = dist * Math.cos(brRad) / 111_320;
                const dlon = dist * Math.sin(brRad) / (111_320 * Math.cos(lat * DEG));
                return [+(lon + dlon).toFixed(8), +(lat + dlat).toFixed(8)];
            }
            const origin: LngLatCoord = [+lon.toFixed(8), +lat.toFixed(8)];
            const leftEdge = project((b - HALF_FOV + 360) % 360, LENGTH_M);
            const rightEdge = project((b + HALF_FOV) % 360, LENGTH_M);
            // Fan: origin → leftEdge → rightEdge → origin
            const coords: LngLatCoord[] = [origin, leftEdge, rightEdge, origin];
            return {
                type: 'Feature',
                id: m.id,
                properties: { title: m.title, bearing: b },
                geometry: { type: 'Polygon', coordinates: [coords] },
            } as GeoFeature;
        });

    return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// Build enriched GeoJSON FeatureCollection
// ---------------------------------------------------------------------------

function buildEnrichedGeoJSON(
    zones: Zone[],
    selectedZoneId: string | null,
    zoneGeometry: GeoFC | null,
): GeoFC {
    const zoneMap = new globalThis.Map<string, Zone>(zones.map((z) => [z.id, z]));

    const enriched = (zoneGeometry ?? ({ type: 'FeatureCollection', features: [] } as GeoFC)).features
        .filter((f) => f.properties?.zoneId)
        .map((f, idx) => {
            const id = f.properties!.zoneId as string;
            const zone = zoneMap.get(id);
            return {
                ...f,
                id: idx,
                properties: {
                    ...f.properties,
                    documentationStatus: zone?.documentationStatus ?? 'not_started',
                    documentationPriority: zone?.documentationPriority ?? 'low',
                    selected: id === selectedZoneId ? 1 : 0,
                    label: zone?.name ?? (f.properties?.name as string ?? id),
                },
            } as GeoFeature;
        });

    return { type: 'FeatureCollection', features: enriched };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkshopMapPanel({
    projectId,
    zones,
    selectedZoneId,
    selectedAssetId = null,
    onSelectZone,
    onSelectAsset,
    assetMarkers = [],
    flyToPosition,
}: WorkshopMapPanelProps) {
    const mapRef = useRef<MapRef>(null);
    const [zoneGeometry, setZoneGeometry] = useState<GeoFC | null>(null);
    const [campusLocations, setCampusLocations] = useState<CampusLocation[]>([]);

    useEffect(() => {
        fetchProjectJson<GeoFC>(projectId, 'zone_geometry.json').then((d) => setZoneGeometry(d))
            .catch((e) => console.error('[WorkshopMap] zone_geometry load failed:', e));
        fetchProjectJson<CampusLocation[]>(projectId, 'campus_locations.json').then((d) => setCampusLocations(d))
            .catch((e) => console.error('[WorkshopMap] campus_locations load failed:', e));
    }, [projectId]);

    // Fly to position when requested from outside
    useEffect(() => {
        if (!flyToPosition || !mapRef.current) return;
        mapRef.current.flyTo({
            center: [flyToPosition.lon, flyToPosition.lat],
            zoom: 18,
            duration: 900,
        });
    }, [flyToPosition]);

    const geojson = useMemo(
        () => buildEnrichedGeoJSON(zones, selectedZoneId, zoneGeometry),
        [zones, selectedZoneId, zoneGeometry],
    );
    const frustumGeojson = useMemo(
        () => buildFrustumGeoJSON(assetMarkers),
        [assetMarkers],
    );

    // Build a MapLibre expression for fill-color based on priority + selection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fillColorExpression: any = [
        'case',
        ['==', ['get', 'selected'], 1], PRIORITY_FILL_SELECTED,
        ['==', ['get', 'documentationPriority'], 'critical'], PRIORITY_FILL.critical,
        ['==', ['get', 'documentationPriority'], 'high'], PRIORITY_FILL.high,
        ['==', ['get', 'documentationPriority'], 'medium'], PRIORITY_FILL.medium,
        PRIORITY_FILL.low,
    ];

    function handleClick(e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) {
        const f = e.features?.[0];
        if (!f) return;
        const zoneId = f.properties?.zoneId as string | undefined;
        if (zoneId) onSelectZone(zoneId);
    }

    const selectedZone = zones.find((z) => z.id === selectedZoneId);

    return (
        <div className="ws-map-wrap">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: CAMPUS_CENTER.lon,
                    latitude: CAMPUS_CENTER.lat,
                    zoom: 16.2,
                }}
                mapStyle={MAP_STYLE}
                style={{ width: '100%', height: '100%' }}
                interactiveLayerIds={['zone-fill']}
                onClick={handleClick}
                cursor="pointer"
            >
                <NavigationControl position="top-right" showCompass visualizePitch />
                <ScaleControl position="bottom-left" unit="metric" />

                {/* Zone polygons */}
                <Source id="zones" type="geojson" data={geojson}>
                    {/* Fill */}
                    <Layer
                        id="zone-fill"
                        type="fill"
                        paint={{
                            'fill-color': fillColorExpression,
                            'fill-opacity': [
                                'case',
                                ['==', ['get', 'selected'], 1], 0.55,
                                0.30,
                            ],
                        }}
                    />
                    {/* Outline */}
                    <Layer
                        id="zone-outline"
                        type="line"
                        paint={{
                            'line-color': [
                                'case',
                                ['==', ['get', 'selected'], 1], '#23614b',
                                ['==', ['get', 'documentationPriority'], 'critical'], '#c62828',
                                ['==', ['get', 'documentationPriority'], 'high'], '#e65100',
                                '#546e7a',
                            ],
                            'line-width': [
                                'case',
                                ['==', ['get', 'selected'], 1], 3,
                                1.5,
                            ],
                        }}
                    />
                    {/* Zone labels */}
                    <Layer
                        id="zone-labels"
                        type="symbol"
                        layout={{
                            'text-field': ['get', 'label'],
                            'text-size': 11,
                            'text-font': ['Noto Sans Bold', 'Arial Unicode MS Bold'],
                            'text-anchor': 'center',
                            'text-max-width': 8,
                        }}
                        paint={{
                            'text-color': '#1f2933',
                            'text-halo-color': '#ffffffcc',
                            'text-halo-width': 1.5,
                        }}
                    />
                </Source>

                {/* Popup for selected zone */}
                {selectedZone && selectedZoneId && (
                    <SelectedZonePopup zones={zones} selectedZoneId={selectedZoneId} geojson={geojson} />
                )}

                {/* GPS photo markers */}
                {assetMarkers.map((m) => (
                    <Marker key={m.id} longitude={m.lon} latitude={m.lat} anchor="center">
                        <button
                            className={`ws-map-asset-marker${m.isPlaceholder ? ' ws-map-asset-marker-placeholder' : ''}${selectedAssetId === m.id ? ' ws-map-asset-marker-active' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelectAsset?.(m.id);
                                if (m.zoneId) onSelectZone(m.zoneId);
                            }}
                            title={`${m.title}${m.capturedAt ? ` · ${m.capturedAt.slice(0, 10)}` : ''}${m.bearing !== undefined ? ` \u2192 ${m.bearing.toFixed(0)}\u00b0` : ''}`}
                            type="button"
                        >
                            <span
                                className="ws-map-asset-marker-glyph"
                                style={m.bearing !== undefined ? { transform: `rotate(${m.bearing}deg)` } : undefined}
                            >
                                {m.isPlaceholder ? '\ud83d\udccd' : '\ud83d\udcf7'}
                            </span>
                        </button>
                    </Marker>
                ))}

                {/* Named campus anchors: buildings + parking areas */}
                {campusLocations.map((location) => (
                    <Marker key={location.id} longitude={location.lon} latitude={location.lat} anchor="bottom">
                        <button
                            className={`ws-map-location-marker ws-map-location-marker-${location.kind}${selectedZoneId === location.zoneId ? ' active' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelectZone(location.zoneId);
                            }}
                            title={`${location.label} · ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`}
                            type="button"
                        >
                            <span className="ws-map-location-pin" />
                            <span className="ws-map-location-label">{location.label}</span>
                        </button>
                    </Marker>
                ))}

                {/* Camera frustum layer */}
                <Source id="frustums" type="geojson" data={frustumGeojson}>
                    <Layer
                        id="frustum-fill"
                        type="fill"
                        paint={{ 'fill-color': '#ff6d00', 'fill-opacity': 0.18 }}
                    />
                    <Layer
                        id="frustum-outline"
                        type="line"
                        paint={{ 'line-color': '#ff6d00', 'line-width': 1.5, 'line-opacity': 0.7 }}
                    />
                </Source>
            </Map>

            {/* Legend */}
            <div className="ws-map-legend">
                <span className="ws-map-legend-title">Dokumentations-Priorität</span>
                {Object.entries(PRIORITY_FILL).map(([key, color]) => (
                    <span key={key} className="ws-map-legend-item">
                        <span className="ws-map-legend-dot" style={{ background: color }} />
                        {key === 'critical' ? 'Kritisch' : key === 'high' ? 'Hoch' : key === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                ))}
                <span className="ws-map-legend-item">
                    <span className="ws-map-legend-dot" style={{ background: PRIORITY_FILL_SELECTED }} />
                    Ausgewählt
                </span>
                <span className="ws-map-legend-item">
                    <span className="ws-map-legend-dot ws-map-legend-dot-location" />
                    Pavillons / Kantine / Parkflächen
                </span>
            </div>

            {/* Data source notice */}
            <div className="ws-map-notice">
                Zonengrenzen: GML LoD2 (LGL BW) → UTM32N/WGS84 | GPS-Fotos: EXIF-kalibriert
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Helper: find approximate centroid of a zone's polygon for popup
// ---------------------------------------------------------------------------

function SelectedZonePopup({
    zones,
    selectedZoneId,
    geojson,
}: {
    zones: Zone[];
    selectedZoneId: string;
    geojson: GeoFC;
}) {
    const zone = zones.find((z) => z.id === selectedZoneId);
    const feature = geojson.features.find(
        (f) => f.properties?.zoneId === selectedZoneId,
    );
    if (!zone || !feature) return null;

    const centroid = polygonCentroid(feature);
    if (!centroid) return null;

    return (
        <Popup longitude={centroid[0]} latitude={centroid[1]} closeButton={false} anchor="bottom" offset={8}>
            <div className="ws-map-popup">
                <strong>{zone.name}</strong>
                <span>Priorität: {zone.documentationPriority}</span>
                <span>Status: {docStatusLabel(zone.documentationStatus)}</span>
            </div>
        </Popup>
    );
}

function polygonCentroid(feature: GeoFeature): [number, number] | null {
    const coords = feature.geometry?.coordinates?.[0];
    if (!coords || coords.length < 3) return null;
    const n = coords.length - 1;
    const lon = coords.slice(0, n).reduce((s, c) => s + c[0], 0) / n;
    const lat = coords.slice(0, n).reduce((s, c) => s + c[1], 0) / n;
    return [lon, lat];
}

function docStatusLabel(s: string): string {
    return s === 'not_started' ? 'Nicht begonnen'
        : s === 'partial' ? 'Teilweise'
            : 'Vollständig';
}
