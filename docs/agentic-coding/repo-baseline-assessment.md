# Repo Baseline Assessment

## Repository

```text
apps/hauskompass-studio/
```

## Date

```text
2026-05-23
```

## Current Structure

```text
apps/hauskompass-studio/
├── AGENTS.md                     — abstract agent instructions (public)
├── CHANGELOG.md                  — per-session change log
├── README.md
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── app/                      — app shell, routing
│   ├── domain/                   — shared domain models (must not import features)
│   │   ├── BuildingHull.ts
│   │   ├── DataConfidence.ts
│   │   ├── EvidenceInspection.ts
│   │   ├── EvidenceItem.ts
│   │   ├── Geometry.ts
│   │   ├── RoofSurface.ts
│   │   ├── WallSurface.ts
│   │   ├── ifcMetadataAdapter.ts
│   │   ├── project/
│   │   ├── spatial/
│   │   └── workshop/
│   ├── features/                 — 23 feature modules
│   │   ├── assessment/
│   │   ├── building-hull-import/
│   │   ├── building-parts/
│   │   ├── data-inventory/
│   │   ├── deconstruction/
│   │   ├── geometry-analysis/
│   │   ├── heritage/
│   │   ├── ifc-viewer/
│   │   ├── lod2-derived/
│   │   ├── map-view/
│   │   ├── metadata/
│   │   ├── new-project/
│   │   ├── private-evidence/
│   │   ├── project-data/
│   │   ├── project-home/
│   │   ├── project-store/
│   │   ├── renovation-dashboard/
│   │   ├── renovation-planning/
│   │   ├── scenarios/
│   │   ├── showcase/
│   │   ├── terrain/
│   │   ├── three-viewer/
│   │   ├── welcome/
│   │   └── workshop/
│   ├── lib/
│   └── validation/
├── tests/                        — 42 test suites, 249 tests
│   ├── fixtures/
│   ├── usability/
│   └── *.test.ts(x)
├── schemas/                      — 14 JSON schemas (BIM-inspired data model)
├── scripts/                      — 4 Python generators + 4 Node.js scripts
├── docs/
│   ├── CURRENT_STATE.md
│   ├── CHANGELOG.md (redirect)
│   ├── adrs/                     — empty
│   ├── architecture/
│   │   └── asset-data-model.md
│   ├── concepts/                 — empty
│   └── agentic-coding/           — this folder (new)
├── examples/                     — fictional example metadata
├── local/                        — git-ignored, private data
├── cache/                        — git-ignored, geodata
└── output/                       — git-ignored, generated IFC
```

## Existing Scripts

| Script | Command | Notes |
|---|---|---|
| Build | `npm run build` | tsc + Vite; **passes** |
| Test | `npm test` | Vitest; 249 pass, 1 empty-suite failure |
| Metadata validation | `npm run validate:metadata` | **passes** (0 schema/ref/privacy/modeling errors) |
| Workshop 3D verify | `npm run verify:workshop-3d` | Not run in this assessment |
| Codex handoff | `npm run handoff:codex` | Generator script, not a quality gate |
| Showcase PDF | `npm run generate:showcase-pdf` | Generator script |
| LoD2 extract | `python scripts/extract_lod2_candidates.py` | Requires local geodata cache |
| Assessment data | `python scripts/generate_assessment_data.py` | Requires local geodata cache |

## Existing Documentation

| File | Purpose | State |
|---|---|---|
| `docs/CURRENT_STATE.md` | Architecture, tech stack, data sources, generated results | Up to date (2026-05-16) |
| `CHANGELOG.md` | Per-session change log | Active, dense recent history |
| `docs/architecture/asset-data-model.md` | BuildingElement / AssetInstance / Evidence model | Present |
| `docs/adrs/` | Architecture decision records | Empty — decisions tracked in CHANGELOG instead |
| `docs/concepts/` | Domain concept docs | Empty |
| `docs/agentic-coding/` | Agentic baseline (this file) | **New** |

