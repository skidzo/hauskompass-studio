# Next Spatial Sprint Decision

Date: 2026-05-18

## 1. What exists already

The Studio already has several spatial capabilities, but they are distributed across feature areas:

- `src/features/ifc-viewer/IFCViewerPanel.tsx` contains the strongest reusable 3D implementation: direct Three.js setup, `OrbitControls`, resize handling, layer-style visibility, camera fitting, source badges and explicit uncertainty language.
- `src/features/three-viewer/LoD2SurfaceViewer.tsx` provides a lightweight LoD2 surface preview, but it is SVG/isometric rather than a navigable 3D workspace.
- `src/features/terrain/*` and `src/features/lod2-derived/fetchTerrainProfile.ts` model terrain as sampled profiles and DGM/Open-Meteo derived measurements. They are useful for evidence and source language, but they do not yet provide a reusable 3D terrain mesh.
- `src/features/map-view/ImportedSiteMapPanel.tsx` and `src/features/workshop/components/WorkshopMapPanel.tsx` already provide MapLibre spatial orientation and workshop zone selection.
- The Workshop domain already links zones, assets, observations, interpretations, claims, questions and workshop scenes through IndexedDB and seed JSON.
- The Eiermann seed already contains zones, corrected site geocode, GPS assets and named campus anchors.

## 2. What should be reused

The first Workshop 3D viewer should reuse:

- Three.js and `OrbitControls` directly, following the IFC viewer pattern.
- The IFC viewer's approach to visible source/confidence information.
- Workshop zone selection concepts and `selectedZoneId` state from the Lage tab.
- Existing workshop zone IDs as the stable bridge between 2D map, 3D model and evidence.
- Existing visual language: quiet toolbars, layer toggles, panels and explicit approximation notes.

## 3. What should be generalized

The following should become Studio-level concepts:

- Project character metadata: scale, character, spatial complexity, stakeholder complexity and workshop mode.
- Spatial source metadata: imported, inferred, measured, workshop sketch or verified.
- Spatial confidence: rough, inferred, imported, workshop sketch, measured, verified.
- Typed spatial layers for terrain, building hulls, vegetation and evidence links.
- A shared local coordinate model for project/site relative 3D scenes.

This sprint should introduce types and seed-ready structures, not a full persistence and import pipeline.

## 4. What should remain workshop-specific

The following should remain in the Workshop feature for now:

- The first 3D viewer UI and its tab placement.
- The interpretation of zones, workshop scenes and evidence links.
- The Eiermann-specific seed model for terrain, hulls and vegetation.
- The language that frames approximation for workshop discussion.

## 5. Smallest valuable next step

The smallest useful next slice is:

1. Add documented Studio-level project character and spatial domain types.
2. Add an Eiermann `spatial_context.json` seed with terrain, building hulls, vegetation and spatial evidence links.
3. Add a Workshop 3D tab that renders terrain, building hulls and vegetation together.
4. Provide layer toggles and visible source/confidence metadata.
5. Highlight the currently selected workshop zone where a spatial object is linked.

This gives users a real orientation tool without pretending to be a digital twin or modeling editor.

## 6. Out of scope for this sprint

- Full BIM authoring or IFC editing.
- High precision GIS editing.
- Terrain import pipeline or DGM mesh generation.
- Vegetation simulation or botanical modeling.
- Editing/refinement of 3D geometry.
- Persisted camera states for workshop scenes.
- Screenshot/export workflow.
- Automatic interpretation or design proposal generation.

## 7. Main risks

- Product risk: users may read approximate geometry as verified reality. Mitigation: always show source/confidence and use restrained rendering.
- Technical risk: duplicating 3D setup before a shared rendering service exists. Mitigation: keep the first viewer small and document the later extraction target.
- Data risk: seed geometry may be spatially plausible but not measured. Mitigation: mark it as `rough` or `inferred`.
- Architecture risk: Workshop 3D could become detached from evidence. Mitigation: link spatial objects to zone IDs from the first slice.
