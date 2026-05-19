# Progress Report: Eiermann-Campus Digital Assessment Model

**Date:** 2026-05-17  
**Prepared by:** automated inspection  
**Status:** internal review draft

---

## 0. Latest Spatial Studio Sprint Update

Date: 2026-05-18

- Studio-level spatial direction documented in `docs/next_spatial_sprint_decision.md`, `docs/studio_spatial_master_plan.md`, `docs/workshop_3d_extension_plan.md` and `docs/project_character_model.md`.
- Project character metadata introduced so the Studio can distinguish focused assessment projects from larger workshop-oriented spatial projects.
- Shared spatial domain types introduced for terrain, building hulls, vegetation, source/confidence metadata and spatial evidence links.
- Eiermann-Campus now has a rough `examples/eiermann/spatial_context.json` seed for a first workshop-oriented 3D model.
- Workshop navigation now includes a 3D view with terrain, building hulls, vegetation, layer toggles, source/confidence note and zone-linked selection.
- Stage 4 evidence linking has started: the 3D side panel now surfaces zone-linked assets, observations, interpretations, claims, questions and workshop scenes for the selected spatial object.
- Stage 4 navigation is interactive: clicking evidence in the 3D panel opens the corresponding Workshop zone, scene or photo/detail focus.
- The Pavillon relation model has been recalibrated from added project material, the user-supplied cropped schema and the corrected 2D Lage view. The 3D spatial context is now generated from the corrected 2D zone polygons, so the Lage geometry is the source of truth for the 3D building placement.
- Follow-up correction: the current 3D view still had Pavillon 1 and Pavillon 3 swapped. The 3D generator now separates geometry source from workshop identity and maps Pavillon 1 to the former Pavillon 3 geometry position and Pavillon 3 to the former Pavillon 1 geometry position; Pavillon 4/NuCOS remains unchanged; Pavillon 5 remains planned-not-built.
- Runtime project data loading is now partially centralized: map, 3D scene, bulk photo import and seed loading use a shared project data loader instead of repeating hard-coded Eiermann public paths in each feature module.

This is intentionally not a digital twin or modeling editor. It is a first source-aware 3D orientation layer for workshop interpretation.

### Addendum: Spatial Evidence and Runtime Consolidation

Date: 2026-05-19

- Runtime project loading was tightened further. `App.tsx`, `ProjectHome.tsx`, `projectDataLoader.ts`, `seedLoader.ts`, `WorkshopMapPanel.tsx`, `Workshop3DPanel.tsx` and `BulkImportPanel.tsx` now operate against registry-driven project configuration instead of scattered Eiermann-specific public paths.
- `public/projects/index.json` now acts as the technical registry for built-in workshop projects, including `slug`, `projectId`, `siteId` and `mediaManifestUrl`.
- Seed restore state and media restore state are now isolated per `projectId` in localStorage. This reduces cross-project contamination when more than one workshop project is opened in the same browser profile.
- The local media folder was migrated to a slug-based convention: `public/local-media/eiermann-campus-pascalstrasse-100/`. Runtime restore already resolves the manifest path per project through the registry.
- 42 local Eiermann photos were integrated into the runtime media manifest and are restored into IndexedDB-backed workshop state on app startup.
- Map and Lage-Foto panel now share a real asset focus: selecting a GPS photo in one surface selects the same asset in the other, and the user can jump from a Lage-Foto preview directly into the corresponding Workshop detail context.
- Asset-level spatial semantics were introduced for continued workshop-spatial work:
  - `spatialAnchorType`
  - `targetZoneId`
  - `linkedSpatialObjectId`
  - `bearingConfidence`
  - `spatialNotes`
- `saveAsset()` now normalizes spatial semantics centrally. GPS photos become `viewpoint` assets automatically; EXIF bearing yields `bearingConfidence: exif`; zone-linked non-GPS assets fall back to `zone_reference`.
- The Lage-Foto panel now exposes this spatial semantics explicitly, and the 3D evidence panel surfaces the spatial anchor type in asset entries.
- The Lage-Foto panel now also supports direct review/editing of that spatial semantics per asset.
- The 3D evidence panel now uses `linkedSpatialObjectId` operationally:
  - a selected asset can activate its linked 3D object,
  - direct object-linked assets are prioritized above generic zone assets,
  - and object detail now reports direct media-link counts.

### Current review conclusion

