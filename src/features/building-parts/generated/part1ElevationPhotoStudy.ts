export type ElevationPoint = {
  xM: number;
  zRelM: number;
};

export type ElevationWindowMarker = {
  id: string;
  label: string;
  elementId: string;
  xCenterM: number;
  widthM: number;
  sillZRelM: number;
  headZRelM: number;
  confidence: 'estimated_photo_study';
};

export type ElevationLine = {
  id: string;
  label: string;
  kind: 'eaves' | 'ridge' | 'roof_slope' | 'floor' | 'cellar' | 'wall';
  points: ElevationPoint[];
};

export type ElevationSurface = {
  id: string;
  label: string;
  kind: 'roof' | 'wall' | 'cellar' | 'attic';
  points: ElevationPoint[];
};

export type ElevationReferenceTarget = {
  id: string;
  label: string;
  task: 'laser_distance_reference';
  targetDescription: string;
  useForViews: string[];
  record: string[];
};

export type ElevationDimension =
  | {
      id: string;
      label: string;
      orientation: 'horizontal';
      x1M: number;
      x2M: number;
      zRelM: number;
      witnessZRelM?: number;
    }
  | {
      id: string;
      label: string;
      orientation: 'vertical';
      xM: number;
      z1RelM: number;
      z2RelM: number;
      witnessXM?: number;
    };

export type ElevationStudyView = {
  id: string;
  label: string;
  type: 'side_elevation' | 'gable_elevation' | 'longitudinal_section';
  status: 'estimated_photo_study';
  widthM: number;
  zMinRelM: number;
  zMaxRelM: number;
  terrain: ElevationPoint[];
  buildingOutline: ElevationPoint[];
  detailLines?: ElevationLine[];
  detailSurfaces?: ElevationSurface[];
  levelLines: Array<{
    id: string;
    label: string;
    zRelM: number;
  }>;
  dimensions?: ElevationDimension[];
  windowMarkers: ElevationWindowMarker[];
  notes: string[];
};

