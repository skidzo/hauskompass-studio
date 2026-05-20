## Context

`IFCViewerPanel` currently renders the generated IFC with web-ifc and Three.js inside a `.panel` containing an inline grid of `1fr 230px` and a fixed `height: 540`. The component already has useful foundations: mesh loading, type/original colors, old/new visibility, camera fitting, legend, metrics and generated-source context.

The main weakness is not the geometry pipeline. The view is visually boxed and sized like a secondary card even though it is the most compelling Building tab surface.

## Goals / Non-Goals

**Goals:**

- Make the IFC viewport the dominant workspace in the Building tab.
- Preserve a compact evidence/metrics layer without permanently shrinking the model.
- Improve inspection ergonomics through view presets, compact controls and responsive sizing.
- Keep generated/source uncertainty visible.

**Non-Goals:**

- No IFC exporter changes.
- No new 3D engine or IFC viewer dependency.
- No full element-property inspector, BCF workflow or BIM issue workflow.
- No local/georeferenced data exposure.

## Decisions

1. Move layout styling from inline JSX to named CSS classes.

   Rationale: responsive height, focus mode and narrow-screen behavior are layout concerns and will be easier to maintain in `styles.css`. The current inline `height: 540` and `gridTemplateColumns: '1fr 230px'` are the main blockers.

   Alternative considered: keep inline styles and add conditional objects. That would preserve locality but make responsive states harder to scan.

2. Use an in-app focus mode before browser fullscreen.

   Rationale: in-app focus mode works without browser permission edge cases, remains easier to test and can keep app navigation recoverable. Browser fullscreen can be added later if still needed.

   Alternative considered: native fullscreen immediately. It gives maximum space but introduces escape/permission behavior and more browser-specific test cases.

3. Keep controls as a compact overlay toolbar.

   Rationale: the viewer needs direct manipulation controls, but they should not create another fixed sidebar. A top overlay with grouped controls and a collapsible info drawer preserves model space.

   Alternative considered: keep permanent sidebar. It keeps metrics visible but sacrifices the horizontal model view.

4. Add named camera presets before element selection.

   Rationale: view presets improve inspection immediately and reuse existing camera/controls logic. Element selection would require richer metadata mapping and belongs in a later evidence-inspection proposal.

   Alternative considered: implement hover/select first. That is valuable but increases scope and risks overclaiming IFC metadata precision.

## Risks / Trade-offs

- Responsive viewer height may conflict with the surrounding scroll container -> constrain with `min-height`, `max-height` and `calc(100vh - app chrome)` rather than unbounded `100vh`.
- Overlay controls can obscure geometry -> keep controls compact, allow metrics/legend collapse and reserve bottom badges for source/uncertainty.
- Camera presets may frame poorly after old/new visibility changes -> reuse the current visible-mesh bounding box fitting for every preset.
- Focus mode can hide context -> keep generated/source status visible inside the focused viewer.

## Migration Plan

1. Refactor JSX layout to semantic classes while preserving existing behavior.
2. Add responsive/focus sizing CSS.
3. Add compact toolbar and collapsible info/legend state.
4. Add camera preset actions using existing Three.js camera and controls.
5. Verify manually in the app and run existing tests/metadata validation.

Rollback is a normal source revert of the component/CSS changes; no data migration is required.

## Open Questions

- Should the first implementation include orthographic presets, or only perspective presets?
- Should focus mode remember the last metrics/legend visibility state?
- Should the old/new toggle label be changed to explicitly say "proposal geometry" or similar to reduce ambiguity?