The Workshop track is now in a better state for review than in the previous report:

- project runtime data is less fragile,
- media restore is more project-aware,
- 2D map, GPS photos and workshop detail context are no longer isolated,
- and the asset model has a first explicit spatial semantics layer.

The main remaining product gap is not infrastructure but review/editability of these new spatial semantics. The current system can infer and display them, but it cannot yet curate them deliberately.

Update: this gap has now been reduced. Spatial semantics can be curated in the Lage-Foto workflow. The next gap is no longer editability itself, but broader downstream use of curated links across 3D, workshop scenes and exports.

---

## 1. Current Repository State

**Project name:** `house-renovation-baseline`  
**Version:** 0.1.0-unreleased  

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.3 |
| Language | TypeScript (strict mode) | 5.6 |
| Build | Vite | 8.0 |
| Persistence | Dexie.js on IndexedDB | 4.4 |
| Reactive bindings | dexie-react-hooks (`useLiveQuery`) | 4.4 |
| Map | MapLibre GL + react-map-gl | 4.7 / 7.1 |
| Icons | lucide-react | 0.468 |
| Tests | Vitest + @testing-library/react | 4.1 / 16.1 |

### Starting the App Locally

```bash
npm install
npm run dev          # → http://localhost:5175
npm test             # vitest run — 169 tests, 14 files
npm run build        # type-checked production build
node utils/inspect_seed.mjs          # seed inspection (CLI)
node utils/inspect_seed.mjs --json   # full JSON dump
node utils/inspect_seed.mjs --zone z-parkdeck-1   # single zone
```

### Application Structure

```
src/
  app/              App.tsx, styles.css, routing
  domain/
    workshop/       types.ts  (39 TypeScript types)
    DataConfidence.ts
  features/
    workshop/       WorkshopRoute.tsx (main view)
      components/   AssetIngestPanel, ObservationPanel, InterpretationPanel,
                    MemoryPanel, QuestionsBoard, WorkshopMapPanel,
                    WorkshopSceneViewer, WorkshopSceneEditor, ZoneList,
                    Timeline, Cards, Badges
      db/           workshopDb.ts (Dexie schema v3), seedLoader.ts
      export/       workshopExport.ts (HTML export)
      hooks/        useWorkshopData.ts
      ingest/
    assessment/     CombinedHullMetricsPanel (renovation project — separate mode)
    building-hull-import/
    ifc-viewer/
    terrain/
    renovation-planning/
    project-home/   AppMode routing (home / workshop / renovation)
    ...
examples/
  eiermann/         seed data (JSON)
docs/               20+ documentation files
tests/              14 test files incl. 5 usability tests
utils/              inspect_seed.mjs, export_ifc.py, download scripts
```

### App Modes

The application has two distinct modes controlled by `AppMode`:

- **Workshop mode:** Eiermann-Campus assessment (the primary subject of this report)
- **Renovation mode:** Separate feature set for the Bestandsgebäude (Bayern/BW only) — out of scope here

### Existing Infrastructure

| Item | Status |
|------|--------|
| Tests | ✅ 169 tests, 14 files, all green |
| Seed data | ✅ `examples/eiermann/` — full JSON dataset |
| Seed versioning | ✅ `SEED_VERSION = '4'`, localStorage key, auto-re-seed |
| Documentation | ✅ extensive (see section 10) |
| DB migrations | ✅ Dexie versioned schema (v1 → v3) |
| Git history | ✅ active, last commit: roof geometry improvements |
| CSV files | ✅ only for terrain cross-section data — not primary storage |

---

## 2. What Has Been Implemented

### Domain Model

| Item | Status |
|------|--------|
| 39 TypeScript types in `src/domain/workshop/types.ts` | ✅ implemented |
| `EpistemicType` (7 values) | ✅ implemented |
| `SensitivityLevel` (5 values) | ✅ implemented |
| `PublicationStatus` (5 values) | ✅ implemented |
| `DataConfidence` (4 values) | ✅ implemented |
| `Citability` + `MemoryReleaseStatus` for Memory | ✅ implemented |
| `WorkshopProjectBundle` (full serializable snapshot) | ✅ implemented |
| `embedding?: number[]` on Asset / Claim / Observation | ✅ structurally prepared |

### Persistence

