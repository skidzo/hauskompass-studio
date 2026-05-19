import { describe, expect, it } from 'vitest';
import {
  parseLocalAssessmentPackage,
  summarizeLocalAssessmentPackage,
  validateLocalAssessmentPackage,
} from '../src/features/renovation-planning/localAssessmentPackages';

const validPackage = {
  packageVersion: '1',
  packageId: 'local-assessment-example-001',
  createdAt: '2026-05-16',
  privacy: {
    classification: 'local_only_private_assessment',
    storageNote: 'Stored in ignored private files.',
    commitPolicy: 'Do not commit exact address data.',
  },
  subject: {
    label: 'Private campus assessment',
    kind: 'campus',
    description: 'Address-agnostic test package.',
    assessmentImplication: 'Use ensemble/campus assessment mode.',
  },
  planningRegisters: {
    buildingFacts: [
      {
        id: 'fact-campus-kind',
        label: 'Assessment typology',
        value: 'Protected campus ensemble',
        unit: 'typology',
        source: 'public source register',
        confidence: 'documented',
        last_updated: '2026-05-16',
        evidence_links: ['local-package#source-1'],
      },
    ],
    assumptions: [],
    measurementNeeds: [],
    renovationDecisions: [],
  },
  publicFacts: [
    {
      id: 'public-fact-1',
      label: 'Public identity',
      value: 'Public source identifies a campus ensemble.',
      confidence: 'documented',
      source_ids: ['source-1'],
    },
  ],
  highPriorityUnknowns: ['Current condition is unknown.'],
  sources: [
    {
      id: 'source-1',
      title: 'Public source register item',
      accessed: '2026-05-16',
      source_type: 'public_reference',
    },
  ],
};

describe('local assessment packages', () => {
  it('validates and summarizes an address-agnostic package', () => {
    expect(validateLocalAssessmentPackage(validPackage)).toEqual([]);
    const result = parseLocalAssessmentPackage(JSON.stringify(validPackage));
    expect(result.errors).toEqual([]);
    expect(result.importResult).not.toBeNull();
    expect(summarizeLocalAssessmentPackage(result.importResult!).registerCount).toBe(1);
    expect(summarizeLocalAssessmentPackage(result.importResult!).kind).toBe('campus');
  });

  it('rejects invalid package registers', () => {
    const invalid = {
      ...validPackage,
      planningRegisters: {
        buildingFacts: [{ id: 'bad-fact' }],
      },
    };
    expect(validateLocalAssessmentPackage(invalid)).toContain('planningRegisters.buildingFacts[0]: label is required');
  });

  it('warns when a package contains exact-location shaped fields', () => {
    const withPrivateLocation = {
      ...validPackage,
      privateContext: {
        address: 'Exact address kept in private file',
        latitude: 48,
      },
    };
    const result = parseLocalAssessmentPackage(JSON.stringify(withPrivateLocation));
    expect(result.importResult?.warnings[0]).toContain('Package contains exact-location shaped fields');
  });
});