export const part1ElevationPhotoStudy = {
  id: 'part1-elevation-photo-study-v1',
  status: 'estimated_photo_study',
  purpose:
    'Photo-first elevation and section study for Part 1. Used to verify rough window heights, floor levels and terrain relation from photos before LiDAR point-cloud work.',
  referenceDatum: {
    label: 'LoD2 hull base',
    zM: 517.64,
  },
  assumptions: [
    'All vertical values are relative to the LoD2 hull base unless explicitly marked absolute.',
    'Ground-floor finished floor is provisionally aligned to the east-side entrance terrain at 519.21 m.',
    'Nominal storey height is 2.40 m.',
    'Window heights are verification markers for photos, not measured window inventory.',
    'Terrain lines are simplified from existing DGM/cross-section context and must be checked visually on site.',
  ],
  views: [
    {
      id: 'part1-east-side-photo-elevation',
      label: 'Ansicht Ost: Hauptkörper mit Wintergarten-/Flur-Anschluss',
      type: 'side_elevation',
      status: 'estimated_photo_study',
      widthM: 24.08,
      zMinRelM: -1.8,
      zMaxRelM: 10.1,
      terrain: [
        { xM: 0, zRelM: 0.1 },
        { xM: 7, zRelM: 0.55 },
        { xM: 16.88, zRelM: 1.57 },
        { xM: 24.08, zRelM: 1.85 },
      ],
      buildingOutline: [
        { xM: 0, zRelM: 0 },
        { xM: 16.88, zRelM: 0 },
        { xM: 16.88, zRelM: 5.48 },
        { xM: 14.95, zRelM: 5.48 },
        { xM: 8.44, zRelM: 9.39 },
        { xM: 1.95, zRelM: 5.48 },
        { xM: 0, zRelM: 5.48 },
      ],
      detailSurfaces: [
        {
          id: 'east-wall-field',
          label: 'Ostwand Hauptkörper',
          kind: 'wall',
          points: [
            { xM: 0, zRelM: 0 },
            { xM: 16.88, zRelM: 0 },
            { xM: 16.88, zRelM: 5.48 },
            { xM: 0, zRelM: 5.48 },
          ],
        },
        {
          id: 'east-roof-visible-plane',
          label: 'sichtbare Dachfläche / Traufe zu First',
          kind: 'roof',
          points: [
            { xM: 1.95, zRelM: 5.48 },
            { xM: 14.95, zRelM: 5.48 },
            { xM: 8.44, zRelM: 9.39 },
          ],
        },
      ],
      detailLines: [
        {
          id: 'east-eaves-line',
          label: 'Trauflinie',
          kind: 'eaves',
          points: [
            { xM: 0, zRelM: 5.48 },
            { xM: 16.88, zRelM: 5.48 },
          ],
        },
        {
          id: 'east-ridge-point-line',
          label: 'Firstprojektion',
          kind: 'ridge',
          points: [
            { xM: 8.44, zRelM: 5.48 },
            { xM: 8.44, zRelM: 9.39 },
          ],
        },
        {
          id: 'east-left-roof-slope',
          label: 'Dachneigung links',
          kind: 'roof_slope',
          points: [
            { xM: 1.95, zRelM: 5.48 },
            { xM: 8.44, zRelM: 9.39 },
          ],
        },
        {
          id: 'east-right-roof-slope',
          label: 'Dachneigung rechts',
          kind: 'roof_slope',
          points: [
            { xM: 8.44, zRelM: 9.39 },
            { xM: 14.95, zRelM: 5.48 },
          ],
        },
      ],
      levelLines: [
        { id: 'level-eg', label: 'EG 519.21', zRelM: 1.57 },
        { id: 'level-dg', label: 'DG 521.61', zRelM: 3.97 },
        { id: 'level-first', label: 'First 527.03', zRelM: 9.39 },
      ],
      dimensions: [
        {
          id: 'dim-east-total-axis',
          label: 'Gesamt Hauptachse Part 1: 24.08 m',
          orientation: 'horizontal',
          x1M: 0,
          x2M: 24.08,
          zRelM: -0.75,
          witnessZRelM: 0,
        },
        {
          id: 'dim-east-r1-main',
          label: 'Hauptkörper R1: 16.88 m',
          orientation: 'horizontal',
          x1M: 0,
          x2M: 16.88,
          zRelM: -1.18,
          witnessZRelM: 0,
        },
        {
          id: 'dim-east-wintergarten',
          label: 'Wintergarten: 4.37 m',
          orientation: 'horizontal',
          x1M: 16.88,
          x2M: 21.25,
          zRelM: -1.52,
          witnessZRelM: 0,
        },
        {
          id: 'dim-east-flur',
          label: 'Flur: 2.83 m',
          orientation: 'horizontal',
          x1M: 21.25,
          x2M: 24.08,
          zRelM: -1.52,
          witnessZRelM: 0,
        },
        {
          id: 'dim-east-ridge',
          label: 'First über LoD2-Basis: 9.39 m',
          orientation: 'vertical',
          xM: 25.05,
          z1RelM: 0,
          z2RelM: 9.39,
          witnessXM: 16.88,
        },
        {
          id: 'dim-east-eaves',
          label: 'Traufe: 5.48 m',
          orientation: 'vertical',
          xM: 24.38,
          z1RelM: 0,
          z2RelM: 5.48,
          witnessXM: 16.88,
        },
        {
          id: 'dim-east-storey',
          label: 'EG bis DG: 2.40 m',
          orientation: 'vertical',
          xM: -0.78,
          z1RelM: 1.57,
          z2RelM: 3.97,
          witnessXM: 0,
        },
      ],
      windowMarkers: [
        {
          id: 'east-eg-window-a',
          label: 'EG Fensterhöhe A',
          elementId: 'part1-erdgeschoss',
          xCenterM: 5.2,
          widthM: 1.1,
          sillZRelM: 2.42,
          headZRelM: 3.67,
          confidence: 'estimated_photo_study',
        },
        {
          id: 'east-eg-window-b',
          label: 'EG Fensterhöhe B',
          elementId: 'part1-erdgeschoss',
          xCenterM: 11.6,
          widthM: 1.1,
          sillZRelM: 2.42,
          headZRelM: 3.67,
          confidence: 'estimated_photo_study',
        },
        {
          id: 'east-dg-window-a',
          label: 'DG/Attic Fensterhöhe',
          elementId: 'part1-dachgeschoss-attic',
          xCenterM: 8.4,
          widthM: 0.9,
          sillZRelM: 4.55,
          headZRelM: 5.25,
          confidence: 'estimated_photo_study',
        },
      ],
      notes: [
        'Primary side elevation: use this for photos around the EG entrance left of the Wintergarten.',
        'Dimension chain separates confirmed R1 main body length from provisional Wintergarten and Flur axis lengths.',
        'Terrain-to-hull-base delta remains visible and must be verified from threshold measurement.',
      ],
    },
    {
      id: 'part1-gable-photo-elevation',
      label: 'Ansicht Giebel: Hauptkörperbreite und Dachprofil',
      type: 'gable_elevation',
      status: 'estimated_photo_study',
      widthM: 8.08,
      zMinRelM: -1.6,
      zMaxRelM: 10.1,
      terrain: [
        { xM: 0, zRelM: 0.95 },
        { xM: 4.04, zRelM: 1.25 },
        { xM: 8.08, zRelM: 1.57 },
      ],
      buildingOutline: [
        { xM: 0, zRelM: 0 },
        { xM: 8.08, zRelM: 0 },
        { xM: 8.08, zRelM: 5.32 },
        { xM: 4.04, zRelM: 9.39 },
        { xM: 0, zRelM: 5.32 },
      ],
      levelLines: [
        { id: 'level-eg', label: 'EG 519.21', zRelM: 1.57 },
        { id: 'level-dg', label: 'DG 521.61', zRelM: 3.97 },
        { id: 'level-first', label: 'First 527.03', zRelM: 9.39 },
      ],
      dimensions: [
        {
          id: 'dim-gable-width',
          label: 'Hauptkörperbreite: 8.08 m',
          orientation: 'horizontal',
          x1M: 0,
          x2M: 8.08,
          zRelM: -0.75,
          witnessZRelM: 0,
        },
        {
          id: 'dim-gable-half-left',
          label: 'halbe Spannweite: 4.04 m',
          orientation: 'horizontal',
          x1M: 0,
          x2M: 4.04,
          zRelM: -1.18,
          witnessZRelM: 0,
        },
        {
          id: 'dim-gable-half-right',
          label: 'halbe Spannweite: 4.04 m',
          orientation: 'horizontal',
          x1M: 4.04,
          x2M: 8.08,
          zRelM: -1.18,
          witnessZRelM: 0,
        },
        {
          id: 'dim-gable-eaves',
          label: 'Giebel-Traufe: 5.32 m',
          orientation: 'vertical',
          xM: 8.82,
          z1RelM: 0,
          z2RelM: 5.32,
          witnessXM: 8.08,
        },
        {
          id: 'dim-gable-ridge',
          label: 'First: 9.39 m',
          orientation: 'vertical',
          xM: 9.45,
          z1RelM: 0,
          z2RelM: 9.39,
          witnessXM: 8.08,
        },
        {
          id: 'dim-gable-roof-rise',
          label: 'Dachanstieg: 4.07 m',
          orientation: 'vertical',
          xM: -0.72,
          z1RelM: 5.32,
          z2RelM: 9.39,
          witnessXM: 0,
        },
      ],
      windowMarkers: [
        {
          id: 'gable-eg-window',
          label: 'EG Giebelfenster',
          elementId: 'part1-erdgeschoss',
          xCenterM: 4.04,
          widthM: 1.05,
          sillZRelM: 2.42,
          headZRelM: 3.67,
          confidence: 'estimated_photo_study',
        },
        {
          id: 'gable-dg-window',
          label: 'DG Giebelfenster',
          elementId: 'part1-dachgeschoss-attic',
          xCenterM: 4.04,
          widthM: 0.95,
          sillZRelM: 4.55,
          headZRelM: 5.35,
          confidence: 'estimated_photo_study',
        },
      ],
      notes: [
        'Use this side elevation to verify the 8.08 m Hauptkörper width, ridge center and roof symmetry.',
        'Window markers are deliberately approximate and should be corrected from photo evidence.',
      ],
    },
    {
      id: 'part1-longitudinal-section',
      label: 'Referenzschnitt: Hauptgebäuderichtung mit Kellerlage',
      type: 'longitudinal_section',
      status: 'estimated_photo_study',
      widthM: 16.88,
      zMinRelM: -1.8,
      zMaxRelM: 10.1,
      terrain: [
        { xM: 0, zRelM: 0.1 },
        { xM: 7, zRelM: 0.55 },
        { xM: 16.88, zRelM: 1.57 },
      ],
      buildingOutline: [
        { xM: 0, zRelM: -0.3 },
        { xM: 7, zRelM: -0.3 },
        { xM: 7, zRelM: 0 },
        { xM: 16.88, zRelM: 0 },
        { xM: 16.88, zRelM: 5.48 },
        { xM: 14.95, zRelM: 5.48 },
        { xM: 8.44, zRelM: 9.39 },
        { xM: 1.95, zRelM: 5.48 },
        { xM: 0, zRelM: 5.48 },
      ],
      detailSurfaces: [
        {
          id: 'section-cellar-vault-zone',
          label: 'Kellergewölbe ca. 7 m',
          kind: 'cellar',
          points: [
            { xM: 0, zRelM: -0.3 },
            { xM: 7, zRelM: -0.3 },
            { xM: 7, zRelM: 1.1 },
            { xM: 0, zRelM: 1.1 },
          ],
        },
        {
          id: 'section-eg-zone',
          label: 'EG Zone',
          kind: 'wall',
          points: [
            { xM: 0, zRelM: 1.57 },
            { xM: 16.88, zRelM: 1.57 },
            { xM: 16.88, zRelM: 3.97 },
            { xM: 0, zRelM: 3.97 },
          ],
        },
        {
          id: 'section-dg-zone',
          label: 'DG Zone',
          kind: 'attic',
          points: [
            { xM: 0, zRelM: 3.97 },
            { xM: 16.88, zRelM: 3.97 },
            { xM: 16.88, zRelM: 5.48 },
            { xM: 0, zRelM: 5.48 },
          ],
        },
        {
          id: 'section-roof-volume',
          label: 'Dachraum',
          kind: 'roof',
          points: [
            { xM: 1.95, zRelM: 5.48 },
            { xM: 14.95, zRelM: 5.48 },
            { xM: 8.44, zRelM: 9.39 },
          ],
        },
      ],
      detailLines: [
        {
          id: 'section-cellar-vault-axis',
          label: 'Gewölbeachse ca. 7 m',
          kind: 'cellar',
          points: [
            { xM: 0, zRelM: 0.65 },
            { xM: 7, zRelM: 0.65 },
          ],
        },
        {
          id: 'section-eg-dg-separator',
          label: 'Decke EG / Boden DG',
          kind: 'floor',
          points: [
            { xM: 0, zRelM: 3.97 },
            { xM: 16.88, zRelM: 3.97 },
          ],
        },
        {
          id: 'section-eaves-line',
          label: 'Traufe',
          kind: 'eaves',
          points: [
            { xM: 0, zRelM: 5.48 },
            { xM: 16.88, zRelM: 5.48 },
          ],
        },
        {
          id: 'section-left-roof-plane',
          label: 'Dachfläche A',
          kind: 'roof_slope',
          points: [
            { xM: 1.95, zRelM: 5.48 },
            { xM: 8.44, zRelM: 9.39 },
          ],
        },
        {
          id: 'section-right-roof-plane',
          label: 'Dachfläche B',
          kind: 'roof_slope',
          points: [
            { xM: 8.44, zRelM: 9.39 },
            { xM: 14.95, zRelM: 5.48 },
          ],
        },
      ],
      levelLines: [
        { id: 'level-keller', label: 'Keller -0.30', zRelM: -0.3 },
        { id: 'level-eg', label: 'EG 519.21', zRelM: 1.57 },
        { id: 'level-dg', label: 'DG 521.61', zRelM: 3.97 },
        { id: 'level-attic', label: 'Attic 524.01', zRelM: 6.37 },
        { id: 'level-first', label: 'First 527.03', zRelM: 9.39 },
      ],
      dimensions: [
        {
          id: 'dim-section-r1-length',
          label: 'Hauptkörper R1: 16.88 m',
          orientation: 'horizontal',
          x1M: 0,
          x2M: 16.88,
          zRelM: -0.75,
          witnessZRelM: 0,
        },
        {
          id: 'dim-section-cellar-length',
          label: 'Kellergewölbe: ca. 7.00 m',
          orientation: 'horizontal',
          x1M: 0,
          x2M: 7,
          zRelM: -1.18,
          witnessZRelM: -0.3,
        },
        {
          id: 'dim-section-cellar-drop',
          label: 'Kellerboden: -0.30 m',
          orientation: 'vertical',
          xM: -0.72,
          z1RelM: -0.3,
          z2RelM: 0,
          witnessXM: 0,
        },
        {
          id: 'dim-section-eg-dg',
          label: 'Geschosshöhe: 2.40 m',
          orientation: 'vertical',
          xM: 17.55,
          z1RelM: 1.57,
          z2RelM: 3.97,
          witnessXM: 16.88,
        },
        {
          id: 'dim-section-attic-volume',
          label: 'Dachraum über Attic: 3.02 m',
          orientation: 'vertical',
          xM: 18.18,
          z1RelM: 6.37,
          z2RelM: 9.39,
          witnessXM: 16.88,
        },
      ],
      windowMarkers: [],
      notes: [
        'This remains a reference cut, not the main deliverable; use it to check vertical assumptions against photos.',
        'It separates cellar, EG, DG, roof volume, eaves and two roof planes for site-visit verification.',
      ],
    },
  ] satisfies ElevationStudyView[],
  referenceTargets: [
    {
      id: 'rp-eg-entrance-left-wintergarten',
      label: 'Task 2A: EG entrance reference',
      task: 'laser_distance_reference',
      targetDescription:
        'Aim at the lower outside corner of the EG entrance threshold left of the Wintergarten, where the vertical door reveal meets the horizontal threshold. Do not aim at the handle, glass, gutter or temporary trim.',
      useForViews: ['part1-east-side-photo-elevation'],
      record: [
        'laser distance from camera position to target',
        'camera height above local ground if easy',
        'whether target is left or right threshold corner in the photo',
        'one overview photo and one close-up showing the target',
      ],
    },
    {
      id: 'rp-r1-southernmost-plinth-corner',
      label: 'Task 2B: southern R1 plinth corner',
      task: 'laser_distance_reference',
      targetDescription:
        'Aim at the hard masonry arris at the southernmost visible corner of the R1 main body, as low as possible on the plinth but above loose soil or vegetation. This is the corner used to anchor the Keller location.',
      useForViews: ['part1-gable-photo-elevation', 'part1-longitudinal-section'],
      record: [
        'laser distance from camera position to target',
        'photo showing the full corner from ground contact to eaves if possible',
        'note if vegetation or render damage hides the true corner',
        'approximate ground-to-threshold relation if visible',
      ],
    },
    {
      id: 'rp-flur-wintergarten-junction',
      label: 'Task 2C: Flur/Wintergarten junction',
      task: 'laser_distance_reference',
      targetDescription:
        'Aim at the exterior lower corner where the tiny Flur volume visually meets the Wintergarten volume. Use the fixed wall/plinth junction, not a movable door leaf or gutter part.',
      useForViews: ['part1-east-side-photo-elevation'],
      record: [
        'laser distance from camera position to target',
        'photo framing both Flur and Wintergarten',
        'confirm whether the three Flur door relationships are visible or hidden',
      ],
    },
  ] satisfies ElevationReferenceTarget[],
} as const;
