import type { MapPoint } from '@/lib/studio-core/spatial-reference/types';
import type { LngLatCoordinates, StudioFeatureCollection, StudioMapFeature, ViewConeSpec } from './types';

const METERS_PER_DEGREE = 111_320;
const DEG = Math.PI / 180;

export function toLngLat(point: MapPoint): LngLatCoordinates {
  return [point.lon, point.lat];
}

export function projectMapPoint(point: MapPoint, bearingDeg: number, distanceMeters: number): MapPoint {
  const brRad = bearingDeg * DEG;
  const dLat = distanceMeters * Math.cos(brRad) / METERS_PER_DEGREE;
  const dLon = distanceMeters * Math.sin(brRad) / (METERS_PER_DEGREE * Math.cos(point.lat * DEG));
  return {
    lat: +(point.lat + dLat).toFixed(8),
    lon: +(point.lon + dLon).toFixed(8),
  };
}

export function buildViewConeFeature<TProperties extends object>(
  spec: ViewConeSpec<TProperties>,
): StudioMapFeature<TProperties> {
  const halfFovDegrees = spec.halfFovDegrees ?? 30;
  const lengthMeters = spec.lengthMeters ?? 28;
  const origin = toLngLat(spec.origin);
  const leftEdge = toLngLat(projectMapPoint(spec.origin, (spec.bearing - halfFovDegrees + 360) % 360, lengthMeters));
  const rightEdge = toLngLat(projectMapPoint(spec.origin, (spec.bearing + halfFovDegrees) % 360, lengthMeters));
  return {
    type: 'Feature',
    id: spec.id,
    properties: spec.properties,
    geometry: {
      type: 'Polygon',
      coordinates: [[origin, leftEdge, rightEdge, origin]],
    },
  };
}

export function buildViewConeCollection<TProperties extends object>(
  specs: ViewConeSpec<TProperties>[],
): StudioFeatureCollection<TProperties> {
  return {
    type: 'FeatureCollection',
    features: specs.map((spec) => buildViewConeFeature(spec)),
  };
}

export function polygonCentroid(coordinates: LngLatCoordinates[]): LngLatCoordinates | null {
  if (coordinates.length < 4) return null;
  const closedRingLength = coordinates.length - 1;
  if (closedRingLength < 3) return null;
  const lon = coordinates.slice(0, closedRingLength).reduce((sum, coordinate) => sum + coordinate[0], 0) / closedRingLength;
  const lat = coordinates.slice(0, closedRingLength).reduce((sum, coordinate) => sum + coordinate[1], 0) / closedRingLength;
  return [lon, lat];
}
