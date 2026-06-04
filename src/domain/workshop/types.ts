/**
 * Domain types for the Workshop Assessment System.
 *
 * These types model the full evidence chain from spatial observation
 * to workshop-ready curated scenes, including sensitivity and
 * publication status for every relevant object.
 *
 * Evidence flow:
 *   Place/Zone → Asset → Observation → Interpretation → Claim → Question
 *   → Assessment → Scenario → WorkshopScene → Export
 */

import type { DataConfidence } from '../DataConfidence';
import type { ProjectCharacterProfile } from '../project/projectCharacter';

// ---------------------------------------------------------------------------
// Sensitivity & Publication
// ---------------------------------------------------------------------------

// SensitivityLevel is mode-neutral — defined in studio-core, re-exported here
// so all existing workshop imports remain unchanged.
import type { SensitivityLevel } from '@/lib/studio-core/media/types';
export type { SensitivityLevel } from '@/lib/studio-core/media/types';

export type PublicationStatus =
    | 'publishable'           // cleared for public use
    | 'needs_review'          // review before publishing
    | 'anonymize_before_use'  // remove personal parts first
    | 'internal_only'         // no public release planned
    | 'do_not_publish';       // explicitly blocked

// ---------------------------------------------------------------------------
// Epistemic type — what kind of knowledge claim is this?
// ---------------------------------------------------------------------------

export type EpistemicType =
    | 'verified_fact'    // confirmed by reliable source
    | 'observation'      // directly observed, described
    | 'interpretation'   // derived from observations
    | 'memory'           // personal recollection or eyewitness account
    | 'hypothesis'       // plausible but unverified assumption
    | 'disputed_claim'   // contested, has counter-arguments
    | 'open_question';   // not yet resolved

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export type ProjectMode = 'active' | 'archived' | 'reference';

export interface WorkshopProject {
    id: string;
    slug: string;
    title: string;
    description: string;
    siteId: string;
    projectMode: ProjectMode;
    createdAt: string;
    updatedAt: string;
    version: string;
    responsibleParty?: string;
    sensitivityDefault: SensitivityLevel;
    publicationDefault: PublicationStatus;
    characterProfile?: ProjectCharacterProfile;
}

// ---------------------------------------------------------------------------
// Site
// ---------------------------------------------------------------------------

export interface Site {
    id: string;
    projectId: string;
    name: string;
    shortDescription: string;
    address?: string;
    geocode?: { lat: number; lon: number };
    historicalSummary?: string;
    currentAccess: 'open' | 'restricted' | 'closed' | 'unknown';
    heritageStatus?: string;
    externalRefs?: { label: string; url: string }[];
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
}

// ---------------------------------------------------------------------------
// Zone
// ---------------------------------------------------------------------------

export type DocumentationPriority = 'critical' | 'high' | 'medium' | 'low';
export type DocumentationStatus = 'not_started' | 'partial' | 'complete';

