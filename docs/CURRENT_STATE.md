# Current State

Last reviewed: 2026-05-16.

Update 2026-05-18: The Eiermann seed model now includes Kurt Grunow's
2026-05-17 SOUP feedback as internal, review-required material: BRASILIEN
light-sign intervention, Max Bense/Brasilia/Urbanistik thread, two follow-up
questions and draft scene `WS-006`.

## Repository Contents

The repository is a local-first renovation planning prototype for a private house. It currently contains:

- a Vite + React + TypeScript web app;
- domain models for building hull, evidence, evidence inspection, geometry, roof and wall surfaces;
- feature modules for site context, LoD2 hull import, 3D viewing, IFC viewing, terrain sections, Part 1 building decomposition, assessment, deconstruction/PV, scenarios and metadata exploration;
- JSON schemas and fictional example metadata;
- generated TypeScript data derived from geodata, terrain, roof/PV studies, Part 1 floor/elevation reasoning and scenario work;
- Python utilities for LoD2/DGM-derived data generation and IFC export;
- documentation for privacy, BIM/AAS-inspired metadata, source registration, evidence workflow, evidence inspection, site visit planning, photo capture, local assessment packages and asset/finding models.
- an OpenSpec baseline under `../../docs/openspec/` with project context, current-state specifications for project context, evidence baseline, privacy/local data, metadata validation and renovation planning workflow, plus the active `improve-ifc-model-viewer` proposal for the Building tab IFC inspection surface.

This is not a finished BIM model, not a full digital twin, not construction documentation and not a replacement for architects, engineers, energy consultants or craftspeople.

## Technology Stack

- Runtime/build: Node.js, npm, Vite.
- Frontend: React 18, TypeScript, CSS.
- 3D/geospatial: Three.js, MapLibre/react-map-gl, web-ifc.
- Validation/tests: Vitest plus custom JSON-schema-shape/reference/privacy/modeling validator.
- Data generation: Python scripts in `scripts/` and IFC export in `utils/export_ifc.py`.
- Local privacy approach: private data and downloaded geodata belong in ignored/local paths such as `.env.local`, `local/` and `cache/`.

## Data Sources In Use Or Referenced

The repository references or uses:

- public geodata and LoD2/DGM context through local cache paths;
- OSM context through local cache paths;
- ALKIS/parcel and heritage context as assessment references;
- generated LoD2 candidate geometry;
- generated site context and terrain cross sections;
- generated assessment data for hull/terrain relationships;
- IFC baseline export artifacts;
- project-specific Part 1 decomposition and site-visit guidance;
- BIM/AAS-inspired architecture sources, including the uploaded IDTA/buildingSMART PDF and project handoff;
- fictional example metadata under `examples/`;
- optional local assessment packages under ignored `local/` paths.

Committed example data must remain fictional or privacy-safe. Real address data, photos, scans, measurements and downloaded source files should stay local-only.

## Generated Results Already Present

Current generated or derived results include:

- LoD2 candidate building geometry in `src/features/building-hull-import/generated/`;
- terrain/site context data in `src/features/map-view/generated/` and `src/features/terrain/generated/`;
- hull assessment derived data in `src/features/assessment/generated/`;
- Part 1 plan/elevation/CAD seed data in `src/features/building-parts/generated/`;
- deconstruction, material reuse, PV and roof-window study data in `src/features/deconstruction/generated/`;
- scenario registry data in `src/features/scenarios/generated/`;
- IFC export logic in `utils/export_ifc.py` and viewer logic expecting generated/public IFC files.

Generated artifacts are useful for reasoning, but most are still estimates until verified by site measurements and expert review.

## Current App Capabilities

The app can currently:

