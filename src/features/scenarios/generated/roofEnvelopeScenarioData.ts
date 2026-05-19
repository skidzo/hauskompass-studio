import type { ScenarioModel } from '@/features/scenarios/scenarioTypes';

export const roofEnvelopeScenarioData = {
  id: 'roof-envelope-package',
  label: 'Roof Envelope Package',
  status: 'review',
  basedOn: 'baseline',
  summary: 'Current staged roof concept with west dormer, east overhang extension, general roof overhang package, and healed IFC comparison geometry.',
  interventions: [
    {
      id: 'west-dormer-package',
      kind: 'roof-geometry',
      label: 'West dormer',
      description: 'Adds a west dormer on Part 1 with ridge-aligned roof geometry and switchable old/new IFC representation.',
      parameterSet: {
        lengthM: 10,
        side: 'west',
        roofPitchDeg: 24.5,
      },
      geometryEdits: [
        {
          id: 'west-dormer-roof',
          targetType: 'roof',
          operation: 'add',
          targetRefs: ['DEBY_LOD2_6944727_8e3274ef-c03e-4de4-bea2-d879c4f19ddc'],
          generatedElementNames: [
            'GAUBE_STAGE_WEST_FRONT_WALL',
            'GAUBE_STAGE_WEST_LEFT_CHEEK',
            'GAUBE_STAGE_WEST_RIGHT_CHEEK',
            'GAUBE_STAGE_WEST_ROOF',
          ],
          note: 'Dormer geometry replaces baseline roof interpretation only in staged comparison mode.',
        },
      ],
      affects: [
        {
          baselineElementId: 'DEBY_LOD2_6944727_8e3274ef-c03e-4de4-bea2-d879c4f19ddc',
          category: 'roof',
        },
      ],
      confidence: 'medium',
      active: true,
    },
    {
      id: 'east-overhang-package',
      kind: 'drainage',
      label: 'East extension overhang',
      description: 'Adds the continuous east-side overhang and support posts from erker zone toward the Part 2 transition.',
      parameterSet: {
        supportCount: 4,
        frontProjectionBand: 'extended',
      },
      geometryEdits: [
        {
          id: 'east-overhang-roof',
          targetType: 'roof',
          operation: 'add',
          targetRefs: ['DEBY_LOD2_6944727_6a2817d6-e225-479d-b3a0-3a4a021a91a7'],
          generatedElementNames: [
            'OVERHANG_STAGE_EAST_ROOF',
            'OVERHANG_STAGE_EAST_SUPPORT_1',
            'OVERHANG_STAGE_EAST_SUPPORT_2',
            'OVERHANG_STAGE_EAST_SUPPORT_3',
            'OVERHANG_STAGE_EAST_SUPPORT_4',
          ],
          note: 'Modeled as a simple stage package for envelope continuity and rain protection assessment.',
        },
      ],
      affects: [
        {
          baselineElementId: 'DEBY_LOD2_6944727_6a2817d6-e225-479d-b3a0-3a4a021a91a7',
          category: 'roof',
        },
      ],
      confidence: 'medium',
      active: true,
    },
    {
      id: 'general-roof-overhang-package',
      kind: 'envelope-repair',
      label: 'General roof overhang package',
      description: 'Applies staged overhang geometry across the main roof set using healed polygon offsets with fallback protection.',
      parameterSet: {
        planOffsetM: 0.42,
        healingEnabled: true,
      },
      geometryEdits: [
        {
          id: 'global-roof-overhangs',
          targetType: 'roof',
          operation: 'heal',
          targetRefs: [
            'DEBY_LOD2_6944727_6a2817d6-e225-479d-b3a0-3a4a021a91a7',
            'DEBY_LOD2_6944727_8e3274ef-c03e-4de4-bea2-d879c4f19ddc',
            'DEBY_LOD2_6944727_cf053b99-23fd-4275-ada9-f70ba6e35a76',
            'DEBY_LOD2_6945465_59db9ff4-0c64-4ded-9b79-d6453af6a4f4',
            'DEBY_LOD2_6945465_72adc19b-a910-4607-bda7-20543246b4e4',
            'DEBY_LOD2_6945465_a0b08415-f133-4fb5-9b23-53127fd1c6dc',
            'DEBY_LOD2_6945465_3c6f6333-dc9d-482f-b1a7-c6821b4a2bd8',
          ],
          generatedElementNames: [
            'ROOF_OVERHANG_STAGE_PART1_MAIN_EAST',
            'ROOF_OVERHANG_STAGE_PART1_MAIN_WEST',
            'ROOF_OVERHANG_STAGE_PART1_ERKER_EAST',
            'ROOF_OVERHANG_STAGE_PART2_MAIN_EAST',
            'ROOF_OVERHANG_STAGE_PART2_MAIN_WEST',
            'ROOF_OVERHANG_STAGE_PART2_LOW_WEST_1',
            'ROOF_OVERHANG_STAGE_PART2_LOW_WEST_2',
          ],
          note: 'Uses 2D polygon offset first and falls back to radial expansion when geometry quality is too weak.',
        },
      ],
      affects: [
        {
          baselineElementId: 'combined-roof-package',
          category: 'roof',
        },
      ],
      confidence: 'medium',
      active: true,
    },
  ],
  assessments: [
    {
      id: 'roof-envelope-geometry-quality',
      kind: 'geometry-quality',
      label: 'Stage geometry health',
      sourceIds: ['export_ifc.py', 'hauskompass_lod2_baseline.ifc'],
      confidence: 'medium',
    },
    {
      id: 'roof-envelope-solar-pv',
      kind: 'solar-pv',
      label: 'Staged roof PV predesign',
      sourceIds: ['solarPvPlanData'],
      confidence: 'medium',
    },
    {
      id: 'roof-envelope-reuse',
      kind: 'material-reuse',
      label: 'Reuse estimates under current baseline/stage context',
      sourceIds: ['materialReuseEstimates'],
      confidence: 'low',
    },
  ],
  outputs: [
    {
      id: 'roof-envelope-pv-summary',
      kind: 'pv-summary',
      label: 'Solar & PV concept summary',
    },
    {
      id: 'roof-envelope-change-log',
      kind: 'geometry-change-log',
      label: 'IFC stage geometry package',
    },
  ],
  assumptions: [
    {
      id: 'roof-windows-deferred',
      text: 'Roof-window strategy is intentionally not part of the active package and requires a later section-based concept pass.',
      impact: 'medium',
      status: 'accepted',
    },
    {
      id: 'roof-overhang-healing',
      text: 'Stage roof overhangs use exporter-side geometry healing and should still be visually checked against irregular LoD2 roof pieces.',
      impact: 'high',
      status: 'accepted',
    },
  ],
} as const satisfies ScenarioModel;
