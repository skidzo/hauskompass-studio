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

export function buildWorkshopZoneFeatureCollection(
  zones: Zone[],
  selectedZoneId: string | null,
  zoneGeometry: StudioFeatureCollection<Record<string, unknown>> | null,
): StudioFeatureCollection<WorkshopZoneFeatureProperties> {
  const zoneMap = new globalThis.Map<string, Zone>(zones.map((zone) => [zone.id, zone]));
  const features = (zoneGeometry?.features ?? [])
    .filter((feature) => typeof feature.properties.zoneId === 'string')
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
