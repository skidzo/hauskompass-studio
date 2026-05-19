import type { DataConfidence } from './DataConfidence';

export type EvidenceSourceRef = {
  id: string;
  label: string;
  sourceType:
    | 'ifc-metadata'
    | 'document'
    | 'boq'
    | 'manual-note'
    | 'photo'
    | 'measurement'
    | 'expert-assessment'
    | 'other';
  pathOrReference?: string;
  capturedAt?: string;
  reliability: DataConfidence;
  notes?: string;
};

export type EvidenceQualityFlag =
  | 'missing-source'
  | 'estimated-value'
  | 'ambiguous-identity'
  | 'quantity-mismatch'
  | 'material-mismatch'
  | 'stale-source'
  | 'needs-expert-review';

export type EvidenceQuality = {
  confidence: DataConfidence;
  flags: EvidenceQualityFlag[];
  explanation: string;
};

export type BuildingElementEvidence = {
  id: string;
  stableElementId?: string;
  label: string;
  elementType: string;
  material?: string;
  quantity?: {
    value: number;
    unit: string;
  };
  sourceRefs: string[];
  quality: EvidenceQuality;
};

export type DocumentEvidence = {
  id: string;
  label: string;
  documentType: 'boq' | 'offer' | 'report' | 'expert-note' | 'manual-note' | 'other';
  extractedText?: string;
  describedElementType?: string;
  describedMaterial?: string;
  describedQuantity?: {
    value: number;
    unit: string;
  };
  sourceRefs: string[];
  quality: EvidenceQuality;
};

export type ReviewState = 'suggested' | 'accepted' | 'rejected' | 'uncertain' | 'needs-expert-review';

export type MatchCandidate = {
  id: string;
  buildingElementEvidenceId: string;
  documentEvidenceId: string;
  score: number;
  reasons: string[];
  conflicts: string[];
  reviewState: ReviewState;
};

export type EvidenceFinding = {
  id: string;
  label: string;
  severity: 'info' | 'warning' | 'critical';
  relatedEvidenceIds: string[];
  description: string;
  recommendedActionId?: string;
};

export type RecommendedAction = {
  id: string;
  label: string;
  actionType: 'inspect' | 'measure' | 'ask-expert' | 'request-document' | 'update-model' | 'other';
  rationale: string;
};

export type EvidenceReport = {
  id: string;
  label: string;
  sourceRefs: EvidenceSourceRef[];
  buildingElementEvidence: BuildingElementEvidence[];
  documentEvidence: DocumentEvidence[];
  matchCandidates: MatchCandidate[];
  findings: EvidenceFinding[];
  recommendedActions: RecommendedAction[];
};

export function requiresHumanReview(candidate: MatchCandidate) {
  return candidate.reviewState === 'uncertain'
    || candidate.reviewState === 'needs-expert-review'
    || candidate.conflicts.length > 0
    || candidate.score < 0.85;
}

export function rankMatchCandidates(candidates: MatchCandidate[]) {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
}

export function summarizeEvidenceQuality(report: EvidenceReport) {
  const qualityItems = [
    ...report.buildingElementEvidence.map((item) => item.quality),
    ...report.documentEvidence.map((item) => item.quality),
  ];
  const flags = new Map<EvidenceQualityFlag, number>();
  for (const quality of qualityItems) {
    for (const flag of quality.flags) {
      flags.set(flag, (flags.get(flag) ?? 0) + 1);
    }
  }
  const reviewRequired = report.matchCandidates.filter(requiresHumanReview).length;
  return {
    evidenceItems: qualityItems.length,
    matchCandidates: report.matchCandidates.length,
    reviewRequired,
    flags: [...flags.entries()].map(([flag, count]) => ({ flag, count })),
  };
}

