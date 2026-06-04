import type { SpatialScene } from '@/domain/spatial/types';
import type { Zone } from '@/features/workshop/db/workshopDb';
import { buildViewConeCollection, polygonCentroid } from '@/lib/studio-core/spatial-rendering/helpers';
import type { StudioFeatureCollection } from '@/lib/studio-core/spatial-rendering/types';

export interface WorkshopAssetMapMarker {
  id: string;
  lat: number;
  lon: number;
  title: string;
  zoneId?: string;
  capturedAt?: string;
  isPlaceholder?: boolean;
  bearing?: number;
}

export interface WorkshopZoneFeatureProperties {
  zoneId: string;
  documentationStatus: string;
  documentationPriority: string;
  selected: 0 | 1;
  label: string;
}

export interface WorkshopMapAnchor {
  lat: number;
  lon: number;
}

export interface WorkshopCampusLocation {
  id: string;
  zoneId: string;
  label: string;
  kind: 'pavilion' | 'plannedPavilion' | 'canteen' | 'parkingDeck' | 'parkingArea' | 'visitorParking';
  lat: number;
  lon: number;
  source: string;
}

export function hasMatchingWorkshopZoneGeometry(
  zones: Zone[],
  zoneGeometry: StudioFeatureCollection<Record<string, unknown>> | null,
): boolean {
  if (!zoneGeometry) return false;
  const zoneIds = new Set(zones.map((zone) => zone.id));
  return zoneGeometry.features.some((feature) => typeof feature.properties.zoneId === 'string' && zoneIds.has(feature.properties.zoneId as string));
}

export function hasMatchingWorkshopCampusLocations(
  zones: Zone[],
  campusLocations: WorkshopCampusLocation[],
): boolean {
  const zoneIds = new Set(zones.map((zone) => zone.id));
  return campusLocations.some((location) => zoneIds.has(location.zoneId));
}

export function buildWorkshopZoneFeatureCollection(
  zones: Zone[],
  selectedZoneId: string | null,
  zoneGeometry: StudioFeatureCollection<Record<string, unknown>> | null,
): StudioFeatureCollection<WorkshopZoneFeatureProperties> {
  const zoneMap = new globalThis.Map<string, Zone>(zones.map((zone) => [zone.id, zone]));
  const features = (zoneGeometry?.features ?? [])
    .filter((feature) => typeof feature.properties.zoneId === 'string' && zoneMap.has(feature.properties.zoneId as string))
    .map((feature, index) => {
      const zoneId = feature.properties.zoneId as string;
      const zone = zoneMap.get(zoneId);
      return {
        ...feature,
        id: index,
        properties: {
          zoneId,
          documentationStatus: zone?.documentationStatus ?? 'not_started',
          documentationPriority: zone?.documentationPriority ?? 'low',
          selected: zoneId === selectedZoneId ? 1 as const : 0 as const,
          label: zone?.name ?? (typeof feature.properties.name === 'string' ? feature.properties.name : zoneId),
        },
      };
    });
  return { type: 'FeatureCollection', features };
}

export function deriveWorkshopMapAnchor(
  markers: WorkshopAssetMapMarker[],
  fallback: WorkshopMapAnchor,
): WorkshopMapAnchor {
  const geoTagged = markers.filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lon));
  if (geoTagged.length === 0) return fallback;
  const total = geoTagged.reduce((acc, marker) => {
    acc.lat += marker.lat;
    acc.lon += marker.lon;
    return acc;
  }, { lat: 0, lon: 0 });
  return {
    lat: total.lat / geoTagged.length,
    lon: total.lon / geoTagged.length,
  };
}

export function buildFallbackWorkshopZoneGeometry(
  sceneData: SpatialScene | null,
  zones: Zone[],
  anchor: WorkshopMapAnchor,
): StudioFeatureCollection<Record<string, unknown>> | null {
  if (!sceneData) return null;
  const zoneMap = new globalThis.Map<string, Zone>(zones.map((zone) => [zone.id, zone]));
  const hullsByZone = new globalThis.Map<string, SpatialScene['buildingHulls'][number][]>();
  sceneData.buildingHulls
    .filter((hull) => hull.zoneId && hull.footprint.length >= 3)
    .forEach((hull) => {
      const zoneId = hull.zoneId as string;
      const group = hullsByZone.get(zoneId) ?? [];
      group.push(hull);
      hullsByZone.set(zoneId, group);
    });

  const features = Array.from(hullsByZone.entries()).map(([zoneId, hulls], index) => {
    const hull = [...hulls].sort((a, b) => polygonAreaInMeters(b.footprint) - polygonAreaInMeters(a.footprint))[0];
    const ring = closePolygonRing(hull.footprint.map((point) => localPointToLngLat(point.x, point.z, anchor)));
    const zone = zoneMap.get(zoneId);
    return {
      type: 'Feature' as const,
      id: index,
      properties: {
        zoneId,
        name: zone?.name ?? hull.label ?? zoneId,
        source: 'spatial_scene_fallback',
        sourceHullId: hull.id,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [ring],
      },
    };
  });

  return features.length > 0 ? { type: 'FeatureCollection', features } : null;
}

