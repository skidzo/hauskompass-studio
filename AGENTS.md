# AGENTS.md

## Purpose

This repository is a **local-first browser application** with two distinct operating modes:

- **Workshop Mode** — documentation of an external workshop/campus (Eiermann ensemble, `ws-pascal`)
- **Renovation Project Mode** — private house renovation planning with evidence-based reasoning

Agents may help inspect, refactor, test, and document code, but must not invent hidden context or silently change architectural boundaries.

## Project-Specific Constraints

- Preserve existing data, generated artifacts and documentation unless explicitly asked to replace them.
- Distinguish measured facts from imported, generated, estimated or assumed values.
- Avoid overclaiming model accuracy.
- Keep renovation reasoning evidence-based.
- Document assumptions and unresolved uncertainties.
- Avoid destructive refactors and avoid deleting local/private workflows.
- Update `docs/CURRENT_STATE.md` and `CHANGELOG.md` after meaningful changes.
- Keep source files, generated files and local-only private artifacts clearly separated.
- Prefer small, coherent, reviewable changes over large rewrites.
- Do not implement full BIM, IFC, BCF, IDS or AAS infrastructure unless the project explicitly reaches that stage.

The project goal is a practical renovation knowledge system first: stable IDs, source-aware facts, explicit assumptions, evidence links, missing measurements, risks, decisions and expert-preparation outputs.

## Public/Private Boundary

This app repo (`apps/hauskompass-studio/`) is a **public repository**. Everything in the workspace root (`lat.md/`, `skills/`, `tools/`, `docs/`, `openspec/`) is private — never commit workbench tooling here.

Before committing or pushing:

- Do not commit `lat.md/`, `skills/`, or any workbench-internal files.
- Do not commit real addresses, coordinates, names, EXIF metadata, real project photos, scans, API keys.
- The app's own `AGENTS.md` is acceptable — it is abstract and carries no private project context.
- Generated artifacts (`output/`) are git-ignored; do not add them.

## Core Principles

1. Evidence before confidence.
2. Specification before implementation.
3. Small reversible changes.
4. Local-first by default.
5. Privacy by design.
6. Domain distinctions must remain explicit.
7. Architecture changes must be documented.
8. Tests are design constraints, not only bug detectors.

## Hidden Information Policy

The user or repository owner may intentionally hide information.

Agents must:

- not approximate hidden details,
- not infer private facts,
- not create placeholder facts that look real,
- use explicit placeholders such as `[PRIVATE_PROJECT_DETAIL_REQUIRED]`,
- document uncertainty rather than hide it.

## Required Workflow for Non-Trivial Changes

Before implementation:

1. Read the active OpenSpec change, if present.
2. Read relevant `lat.md/` sections.
3. Use targeted context gathering; avoid broad blind reads.
4. Convert the request into an implementation contract:
   - goal,
   - non-goals,
   - constraints,
   - domain invariants,
   - privacy invariants,
   - architecture boundaries,
   - verification plan.
5. Identify whether new dependencies, folder boundaries, persistent data structures, export formats, MCP servers, or external APIs are involved.

During implementation:

1. Keep changes small.
2. Prefer existing patterns.
3. Do not mix Workshop Mode and Renovation Project Mode semantics without a design note.
4. Do not add real private data to tests, fixtures, docs, examples, screenshots, or generated artifacts.
5. Add `@lat` backlinks only for meaningful domain, architecture, or test anchors.

After implementation:

1. Run the relevant quality gate.
2. Create or update an evidence bundle.
3. Document commands run and results.
4. Document known limitations.
5. Document manual review focus.
6. Update `lat.md/` only for stable knowledge.
7. Update OpenSpec artifacts when the change scope changes.

## Mandatory Checks

Run what exists in this repository. Do not invent commands as if they succeeded.

Typical checks may include:

```bash
npm run build
npm test
npm run validate:metadata
npm run lat:check
npm run quality:agentic
```

If a command does not exist, document:

```text
Command:
Result: not available
Reason:
Follow-up:
```

