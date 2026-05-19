# Studio Spatial Master Plan

## Purpose

Hauskompass Studio should support focused assessment projects and broader workshop-oriented spatial projects. Spatial tools must help users understand place, evidence, uncertainty and transformation choices, not produce false precision.

## Project Families

- Focused assessment projects: usually one building or a small cluster, detailed building-scale modeling, stronger need for IFC/LoD2/terrain measurements.
- Workshop projects: campuses, settlements, district fragments or socially sensitive transformation areas, stronger need for spatial orientation, zones, evidence linking and communication.

## Shared Foundation

The shared spatial foundation should contain:

- `domain/project`: project character, scale, complexity and mode metadata.
- `domain/spatial`: source, confidence, terrain, hull, vegetation, spatial object, spatial scene and evidence link types.
- Future `services/spatial-*`: import, coordinate transforms, rendering helpers and spatial linking.

## Layering

```text
Studio Spatial Foundation
  -> domain/project
  -> domain/spatial
  -> services/spatial-import
  -> services/spatial-rendering
  -> services/spatial-linking
  -> features/building
  -> features/workshop-3d
  -> features/project-context
```

## Modeling Rules

- Keep source and confidence visible.
- Distinguish measured, imported, inferred and workshop sketch geometry.
- Prefer stable project/site/zone links over ad-hoc labels.
- Keep shared rendering and coordinate logic generic.
- Keep workshop interpretation in Workshop features.

## Development Path

1. Document current spatial readiness and first sprint decision.
2. Add project character metadata.
3. Add typed spatial domain structures.
4. Add first Workshop 3D viewer with approximate terrain, hull and vegetation.
5. Link spatial objects to workshop evidence through zone, asset, observation, interpretation and scene references.
6. Add lightweight refinement only after the view proves useful.
7. Store scene/camera states for workshop communication later.
