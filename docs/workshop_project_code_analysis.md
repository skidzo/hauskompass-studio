# Workshop Project Code Analysis

**Date:** 2026-05-20  
**Scope reviewed:** `src/features/workshop/`, `src/domain/workshop/`, Dexie persistence, seed loading, export, ingest, map/3D, Workshop tests, Workshop docs

## 1. Current Implemented Capabilities

- Workshop domain model exists in [`src/domain/workshop/types.ts`](../..//apps/hauskompass-studio/src/domain/workshop/types.ts:1) with distinct types for `Asset`, `Observation`, `Interpretation`, `Claim`, `Question`, `Memory`, `Assessment`, `Scenario`, and `WorkshopScene`.
- Local-first Workshop persistence exists in [`src/features/workshop/db/workshopDb.ts`](../..//apps/hauskompass-studio/src/features/workshop/db/workshopDb.ts:1) using Dexie/IndexedDB, including blob storage for media.
- Seed loading exists in [`src/features/workshop/db/seedLoader.ts`](../..//apps/hauskompass-studio/src/features/workshop/db/seedLoader.ts:1) and loads project/site/zones/observations/claims/questions/memories/event phases/scenes from public seed JSON.
- Workshop UI exists in [`src/features/workshop/WorkshopRoute.tsx`](../..//apps/hauskompass-studio/src/features/workshop/WorkshopRoute.tsx:1) with tabs for zones, timeline, questions, and scenes.
- Users can ingest assets with thumbnails, EXIF, placeholder assets, and camera capture via [`AssetIngestPanel.tsx`](../..//apps/hauskompass-studio/src/features/workshop/components/AssetIngestPanel.tsx:1).
- Users can bulk-import photos with GPS-assisted zone suggestion via [`BulkImportPanel.tsx`](../..//apps/hauskompass-studio/src/features/workshop/components/BulkImportPanel.tsx:1).
- Users can create/delete observations, interpretations, and memories through dedicated components.
- Users can create/edit WorkshopScenes via [`WorkshopSceneEditor.tsx`](../..//apps/hauskompass-studio/src/features/workshop/components/WorkshopSceneEditor.tsx:1).
- HTML scene export exists via [`workshopExport.ts`](../..//apps/hauskompass-studio/src/features/workshop/export/workshopExport.ts:1).
- Backup/export/import exists for metadata JSON and ZIP-with-photos via [`workshopDb.ts`](../..//apps/hauskompass-studio/src/features/workshop/db/workshopDb.ts:383).
- Spatial support exists in separate map and 3D sections in [`src/app/App.tsx`](../..//apps/hauskompass-studio/src/app/App.tsx:749), not inside `WorkshopRoute`.
- Map view exists with zone polygons and GPS photo markers in [`WorkshopMapPanel.tsx`](../..//apps/hauskompass-studio/src/features/workshop/components/WorkshopMapPanel.tsx:159).
- 3D spatial context exists with evidence navigation in [`Workshop3DPanel.tsx`](../..//apps/hauskompass-studio/src/features/workshop/components/Workshop3DPanel.tsx:48).
- GPS metadata review and explicit spatial review fields exist in [`GpsMetadataPanel.tsx`](../..//apps/hauskompass-studio/src/features/workshop/components/GpsMetadataPanel.tsx:1).

## 2. Domain Model Status

- Strongest part of the current Workshop implementation.
- The epistemic distinction is explicit at type level: observations are not interpretations, interpretations are not claims, questions are separate, and memories carry additional consent/citability fields.
- Sensitivity and publication are present on almost all export-relevant entities.
- `WorkshopScene` is modeled as a curated layer, but the current shape still mixes linked references with duplicated scene text:
  - good: `selectedAssetIds`, `selectedObservationIds`, `selectedClaimIds`, `selectedQuestionIds`
  - weaker: `observations`, `interpretations`, `openQuestions` are stored as duplicated strings
- Spatial semantics for assets have started to move beyond raw GPS:
  - `spatialAnchorType`
  - `targetZoneId`
  - `linkedSpatialObjectId`
  - `bearingConfidence`
  - `spatialNotes`
- There is no dedicated domain object yet for:
  - capture session / fieldwork session
  - export review report / redaction report
  - explicit scene evidence safety assessment
  - spatial confidence on scene-level selections

## 3. Persistence Status

- Dexie schema is broad and mostly coherent.
- `workshopDb.ts` centralizes many CRUD and export/import functions, which is helpful for local-first behavior.
- Strengths:
  - clear table ownership
  - blob separation for media
  - project export/import and merge flows
  - quick-start project creation
- Weaknesses:
  - persistence module is too large and accumulates unrelated responsibilities:
    - schema
    - CRUD
    - export/import
    - merge logic
    - quick-start setup
  - several aggregate queries ignore their nominal scope and scan all records:
    - `getZoneAssetCounts(siteId)` ignores `siteId`
    - `getZoneObservationCounts(_siteId)` ignores site
    - `getZoneInterpretationCounts(_siteId)` ignores site
  - `clearProjectSeed()` only clears some project-linked tables and leaves others untouched:
    - assets
    - observations
    - interpretations
    - memories
    - places
    - assessments
    - scenarios
    - asset blobs
  - seed loading currently imports only part of the domain surface and hardcodes empty arrays for several bundle sections.

## 4. UI Status

- Workshop core workflow is already broader than the docs imply.
- Implemented UI surfaces:
  - zone overview with documentation completeness
  - zone detail with asset/observation/interpretation/memory/claim/question sections
  - photo lightbox with inline observation capture
  - scene list, scene detail, scene editor
  - question board
  - timeline
  - bulk import
  - map section
  - 3D section
  - GPS metadata review section
- Strong areas:
  - epistemic distinction is visible in the UI
  - field capture is practical and fast
  - scene editing is already real, not just seeded
  - map and 3D can push focus back into evidence views
- Gaps:
  - WorkshopScene detail does not show linked evidence objects as first-class linked items, only flattened text and selected asset count placeholder state
  - scene editor warns only on asset publication safety, not linked observation/claim/question safety
  - no scene export preview or redaction report
  - no explicit fieldwork backup reminder in the active capture flow
  - no creation/editing UI for claims/questions themselves in the reviewed Workshop surface

## 5. Export Status

- Two distinct export families exist:
  - project backup/export/import in `workshopDb.ts`
  - scene HTML export in `workshopExport.ts`
- Strengths:
  - local backup is real and already useful
  - ZIP export includes media blobs
  - scene HTML export has internal/public modes
- Weaknesses:
  - public scene export filters only on scene `publicationStatus`, not on linked observations/claims/questions
  - current scene safety normalization only checks selected assets in [`sceneSafety.ts`](../..//apps/hauskompass-studio/src/features/workshop/sceneSafety.ts:1)
  - no redaction report
  - no excluded-item report
  - no preview explaining why a scene is blocked from public export
  - internal export does not visibly mark sensitivity beyond scene text content

## 6. Test Coverage

- Workshop-specific tests exist and are useful.
- Covered well:
  - scene publication normalization and persistence
  - placeholder assets and completeness logic
  - spatial asset semantics
  - seed structure integrity
  - some usability-oriented workshop flows
- Coverage weaknesses:
  - many usability tests are local reimplementations rather than tests of production code
  - scene export safety is only tested for asset-based downgrade, not for linked evidence types
  - `WorkshopMapPanel`, `Workshop3DPanel`, and editor UI interactions are barely covered
  - no tests for export preview/reporting because that feature does not exist yet
  - no tests for `clearProjectSeed()` completeness
- Important inconsistency found:
  - [`03-workshop-seed-integrity.test.ts`](../..//apps/hauskompass-studio/tests/usability/03-workshop-seed-integrity.test.ts:202) expects `exportStatus` values `draft|review|approved|exported`
  - domain type and current seed use `not_ready|draft|ready`
  - this test is stale relative to the implemented domain model

## 7. Code Quality Observations

- Positive:
  - domain semantics are unusually explicit for this stage
  - Workshop concerns are separated from renovation-specific UI in most places
  - pure logic helpers like `completeness.ts` and `assetSpatialSemantics.ts` are clean
  - local-first strategy is coherent
- Negative:
  - several files are oversized and bundle too many responsibilities:
    - `WorkshopRoute.tsx`
    - `workshopDb.ts`
    - `GpsMetadataPanel.tsx`
    - `Workshop3DPanel.tsx`
    - `AssetIngestPanel.tsx`
  - UI components still contain domain-policy decisions that should live in reusable safety helpers
  - route-level helper hooks inside `WorkshopRoute.tsx` duplicate data-access patterns already present in `useWorkshopData.ts`
  - current docs sometimes overstate implementation completeness

## 8. Duplicated Logic

- ID generation is repeated across assets, observations, interpretations, memories, and scenes.
- Default publication derivation is repeated with slight variation in:
  - `ObservationPanel.tsx`
  - `MemoryPanel.tsx`
  - `AssetIngestPanel.tsx`
  - `BulkImportPanel.tsx`
- Project-level query hooks are split between:
  - `useWorkshopData.ts`
  - local helper hooks inside `WorkshopRoute.tsx`
- Scene safety logic is partly in:
  - `sceneSafety.ts`
  - `WorkshopSceneEditor.tsx`
  - `workshopExport.ts`
- Spatial review logic exists both as inferred semantics and manual review form behavior without a dedicated adapter/service layer.

## 9. Missing Abstractions

- Scene export safety evaluator covering all linked evidence types
- Export preview/redaction report model
- Shared publication-policy helper for all Workshop entities
- Shared ID generation helper
- Shared capture session concept
- Smaller persistence modules:
  - queries
  - mutations
  - backup/export
  - seed
- Clear adapter boundary for map/3D evidence focus translation

## 10. Fragile or Overly Coupled Areas

- `WorkshopRoute.tsx` couples:
  - seeding
  - tab navigation
  - scene editing
  - export controls
  - asset deletion
  - photo viewer behavior
  - inline project queries
- `workshopDb.ts` is a single failure surface for many unrelated concerns.
- Scene export depends on the scene already containing flattened text, which weakens traceability back to source evidence.
- `seedLoader.ts` reseeding depends on manual `SEED_VERSION` bumps and `clearProjectSeed()`, but the clear function does not symmetrically clear all project data.
- Spatial UI is meaningful, but confidence communication is uneven:
  - assets have explicit spatial semantics
  - map shows approximate zones
  - 3D has source/confidence language
  - scene/export layers do not carry that spatial caution forward

## 11. Missing User Workflows

- export preview with exclusions and reasons
- safe public export review before download
- create/edit claims in-app
- create/edit questions in-app from Workshop surface
- fieldwork session / visit-level checklist inside active workflow
- backup reminder after capture/import
- workflow for scene evidence review beyond assets
- explicit unsupported-claim or evidence-gap inspection view

## 12. High-Value Improvement Opportunities

### A. Scene export hardening across linked evidence

- Highest near-term value because scene editing already exists and public/internal export risk is real.
- Prevents false confidence that public export is safe when linked observations/claims/questions remain internal or review-only.

### B. Scene detail upgrade from flattened text to evidence-first rendering

- Would make WorkshopScene more trustworthy as a curated view over evidence rather than a semi-duplicated note object.

### C. Persistence cleanup for project scoping and reseed safety

- Fix ignored query parameters and incomplete `clearProjectSeed()` behavior.
- High maintainability and data-safety value.

### D. Field capture readiness

- Placeholder assets and completeness already exist.
- Next step would be backup reminders, metadata completeness focus, and capture-session framing.

### E. Evidence graph / link inspector

- Valuable for trust, but broader and riskier than the current sprint should take on.

## Summary

The Workshop mode is already substantial. The biggest strategic strength is the domain model and local-first evidence architecture. The biggest current weakness is that curation and export safety are only partially aligned: the app can already create real WorkshopScenes, but the publication/export logic does not yet evaluate the full linked evidence chain. That makes export hardening the most defensible next bounded improvement unless more urgent data-loss issues are discovered.
