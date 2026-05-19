import type { DataConfidence } from './DataConfidence';
import type { EvidenceRef } from './EvidenceItem';
import type { Polygon2D } from './Geometry';
import type { RoofSurface } from './RoofSurface';
import type { WallSurface } from './WallSurface';

export type BuildingPart = {
  id: string;
  label: string;
  type: 'main-volume' | 'extension' | 'dormer' | 'cellar' | 'unknown';
  confidence: DataConfidence;
};

export type ManualCorrection = {
  id: string;
  targetId: string;
  targetType: 'building-hull' | 'roof-surface' | 'wall-surface' | 'terrain' | 'data-inventory';
  correctionType: 'geometry' | 'classification' | 'measurement' | 'orientation' | 'area' | 'confidence' | 'note';
  before?: unknown;
  after: unknown;
  reason: string;
  evidence: EvidenceRef[];
  createdAt: string;
};

export type BuildingHull = {
  id: string;
  projectId: string;
  source: 'lod2' | 'manual' | 'hybrid' | 'mock';
  coordinateReferenceSystem?: string;
  footprint?: Polygon2D;
  roofSurfaces: RoofSurface[];
  wallSurfaces: WallSurface[];
  buildingParts: BuildingPart[];
  surroundingContext: {
    buildingsLoaded: boolean;
    terrainLoaded: boolean;
    vegetationLoaded: boolean;
  };
  evidence: EvidenceRef[];
  confidence: DataConfidence;
  manualCorrections: ManualCorrection[];
};
