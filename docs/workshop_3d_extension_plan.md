# Workshop 3D Extension Plan

## Goal

Add a Workshop 3D view that supports orientation, discussion and evidence-based interpretation across terrain, building hulls, vegetation and workshop zones.

## Stage 0: Spatial Assessment

Completed for this sprint: existing Three.js, IFC, terrain, MapLibre and Workshop data flows were reviewed. The first viewer should reuse Three.js patterns from the IFC viewer and zone linking from the Workshop map.

## Stage 1: Project Character

Add project metadata that distinguishes single-building assessment projects from workshop-oriented, multi-stakeholder spatial projects.

## Stage 2: Spatial Foundation

Introduce typed structures for terrain, building hulls, vegetation, sources, confidence and evidence links. Keep this import-ready and seed-ready.

## Stage 3: First Workshop 3D Viewer

Implement a Workshop tab that:

- renders a simplified terrain surface,
- renders approximate building hulls,
- renders vegetation clusters,
- offers terrain/buildings/vegetation layer toggles,
- supports orbit/pan/zoom navigation,
- displays source and confidence metadata,
- highlights linked selected zones.

Geometry calibration note:

- Pavillon 1-4 and Kantine now follow the project material `examples/eiermann/project_materials/eiermann_spatial_working_model_1984.md` and the user-supplied cropped navigation schema.
- The current 3D model is generated from the corrected 2D zone polygons via `npm run generate:eiermann-spatial`; this makes the 2D Lage view the source of truth for pavilion placement.
- The latest 3D correction also swaps Pavillon 1 and Pavillon 3 in the generated 3D mapping: the object labelled Pavillon 1 now uses the former Pavillon 3 geometry position and the object labelled Pavillon 3 uses the former Pavillon 1 geometry position. Pavillon 4/NuCOS remains unchanged. Pavillon 5 is added as a planned-not-built 2D/3D reference.
- Pavillon 5 is retained only as a ghosted planned-not-built extension placeholder.

## Stage 4: Evidence Linking

Extend the viewer so spatial objects can surface linked assets, observations, interpretations and workshop scenes.

Initial implementation:

- selecting a 3D object selects its linked workshop zone,
- the side panel shows zone-linked assets, observations, interpretations, claims, questions and scenes,
- evidence items in the 3D panel can open or focus the corresponding Workshop detail context,
- spatial evidence links remain explicit in `spatial_context.json`,
- this is still inspection and navigation, not annotation editing.

## Stage 5: Lightweight Refinement

Allow careful adjustment or annotation of approximate hulls, vegetation and terrain references. Do not build a full BIM or GIS editor.

## Stage 6: Scene Integration

Allow WorkshopScenes to reference camera state, visible layers and selected spatial objects for review and presentation.

## First Sprint Acceptance

- A Workshop 3D tab exists.
- Terrain, hulls and vegetation render together.
- Users can navigate the scene.
- Layer toggles work.
- Approximation and source metadata are visible.
- At least one spatial link to workshop zones exists.

---

## Stage 7: Spatial Grounding Workflow (2026-05-19)

All spatial objects must carry explicit geometry provenance before being shown in the 3D view.

### Confidence Model

Defined in `docs/spatial_confidence_model.md`. All spatial types carry:

- `verificationStatus`: `verified_geometry | inferred_geometry | placeholder_geometry | unknown_geometry`
- `confidence`: existing `SpatialConfidence` type

### Source Inventory

Documented in `docs/eiermann_spatial_grounding_report.md`.

**Current geometry status by object:**

- Pavillons 1–4, Kantine: `inferred_geometry` (LGL-BW LOD2 + GPS verification)
- Vegetation: `placeholder_geometry` (hardcoded estimates)
- Terrain: `placeholder_geometry` (3×3 schematic grid)
- Parkdecks: `unknown_geometry` (no footprint source)
- Stege/Wege: `unknown_geometry`
- Pavillon 5 (planned): `placeholder_geometry` (schematic drawing, removed from 3D until confirmed)

### Agent Behavior Rule

Before modeling any spatial relation, the agent must internally answer:

1. What source supports this relation? (file path, GML-ID, coordinates)
2. What is the `verificationStatus`?
3. What is the `confidence`?
4. Would showing this create false spatial confidence?

If question 1 cannot be answered: **do not model. Create a `placeholder_geometry` with explicit note, or omit.**

### Data Needed

See `docs/eiermann_spatial_data_needed.md` for the full checklist.

Priority gaps:

- Aerial image (blocked: `AERIAL_LUFTBILD_27022022` referenced but not in repo)
- Lageplan / Flurkarte (not available)
- Parkdeck dimensions (user has measurements, not yet ingested)
- 10 unassigned LOD2 buildings (in `zone_geometry_inspect.geojson`)

### UI Requirements

- `inferred_geometry`: show normally; sidebar shows "Geometrie: abgeleitet" + source name
- `placeholder_geometry`: dashed outline in 3D; sidebar shows "Geometrie: Platzhalter"
- `unknown_geometry`: not rendered in 3D; sidebar shows "Keine Geometrie verfügbar"
- `verified_geometry`: full rendering; no extra badge needed
