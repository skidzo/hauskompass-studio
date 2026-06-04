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

import type { SpatialScene } from '@/domain/spatial/types';
import { fetchProjectJson } from '@/features/project-data/projectDataLoader';
import type { Zone } from '@/features/workshop/db/workshopDb';
import {
    buildFallbackWorkshopCampusLocations,
    buildFallbackWorkshopZoneGeometry,
    buildWorkshopCameraFrustumCollection,
    buildWorkshopZoneFeatureCollection,
    deriveWorkshopMapAnchor,
    findWorkshopZoneCentroid,
    hasMatchingWorkshopCampusLocations,
    hasMatchingWorkshopZoneGeometry,
    type WorkshopAssetMapMarker,
    type WorkshopCampusLocation,
    type WorkshopZoneFeatureProperties,
} from '@/features/workshop/rendering/workshopMapAdapter';
import { loadWorkshopSpatialScene } from '@/features/workshop/spatial/workshopSpatialScene';
import type { StudioFeatureCollection } from '@/lib/studio-core/spatial-rendering/types';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapGeoJSONFeature, MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import Map, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source } from 'react-map-gl/maplibre';

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

// Campus center — used only as a last-resort fallback when no GPS-backed anchor exists.
const CAMPUS_CENTER = { lon: 9.075894, lat: 48.726961 };

// Priority → fill color
const PRIORITY_FILL: Record<string, string> = {
    critical: '#ef5350',
    high: '#ff9800',
    medium: '#42a5f5',
    low: '#90a4ae',
};

const PRIORITY_FILL_SELECTED = '#23614b';

