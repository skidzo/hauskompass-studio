import { describe, expect, it } from 'vitest';
import {
  buildAgenticReasoningSnapshot,
  getBlockedDecisions,
  getHighPriorityMeasurementNeeds,
  getOpenAssumptions,
  renovationPlanningData,
  validatePlanningData,
} from '../src/features/renovation-planning/renovationPlanningSelectors';

describe('renovation planning selectors', () => {
  it('validates the committed planning seed', () => {
    expect(validatePlanningData(renovationPlanningData)).toEqual([]);
  });

  it('keeps assumptions separate from facts', () => {
    expect(renovationPlanningData.buildingFacts.some((fact) => fact.id === 'assumption-roof-build-up')).toBe(false);
    expect(getOpenAssumptions().some((assumption) => assumption.id === 'assumption-roof-build-up')).toBe(true);
  });

  it('identifies high-value measurements and blocked decisions', () => {
    expect(getHighPriorityMeasurementNeeds().map((need) => need.id)).toContain('need-roof-build-up');
    expect(getBlockedDecisions().map((decision) => decision.id)).toContain('decision-roof-insulation');
  });

  it('produces agentic reasoning sections', () => {
    const snapshot = buildAgenticReasoningSnapshot();
    expect(snapshot.facts.length).toBeGreaterThan(0);
    expect(snapshot.assumptions.length).toBeGreaterThan(0);
    expect(snapshot.risks.length).toBeGreaterThan(0);
    expect(snapshot.missingInformation.length).toBeGreaterThan(0);
    expect(snapshot.suggestedNextActions.length).toBeGreaterThan(0);
  });
});
