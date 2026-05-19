export type FloorPlanPoint = {
  x: number;
  y: number;
};

export type FloorPlanArea = {
  id: string;
  elementId: string;
  label: string;
  role: string;
  fill: string;
  polygon: FloorPlanPoint[];
  labelPoint?: FloorPlanPoint;
  notes: string[];
};

export type FloorPlanDoorMetadata = {
  id: string;
  fromElementId: string;
  to: 'wintergarten' | 'garten' | 'scheune';
  label: string;
  drawInPlan: false;
  evidenceState: 'owner_specified_unmeasured';
  placementHint: string;
};

export type GroundFloorRectangle = {
  id: string;
  label: string;
  candidateElementId: string;
  confidence: 'medium' | 'owner_confirmed';
  polygon: FloorPlanPoint[];
  buildingAxisBoundsM: {
    longitudinalMin: number;
    longitudinalMax: number;
    transverseMin: number;
    transverseMax: number;
  };
  notes: string[];
};

export type BasementVaultCandidate = {
  id: string;
  elementId: string;
  label: string;
  confidence: 'owner_specified_schematic';
  dimensionsM: {
    lengthAlongMainAxis: number;
    widthAcrossMainAxis: number;
  };
  polygon: FloorPlanPoint[];
  labelPoint: FloorPlanPoint;
  placement: string;
  vaultDirection: string;
};

export type ExteriorWallEstimate = {
  id: string;
  elementId: string;
  label: string;
  status: 'estimated_from_footprint';
  thicknessM: number;
  appliesToLevelIds: string[];
  outerPolygon: FloorPlanPoint[];
  innerPolygon: FloorPlanPoint[];
  assumptions: string[];
};

export type VerticalCadSeed = {
  id: string;
  status: 'estimated_from_lod2_ridge_terrain_and_owner_input';
  sourceHeightsM: {
    lod2HullBaseZ: number;
    lod2RidgeZ: number;
    estimatedEastEntranceTerrainZ: number;
  };
  assumptions: {
    nominalStoreyHeightM: number;
    cellarBelowHullBaseM: number;
    groundFloorDatum: string;
  };
  levels: Array<{
    id: string;
    label: string;
    zM: number;
    reference: string;
  }>;
  derived: {
    ridgeAboveGroundFloorM: number;
    entranceTerrainAboveHullBaseM: number;
    roofVolumeAboveNominalAtticCeilingM: number;
  };
  siteVisitChecks: string[];
};

