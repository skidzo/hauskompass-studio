export type Confidence = 'measured' | 'documented' | 'generated' | 'estimated' | 'unknown';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type BuildingFact = {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  source: string;
  confidence: Confidence;
  last_updated: string;
  evidence_links: string[];
};

export type PlanningAssumption = {
  id: string;
  statement: string;
  why_it_matters: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  affected_decisions: string[];
  required_verification: string;
  status: 'open' | 'needs_site_check' | 'verified' | 'rejected' | 'superseded';
};

export type MeasurementNeed = {
  id: string;
  description: string;
  location_or_component: string;
  reason: string;
  priority: Priority;
  suggested_method: string;
  blocks_decisions: string[];
};

export type PlanningDecision = {
  id: string;
  decision_title: string;
  current_status: 'not_started' | 'blocked' | 'under_review' | 'ready_for_expert' | 'decided' | 'deferred';
  options: string[];
  dependencies: string[];
  risks: string[];
  evidence_links: string[];
  next_action: string;
};

export type PlanningRisk = {
  id: string;
  description: string;
  category: 'moisture' | 'structure' | 'energy' | 'pv' | 'cost' | 'schedule' | 'privacy' | 'data_quality' | 'deconstruction' | 'other';
  likelihood: 'low' | 'medium' | 'high' | 'unknown';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  related_assumptions: string[];
  related_decisions: string[];
};

export type PlanningEvidenceItem = {
  id: string;
  title: string;
  type: 'document' | 'photo' | 'generated_model' | 'ifc' | 'terrain' | 'schema' | 'manual_note' | 'site_check' | 'other';
  path_or_reference: string;
  derived_from: string[];
  reliability_notes: string;
};

export type PlanningArtifact = {
  id: string;
  label: string;
  path: string;
  kind: string;
  status: string;
};

export type RenovationPlanningData = {
  projectStatus: {
    label: string;
    phase: string;
    privacyMode: string;
    latestGeneratedState: string;
    statusNotes: string[];
  };
  artifacts: PlanningArtifact[];
  buildingFacts: BuildingFact[];
  assumptions: PlanningAssumption[];
  measurementNeeds: MeasurementNeed[];
  renovationDecisions: PlanningDecision[];
  risks: PlanningRisk[];
  evidenceItems: PlanningEvidenceItem[];
  nextImplementationTasks: string[];
};

export type AgenticReasoningSnapshot = {
  facts: string[];
  assumptions: string[];
  risks: string[];
  missingInformation: string[];
  suggestedNextActions: string[];
};
