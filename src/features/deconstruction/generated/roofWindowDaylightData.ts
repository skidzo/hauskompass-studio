export const roofWindowDaylightData = {
  generatedAt: '2026-05-11',
  methodNote:
    'The roof-window study was exploratory only and is now intentionally parked. No roof-window layout is part of the current recommended stage package.',
  designDecision:
    'Roof windows are removed from the current concept. The attic daylight topic needs a later pass with better interior assumptions, reveal depth logic, and a clearer architectural intent.',
  chosenLayout: {
    side: 'deferred',
    windowCount: 0,
    nominalSizeM: 'deferred',
    heightZone: 'deferred',
    spacingRule: 'deferred',
    exclusionZone: 'deferred',
    positionsAlongRoofM: {},
  },
  chosenPerformance: {
    directSunPct: 0,
    diffuseSkyPct: 0,
    clearSpacingM: 0,
  },
  rationale: [
    'The attempted roof-window placements were not convincing enough architecturally or geometrically to keep in the active concept.',
    'A later daylight iteration should start from interior room use, section depth, reveal geometry, and intended view/light character instead of from roof-surface availability alone.',
    'The current stage package is stronger when focused on dormer geometry, roof overhangs, drainage, and envelope coherence.',
  ],
} as const;

export type RoofWindowDaylightData = typeof roofWindowDaylightData;