- display a site/map context section;
- show LoD2 building geometry and confirmed building parts;
- switch between Part 1 / Part 2 candidates;
- show Part 1 element plans, Keller layer and side-elevation sheets;
- show IFC geometry through a web-ifc/Three.js viewer with responsive viewport, named camera presets (Oblique/Top/South/East), compact overlay controls, collapsible info drawer and in-app focus mode;
- display terrain cross sections;
- show assessment, missing measurement and readiness panels;
- show deconstruction/material reuse/PV planning panels;
- show a metadata explorer and scenario registry;
- show a Planning section with separated facts, assumptions, missing measurements, decisions, local editable registers, site-visit import and rule-based reasoning;
- load a generic, address-agnostic local assessment package JSON, preview its metadata and merge its planning registers into browser-local storage;
- model source references, evidence quality flags, review states and match candidates for future IFC/document evidence inspection without claiming automatic matching accuracy;
- generate `docs/CODEX_HANDOFF.md` with model-state diff information;
- validate committed example metadata with schema, reference, privacy and modeling checks.
- validate the current OpenSpec baseline specifications with `openspec validate --specs --strict --no-interactive`.
- carry the first incoming SOUP feedback after the workshop as structured seed
  data while keeping it internal and review-required until source material and
  publication consent are clarified.

## Explicit Assumptions

Documented assumptions include:

- Part 1 / Part 2 are the confirmed hull parts.
- Part 1 ground-floor understanding is based on four rectangles: main body, Erker, Wintergarten and Flur zur Scheune.
- The Keller is approximately 4 m by 7 m near the southernmost Part 1 corner.
- The main-house exterior wall is currently estimated at about 0.5 m.
- Nominal storey height is estimated at about 2.4 m.
- Part 1 vertical CAD seed uses LoD2-derived hull base and ridge references.
- Roof build-up, wall build-up, moisture paths, exact drainage and timber condition remain unverified.
- Photo shot list entries `S01` to `S20` are multi-photo capture blocks with laser-distance metadata, not single photos.
- Asset/product data must not be duplicated into building element records.

## Implicit Or Code-Embedded Assumptions

Some assumptions are still mostly embedded in generated data or UI logic:

- exact local coordinate transforms and axis orientation for Part 1 plans;
- simplified terrain lines in elevation drawings;
- roof slope/eaves/ridge projection logic for side-elevation sheets;
- staged IFC roof/dormer/overhang logic in the exporter;
- PV and solar potential assumptions encoded in generated deconstruction data;
- UI grouping of data into Site, Building, Assessment, Data and scenario panels;
- confidence semantics for some generated values.

These should gradually move into source-aware facts, assumptions, requirements or findings.

## Missing For Serious Renovation Assessment

The project still needs:

- measured facade lengths, heights, eaves, ridge and roof overhangs;
- confirmed wall thickness and build-up at representative openings;
- roof build-up, covering condition, ventilation and underlay/sarking evidence;
- timber condition, rafter/purlin dimensions and bearing details;
- verified Keller dimensions, vault direction, moisture and ventilation condition;
- drainage/downpipe discharge paths and splashback/ponding behavior;
- window/door inventory with dimensions and condition;
- moisture evidence inside and outside;
- structural assessment of roof interventions, PV loads, dormer/overhang concepts and retained timber;
- energy consultant input for insulation/HVAC strategy;
- permit/planning constraints;
- real product datasheets only when candidates are intentionally selected.

## To Verify On Site

Highest-priority site checks:

- Part 1 sub-part identification and corner relationships.
- One reliable long reference length for Part 1.
- Eaves, ridge, threshold and terrain relationships.
- Roof overhang depths and actual roof edge geometry.
- Wall thickness at a representative window/door reveal.
- Keller location, size, vault direction and moisture pattern.
- North/west weather exposure, plinth moisture and drainage behavior.
- Roof covering, roof penetrations and PV-obstruction reality.
- Attic timber layout and condition.
- Laser-referenced photo coverage according to `docs/FOTOLISTE_BEGEHUNG_S01_S20.md`.

## Do Not Overclaim Yet

Do not treat the current model as:

- measured as-built geometry;
- construction-ready CAD/BIM;
- structural proof;
- moisture diagnosis;
- energy design;
- PV installation design;
- legal/permitting assessment;
- complete deconstruction inventory.

The current repository is best understood as an evidence-organizing and uncertainty-reduction system that prepares better expert conversations.
