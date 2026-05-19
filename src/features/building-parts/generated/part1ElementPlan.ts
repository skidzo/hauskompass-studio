export const part1Lod2SurfaceRefs = {
  ground: 'DEBY_LOD2_6944727_eb31fe69-1812-4a2c-8962-db8a947c69ba',
  roofEast: 'DEBY_LOD2_6944727_6a2817d6-e225-479d-b3a0-3a4a021a91a7',
  roofErker: 'DEBY_LOD2_6944727_cf053b99-23fd-4275-ada9-f70ba6e35a76',
  roofWest: 'DEBY_LOD2_6944727_8e3274ef-c03e-4de4-bea2-d879c4f19ddc',
  wallErkerNorthEast: 'DEBY_LOD2_6944727_4e5c2007-393b-4dc7-9291-39d4c6a2bbf6',
  wallEastMain: 'DEBY_LOD2_6944727_fdb11730-819e-4c77-8db6-c72d0411478d',
  wallTransitionUpper: 'DEBY_LOD2_6944727_6a36f4a8-3f0e-422b-b7dd-7dc8c65421bd',
  wallErkerNorthWest: 'DEBY_LOD2_6944727_84c10142-8089-4106-8d7e-8b4ce7f4e759',
  wallErkerSouthEast: 'DEBY_LOD2_6944727_15f19be6-5952-44b2-955a-e6dd97fd76e7',
  wallSouthEastLower: 'DEBY_LOD2_6944727_a2dea5bd-583d-4842-a880-59106e74b39d',
  wallSouthReturn: 'DEBY_LOD2_6944727_21ca80dd-6de6-4d7c-af95-923467de5e8c',
  wallWestUpper: 'DEBY_LOD2_6944727_241af0dd-ead3-41e2-a251-2e043bfb088a',
  wallErkerConnector: 'DEBY_LOD2_6944727_9022b5b1-162b-43af-9fc4-1b4f6b21cce9',
  wallSouthWestMain: 'DEBY_LOD2_6944727_2a9063cb-9c5d-4134-8aca-b2a08cf2145c',
  wallWestMain: 'DEBY_LOD2_6944727_05f4258b-f9cf-41c9-a606-2ba1df68c1d7',
  wallErkerOuterNorth: 'DEBY_LOD2_6944727_741ac71d-c617-4ece-9a0d-d33e928215ce',
  wallSouthEastSmall: 'DEBY_LOD2_6944727_f32a6094-5c19-4cd4-b61c-5d2532c68983',
  wallSouthEastReturn: 'DEBY_LOD2_6944727_774a2c2d-8c49-4ff9-9689-2f6296b666eb',
  wallUpperKink: 'DEBY_LOD2_6944727_2d740af0-619a-4ff3-972d-10974128068d',
  wallErkerInnerNorth: 'DEBY_LOD2_6944727_894976d5-283d-4e20-9346-ebd9a56c2dbe',
  wallErkerOuterEast: 'DEBY_LOD2_6944727_7e21207e-c05b-4847-9020-f070aff7d2ee',
} as const;

