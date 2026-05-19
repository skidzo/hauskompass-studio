import type { DataConfidence } from './DataConfidence';
import type { EvidenceRef } from './EvidenceItem';

export type WallSurface = {
  id: string;
  label?: string;
  areaM2?: number;
  azimuthDeg?: number;
  exposure?: Array<'street-side' | 'north-east-wind' | 'solar-gain' | 'driving-rain' | 'adjacent-extension' | 'unknown'>;
  renovationRelevance: Array<'insulation' | 'windows' | 'moisture' | 'structural-opening' | 'facade' | 'needs-manual-check'>;
  evidence: EvidenceRef[];
  confidence: DataConfidence;
};