| Item | Status |
|------|--------|
| Dexie DB with 14 tables (schema v1) | ✅ implemented |
| `assetBlobs` table for binary media (schema v3) | ✅ implemented |
| `zoneId` index on `interpretations` (schema v3) | ✅ implemented |
| All CRUD functions via `workshopDb.ts` (incl. `saveWorkshopScene`) | ✅ implemented |
| No direct Dexie access from components | ✅ enforced |
| Asset metadata / blob separation | ✅ implemented |
| Semantic search index | ⬜ not yet implemented (field prepared) |
| SQLite / OPFS variant | ⬜ planned, documented |
| Cloud sync / multi-device | ⬜ not implemented (by design) |

### Seed Data

| Item | Status |
|------|--------|
| Eiermann-Campus JSON seed | ✅ implemented |
| Versioned re-seeding | ✅ implemented |
| Zone GeoJSON geometry | ✅ 12 zones in `zone_geometry.geojson` |
| No seed for: places, assets, interpretations, scenarios, assessments | ⚠️ empty tables on start |

### UI / Inspection Views

| Item | Status |
|------|--------|
| `WorkshopRoute` with 5 tabs (Zones, Timeline, Questions, Scenes, Map) | ✅ implemented |
| `ZoneList` with documentation status + observation count | ✅ implemented |
| `ZoneDetailPanel` with full evidence chain | ✅ implemented |
| `AssetIngestPanel` (file drop + mobile camera) | ✅ implemented |
| `ObservationPanel` (capture + 2-click delete) | ✅ implemented |
| `InterpretationPanel` (observation linker, epistemic type, counter-position) | ✅ implemented |
| `MemoryPanel` (consent status, citability, conservative defaults) | ✅ implemented |
| `QuestionsBoard` (by priority, zone links) | ✅ implemented |
| `WorkshopSceneViewer` (scene display) | ✅ implemented |
| `WorkshopSceneEditor` (create / edit in app) | ✅ implemented |
| `WorkshopMapPanel` (MapLibre + zone overlays) | ✅ implemented |
| `Timeline` | ✅ implemented |
| Scenario editing UI | ⬜ not implemented |
| Assessment editing UI | ⬜ not implemented |
| Media player / viewer (photo, video) | ⚠️ partially (blob → `<img>`) |
| Asset-to-Observation linking UI | ⚠️ partially (IDs linked but no visual cross-reference) |

### Media Handling

| Item | Status |
|------|--------|
| File drop ingest | ✅ implemented |
| Mobile camera capture (`capture="environment"`) | ✅ implemented |
| Blob stored in separate `assetBlobs` table | ✅ implemented |
| `getAssetObjectUrl()` on-demand blob retrieval | ✅ implemented |
| Thumbnail / preview generation | ⬜ not implemented |
| Video playback | ⬜ not implemented |
| Batch import (folder / archive) | ⬜ not implemented |

### Workshop Scene Handling

| Item | Status |
|------|--------|
| `WorkshopScene` entity (typed, with `publicationStatus`) | ✅ implemented |
| 5 seed scenes for Eiermann Campus | ✅ implemented |
| Scene viewer component | ✅ implemented |
| HTML export (public + internal mode) | ✅ implemented |
| Export filter (do_not_publish blocked, public/internal split) | ✅ implemented |
| Scene editor (create / edit in app) | ✅ implemented |
| Asset preview inside scenes | ⬜ not implemented |
| Scene ordering / drag-and-drop | ⬜ not implemented |

### Validation

| Item | Status |
|------|--------|
| TypeScript strict mode throughout | ✅ implemented |
| `epistemic` type constraints (`Extract<EpistemicType, ...>`) | ✅ implemented |
| Seed integrity test (03-workshop-seed-integrity) | ✅ 27 test cases |
| Export filter correctness | ✅ tested |
| JSON schema for seed files | ⬜ no runtime schema validation |
| Input validation in forms (beyond TypeScript) | ⚠️ minimal |

### Documentation

See section 10.

### Tests

| Category | Count | Status |
|----------|-------|--------|
| Geocode / address restriction | 2 files | ✅ green |
| Workshop seed integrity | 1 file, 27 tests | ✅ green |
| Project store lifecycle | 1 file | ✅ green |
| Workshop data logic | 1 file | ✅ green |
| Evidence inspection / IFC adapter | 3 files | ✅ green |
| Renovation planning selectors | 2 files | ✅ green |
| WorkshopScene editor / publication safety | 1 file, 5 tests | ✅ green |
| **Total** | **14 files, 169 tests** | **✅ all green** |