## Existing Tests

| Path | Type | Notes |
|---|---|---|
| `tests/*.test.ts(x)` | Unit + integration | 36 files, covers domain, project store, renovation, Workshop |
| `tests/usability/` | Usability / integrity checks | Workshop seed integrity (27 tests) |
| `tests/release-*.test.ts(x)` | Release smoke / workflow readiness | Renovation revisit, address corpus |
| `tests/workshop-workflow-readiness.test.tsx` | Workshop workflow smoke | Exists |
| `tests/renovation-workflow-readiness.test.tsx` | Renovation workflow smoke | Exists |
| `tools/export/tests/generate-media-manifest.test.mjs` | Tool test | **Failing** — empty test suite (no `describe`/`it` body) |

## Current Domain Boundaries

- **Workshop Mode:** `src/features/workshop/`, `src/domain/workshop/` — Eiermann campus, zone documentation, spatial scenes, asset ingest
- **Renovation Project Mode:** `src/features/renovation-*`, `src/features/assessment/`, `src/features/building-parts/` — private house baseline
- **Shared primitives:** `src/domain/` (EvidenceItem, DataConfidence, Geometry, BuildingHull), `src/features/project-store/`, `src/features/project-data/`, `src/features/project-home/`
- **Unclear:** `src/features/private-evidence/` — contains only a single placeholder stub (`EvidenceList.tsx`), not imported anywhere. Confirmed Renovation Mode only (local-only photos/scans/notes). Safe to extend for renovation evidence UI. Must not be used for Workshop Mode. **Resolved 2026-05-23.**

## Local-first and Privacy Assumptions

Known:

- IndexedDB (Dexie) is the primary persistence layer
- Backup/restore uses ZIP envelope format (fflate)
- `local/`, `cache/`, `output/`, `.env.local` are git-ignored
- `examples/` contains only fictional data
- Media blobs are stored as IndexedDB records, not committed

Unknown:

- Whether `src/features/private-evidence/` has its own persistence model
- Whether any telemetry or external call exists in the build (not audited)

## Hidden Information Boundaries

The following must not be approximated:

- Real address and coordinates of the renovation project building
- Measurements, photos, scans from site visits
- Expert contact details, quotes, inspection reports
- Contents of the external Hauskompass project-data workspace
- Any detail derived from local `cache/` or `local/` paths

## Agentic Coding Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Empty test suite in `tools/export/` causes test run to fail | Low | Fix or remove the empty test file |
| `docs/adrs/` empty — decisions not formally recorded | Medium | Use OpenSpec changes as decision record (already done) |
| Large JS chunks (web-ifc 3MB, index 1.4MB) | Low | Known build warning; not a correctness issue |
| `src/features/private-evidence/` boundary unclear | Medium | Document or clarify role before adding features there |
| No `docs/agentic-coding/` existed — no baseline for agents | Medium | **Resolved by this assessment** |
| Workshop / Renovation mode boundary enforced only by convention | Medium | Add import-boundary static check as future quality gate |

## Recommended Next Steps

1. **Fix the failing test suite:** `tools/export/tests/generate-media-manifest.test.mjs` has no test body — add a stub test or remove it from the Vitest glob.
2. **Document `src/features/private-evidence/`** — clarify which mode it belongs to and whether it has its own persistence model.
3. **Proceed to the active OpenSpec change** — `workshop-lage-and-massive-intake-maturity` or `workshop-evidence-inspector` based on priority.
4. **Add import-boundary check** — a future quality gate to enforce `src/domain/` not importing from `src/features/` (currently convention-only).

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `npm run build` | **pass** | Built in 6s; chunk-size warnings (expected) |
| `npm test -- --run` | **41 pass / 1 fail** | 249 tests pass; 1 empty suite in `tools/export/` |
| `npm run validate:metadata` | **pass** | 0 schema/ref/privacy/modeling errors |
