export type ProjectType = 'assessment' | 'workshop' | 'hybrid' | 'reference';

export type ProjectCharacter =
    | 'single_building'
    | 'small_cluster'
    | 'campus'
    | 'settlement'
    | 'district_fragment'
    | 'socially_relevant_workshop_project';

export type ProjectScale = 'small' | 'medium' | 'large' | 'very_large';

export type ProjectComplexity = 'low' | 'medium' | 'high' | 'very_high';

export type WorkshopMode = 'none' | 'light' | 'full';

export type SingleProjectMode = 'none' | 'light' | 'full';

export type SpatialModelAvailability =
    | 'none'
    | 'map_only'
    | 'terrain'
    | 'building_hulls'
    | 'ifc'
    | 'mixed';

export interface ProjectCharacterProfile {
    projectType: ProjectType;
    projectCharacter: ProjectCharacter;
    projectScale: ProjectScale;
    siteComplexity: ProjectComplexity;
    stakeholderComplexity: ProjectComplexity;
    workshopMode: WorkshopMode;
    singleProjectMode: SingleProjectMode;
    spatialModelAvailability: SpatialModelAvailability;
}