## Architecture Boundary Rules

- `src/domain/` must not import from `src/features/`.
- `utils/` must not import from application feature modules.
- Workshop-specific logic must not be silently reused as renovation semantics.
- Renovation-specific logic must not silently overwrite workshop capture behavior.
- Local-first storage must remain distinguishable from imports, generated exports, and demo data.

## Privacy Rules

Never commit:

- real addresses,
- exact private coordinates,
- personal names from project data,
- unredacted EXIF metadata,
- real project photos,
- private config files,
- API keys,
- local absolute paths containing personal information,
- customer-specific details.

Use synthetic data or placeholders.

## MCP and External Tool Rules

Any new MCP server, external API, hosted service, or cloud integration requires an explicit design note with:

- purpose,
- data exposed,
- permissions required,
- failure mode,
- security risk,
- rollback path.

## Definition of Done

A change is done only when:

```text
Intent is documented.
Constraints are explicit.
Implementation is small and reversible.
Verification evidence exists.
Risks and limitations are visible.
A human reviewer can understand what changed and why.
```

---

## Aktueller Stand (Mai 2026)

**Reifer, aktiv genutzter Stand.** 252/252 Vitest-Tests grün. 7/7 Playwright E2E-Smoke-Tests grün.

**Zuletzt implementiert:**

- File System Access API: `storageMode: 'blob' | 'fs-reference'` — Fotos werden als Directory-Handle referenziert, nicht kopiert (0 MB in IndexedDB)
- GPS-Confidence-System: `PlacementConfidence` (verified ≤5m / likely ≤15m / approximate ≤50m / uncertain)
- EXIF-Erweiterung: `gpsHAccuracyM`, `gpsBearingRef`, `GPSImgDirectionRef`
- BulkImportPanel: Thumbnail-Parallelgenerierung (8er-Batches, ~8× schneller)
- LoD2-Import-Wizard: Radius-basierte Gebäude-Bulk-Selektion
- URL-Hash-Routing: Deep-Links und Browser-Back (`#/workshop/map`, `#/renovation/<slug>/site`)
- Workshop-Backup/Restore: vollständige Projekt-Persistenz inkl. Spatial Scene
- Eiermann-Ensemble: echte LoD2-Hüllen aus LGL-BW GML, korrekte Pavilion-Nummerierung

**Stack (bestätigt):**

- React 18 + Vite + TypeScript
- IndexedDB (Dexie) — local-first Persistenz, Schema v4
- MapLibre GL — 2D-Karte
- Three.js — 3D-Gebäudeszene
- Vitest + jsdom — Unit-Tests
- Playwright — E2E-Smoke-Tests (in `testing/e2e/playwright/` des NuAires-Workspace)

## Nächste Schritte (Was steht an)

**Feature-Prioritäten:**

1. **Renovation-Workflow schärfen:** Raumformular nutzt `NamedEntityFields` (neu) — prüfen ob Konsistenz zu Workshop-Zonen hergestellt ist
2. **FS-Reference-Modus testen mit echtem Foto-Corpus:** GPS-Confidence-Labels und Thumbnail-Generierung für 300+-Foto-Import verifizieren
3. **Exportformat für Energiebilanz / IFC:** LOD2-Hüllen sind im Modell — Anbindung an externe Berechnungstools (IFC-Export, U-Wert-Eingabe)
4. **Zone-Asset-Verknüpfung schließen:** GPS-loose Assets → Zone-Zuweisung via Bulk-Assign (implementiert) → Persistenz verifizieren
5. **Mobile-Ansicht Workshop/Renovation:** Layout-Tests auf 375px noch ausstehend

**Technische Schulden:**

- `workshopDb` Schema-Migrationen: v4 ist aktuell — bei nächster Schema-Änderung Migration-Pfad testen
- `spatial_context.json` Fallback-Logik: mehrere Pfade (bundled, localStorage, derived) — konsolidieren
- Playwright-Tests laufen nur gegen lokalen Dev-Server — CI-Integration ausstehend
