import type { MapPoint } from '@/lib/studio-core/spatial-reference/types';

export type LngLatCoordinates = [number, number];

export interface StudioPolygonGeometry {
  type: 'Polygon';
  coordinates: LngLatCoordinates[][];
}

export interface StudioMapFeature<TProperties extends object = Record<string, unknown>> {
  type: 'Feature';
  id?: string | number;
  properties: TProperties;
  geometry: StudioPolygonGeometry;
}

export interface StudioFeatureCollection<TProperties extends object = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: StudioMapFeature<TProperties>[];
}

export interface ViewConeSpec<TProperties extends object = Record<string, unknown>> {
  id: string;
  origin: MapPoint;
  bearing: number;
  halfFovDegrees?: number;
  lengthMeters?: number;
  properties: TProperties;
}