export interface Zone {
    id: string;
    siteId: string;
    name: string;
    description: string;
    spatialRef?: string;
    documentationPriority: DocumentationPriority;
    documentationStatus: DocumentationStatus;
    openQuestionIds: string[];
    linkedAssetIds: string[];
    linkedAssessmentIds: string[];
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Place
// ---------------------------------------------------------------------------

export type PlaceType =
    | 'entrance' | 'room' | 'corridor' | 'staircase' | 'facade'
    | 'level' | 'vegetation' | 'route' | 'threshold' | 'technical' | 'other';

export interface Place {
    id: string;
    zoneId: string;
    name: string;
    description?: string;
    placeType: PlaceType;
    linkedAssetIds: string[];
    geocode?: { lat: number; lon: number };
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
}

// ---------------------------------------------------------------------------
// Asset
// ---------------------------------------------------------------------------

export type AssetType =
    | 'photo' | 'video' | 'scan' | 'document' | 'audio'
    | 'model' | 'map' | 'sketch' | 'screenshot' | 'transcript' | 'other';

export type AssetQuality = 'excellent' | 'good' | 'acceptable' | 'poor';
export type ProcessingStatus = 'raw' | 'reviewed' | 'processed' | 'archived';
export type AssetSpatialAnchorType = 'viewpoint' | 'zone_reference' | 'path_reference' | 'overview';
export type AssetBearingConfidence = 'exif' | 'estimated' | 'verified';

export interface AssetDerivates {
    thumbnail?: string;
    preview?: string;
    transcript?: string;
    compressed?: string;
}

export interface Asset {
    id: string;                    // e.g. "A-000001"
    projectId: string;
    assetType: AssetType;
    title: string;
    description?: string;
    filePath?: string;             // relative path — raw file must not be modified
    fileName?: string;
    fileSize?: number;             // bytes
    mimeType?: string;
    capturedAt?: string;           // ISO 8601
    digitizedAt?: string;
    source?: string;
    zoneId?: string;
    placeId?: string;
    linkedEventIds?: string[];
    linkedPersonIds?: string[];
    derivates?: AssetDerivates;
    tags: string[];
    qualityRating?: AssetQuality;
    processingStatus: ProcessingStatus;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    /** GPS position extracted from EXIF — WGS-84 decimal degrees */
    gpsLat?: number;
    gpsLon?: number;
    /** Meters above sea level */
    gpsAlt?: number;
    /** Camera bearing in degrees clockwise from True North (0–360), from EXIF GPSImgDirection */
    gpsBearing?: number;
    /** 'T' = True North reference, 'M' = Magnetic North (from EXIF GPSImgDirectionRef) */
    gpsBearingRef?: 'T' | 'M';
    /** Horizontal GPS accuracy in meters (from EXIF GPSHPositioningError); smaller = more precise */
    gpsHAccuracyM?: number;
    /** Explicit spatial role of the asset within the workshop/site model. */
    spatialAnchorType?: AssetSpatialAnchorType;
    /** Zone the asset is looking at or describing, distinct from the capture location zone when needed. */
    targetZoneId?: string;
    /** Linked spatial object in 3D/scene context when known. */
    linkedSpatialObjectId?: string;
    /** Confidence/source of the stored bearing. */
    bearingConfidence?: AssetBearingConfidence;
    /** Short spatial note for orientation, access, facade side, or view direction. */
    spatialNotes?: string;
    /**
     * Storage mode for the raw file:
     * - 'blob'         (default) — full binary stored in IndexedDB assetBlobs table
     * - 'fs-reference' — file stays on the user's local filesystem; only metadata +
     *                    thumbnail are stored. Requires a linked FileSystemDirectoryHandle
     *                    saved in the folderHandles table.
     */
    storageMode?: 'blob' | 'fs-reference';
    /**
     * Relative path of the file within the linked folder handle.
     * Only set when storageMode === 'fs-reference'.
     * E.g. "Besprechungsraum/IMG_20260522_132437280.jpg"
     */
    localPath?: string;
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Observation
// ---------------------------------------------------------------------------

export interface Observation {
    id: string;
    projectId: string;
    text: string;
    observer?: string;
    observedAt?: string;
    zoneId?: string;
    placeId?: string;
    linkedAssetIds: string[];
    epistemic: Extract<EpistemicType, 'observation' | 'verified_fact'>;
    confidence: DataConfidence;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Interpretation
// ---------------------------------------------------------------------------

export interface Interpretation {
    id: string;
    projectId: string;
    zoneId?: string;
    text: string;
    basedOnObservationIds: string[];
    basedOnAssetIds?: string[];
    source?: string;
    confidence: DataConfidence;
    counterPositions?: string[];
    epistemic: Extract<EpistemicType, 'interpretation' | 'hypothesis'>;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------

export type ClaimType =
    | 'historical' | 'spatial' | 'ecological' | 'social'
    | 'technical' | 'organizational' | 'evaluative' | 'normative';

export type ReviewStatus =
    | 'unreviewed' | 'under_review' | 'confirmed' | 'rejected' | 'needs_revision';

export interface Claim {
    id: string;                    // e.g. "C-000001"
    projectId: string;
    statement: string;
    claimType: ClaimType;
    epistemic: EpistemicType;
    confidence: DataConfidence;
    sourceRefs: string[];          // Asset IDs or document references
    zoneId?: string;
    eventId?: string;
    reviewStatus: ReviewStatus;
    counterArguments?: string[];
    linkedQuestionIds?: string[];
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Question
// ---------------------------------------------------------------------------

export type QuestionType =
    | 'technical' | 'historical' | 'legal' | 'ecological'
    | 'social' | 'organizational' | 'aesthetic' | 'ethical' | 'other';

export type QuestionPriority = 'critical' | 'high' | 'medium' | 'low';

export type QuestionStatus =
    | 'open' | 'in_progress' | 'answered' | 'deferred' | 'out_of_scope';

export interface Question {
    id: string;                    // e.g. "Q-000001"
    projectId: string;
    text: string;
    questionType: QuestionType;
    priority: QuestionPriority;
    requiredExpertise?: string[];
    zoneId?: string;
    linkedClaimIds?: string[];
    nextCheckStep?: string;
    status: QuestionStatus;
    answer?: string;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type Citability =
    | 'freely_citable' | 'citable_with_context' | 'internal_only' | 'not_citable';

export type MemoryReleaseStatus = 'released' | 'pending_consent' | 'not_released';

export interface Memory {
    id: string;                    // e.g. "M-000001"
    projectId: string;
    title: string;
    summary: string;
    sourceOrPerson?: string;       // anonymise if sensitive
    roleDescription?: string;
    timePeriod?: string;
    linkedAssetIds?: string[];
    zoneId?: string;
    eventId?: string;
    themes: string[];
    citability: Citability;
    releaseStatus: MemoryReleaseStatus;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// EventPhase
// ---------------------------------------------------------------------------

export type PhaseType =
    | 'planning' | 'construction' | 'operation' | 'transition'
    | 'vacancy' | 'reuse' | 'workshop' | 'documentation' | 'other';

export interface EventPhase {
    id: string;                    // e.g. "E-ibm-hauptverwaltung"
    projectId: string;
    title: string;
    phaseType: PhaseType;
    startYear?: number;
    endYear?: number;
    description: string;
    linkedAssetIds?: string[];
    linkedClaimIds?: string[];
    sortOrder: number;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export type AssessmentCriterion =
    | 'spatial_relevance'
    | 'historical_value'
    | 'documentation_quality'
    | 'workshop_relevance'
    | 'transformation_potential'
    | 'ecological_relevance'
    | 'uncertainty'
    | 'publication_readiness'
    | 'decision_relevance'
    | 'memory_value';

export type AssessmentRating = 'high' | 'medium' | 'low' | 'unknown';

export interface AssessmentDimension {
    criterion: AssessmentCriterion;
    rating: AssessmentRating;
    rationale?: string;
    evidenceIds?: string[];
}

export type AssessmentSubjectType = 'zone' | 'place' | 'asset' | 'scenario';

export interface CampusAssessment {
    id: string;
    projectId: string;
    subjectId: string;
    subjectType: AssessmentSubjectType;
    dimensions: AssessmentDimension[];
    assessedBy?: string;
    assessedAt: string;
    notes?: string;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export type ScenarioStatus = 'draft' | 'ready' | 'in_use' | 'archived';

export interface Scenario {
    id: string;                    // e.g. "S-001"
    projectId: string;
    title: string;
    guidingQuestion: string;
    description: string;
    linkedZoneIds: string[];
    linkedAssetIds?: string[];
    linkedClaimIds?: string[];
    linkedQuestionIds?: string[];
    expectedDiscussion?: string;
    benefits?: string;
    risks?: string;
    status: ScenarioStatus;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// WorkshopScene
// ---------------------------------------------------------------------------

export type WorkshopSceneExportStatus = 'not_ready' | 'draft' | 'ready';
export type WorkshopSceneVisibility = 'internal' | 'public';

export interface WorkshopScene {
    id: string;
    projectId: string;
    scenarioId?: string;
    title: string;
    guidingQuestion: string;
    dramaturgy?: string;
    selectedAssetIds: string[];    // 3–8 assets
    selectedObservationIds?: string[];
    selectedClaimIds?: string[];
    selectedQuestionIds?: string[];
    contextText: string;
    observations: string[];
    interpretations: string[];
    openQuestions: string[];
    discussionPrompt: string;
    targetAudience?: string;
    exportStatus: WorkshopSceneExportStatus;
    visibility: WorkshopSceneVisibility;
    sortOrder?: number;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
    createdAt: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Convenience: full project data bundle (for in-memory / JSON loading)
// ---------------------------------------------------------------------------

export interface WorkshopProjectBundle {
    project: WorkshopProject;
    site: Site;
    zones: Zone[];
    places: Place[];
    assets: Asset[];
    observations: Observation[];
    interpretations: Interpretation[];
    claims: Claim[];
    questions: Question[];
    memories: Memory[];
    eventPhases: EventPhase[];
    assessments: CampusAssessment[];
    scenarios: Scenario[];
    workshopScenes: WorkshopScene[];
}