export function buildFallbackWorkshopCampusLocations(
  sceneData: SpatialScene | null,
  zones: Zone[],
  anchor: WorkshopMapAnchor,
): WorkshopCampusLocation[] {
  if (!sceneData) return [];
  const zoneMap = new globalThis.Map<string, Zone>(zones.map((zone) => [zone.id, zone]));
  const hullsByZone = new globalThis.Map<string, SpatialScene['buildingHulls'][number][]>();
  sceneData.buildingHulls
    .filter((hull) => hull.zoneId && hull.footprint.length >= 3)
    .forEach((hull) => {
      const zoneId = hull.zoneId as string;
      const group = hullsByZone.get(zoneId) ?? [];
      group.push(hull);
      hullsByZone.set(zoneId, group);
    });

  return Array.from(hullsByZone.entries()).map(([zoneId, hulls]) => {
    const hull = [...hulls].sort((a, b) => polygonAreaInMeters(b.footprint) - polygonAreaInMeters(a.footprint))[0];
    const center = polygonCenter(hull.footprint);
    const zone = zoneMap.get(zoneId);
    const [lon, lat] = localPointToLngLat(center.x, center.z, anchor);
    return {
      id: `fallback-location-${zoneId}`,
      zoneId,
      label: zone?.name ?? hull.label ?? zoneId,
      kind: inferCampusLocationKind(zone?.name ?? hull.label ?? zoneId, hull.historicalStatus),
      lat,
      lon,
      source: 'spatial_scene_fallback',
    };
  });
}

export function buildWorkshopCameraFrustumCollection(
  markers: WorkshopAssetMapMarker[],
): StudioFeatureCollection<{ title: string; bearing: number }> {
  return buildViewConeCollection(
    markers
      .filter((marker) => typeof marker.bearing === 'number')
      .map((marker) => ({
        id: marker.id,
        origin: { lat: marker.lat, lon: marker.lon },
        bearing: marker.bearing as number,
        properties: { title: marker.title, bearing: marker.bearing as number },
      })),
  );
}

export function findWorkshopZoneCentroid(
  geojson: StudioFeatureCollection<WorkshopZoneFeatureProperties>,
  selectedZoneId: string,
): [number, number] | null {
  const feature = geojson.features.find((item) => item.properties.zoneId === selectedZoneId);
  if (!feature) return null;
  return polygonCentroid(feature.geometry.coordinates[0]);
}

function localPointToLngLat(x: number, z: number, anchor: WorkshopMapAnchor): [number, number] {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = Math.max(111_320 * Math.cos((anchor.lat * Math.PI) / 180), 1);
  return [
    anchor.lon + (x / metersPerDegreeLon),
    anchor.lat - (z / metersPerDegreeLat),
  ];
}

function closePolygonRing(points: [number, number][]): [number, number][] {
  if (points.length === 0) return points;
  const [firstLon, firstLat] = points[0];
  const [lastLon, lastLat] = points[points.length - 1];
  if (firstLon === lastLon && firstLat === lastLat) return points;
  return [...points, points[0]];
}

function polygonCenter(points: Array<{ x: number; z: number }>): { x: number; z: number } {
  const total = points.reduce((acc, point) => {
    acc.x += point.x;
    acc.z += point.z;
    return acc;
  }, { x: 0, z: 0 });
  return {
    x: total.x / points.length,
    z: total.z / points.length,
  };
}

function polygonAreaInMeters(points: Array<{ x: number; z: number }>): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.z - next.x * current.z;
  }
  return Math.abs(area / 2);
}

function inferCampusLocationKind(
  label: string,
  historicalStatus?: SpatialScene['buildingHulls'][number]['historicalStatus'],
): WorkshopCampusLocation['kind'] {
  const normalized = label.toLowerCase();
  if (historicalStatus === 'planned_not_built') return 'plannedPavilion';
  if (normalized.includes('parkdeck')) return 'parkingDeck';
  if (normalized.includes('parking')) return 'parkingArea';
  if (normalized.includes('visitor')) return 'visitorParking';
  if (normalized.includes('kantine') || normalized.includes('canteen')) return 'canteen';
  return 'pavilion';
}