export const part1SchematicFloorPlan = {
  id: 'part1-schematic-floor-plan-v1',
  parentPartId: 'DEBY_LOD2_6944727',
  outerFootprintSourceSurfaceId:
    'DEBY_LOD2_6944727_eb31fe69-1812-4a2c-8962-db8a947c69ba',
  coordinateSystem:
    'local_meters_from_lod2_ground_surface_north_up_west_left_absolute_coordinates_removed',
  footprintDimensionsM: {
    widthEastWest: 17.88,
    depthNorthSouth: 22.23,
  },
  localBuildingAxes: {
    longitudinalBearingDeg: 26.1,
    transverseBearingDeg: 116.1,
    note:
      'Rectangle decomposition is derived in the rotated building-axis system, then projected back into the north-up plan view.',
  },
  outerFootprint: [
    { x: 14.72, y: 7.11 },
    { x: 10.04, y: 16.54 },
    { x: 11.18, y: 17.14 },
    { x: 10.34, y: 18.81 },
    { x: 9.18, y: 18.25 },
    { x: 7.23, y: 22.23 },
    { x: 0, y: 18.66 },
    { x: 7.25, y: 3.85 },
    { x: 7.52, y: 3.54 },
    { x: 12.17, y: 5.77 },
    { x: 14.39, y: 1.6 },
    { x: 15.22, y: 2.11 },
    { x: 16.66, y: 0 },
    { x: 17.67, y: 0.73 },
    { x: 16.19, y: 2.95 },
    { x: 17.88, y: 3.91 },
    { x: 15.87, y: 7.68 },
  ] satisfies FloorPlanPoint[],
  groundFloorRectangles: [
    {
      id: 'eg-rectangle-main-house',
      label: 'R1 Hauptkörper Erdgeschoss',
      candidateElementId: 'part1-erdgeschoss',
      confidence: 'owner_confirmed',
      polygon: [
        { x: 0, y: 18.66 },
        { x: 7.42, y: 3.49 },
        { x: 14.68, y: 7.05 },
        { x: 7.26, y: 22.21 },
      ],
      buildingAxisBoundsM: {
        longitudinalMin: 0,
        longitudinalMax: 16.88,
        transverseMin: 0,
        transverseMax: 8.08,
      },
      notes: [
        'Largest rectangle and structural main body candidate.',
        'Matches the long LoD2 footprint edges and should anchor the Erdgeschoss/Dachgeschoss relationship.',
      ],
    },
    {
      id: 'eg-rectangle-erker',
      label: 'R2 Erker-Kandidat',
      candidateElementId: 'part1-erker',
      confidence: 'owner_confirmed',
      polygon: [
        { x: 9.2, y: 18.25 },
        { x: 10.03, y: 16.54 },
        { x: 11.19, y: 17.11 },
        { x: 10.35, y: 18.81 },
      ],
      buildingAxisBoundsM: {
        longitudinalMin: 4.41,
        longitudinalMax: 6.31,
        transverseMin: 8.08,
        transverseMax: 9.37,
      },
      notes: [
        'Small attached footprint rectangle detected on the main body edge.',
        'Kept as Erker candidate pending exterior photo confirmation of the projecting footprint.',
      ],
    },
    {
      id: 'eg-rectangle-wintergarten',
      label: 'R3 Wintergarten-Kandidat',
      candidateElementId: 'part1-wintergarten',
      confidence: 'owner_confirmed',
      polygon: [
        { x: 12.15, y: 5.81 },
        { x: 14.07, y: 1.88 },
        { x: 17.88, y: 3.75 },
        { x: 15.95, y: 7.67 },
      ],
      buildingAxisBoundsM: {
        longitudinalMin: 16.88,
        longitudinalMax: 21.25,
        transverseMin: 5.26,
        transverseMax: 9.5,
      },
      notes: [
        'Attached rectangle between main body and the small Flur rectangle.',
        'Candidate for Wintergarten because it forms the larger buffer zone connected to the tiny transition part.',
      ],
    },
    {
      id: 'eg-rectangle-flur',
      label: 'R4 Flur-Kandidat',
      candidateElementId: 'part1-flur-zur-scheune',
      confidence: 'owner_confirmed',
      polygon: [
        { x: 15.08, y: 2.38 },
        { x: 16.33, y: -0.16 },
        { x: 17.79, y: 0.55 },
        { x: 16.55, y: 3.1 },
      ],
      buildingAxisBoundsM: {
        longitudinalMin: 21.25,
        longitudinalMax: 24.08,
        transverseMin: 6.39,
        transverseMax: 8.02,
      },
      notes: [
        'Smallest rectangle connected to the Wintergarten candidate.',
        'Candidate for Flur zur Scheune because it matches the owner-described tiny transition part.',
      ],
    },
  ] satisfies GroundFloorRectangle[],
  basementVault: {
    id: 'basement-vault-south-corner',
    elementId: 'part1-keller-suedost',
    label: 'Kellergewölbe südlichste Ecke',
    confidence: 'owner_specified_schematic',
    dimensionsM: {
      lengthAlongMainAxis: 7,
      widthAcrossMainAxis: 4,
    },
    polygon: [
      { x: 3.66, y: 20.45 },
      { x: 6.74, y: 14.16 },
      { x: 10.33, y: 15.92 },
      { x: 7.26, y: 22.21 },
    ],
    labelPoint: { x: 7, y: 18.18 },
    placement:
      'anchored at the southernmost corner of the main Part 1 footprint rectangle',
    vaultDirection:
      'barrel vault runs along the detected Part 1 main longitudinal axis',
  } satisfies BasementVaultCandidate,
  exteriorWallEstimate: {
    id: 'part1-main-house-exterior-wall-estimate',
    elementId: 'part1-erdgeschoss',
    label: 'Außenwand Hauptgebäude ca. 0.5 m',
    status: 'estimated_from_footprint',
    thicknessM: 0.5,
    appliesToLevelIds: ['part1-level-eg', 'part1-level-dg'],
    outerPolygon: [
      { x: 0, y: 18.66 },
      { x: 7.42, y: 3.49 },
      { x: 14.68, y: 7.05 },
      { x: 7.26, y: 22.21 },
    ],
    innerPolygon: [
      { x: 0.67, y: 18.43 },
      { x: 7.65, y: 4.16 },
      { x: 14.01, y: 7.28 },
      { x: 7.03, y: 21.54 },
    ],
    assumptions: [
      'Wall thickness is a planning estimate, not measured.',
      'Offset is applied in the detected building-axis coordinate system.',
      'Estimate applies only to the main house rectangle R1, not Erker, Wintergarten, Flur or Keller.',
      'Verify representative wall thickness at an existing opening during the first site visit.',
    ],
  } satisfies ExteriorWallEstimate,
  verticalCadSeed: {
    id: 'part1-vertical-cad-seed-v1',
    status: 'estimated_from_lod2_ridge_terrain_and_owner_input',
    sourceHeightsM: {
      lod2HullBaseZ: 517.64,
      lod2RidgeZ: 527.03,
      estimatedEastEntranceTerrainZ: 519.21,
    },
    assumptions: {
      nominalStoreyHeightM: 2.4,
      cellarBelowHullBaseM: 0.3,
      groundFloorDatum:
        'EG floor seed follows the estimated east-side entrance terrain near the Wintergarten, not the lower LoD2 hull base.',
    },
    levels: [
      {
        id: 'level-keller-floor',
        label: 'Keller Boden',
        zM: 517.34,
        reference: '0.30 m below LoD2 hull base by owner input',
      },
      {
        id: 'level-hull-base',
        label: 'LoD2 Hüllbasis',
        zM: 517.64,
        reference: 'LoD2 ground surface / current hull base',
      },
      {
        id: 'level-eg-entrance-floor',
        label: 'EG Eingang / Fertigboden geschätzt',
        zM: 519.21,
        reference: 'DGM/E-W terrain estimate at east-side entrance left of Wintergarten',
      },
      {
        id: 'level-dg-floor',
        label: 'Dachgeschoss Boden geschätzt',
        zM: 521.61,
        reference: 'EG estimated floor + 2.40 m nominal storey height',
      },
      {
        id: 'level-attic-nominal-ceiling',
        label: 'Attic nominale Oberkante',
        zM: 524.01,
        reference: 'DG estimated floor + 2.40 m nominal storey height',
      },
      {
        id: 'level-ridge',
        label: 'First',
        zM: 527.03,
        reference: 'maximum LoD2 roof point',
      },
    ],
    derived: {
      ridgeAboveGroundFloorM: 7.82,
      entranceTerrainAboveHullBaseM: 1.57,
      roofVolumeAboveNominalAtticCeilingM: 3.02,
    },
    siteVisitChecks: [
      'Confirm whether EG finished floor is close to the east-side entrance terrain or closer to the LoD2 hull base.',
      'Measure one threshold height at the EG entrance left of the Wintergarten.',
      'Confirm cellar floor is approximately 0.30 m below the LoD2 hull-base reference or document the actual step down.',
      'Confirm one vertical distance between EG floor and DG floor if accessible.',
      'Treat the 1.57 m terrain-to-hull-base delta as unresolved until site evidence confirms floor datum.',
    ],
  } satisfies VerticalCadSeed,
  status: 'owner_guided_schematic',
  note:
    'Three-level schematic floor plan for Part 1. The outside contour is derived from the LoD2 ground surface in local meters; the Erdgeschoss four-rectangle decomposition is owner-confirmed, the Kellergewölbe is owner-specified schematically, the main-house exterior wall is estimated at 0.5 m, and the vertical CAD seed uses nominal 2.4 m storeys.',
  levels: [
    {
      id: 'part1-level-keller',
      label: 'Keller',
      areas: [
        {
          id: 'plan-keller-gewoelbe',
          elementId: 'part1-keller-suedost',
          label: 'Kellergewölbe',
          role: 'south-corner vault approx 4 x 7 m',
          fill: '#36414f',
          polygon: [
            { x: 3.66, y: 20.45 },
            { x: 6.74, y: 14.16 },
            { x: 10.33, y: 15.92 },
            { x: 7.26, y: 22.21 },
          ],
          labelPoint: { x: 7, y: 18.18 },
          notes: [
            'Located at the southernmost corner of Part 1.',
            'Gewölbe runs in the detected main building direction.',
            'Approximate owner-specified size: 4 m x 7 m.',
          ],
        },
      ] satisfies FloorPlanArea[],
    },
    {
      id: 'part1-level-eg',
      label: 'Erdgeschoss',
      areas: [
        {
          id: 'plan-eg-flur-zur-scheune',
          elementId: 'part1-flur-zur-scheune',
          label: 'Flur zur Scheune',
          role: 'north-west tiny transition part',
          fill: '#2f6f73',
          polygon: [
            { x: 15.08, y: 2.38 },
            { x: 16.33, y: -0.16 },
            { x: 17.79, y: 0.55 },
            { x: 16.55, y: 3.1 },
          ],
          labelPoint: { x: 16.45, y: 1.45 },
          notes: [
            'Smallest north-west Part 1 sub-part.',
            'Connected to Wintergarten and used as transition toward garden and Scheune.',
          ],
        },
        {
          id: 'plan-eg-wintergarten',
          elementId: 'part1-wintergarten',
          label: 'Wintergarten',
          role: 'buffer space connected to Flur',
          fill: '#6f8f35',
          polygon: [
            { x: 12.15, y: 5.81 },
            { x: 14.07, y: 1.88 },
            { x: 17.88, y: 3.75 },
            { x: 15.95, y: 7.67 },
          ],
          labelPoint: { x: 15.25, y: 4.75 },
          notes: [
            'Clipped into the northern LoD2 footprint lobe and connected to the Flur.',
            'Boundary to main Erdgeschoss remains a future evidence target.',
          ],
        },
        {
          id: 'plan-eg-erdgeschoss-main',
          elementId: 'part1-erdgeschoss',
          label: 'Erdgeschoss Hauptgebäude',
          role: 'main ground-floor body',
          fill: '#b06d32',
          polygon: [
            { x: 0, y: 18.66 },
            { x: 7.42, y: 3.49 },
            { x: 14.68, y: 7.05 },
            { x: 7.26, y: 22.21 },
          ],
          labelPoint: { x: 7.4, y: 12.85 },
          notes: [
            'Main ground-floor hull body, excluding Erker, Wintergarten and Flur.',
            'Internal room layout is intentionally not specified yet.',
          ],
        },
        {
          id: 'plan-eg-erker',
          elementId: 'part1-erker',
          label: 'Erker',
          role: 'west-south projection',
          fill: '#9d4f70',
          polygon: [
            { x: 9.2, y: 18.25 },
            { x: 10.03, y: 16.54 },
            { x: 11.19, y: 17.11 },
            { x: 10.35, y: 18.81 },
          ],
          labelPoint: { x: 10.2, y: 17.7 },
          notes: [
            'Owner-corrected west-south projection.',
            'Expected to be clearly detectable from exterior photos and footprint corners.',
          ],
        },
      ] satisfies FloorPlanArea[],
    },
    {
      id: 'part1-level-dg',
      label: 'Dachgeschoss + Attic',
      areas: [
        {
          id: 'plan-dg-dachgeschoss-attic',
          elementId: 'part1-dachgeschoss-attic',
          label: 'Dachgeschoss + Attic Hauptgebäude',
          role: 'upper main-house roof volume',
          fill: '#7d4f43',
          polygon: [
            { x: 0, y: 18.66 },
            { x: 7.42, y: 3.49 },
            { x: 14.68, y: 7.05 },
            { x: 7.26, y: 22.21 },
          ],
          labelPoint: { x: 7.4, y: 12.85 },
          notes: [
            'Upper level fitted to the LoD2 Part 1 footprint outline.',
            'Erker roof, dormer and exact attic zones remain separate future detailing topics.',
          ],
        },
      ] satisfies FloorPlanArea[],
    },
  ],
  doorMetadata: [
    {
      id: 'door-meta-flur-wintergarten',
      fromElementId: 'part1-flur-zur-scheune',
      to: 'wintergarten',
      label: 'Flur to Wintergarten',
      drawInPlan: false,
      evidenceState: 'owner_specified_unmeasured',
      placementHint: 'between Flur and Wintergarten shared boundary',
    },
    {
      id: 'door-meta-flur-garten',
      fromElementId: 'part1-flur-zur-scheune',
      to: 'garten',
      label: 'Flur to Garten',
      drawInPlan: false,
      evidenceState: 'owner_specified_unmeasured',
      placementHint: 'external door from Flur to garden side',
    },
    {
      id: 'door-meta-flur-scheune',
      fromElementId: 'part1-flur-zur-scheune',
      to: 'scheune',
      label: 'Flur to Scheune',
      drawInPlan: false,
      evidenceState: 'owner_specified_unmeasured',
      placementHint: 'transition door from Flur toward Scheune / Part 2',
    },
  ] satisfies FloorPlanDoorMetadata[],
} as const;