---

## 3. Domain Model Status

All 15 entities listed below are defined in `src/domain/workshop/types.ts`.

| Entity | Defined | Persisted | Stable ID | Relationships | Sensitivity modeled |
|--------|---------|-----------|-----------|---------------|---------------------|
| **Project** (WorkshopProject) | ✅ | ✅ | `proj-*` | Site | ✅ |
| **Site** | ✅ | ✅ | `site-*` | Project | ✅ |
| **Zone** | ✅ | ✅ | `z-*` | Site, Assets, Questions | ✅ |
| **Place** | ✅ | ✅ | custom | Zone, Assets | ✅ |
| **Asset** | ✅ | ✅ | `A-*` or `A-{ts}-{rnd}` | Zone, Place, Events | ✅ full |
| **Observation** | ✅ | ✅ | `OBS-*` | Zone, Place, Assets | ✅ |
| **Interpretation** | ✅ | ✅ | `INT-*` | Zone, Observations, Assets | ✅ |
| **Claim** | ✅ | ✅ | `C-*` | Zone, Event, Questions | ✅ |
| **Question** | ✅ | ✅ | `Q-*` | Zone, Claims | ✅ |
| **Memory** | ✅ | ✅ | `M-*` | Zone, Event, Assets | ✅ + citability + releaseStatus |
| **EventPhase** | ✅ | ✅ | `E-*` | Assets, Claims | ✅ |
| **Assessment** (CampusAssessment) | ✅ | ✅ (table) | custom | Zone/Place/Asset/Scenario | ✅ |
| **Scenario** | ✅ | ✅ (table) | `S-*` | Zones, Assets, Claims, Questions | ✅ |
| **WorkshopScene** | ✅ | ✅ | `WS-*` | Scenario, Assets, optional Observation/Claim/Question refs | ✅ full |
| **ExportPackage** | ⬜ | ⬜ | — | — | — |

**Notes:**

- `Assessment` and `Scenario` are persisted in DB tables but have no seed data and no create/read DB-API functions exposed — the tables exist but are not queryable from the app yet.
- `WorkshopScene` can now be created and edited in-app. Optional reference fields preserve selected observation, claim and question IDs while the current viewer/export still renders text lists.
- `ExportPackage` is not a formal entity; export is handled by `workshopExport.ts` generating an HTML Blob on demand.
- `Memory` has the most complete sensitivity model: `SensitivityLevel` + `PublicationStatus` + `Citability` + `MemoryReleaseStatus`.

---

## 4. Persistence Strategy

**Current approach: Dexie.js on browser IndexedDB.**

| Question | Answer |
|----------|--------|
| SQLite used? | No. Dexie/IndexedDB only. |
| Other database? | No. |
| Migrations present? | Yes — Dexie versioned schema (v1 → v3). Additive only. |
| File-based storage? | Seed data only (JSON in `examples/eiermann/`). Runtime data is IndexedDB. |
| CSV as primary storage? | No. CSVs exist only for terrain cross-sections (`output/*.csv`). |
| CSV for import/export? | Not currently. Export is HTML only. |
| Migration path to PostgreSQL? | Yes — `WorkshopProjectBundle` is fully JSON-serializable with stable string IDs throughout. Documented in `docs/persistence_strategy.md`. |

**Key characteristics:**

- All tables use stable string IDs — no auto-increment sequences that would break a PostgreSQL migration.
- Asset metadata and binary blobs are separated: metadata in `assets`, binary in `assetBlobs`. Both share the same ID.
- `useLiveQuery` hooks provide reactive binding — all component data updates automatically on DB writes.
- No cross-device sync. Data lives in the browser origin of the device that captured it. This is intentional for privacy.
- Vector embedding field (`embedding?: number[]`) is declared on Asset, Claim, Observation but not indexed. Nearest-neighbour search is planned as in-memory operation.

**Schema version history:**

- `v1` — 14 domain tables
- `v3` — adds `assetBlobs` table + `zoneId` index on `interpretations`

(Note: `v2` was skipped — Dexie allows non-sequential version numbers when migrations are merged.)

---

## 5. Seed Data and Example Content

**Seed location:** `examples/eiermann/`  
**Seed version:** `'4'` (localStorage key `eiermann-seed-version`)

