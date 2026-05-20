import type { MediaOriginKind } from '@/lib/studio-core/media/types';
import type {
  MapPoint,
  OrientationConfidence,
  PlanPoint,
  PlacementConfidence,
  SpatialReferenceSource,
  ViewDirectionLabel,
} from '@/lib/studio-core/spatial-reference/types';

export type RenovationPhotoImportSource = MediaOriginKind;
export type PhotoPlacementSource = SpatialReferenceSource;
export type PhotoPlacementConfidence = PlacementConfidence;
export type PhotoOrientationConfidence = OrientationConfidence;
export type HistoricalDateConfidence = 'exact' | 'estimated' | 'rough' | 'unknown';
export type HistoricalShownState = 'before' | 'during' | 'after' | 'unknown';
export type HistoricalDecisionUsefulness = 'high' | 'medium' | 'low' | 'unknown';
export type RenovationPhotoEvidenceKind = 'observation' | 'question';
export type HiddenInfrastructureStatus = 'visible' | 'historical_photo_only' | 'inferred' | 'unknown';
export type { ViewDirectionLabel };
export type RenovationMapPoint = MapPoint;
export type RenovationPlanPoint = PlanPoint;

export interface RenovationPhotoRecord {
  id: string;
  projectSlug: string;
  assetType: 'photo';
  title: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  capturedAt?: string;
  sourceDeviceLabel?: string;
  importSource: RenovationPhotoImportSource;
  isHistorical: boolean;
  exifGpsLat?: number;
  exifGpsLon?: number;
  exifBearing?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoPlacement {
  photoPlacementId: string;
  assetId: string;
  projectSlug: string;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  buildingElementId?: string;
  surfaceId?: string;
  mapPoint?: RenovationMapPoint;
  planPoint?: RenovationPlanPoint;
  viewDirectionDegrees?: number;
  viewDirectionLabel?: ViewDirectionLabel;
  placementSource: PhotoPlacementSource;
  placementConfidence: PhotoPlacementConfidence;
  orientationConfidence: PhotoOrientationConfidence;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalPhotoMetadata {
  assetId: string;
  isHistorical: boolean;
  estimatedDate?: string;
  exactDateKnown: boolean;
  dateConfidence: HistoricalDateConfidence;
  shownState: HistoricalShownState;
  whatIsVisible: string;
  whatMayHaveChanged?: string;
  sourceDescription?: string;
  decisionUsefulness: HistoricalDecisionUsefulness;
  relatedUtilityLineIds: string[];
  relatedBuildingElementIds: string[];
  relatedInspectionPointIds: string[];
  notes?: string;
}

export interface RenovationPhotoEvidenceNote {
  id: string;
  assetId: string;
  projectSlug: string;
  kind: RenovationPhotoEvidenceKind;
  text: string;
  createdAt: string;
  placementLinked: boolean;
  relatedToHiddenInfrastructure: boolean;
  hiddenInfrastructureStatus: HiddenInfrastructureStatus;
}

export interface RenovationPhotoPlacementState {
  projectSlug: string;
  photos: RenovationPhotoRecord[];
  placements: PhotoPlacement[];
  historicalMetadata: HistoricalPhotoMetadata[];
  evidenceNotes: RenovationPhotoEvidenceNote[];
}
