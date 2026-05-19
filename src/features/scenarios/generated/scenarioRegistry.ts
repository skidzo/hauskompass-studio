import { baselineScenarioData } from '@/features/scenarios/generated/baselineScenarioData';
import { roofEnvelopeScenarioData } from '@/features/scenarios/generated/roofEnvelopeScenarioData';
import type { ScenarioRegistry } from '@/features/scenarios/scenarioTypes';

export const scenarioRegistry = {
  generatedAt: '2026-05-11',
  projectLabel: 'House Renovation Baseline',
  baselineScenarioId: baselineScenarioData.id,
  activeScenarioId: roofEnvelopeScenarioData.id,
  scenarios: [baselineScenarioData, roofEnvelopeScenarioData],
} as const satisfies ScenarioRegistry;
