import { describe, expect, it } from 'vitest';
import {
  buildShowcaseDecisions,
  buildShowcaseMetrics,
  buildShowcaseReasoningLines,
  buildShowcaseRegisterColumns,
} from '../src/features/showcase/showcasePlanningMapper';

describe('showcase planning mapper', () => {
  it('maps selected planning facts into showcase metrics', () => {
    const metrics = buildShowcaseMetrics();

    expect(metrics).toHaveLength(5);
    expect(metrics.map((metric) => metric.label)).toContain('Part 1 main body length');
    expect(metrics.find((metric) => metric.label === 'Part 1 main body length')?.badge.label).toBe('Generated');
  });

  it('builds facts, assumptions and site-check columns from planning data', () => {
    const columns = buildShowcaseRegisterColumns();

    expect(columns.map((column) => column.title)).toEqual(['Known facts', 'Open assumptions', 'Needed site checks']);
    expect(columns.every((column) => column.items.length > 0)).toBe(true);
  });

  it('maps decisions with dependency, risk and next-action context', () => {
    const decisions = buildShowcaseDecisions();

    expect(decisions).toHaveLength(4);
    expect(decisions[0].title).toContain('roof insulation');
    expect(decisions[0].nextStep.length).toBeGreaterThan(10);
    expect(decisions[0].uncertainty.length).toBeGreaterThan(10);
  });

  it('keeps the reasoning output in the required five-part structure', () => {
    const lines = buildShowcaseReasoningLines();

    expect(lines.map((line) => line.heading)).toEqual([
      'Facts',
      'Assumptions',
      'Risks',
      'Missing information',
      'Suggested next actions',
    ]);
  });
});