| Entity | Seed count | File |
|--------|-----------|------|
| Projects | 1 | `project.json` |
| Sites | 1 | `site.json` |
| Zones | 12 | `zones.json` |
| Places | 0 | — |
| Assets | 0 | — (ingest only) |
| Observations | 6 | `observations.json` |
| Interpretations | 0 | — (UI only) |
| Claims | 5 | `claims.json` |
| Questions | 8 | `questions.json` |
| Memories | 3 | `memories.json` |
| EventPhases | 8 | `event_phases.json` |
| Assessments | 0 | — |
| Scenarios | 0 | — |
| WorkshopScenes | 5 | `workshop_scenes.json` |
| Zone GeoJSON | 12 polygons | `zone_geometry.geojson` |

**Zone IDs (all 12):**
`z-zugang-tor`, `z-besucherparkplaetze`, `z-nucos-gebaeude`, `z-nucos-buero-flur-kueche`, `z-pavillon-aussenraeume`, `z-parkdeck-1`, `z-parkdeck-2`, `z-kantine-gemeinschaft`, `z-gruenraeume-sukzession`, `z-raender-strassen-autobahn`, `z-technische-infrastruktur`, `z-uebergaenge-stege-wege`

**Workshop scene "Parkdeck: Relikt oder Rohling?":**  
✅ Present as `WS-001`. Status: `exportStatus: 'draft'`, `publicationStatus: 'needs_review'`.  
Correctly reflects that the Parkdecks are **not** formally protected (unlike the Pavillons). The scene frames the distinction as a productive discussion point, not a legal question.

**Memory seed entries (3):**

- `M-SEED-001` — Kantine memory (zone-linked, `pending_consent`, `citable_with_context`)
- `M-SEED-002` — Holzapfel Verabschiedungsmaterial (no zone, `not_released`, `sensitive_personal`, `do_not_publish`)
- `M-SEED-003` — NuCOS-Küche memory (zone-linked, `released`, `citable_with_context`)

---

## 6. Current Evidence Flow

```
Zone / Place
  → Asset             ✅  supported (ingest UI, blob storage, zone assignment)
  → Observation       ✅  supported (capture panel, zone-scoped query, seed data)
  → Interpretation    ✅  supported (UI with observation linker, DB API, zone index)
  → Claim             ⚠️  partially supported (seed claims exist, no UI to create new)
  → Question          ⚠️  partially supported (seed questions exist, QuestionsBoard reads them; no create UI)
  → Assessment        ⬜  not yet supported (DB table exists, no DB API, no UI)
  → Scenario          ⬜  not yet supported (DB table exists, no DB API, no UI)
  → WorkshopScene     ⚠️  partially supported (5 seed scenes viewable; no create/edit UI)
  → Export            ✅  supported (HTML export, public + internal filter, download)
```

**Comments:**

- The upper chain (Asset → Observation → Interpretation) is fully interactive — users can capture and link on device.
- The lower chain (Claim → Question) is currently read-only: seed data is viewable but no creation UI exists.
- Assessment and Scenario are the most significant implementation gaps in the evidence flow.
- The export at the end of the chain works well for the existing seed scenes but cannot yet export user-created scenes (since scene creation UI is missing).

---

## 7. Sensitivity, Publication and Certainty Handling

### Sensitivity Levels

| Level | Modeled | Notes |
|-------|---------|-------|
| `public` | ✅ | |
| `internal` | ✅ | |
| `sensitive_personal` | ✅ | Memory default |
| `restricted` | ✅ | |
| `unknown` | ✅ | |

All domain entities carry `sensitivityLevel`. The DB schema indexes `assets`, `claims`, and `memories` on `sensitivityLevel`.

### Publication Status

| Status | Modeled | Export filter |
|--------|---------|---------------|
| `publishable` | ✅ | public export only |
| `needs_review` | ✅ | internal export only |
| `anonymize_before_use` | ✅ | internal export only |
| `internal_only` | ✅ | internal export only |
| `do_not_publish` | ✅ | blocked in all exports |

The export filter in `workshopExport.ts` is hard-coded — `do_not_publish` cannot be overridden.

### Certainty / Epistemic Status

| Entity | `epistemic` field | `confidence` field |
|--------|-------------------|-------------------|
| Observation | ✅ `'observation' \| 'verified_fact'` | ✅ DataConfidence |
| Interpretation | ✅ `'interpretation' \| 'hypothesis'` | ✅ DataConfidence |
| Claim | ✅ full EpistemicType | ✅ DataConfidence |
| Question | — (no epistemic field) | — |
| Assessment | — (rating per dimension) | ✅ per AssessmentDimension |

