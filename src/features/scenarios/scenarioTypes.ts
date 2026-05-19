export type ScenarioStatus = 'draft' | 'review' | 'accepted' | 'rejected';
export type ScenarioAssessmentKind =
  | 'envelope-risk'
  | 'solar-pv'
  | 'material-reuse'
  | 'inspection-readiness'
  | 'geometry-quality'
  | 'other';
export type InterventionKind =
  | 'roof-geometry'
  | 'drainage'
  | 'opening-strategy'
  | 'pv-layout'
  | 'envelope-repair'
  | 'site-water-management'
  | 'other';
export type GeometryOperation = 'add' | 'replace' | 'hide' | 'heal' | 'annotate';

export type ScenarioAssessmentRef = {
  id: string;
  kind: ScenarioAssessmentKind;
  label: string;
  sourceIds: string[];
  confidence: 'low' | 'medium' | 'high';
};

export type GeometryEdit = {
  id: string;
  targetType: 'roof' | 'wall' | 'terrain' | 'opening' | 'composite';
  operation: GeometryOperation;
  targetRefs: string[];
  generatedElementNames: string[];
  note: string;
};

export type InterventionPackage = {
  id: string;
  kind: InterventionKind;
  label: string;
  description: string;
  parameterSet: Record<string, string | number | boolean>;
  geometryEdits: GeometryEdit[];
  affects: Array<{
    baselineElementId: string;
    category: 'roof' | 'wall' | 'opening' | 'site' | 'other';
  }>;
  confidence: 'low' | 'medium' | 'high';
  active: boolean;
};

export type AssumptionItem = {
  id: string;
  text: string;
  impact: 'low' | 'medium' | 'high';
  status: 'open' | 'accepted' | 'rejected';
};

export type OutputArtifactRef = {
  id: string;
  kind: 'decision-matrix' | 'site-visit-checklist' | 'pv-summary' | 'reuse-summary' | 'geometry-change-log';
  label: string;
};

export type ScenarioModel = {
  id: string;
  label: string;
  status: ScenarioStatus;
  basedOn: 'baseline' | string;
  summary: string;
  interventions: InterventionPackage[];
  assessments: ScenarioAssessmentRef[];
  outputs: OutputArtifactRef[];
  assumptions: AssumptionItem[];
};

export type ScenarioRegistry = {
  generatedAt: string;
  projectLabel: string;
  baselineScenarioId: string;
  activeScenarioId: string;
  scenarios: ScenarioModel[];
};
