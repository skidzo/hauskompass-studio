export type PlacementConfidence = 'verified' | 'likely' | 'approximate' | 'uncertain' | 'unknown';

export type OrientationConfidence = 'verified' | 'likely' | 'approximate' | 'uncertain' | 'unknown';

export type SpatialReferenceSource =
  | 'exif'
  | 'manual'
  | 'inferred_from_context'
  | 'historical_note'
  | 'imported_from_other_device'
  | 'unknown';

export type ViewDirectionLabel =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest'
  | 'towards_door'
  | 'towards_window'
  | 'towards_stair'
  | 'along_wall'
  | 'across_room'
  | 'unknown';

export interface MapPoint {
  lat: number;
  lon: number;
}

export interface PlanPoint {
  x: number;
  y: number;
}

export interface SpatialReference {
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  buildingElementId?: string;
  surfaceId?: string;
  mapPoint?: MapPoint;
  planPoint?: PlanPoint;
  source: SpatialReferenceSource;
  confidence: PlacementConfidence;
  notes?: string;
}

export interface PhotoPlacementReference extends SpatialReference {
  viewDirectionDegrees?: number;
  viewDirectionLabel?: ViewDirectionLabel;
  orientationConfidence: OrientationConfidence;
}