**Gaps:**

- `Question` has no epistemic or confidence field — its status is expressed via `QuestionStatus` and `QuestionPriority` only.
- The type constraint system (`Extract<EpistemicType, ...>`) actively prevents observations being misclassified as interpretations at the type level.

### Memory-specific Fields

Memory has the most granular sensitivity model:

- `citability`: `freely_citable | citable_with_context | internal_only | not_citable`
- `releaseStatus`: `released | pending_consent | not_released`
- Conservative UI defaults enforced in `MemoryPanel`

---

## 8. Capture-First Readiness

The software is designed around field capture. Evaluation:

| Capability | Status | Notes |
|------------|--------|-------|
| Register new photos / videos | ✅ | `AssetIngestPanel` — file drop + mobile camera |
| Assign assets to zones | ✅ | Zone selection in ingest form |
| Assign assets to places | ⚠️ | Field exists, no Place creation UI |
| Detect missing metadata | ⚠️ | No dedicated completeness indicator |
| Add observations from fieldwork | ✅ | `ObservationPanel` — text, confidence, sensitivity |
| Separate sensitive material | ✅ | Sensitivity + publication fields on every form |
| Create placeholder assets before media import | ⬜ | Not implemented; all assets require a file |
| Offline use (after first load) | ✅ | IndexedDB + local bundle — no network needed |
| Multi-image batch upload | ⬜ | One file at a time |
| GPS / EXIF metadata extraction | ⬜ | Not implemented |
| Audio capture | ⬜ | Not implemented |

**Missing for practical field use:**

1. Placeholder assets (asset record without blob — "we took a photo here, import later")
2. EXIF date / GPS extraction on ingest
3. Batch import (folder of images from a site visit)
4. Zone documentation completeness indicator (how much is covered vs. target)

---

## 9. Workshop Readiness

| Capability | Status | Notes |
|------------|--------|-------|
| Display workshop scenes | ✅ | `WorkshopSceneViewer` — all 5 seed scenes |
| Create / edit scenes | ⬜ | No create/edit UI |
| Combine media, observations, claims, questions in a scene | ⚠️ | Scene has `selectedAssetIds`, `observations[]`, `openQuestions[]` — but no live DB links; scenes are currently static seed data |
| Separate internal and public view | ✅ | Export filter enforced |
| Export as HTML | ✅ | Public + internal modes, self-contained HTML with print CSS |
| Export as PDF | ⬜ | Not implemented (browser print from HTML is the workaround) |
| QR code / deep link to a scene | ⬜ | Not implemented |
| Presenter view | ⬜ | Not implemented |

**What is missing for a usable first workshop demonstrator:**

1. A scene editor — curating 3–5 assets + observations + discussion prompt interactively
2. Live asset previews inside scenes (thumbnails of ingested photos)
3. PDF export or reliable browser-print flow
4. At minimum one scene built from real on-site captured material, not placeholder seed data

---

## 10. Documentation Status

The `docs/` directory contains over 20 files. Most relevant:

| File | Status | Summary |
|------|--------|---------|
| `README.md` | ✅ current | Project overview, purpose, local startup |
| `CHANGELOG.md` | ✅ maintained | One-line entries per feature sprint |
| `docs/project_vision.md` | ✅ v0.2.0 | Vision, scope, Eiermann as first use case |
| `docs/domain_model.md` | ✅ v0.2.0 (updated 2026-05-17) | All 39 types, DB indexes, seed table, export rules |
| `docs/persistence_strategy.md` | ✅ v1.0.0 (2026-05-17) | Dexie/IndexedDB rationale, migration path |
| `docs/first_architecture_slice.md` | ✅ v1.0.0 (2026-05-17) | What is built, what is intentionally missing, next steps |
| `docs/implementation_plan.md` | ✅ exists (209 lines) | Sprint tasks and feature list |
| `docs/04_evidence_workflow.md` | ✅ exists | Evidence chain conceptual description |
| `docs/06_privacy_and_local_data_rules.md` | ✅ exists | Privacy model, consent, publication rules |
| `docs/AGENTIC_BEHAVIOR.md` | ✅ exists | Agent/automated assistant guidelines |
| `docs/adrs/` | ✅ 2 ADRs | ADR-0001: separate building model from asset data; ADR-0002: evidence inspection before matching |
| `docs/NEXT_DEVELOPMENT_PRIORITIES.md` | ⚠️ mixed | Contains renovation-project items, partially outdated for the workshop track |
| `docs/CURRENT_STATE.md` | ⚠️ check date | May reflect earlier state |
| `docs/DATA_MODEL.md` (legacy) | ⚠️ older | Superseded by `domain_model.md` |
| `docs/implementation_plan.md` | ⚠️ check | May not reflect current sprint progress |