export const part1ElementPlan = {
  parentPartId: 'DEBY_LOD2_6944727',
  parentLabel: 'Part 1 Haupthaus',
  status: 'part1_identification_complete',
  note:
    'Parametric decomposition proposal for incrementally detailing Part 1 while keeping the overall assembly linked to the existing LoD2 hull and IFC model.',
  elements: [
    {
      id: 'part1-flur-zur-scheune',
      label: 'Flur zur Scheune',
      role: 'connection_zone',
      level: 'ground',
      order: 1,
      parameters: {
        parentPart: 'Part 1',
        adjacency: 'Part 2 transition',
        detailState: 'placeholder',
      },
      lod2Mapping: {
        confidence: 'medium',
        rationale:
          'Owner-corrected as the north-west-most tiny transition part, connected to the Wintergarten. The LoD2 model has no interior corridor split, so this maps to the transition wall cluster and shared Part 1 footprint.',
        surfaces: [
          {
            surfaceId: part1Lod2SurfaceRefs.ground,
            kind: 'ground',
            label: 'shared Part 1 footprint',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallTransitionUpper,
            kind: 'wall',
            label: 'candidate transition / gable wall',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallUpperKink,
            kind: 'wall',
            label: 'small transition kink',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallWestUpper,
            kind: 'wall',
            label: 'north-west transition wall candidate',
          },
        ],
      },
      openQuestions: ['exact boundary to Part 2', 'floor and threshold relationship', 'moisture and fire separation requirements'],
    },
    {
      id: 'part1-wintergarten',
      label: 'Wintergarten',
      role: 'buffer_space',
      level: 'ground',
      order: 2,
      parameters: {
        parentPart: 'Part 1',
        climateRole: 'solar buffer / seasonal use',
        detailState: 'placeholder',
      },
      lod2Mapping: {
        confidence: 'medium',
        rationale:
          'Owner-corrected as the buffer volume connected to the tiny north-west Flur. LoD2 separates this only as facade fragments, not as a room or glazed assembly.',
        surfaces: [
          {
            surfaceId: part1Lod2SurfaceRefs.ground,
            kind: 'ground',
            label: 'shared Part 1 footprint',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallEastMain,
            kind: 'wall',
            label: 'main facade segment adjacent to buffer zone',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerConnector,
            kind: 'wall',
            label: 'small connector facet near buffer zone',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerInnerNorth,
            kind: 'wall',
            label: 'inner buffer edge candidate',
          },
        ],
      },
      openQuestions: ['thermal separation', 'drainage at connection', 'future year-round use'],
    },
    {
      id: 'part1-erdgeschoss',
      label: 'Erdgeschoss',
      role: 'primary_floor',
      level: 'ground',
      order: 3,
      parameters: {
        parentPart: 'Part 1',
        occupancyRole: 'main usable floor',
        detailState: 'placeholder',
      },
      lod2Mapping: {
        confidence: 'high',
        rationale:
          'Primary lower volume of Part 1. LoD2 does not split floors, so the mapping uses the footprint plus the major lower facade surfaces excluding the Erker-specific cluster.',
        surfaces: [
          {
            surfaceId: part1Lod2SurfaceRefs.ground,
            kind: 'ground',
            label: 'Part 1 footprint',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallEastMain,
            kind: 'wall',
            label: 'large east facade',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthEastLower,
            kind: 'wall',
            label: 'south-east lower facade',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthEastSmall,
            kind: 'wall',
            label: 'small south-east facade facet',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthReturn,
            kind: 'wall',
            label: 'south return',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthWestMain,
            kind: 'wall',
            label: 'south-west main facade',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallWestMain,
            kind: 'wall',
            label: 'west main facade',
          },
        ],
      },
      openQuestions: ['room boundaries', 'wall thicknesses', 'openings and structural constraints'],
    },
    {
      id: 'part1-dachgeschoss-attic',
      label: 'Dachgeschoss + Attic',
      role: 'upper_roof_volume',
      level: 'upper',
      order: 4,
      parameters: {
        parentPart: 'Part 1',
        roofRelationship: 'main roof and dormer package',
        detailState: 'placeholder',
      },
      lod2Mapping: {
        confidence: 'high',
        rationale:
          'Upper occupied/attic volume is bounded by the two main pitched roof planes and the larger gable/upper wall faces. The dormer remains an intervention package, not LoD2 baseline.',
        surfaces: [
          {
            surfaceId: part1Lod2SurfaceRefs.roofEast,
            kind: 'roof',
            label: 'main east roof plane',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.roofWest,
            kind: 'roof',
            label: 'main west roof plane',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallTransitionUpper,
            kind: 'wall',
            label: 'upper transition / gable wall',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthWestMain,
            kind: 'wall',
            label: 'south-west gable / upper facade',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallWestUpper,
            kind: 'wall',
            label: 'west upper wall',
          },
        ],
      },
      openQuestions: ['standing height zones', 'roof build-up', 'daylight concept deferred'],
    },
    {
      id: 'part1-erker',
      label: 'Erker',
      role: 'projecting_volume',
      level: 'ground_to_upper',
      order: 5,
      parameters: {
        parentPart: 'Part 1',
        envelopeRole: 'projection / local roof surface',
        detailState: 'placeholder',
      },
      lod2Mapping: {
        confidence: 'high',
        rationale:
          'Owner-corrected as the clearly detectable west-south projection. The LoD2 baseline provides one separate roof plane and a compact cluster of small wall facets for this Erker volume.',
        surfaces: [
          {
            surfaceId: part1Lod2SurfaceRefs.roofErker,
            kind: 'roof',
            label: 'separate Erker roof plane',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerNorthEast,
            kind: 'wall',
            label: 'Erker wall facet A',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerNorthWest,
            kind: 'wall',
            label: 'Erker wall facet B',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerSouthEast,
            kind: 'wall',
            label: 'Erker wall facet C',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerOuterNorth,
            kind: 'wall',
            label: 'outer Erker wall facet',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerOuterEast,
            kind: 'wall',
            label: 'outer Erker facade facet',
          },
        ],
      },
      openQuestions: ['structural support', 'roof-water transition', 'thermal bridge risk'],
    },
  ],
  knownSubParts: [
    {
      id: 'part1-keller-suedost',
      label: 'Keller südlichste Ecke / Gewölbe',
      role: 'basement_access_zone',
      level: 'basement',
      parentElementId: 'part1-erdgeschoss',
      status: 'known_from_owner_input',
      lod2Mapping: {
        confidence: 'medium',
        rationale:
          'Owner input locates the cellar at the southernmost Part 1 corner. Its barrel vault runs in the detected main building direction and is approximately 4 m x 7 m. The LoD2 hull contains nearby facade facets but no basement shell or door/opening object, so this is a spatial anchor pending site evidence.',
        surfaces: [
          {
            surfaceId: part1Lod2SurfaceRefs.ground,
            kind: 'ground',
            label: 'southernmost part of shared footprint',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallEastMain,
            kind: 'wall',
            label: 'candidate access facade left of Erker',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallErkerConnector,
            kind: 'wall',
            label: 'facade connector next to Erker',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthEastLower,
            kind: 'wall',
            label: 'south-east corner facade',
          },
          {
            surfaceId: part1Lod2SurfaceRefs.wallSouthEastSmall,
            kind: 'wall',
            label: 'small south-east lower facet',
          },
        ],
      },
      evidenceNeeded: [
        'photo of cellar door from outside with orientation note',
        'rough door width and threshold height',
        'confirm cellar footprint approximately 4 m x 7 m and vault direction along the main building axis',
        'cellar wall thickness relation to Part 1 footprint',
        'moisture traces at south-east corner and Erker junction',
      ],
    },
  ],
  consistencyRules: [
    'Each element stays linked to Part 1 until a measured interior boundary is available.',
    'Element boundaries are metadata-first placeholders and must not mutate the LoD2 baseline geometry.',
    'Cellar access is tracked as owner-provided evidence until an opening or basement shell is measured.',
    'Part 2 remains a single parent assembly until a separate decomposition decision is made.',
    'Future geometry, evidence, assumptions, and decisions should reference these element IDs rather than ad hoc labels.',
  ],
} as const;

export type Part1ElementPlan = typeof part1ElementPlan;
