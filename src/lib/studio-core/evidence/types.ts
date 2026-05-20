import type { PlacementConfidence } from '../spatial-reference/types';

export type SourceReferenceKind = 'asset' | 'document' | 'measurement' | 'note' | 'external_record' | 'unknown';

export interface SourceReference {
  kind: SourceReferenceKind;
  refId?: string;
  label?: string;
  confidence?: PlacementConfidence;
  capturedAt?: string;
  note?: string;
}

export type EvidenceTargetKind =
  | 'observation'
  | 'interpretation'
  | 'claim'
  | 'question'
  | 'risk'
  | 'decision'
  | 'scene'
  | 'other';

export type EvidenceRelation = 'documents' | 'supports' | 'questions' | 'locates' | 'summarizes';

export interface EvidenceLink {
  id: string;
  source: SourceReference;
  targetKind: EvidenceTargetKind;
  targetId: string;
  relation: EvidenceRelation;
}

export function hasResolvableSourceReference(reference: SourceReference): boolean {
  return Boolean(reference.refId?.trim() || reference.label?.trim());
}

export function isEvidenceLinkComplete(link: EvidenceLink): boolean {
  return Boolean(link.id.trim() && hasResolvableSourceReference(link.source) && link.targetId.trim());
}
