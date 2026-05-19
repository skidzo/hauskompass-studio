export type DataConfidence = 'unknown' | 'low' | 'medium' | 'high';

export const confidenceLabel: Record<DataConfidence, string> = {
  unknown: 'Unknown',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
