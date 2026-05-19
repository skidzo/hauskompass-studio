import type { DataConfidence } from './DataConfidence';
import type { EvidenceRef } from './EvidenceItem';

export type RoofSurface = {
  id: string;
  label?: string;
  geometryRef?: string;
  areaM2?: number;
  pitchDeg?: number;
  azimuthDeg?: number;
  classification: 'main-roof' | 'extension-roof' | 'dormer' | 'unknown-roof';
  solarSuitability?: 'poor' | 'limited' | 'good' | 'excellent' | 'unknown';
  renovationRelevance: Array<
    | 'pv'
    | 'insulation'
    | 'snow-load'
    | 'snow-slide'
    | 'summer-heat'
    | 'north-east-wind'
    | 'rain-protection'
    | 'roof-extension'
    | 'visual-authenticity'
    | 'needs-manual-check'
  >;
  evidence: EvidenceRef[];
  confidence: DataConfidence;
};
