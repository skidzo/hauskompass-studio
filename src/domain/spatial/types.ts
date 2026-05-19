export type SpatialConfidence =
    | 'rough'
    | 'inferred'
    | 'imported'
    | 'workshop_sketch'
    | 'measured'
    | 'verified';

export type GeometryVerificationStatus =
    | 'verified_geometry'
    | 'inferred_geometry'
    | 'placeholder_geometry'
    | 'unknown_geometry';

export type SpatialSourceKind =
    | 'manual_seed'
    | 'project_drawing'
    | 'web_reference'
    | 'osm'
    | 'lod2'
    | 'dgm'
    | 'gps'
    | 'workshop_observation'
    | 'derived';

export interface SpatialSource {
    id: string;
    label: string;
    kind: SpatialSourceKind;
    capturedAt?: string;
    note?: string;
}

export interface LocalPoint3 {
    x: number;
    y: number;
    z: number;
}

export interface SpatialBounds {
    min: LocalPoint3;
    max: LocalPoint3;
}

export interface TerrainModel {
    id: string;
    label: string;
    sourceId: string;
    confidence: SpatialConfidence;
    verificationStatus?: GeometryVerificationStatus;
    bounds: SpatialBounds;
    verticalExaggeration?: number;
    vertices: LocalPoint3[];
    faces: [number, number, number][];
}

export interface BuildingHullModel {
    id: string;
    label: string;
    zoneId?: string;
    groupId?: string;
    gmlId?: string;
    sourceId: string;
    confidence: SpatialConfidence;
    verificationStatus?: GeometryVerificationStatus;
    levelOfDetail: 'mass_model' | 'lod1' | 'lod2' | 'ifc' | 'workshop_sketch';
    footprint: LocalPoint3[];
    courtyard?: LocalPoint3[];
    baseElevation: number;
    height: number;
    role?: string;
    historicalStatus?: 'original_phase' | 'built_extension_after_original_phase' | 'planned_not_built' | 'unknown';
    modelingRule?: string;
}

export interface VegetationModel {
    id: string;
    label: string;
    zoneId?: string;
    sourceId: string;
    confidence: SpatialConfidence;
    verificationStatus?: GeometryVerificationStatus;
    kind: 'tree' | 'tree_group' | 'green_area' | 'succession_area' | 'marker';
    position: LocalPoint3;
    radius: number;
    height: number;
    countEstimate?: number;
}

export interface SpatialEvidenceLink {
    id: string;
    spatialObjectId: string;
    zoneId?: string;
    assetId?: string;
    observationId?: string;
    interpretationId?: string;
    workshopSceneId?: string;
    note?: string;
}

export interface SpatialScene {
    id: string;
    projectId: string;
    siteId: string;
    label: string;
    sources: SpatialSource[];
    terrain: TerrainModel[];
    buildingHulls: BuildingHullModel[];
    vegetation: VegetationModel[];
    evidenceLinks: SpatialEvidenceLink[];
}
