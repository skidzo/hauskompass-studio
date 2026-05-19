import { describe, expect, it } from 'vitest';
import {
  rankMatchCandidates,
  requiresHumanReview,
  summarizeEvidenceQuality,
  type EvidenceReport,
  type MatchCandidate,
} from '../src/domain/EvidenceInspection';

const syntheticCandidateA: MatchCandidate = {
  id: 'candidate-wall-a',
  buildingElementEvidenceId: 'element-wall-01',
  documentEvidenceId: 'document-boq-01',
  score: 0.91,
  reasons: ['element type and material align'],
  conflicts: [],
  reviewState: 'suggested',
};

const syntheticCandidateB: MatchCandidate = {
  id: 'candidate-wall-b',
  buildingElementEvidenceId: 'element-wall-02',
  documentEvidenceId: 'document-boq-01',
  score: 0.72,
  reasons: ['element type aligns'],
  conflicts: ['quantity differs from model evidence'],
  reviewState: 'uncertain',
};

const syntheticReport: EvidenceReport = {
  id: 'synthetic-evidence-report-01',
  label: 'Synthetic wall evidence report',
  sourceRefs: [
    {
      id: 'source-ifc-synthetic',
      label: 'Synthetic IFC metadata fixture',
      sourceType: 'ifc-metadata',
      reliability: 'medium',
    },
    {
      id: 'source-boq-synthetic',
      label: 'Synthetic BoQ fixture',
      sourceType: 'boq',
      reliability: 'medium',
    },
  ],
  buildingElementEvidence: [
    {
      id: 'element-wall-01',
      stableElementId: 'synthetic-wall-01',
      label: 'Synthetic concrete wall',
      elementType: 'wall',
      material: 'concrete',
      quantity: { value: 12, unit: 'm2' },
      sourceRefs: ['source-ifc-synthetic'],
      quality: {
        confidence: 'medium',
        flags: [],
        explanation: 'Synthetic benchmark element with complete metadata.',
      },
    },
  ],
  documentEvidence: [
    {
      id: 'document-boq-01',
      label: 'Synthetic wall BoQ line',
      documentType: 'boq',
      describedElementType: 'wall',
      describedMaterial: 'concrete',
      describedQuantity: { value: 11.5, unit: 'm2' },
      sourceRefs: ['source-boq-synthetic'],
      quality: {
        confidence: 'medium',
        flags: ['quantity-mismatch'],
        explanation: 'Synthetic benchmark line with intentional quantity difference.',
      },
    },
  ],
  matchCandidates: [syntheticCandidateB, syntheticCandidateA],
  findings: [],
  recommendedActions: [],
};

describe('evidence inspection model', () => {
  it('ranks match candidates deterministically by score', () => {
    expect(rankMatchCandidates([syntheticCandidateB, syntheticCandidateA]).map((candidate) => candidate.id)).toEqual([
      'candidate-wall-a',
      'candidate-wall-b',
    ]);
  });

  it('keeps uncertain or conflicting matches in human review', () => {
    expect(requiresHumanReview(syntheticCandidateA)).toBe(false);
    expect(requiresHumanReview(syntheticCandidateB)).toBe(true);
  });

  it('summarizes evidence quality without claiming match accuracy', () => {
    expect(summarizeEvidenceQuality(syntheticReport)).toEqual({
      evidenceItems: 2,
      matchCandidates: 2,
      reviewRequired: 1,
      flags: [{ flag: 'quantity-mismatch', count: 1 }],
    });
  });
});