export interface AssetMarker {
    id: string;
    lat: number;
    lon: number;
    title: string;
    zoneId?: string;
    capturedAt?: string;
    isPlaceholder?: boolean;
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
    flyToPosition?: { lat: number; lon: number } | null;
}

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
    const hasFittedRef = useRef(false);
    const [zoneGeometry, setZoneGeometry] = useState<StudioFeatureCollection<Record<string, unknown>> | null>(null);
    const [campusLocations, setCampusLocations] = useState<WorkshopCampusLocation[]>([]);
    const [sceneData, setSceneData] = useState<SpatialScene | null>(null);

    useEffect(() => {
        let cancelled = false;
        hasFittedRef.current = false;
        setZoneGeometry(null);
        setCampusLocations([]);
        setSceneData(null);

        fetchProjectJson<StudioFeatureCollection<Record<string, unknown>>>(projectId, 'zone_geometry.json')
            .then((data) => {
                if (!cancelled) setZoneGeometry(data);
            })
            .catch((error) => console.debug('[WorkshopMap] zone_geometry load skipped or failed:', error));

        fetchProjectJson<WorkshopCampusLocation[]>(projectId, 'campus_locations.json')
            .then((data) => {
                if (!cancelled) setCampusLocations(data);
            })
            .catch((error) => console.debug('[WorkshopMap] campus_locations load skipped or failed:', error));

        loadWorkshopSpatialScene(projectId)
            .then((data) => {
                if (!cancelled) setSceneData(data);
            })
            .catch((error) => console.error('[WorkshopMap] spatial scene load failed:', error));

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    useEffect(() => {
        if (!flyToPosition || !mapRef.current) return;
        mapRef.current.flyTo({
            center: [flyToPosition.lon, flyToPosition.lat],
            zoom: 18,
            duration: 900,
        });
    }, [flyToPosition]);

    const mapAnchor = useMemo(
        () => sceneData?.mapAnchor ?? deriveWorkshopMapAnchor(assetMarkers as WorkshopAssetMapMarker[], CAMPUS_CENTER),
        [assetMarkers, sceneData],
    );
    const preferRecoveredHulls = Boolean(sceneData?.buildingHulls.some((hull) => hull.levelOfDetail === 'lod2'));
    const matchingStaticGeometry = hasMatchingWorkshopZoneGeometry(zones, zoneGeometry);
    const matchingStaticLocations = hasMatchingWorkshopCampusLocations(zones, campusLocations);
    const effectiveZoneGeometry = useMemo(
        () => (preferRecoveredHulls || !matchingStaticGeometry)
            ? buildFallbackWorkshopZoneGeometry(sceneData, zones, mapAnchor)
            : zoneGeometry,
        [mapAnchor, matchingStaticGeometry, preferRecoveredHulls, sceneData, zoneGeometry, zones],
    );
    const effectiveCampusLocations = useMemo(
        () => (preferRecoveredHulls || !matchingStaticLocations)
            ? buildFallbackWorkshopCampusLocations(sceneData, zones, mapAnchor)
            : campusLocations,
        [campusLocations, mapAnchor, matchingStaticLocations, preferRecoveredHulls, sceneData, zones],
    );
    const usingFallbackGeometry = (!matchingStaticGeometry || preferRecoveredHulls) && Boolean(effectiveZoneGeometry?.features.length);
    const usingFallbackLocations = (!matchingStaticLocations || preferRecoveredHulls) && effectiveCampusLocations.length > 0;
    const useRecoveredHullLabels = usingFallbackGeometry && effectiveCampusLocations.length > 0;

    const geojson = useMemo(
        () => buildWorkshopZoneFeatureCollection(zones, selectedZoneId, effectiveZoneGeometry),
        [zones, selectedZoneId, effectiveZoneGeometry],
    );
    const frustumGeojson = useMemo(
        () => buildWorkshopCameraFrustumCollection(assetMarkers as WorkshopAssetMapMarker[]),
        [assetMarkers],
    );

    useEffect(() => {
        if (flyToPosition || hasFittedRef.current || !mapRef.current) return;
        const coordinates: Array<[number, number]> = [];
        geojson.features.forEach((feature) => {
            feature.geometry.coordinates[0]?.forEach((coordinate) => coordinates.push(coordinate));
        });
        effectiveCampusLocations.forEach((location) => coordinates.push([location.lon, location.lat]));
        assetMarkers.forEach((marker) => coordinates.push([marker.lon, marker.lat]));
        if (coordinates.length === 0) return;
        const lons = coordinates.map((coordinate) => coordinate[0]);
        const lats = coordinates.map((coordinate) => coordinate[1]);
        mapRef.current.fitBounds(
            [
                [Math.min(...lons), Math.min(...lats)],
                [Math.max(...lons), Math.max(...lats)],
            ],
            { padding: 48, duration: 0, maxZoom: 17.2 },
        );
        hasFittedRef.current = true;
    }, [assetMarkers, effectiveCampusLocations, flyToPosition, geojson]);

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
        const feature = e.features?.[0];
        if (!feature) return;
        const zoneId = feature.properties?.zoneId as string | undefined;
        if (zoneId) onSelectZone(zoneId);
    }

    const selectedZone = zones.find((zone) => zone.id === selectedZoneId);

    return (
        <div className="ws-map-wrap">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: mapAnchor.lon,
                    latitude: mapAnchor.lat,
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

                <Source id="zones" type="geojson" data={geojson}>
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
                    {!useRecoveredHullLabels && (
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
                    )}
                </Source>

                {selectedZone && selectedZoneId && (
                    <SelectedZonePopup zones={zones} selectedZoneId={selectedZoneId} geojson={geojson} />
                )}

                {assetMarkers.map((marker) => (
                    <Marker key={marker.id} longitude={marker.lon} latitude={marker.lat} anchor="center">
                        <button
                            className={`ws-map-asset-marker${marker.isPlaceholder ? ' ws-map-asset-marker-placeholder' : ''}${selectedAssetId === marker.id ? ' ws-map-asset-marker-active' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelectAsset?.(marker.id);
                                if (marker.zoneId) onSelectZone(marker.zoneId);
                            }}
                            title={`${marker.title}${marker.capturedAt ? ` · ${marker.capturedAt.slice(0, 10)}` : ''}${marker.bearing != null ? ` → ${marker.bearing.toFixed(0)}°` : ''}`}
                            type="button"
                        >
                            <span
                                className="ws-map-asset-marker-glyph"
                                style={marker.bearing != null ? { transform: `rotate(${marker.bearing}deg)` } : undefined}
                            >
                                {marker.isPlaceholder ? '📍' : '📷'}
                            </span>
                        </button>
                    </Marker>
                ))}

                {effectiveCampusLocations.map((location) => (
                    <Marker key={location.id} longitude={location.lon} latitude={location.lat} anchor={useRecoveredHullLabels ? 'center' : 'bottom'}>
                        <button
                            className={`ws-map-location-marker ws-map-location-marker-${location.kind}${useRecoveredHullLabels ? ' ws-map-location-marker-recovered' : ''}${selectedZoneId === location.zoneId ? ' active' : ''}`}
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

            <div className="ws-map-notice">
                {usingFallbackGeometry || usingFallbackLocations
                    ? useRecoveredHullLabels
                        ? 'Projektkarte aus wiederhergestellten Gebäudehüllen: Namen und Marker aus dem räumlichen Workshop-Modell abgeleitet.'
                        : 'Fallback-Karte: Zonen und Marker aus räumlichem Workshop-Modell + GPS abgeleitet. Vor Ort verifizieren.'
                    : 'Zonengrenzen: GML LoD2 (LGL BW) → UTM32N/WGS84 | GPS-Fotos: EXIF-kalibriert'}
            </div>
        </div>
    );
}

function SelectedZonePopup({
    zones,
    selectedZoneId,
    geojson,
}: {
    zones: Zone[];
    selectedZoneId: string;
    geojson: StudioFeatureCollection<WorkshopZoneFeatureProperties>;
}) {
    const zone = zones.find((item) => item.id === selectedZoneId);
    if (!zone) return null;

    const centroid = findWorkshopZoneCentroid(geojson, selectedZoneId);
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

function docStatusLabel(status: string): string {
    return status === 'not_started' ? 'Nicht begonnen'
        : status === 'partial' ? 'Teilweise'
            : 'Vollständig';
}