**Missing documentation:**

- No dedicated `CONTRIBUTING.md` or onboarding guide
- No API reference for `workshopDb.ts` functions
- `docs/NEXT_DEVELOPMENT_PRIORITIES.md` mixes renovation and workshop concerns — worth splitting

---

## 11. Technical Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **Assessment + Scenario: DB tables without API** | Medium | Two entities persist in DB but have no `get*` / `save*` functions — they cannot be read or written from the app |
| **WorkshopScene curation remains text-list based** | Medium | Scenes can now be created/edited, but selected observations/claims/questions are still rendered as curated text rather than fully resolved live evidence cards |
| **No placeholder assets** | Medium | Field capture requires attaching a file — "we were here" notes are impossible |
| **IndexedDB data isolation** | Medium | Data does not survive browser profile deletion or origin change; no backup mechanism implemented |
| **No thumbnailing** | Low | All photos served as full-resolution blobs — may strain memory on mobile with many assets |
| **`version(2)` skipped** | Low | Dexie v1 → v3 migration is correct technically; unusual numbering may confuse future contributors |
| **EXIF / GPS not extracted** | Medium | Capture coordinates and dates are typed manually — error-prone, defeats part of the mobile capture value |
| **No runtime JSON schema validation** | Low | Seed data correctness is tested but seed files can be edited and break silently without schema enforcement |

---

## 12. Product Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **Losing capture-first priority** | High | The time window for on-site documentation is limited. Building more UI features before the first site visit is risky. |
| **Scene editing before enough real content** | Medium | The editor exists; value depends on using it after field capture, not as a substitute for real observations |
| **Confusing Archive Mode and Workshop Mode** | Medium | The renovation-planning feature set (Bayern/BW) lives in the same app — same UI, different domain model |
| **Memories treated as ordinary data** | Medium | Memory capture UI enforces conservative defaults — but downstream use of memories (consent tracking, attribution) is not yet modeled |
| **Losing observation/interpretation/claim distinction** | Low | Type constraints enforce this at compile time — but the UI does not make the epistemological difference visible to non-technical users |
| **Too specific to Eiermann-Campus too early** | Low | `projectId` is on every entity; the seed version key (`eiermann-seed-version`) is project-specific — switching projects clears data |
| **Too generic before first use case works** | Medium | The system has 15 entity types but only the Zone→Asset→Observation→Interpretation chain is fully interactive |
| **Overbuilt UI before data model maturity** | Low | Current risk: assessment + scenario UI is missing, which is the opposite problem |

---

## 13. Recommended Next Three Steps

### Step 1: First Real Site Visit — Capture Pipeline Validation

**Goal:** Execute one documented site visit using the current software and identify what breaks in practice.

**Benefit:** Validates the capture-first flow with real on-site material before adding more features. Produces the first real assets and observations in the DB.

**Affected files / modules:**

- `AssetIngestPanel.tsx` — test on actual mobile device
- `ObservationPanel.tsx` — test with zone assignment
- `utils/inspect_seed.mjs` — verify what was captured
- `docs/NEXT_SITE_VISIT_TODOS.md` — use as checklist

**Acceptance criteria:**

- At least 10 assets ingested and assigned to zones
- At least 5 observations linked to assets
- At least 1 interpretation derived from observations
- All captured material has sensitivity and publication status set
- No data loss on app reload

---

### Step 2: Use the Minimal Scene Editor After First Capture

**Goal:** Create the first non-seed `WorkshopScene` from real captured assets and observations.

**Benefit:** Validates whether the editor actually helps prepare a workshop discussion without hiding uncertainty.

**Affected files / modules:**

- `src/features/workshop/components/WorkshopSceneEditor.tsx`
- `workshopDb.ts` — `saveWorkshopScene()`
- `WorkshopRoute.tsx` — "Neue Szene" button in scenes tab
- `workshopExport.ts` — already works for any scenes stored in DB

