import type { ScenarioModel } from '@/features/scenarios/scenarioTypes';

export const baselineScenarioData = {
  id: 'baseline',
  label: 'Baseline Existing State',
  status: 'accepted',
  basedOn: 'baseline',
  summary: 'Confirmed LoD2 building state, terrain context, and evidence-derived assessment baseline without active intervention geometry.',
  interventions: [],
  assessments: [
    {
      id: 'baseline-envelope-risk',
      kind: 'envelope-risk',
      label: 'Baseline envelope interpretation',
      sourceIds: ['assessmentDerivedData', 'fetchedGeodataSummary'],
      confidence: 'medium',
    },
    {
      id: 'baseline-inspection-readiness',
      kind: 'inspection-readiness',
      label: 'Missing measurements and readiness',
      sourceIds: ['fetchedGeodataSummary', 'measurementTasks'],
      confidence: 'medium',
    },
  ],
  outputs: [
    {
      id: 'next-site-visit-checklist',
      kind: 'site-visit-checklist',
      label: 'Next site visit TODOs',
    },
  ],
  assumptions: [
    {
      id: 'baseline-lod2-geometry',
      text: 'Baseline geometry remains evidence-grade LoD2 and may still contain source simplifications or minor surface artifacts.',
      impact: 'medium',
      status: 'accepted',
    },
  ],
} as const satisfies ScenarioModel;
