export type Priority = 'critical' | 'high' | 'medium';

export type ReuseStream = 'timber' | 'masonry' | 'finishes' | 'documentation';

export type ReuseOutcome = 'direct-reuse' | 'downcycle' | 'dispose' | 'tbd';

export const STREAM_LABELS: Record<ReuseStream, string> = {
  timber: 'Timber Reuse',
  masonry: 'Masonry Reuse',
  finishes: 'Finishes & Fixtures',
  documentation: 'Documentation',
};

export const STREAM_COLORS: Record<ReuseStream, string> = {
  timber: '#c8862a',
  masonry: '#8a7060',
  finishes: '#4a7a6a',
  documentation: '#4a6a8a',
};

export const OUTCOME_COLORS: Record<ReuseOutcome, string> = {
  'direct-reuse': '#4a9a5a',
  downcycle: '#e09b39',
  dispose: '#9a5a5a',
  tbd: '#555555',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: '#e05555',
  high: '#e09b39',
  medium: '#6aa8d4',
};
