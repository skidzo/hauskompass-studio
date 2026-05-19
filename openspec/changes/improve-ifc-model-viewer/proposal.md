## Why

The Building tab IFC Model is currently the strongest visual inspection surface, but it is constrained by a fixed 540 px panel, a permanent metrics sidebar and sparse view controls. The view should feel like the primary model workspace while still preserving the project rule that generated IFC geometry is an evidence aid, not measured as-built truth.

## What Changes

- Make the IFC Model view occupy the available Building tab workspace with responsive height instead of a fixed 540 px container.
- Replace the permanent right metrics sidebar with a compact, collapsible or overlay-style information surface so the model gets most of the horizontal space.
- Improve visual clarity with stronger edge/outline treatment, clearer old/new visibility state, legible legend placement and better contrast against the current dark scene.
- Add practical inspection controls: reset/framing, named view presets, old/new toggle, color mode, optional metrics/legend visibility and a fullscreen or focus mode.
- Keep uncertainty labels visible so LoD2, DGM1 and generated IFC context are not mistaken for measured reality.

## Capabilities

### New Capabilities

- `ifc-model-inspection`: Covers the Building tab IFC Model as an interactive, evidence-aware 3D inspection workspace.

### Modified Capabilities

None.

## Intended User Flow

1. The user opens Building -> IFC Model and immediately sees a large, well-framed 3D model.
2. The user switches between old/new package visibility, type/original colors and named camera views without losing model context.
3. The user can show or hide metrics/legend panels when they need either inspection space or supporting data.
4. The user can identify the displayed model as generated LoD2/DGM1/IFC evidence and understands that site verification is still required.

## Non-Goals

- Do not change the IFC export geometry, generated data model or `utils/export_ifc.py` behavior in this change.
- Do not add full BIM, BCF, IDS or AAS inspection infrastructure.
- Do not add private data, exact coordinates or property-identifying content to committed files.
- Do not claim the model is measured, construction-ready or structurally verified.

## Acceptance Criteria

- The IFC viewport uses most of the Building tab width and scales with the available viewport height.
- The viewer remains usable on desktop and degrades cleanly on narrow screens.
- Controls are discoverable, compact and do not obscure important model geometry.
- Metrics and source/uncertainty information remain available without permanently consuming a large side column.
- Reset/framing and visibility/color controls continue to work after resize and fullscreen/focus changes.

## Technical Choices Still Open

- Whether focus mode should use the browser fullscreen API or an in-app maximized panel.
- Whether metrics should be a collapsible side rail, floating drawer or bottom sheet.
- Whether named camera presets should include orthographic plan/elevation views in the first slice or only perspective presets.
- Whether element hover/selection should be included now or reserved for a later evidence-inspection change.

## Expected Files To Change

- `src/features/ifc-viewer/IFCViewerPanel.tsx`
- `src/app/styles.css`
- Tests or smoke-check documentation if automated coverage is added for viewer controls.
- `docs/CURRENT_STATE.md` and `CHANGELOG.md` after implementation.

## Verification Plan

- Run `npm test -- --run` for existing regression coverage.
- Run `npm run validate:metadata` to keep repository guardrails green.
- Start the Vite app and inspect Building -> IFC Model at desktop and narrow widths.
- Verify resize behavior, reset/framing, old/new visibility, color mode and metrics/legend visibility.
- Confirm generated/estimated status remains visible and no private data is introduced.

## Rollback Plan

Revert the IFC viewer component and CSS changes for this change. The existing IFC export and generated/public IFC file remain unchanged, so rollback should not require data migration.

