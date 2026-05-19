import { describe, expect, it } from 'vitest';
import {
  createRegisterTemplate,
  mergeLocalPlanningRegisters,
  parseLocalRegisterImport,
  parseLocalRegisters,
  parseRegisterDraft,
  upsertLocalRegisterRecord,
  validateLocalRegisterRecord,
} from '../src/features/renovation-planning/localPlanningRegisters';
import {
  parseSiteVisitImportDraft,
  siteVisitTemplate,
  summarizeSiteVisitImport,
  validateSiteVisitImport,
} from '../src/features/renovation-planning/siteVisitImport';

describe('local planning registers', () => {
  it('parses missing localStorage state as empty registers', () => {
    expect(parseLocalRegisters(null).buildingFacts).toEqual([]);
  });

  it('validates and upserts a local fact draft', () => {
    const draft = JSON.stringify(createRegisterTemplate('buildingFacts'));
    const parsed = parseRegisterDraft('buildingFacts', draft);
    expect(parsed.errors).toEqual([]);
    expect(parsed.record).not.toBeNull();
    const registers = upsertLocalRegisterRecord(parseLocalRegisters(null), 'buildingFacts', parsed.record!);
    expect(registers.buildingFacts).toHaveLength(1);
  });

  it('rejects local records without required fields', () => {
    expect(validateLocalRegisterRecord('measurementNeeds', { id: 'bad' })).toContain('description is required');
  });

  it('imports and merges local register files', () => {
    const current = upsertLocalRegisterRecord(
      parseLocalRegisters(null),
      'buildingFacts',
      { ...createRegisterTemplate('buildingFacts'), id: 'existing-fact' },
    );
    const parsed = parseLocalRegisterImport(JSON.stringify({
      buildingFacts: [{ ...createRegisterTemplate('buildingFacts'), id: 'imported-fact' }],
      assumptions: [],
      measurementNeeds: [],
      renovationDecisions: [],
    }));
    expect(parsed.errors).toEqual([]);
    const merged = mergeLocalPlanningRegisters(current, parsed.registers!);
    expect(merged.buildingFacts.map((fact) => fact.id)).toEqual(['existing-fact', 'imported-fact']);
  });

  it('rejects invalid local register imports', () => {
    const parsed = parseLocalRegisterImport(JSON.stringify({ measurementNeeds: [{ id: 'bad' }] }));
    expect(parsed.registers).toBeNull();
    expect(parsed.errors).toContain('measurementNeeds[0]: description is required');
  });
});

describe('site visit import', () => {
  it('validates a realistic S-block import', () => {
    const importData = {
      ...siteVisitTemplate,
      blocks: [
        {
          ...siteVisitTemplate.blocks[0],
          laserMeasurements: [{ ...siteVisitTemplate.blocks[0].laserMeasurements[0], distanceM: 6.4 }],
        },
      ],
    };
    expect(validateSiteVisitImport(importData)).toEqual([]);
    expect(summarizeSiteVisitImport(importData).photoCount).toBe(1);
  });

  it('rejects missing laser distance metadata', () => {
    const parsed = parseSiteVisitImportDraft(JSON.stringify(siteVisitTemplate));
    expect(parsed.errors.some((error) => error.includes('distanceM must be > 0'))).toBe(true);
  });
});