**Acceptance criteria:**

- Create a scene with title, guiding question, selected assets, selected observations, free text, discussion prompt
- Scene visible in viewer immediately after save
- Scene appears in export
- `publicationStatus` can be set and is respected by export filter

---

### Step 3: Placeholder Asset Support

**Goal:** Allow creating an Asset record without a file attached (type: `other`, `processingStatus: 'raw'`).

**Benefit:** Enables "we were at this location, import the photos later" workflow. Critical for field use where media transfer happens after the visit.

**Affected files / modules:**

- `AssetIngestPanel.tsx` — add "Nur Metadaten erfassen" mode (no file required)
- `workshopDb.ts` — `saveAsset()` already accepts `AssetRecord`; blob storage is separate — no change needed
- `types.ts` — no change needed; `filePath` and `blob` are already optional

**Acceptance criteria:**

- User can create an asset with title, zone, sensitivity and empty `filePath`
- Asset appears in zone asset list with "kein Medium" indicator
- Blob can be attached later by re-opening the asset record
- Export skips assets without blobs

---

## 14. Files Changed Recently

```bash
git log --oneline -5
e10c79c  Improve staged roof geometry healing and viewer visibility
cb10fdd  Add renovation assessment, staged roof updates, and IFC export tooling
a04d44b  fix: update WASM files to match web-ifc@0.0.68 (fixes SetLogLevel error)
9edd159  fix: rewrite IFCViewerPanel — web-ifc direct + Three.js
096dbe1  feat: IFC viewer (bimraum web-ifc-viewer) + terrain TIN export
```

**Note:** The last 5 commits all affect the **renovation project track** (IFC viewer, roof geometry, terrain), not the workshop/assessment track. The workshop feature set has no dedicated recent commits — its work is captured in the unstaged changes (`git status --short` shows 101 modified files, all unstaged).

**Most relevant recently modified workshop files (unstaged):**

- `src/app/App.tsx` — AppMode routing, project-home integration
- `src/app/styles.css` — all new component styles (InterpretationPanel, ExportBar, camera button, MemoryPanel)
- `src/features/workshop/WorkshopRoute.tsx` — scenes export bar, useInterpretations hook
- `docs/domain_model.md` — updated to v0.2.0
- `docs/persistence_strategy.md` — new file
- `docs/first_architecture_slice.md` — new file
- `utils/inspect_seed.mjs` — new file
- `CHANGELOG.md` — updated

---

## 15. Questions for the Reviewer

1. **Scene editor priority vs. field capture priority:** Should the next sprint focus on adding more real on-site content (photos, observations) before building a scene editor? Or is a minimal scene editor needed to motivate further capture?

2. **Scenario entity:** The `Scenario` type is defined and persisted but has no UI or DB-API. Is it useful as a distinct layer between Assessment and WorkshopScene, or can it be collapsed into WorkshopScene for now?

3. **Memory consent workflow:** The current model tracks `releaseStatus` per Memory entry, but there is no workflow for obtaining and recording consent (e.g., a Freigabe-Formular, email record, or consent form scan). What level of traceability is needed before memories can be marked `released`?

4. **Multi-project architecture:** Every entity has `projectId`. Should a second project (e.g., a different campus or building) be started now to stress-test the isolation model, or is Eiermann-Campus exclusive until it is working end-to-end?

5. **Export format:** The current export is self-contained HTML with embedded CSS. Is this sufficient for the first workshop, or is a PDF (printable, fixed layout) required? What about collaborative review tools (Notion, shared PDF, etc.)?

6. **Observation vs. Interpretation distinction for non-expert users:** The epistemic distinction between Observation (was ist sichtbar) and Interpretation (was bedeutet das) is architecturally sound but may not be intuitive to workshop participants without fieldwork experience. Should the UI add explanatory text or examples?

7. **GeoJSON zone geometries:** The 12 zone polygons in `zone_geometry.geojson` are approximate outlines. How precise do they need to be for the workshop? Is GPS-snapping of assets to zones needed, or is manual zone assignment sufficient?

8. **Assessment dimensions:** The `AssessmentCriterion` type has 10 values (spatial_relevance, historical_value, workshop_relevance, etc.). Should these be evaluated per zone before the first workshop? If so, who assesses them — the software team or domain experts in the workshop itself?
