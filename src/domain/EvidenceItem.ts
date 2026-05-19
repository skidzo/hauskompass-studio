import type { DataConfidence } from './DataConfidence';

export type EvidenceSourceType =
  | 'public-geodata'
  | 'manual-measurement'
  | 'photo'
  | 'scan'
  | 'expert-assessment'
  | 'assumption'
  | 'derived';

export type EvidenceRef = {
  id: string;
  sourceType: EvidenceSourceType;
  label: string;
  capturedAt?: string;
  url?: string;
  fileRef?: string;
  confidence: DataConfidence;
  notes?: string;
};

export type EvidenceItem = {
  id: string;
  type: 'photo' | 'measurement' | 'note' | 'scan' | 'document' | 'geodata' | 'expert-assessment' | 'assumption';
  label: string;
  capturedAt?: string;
  createdAt: string;
  fileRef?: string;
  url?: string;
  relatedBuildingPart?: string;
  relatedSurfaceId?: string;
  reliability: DataConfidence;
  tags: string[];
  notes?: string;
};
