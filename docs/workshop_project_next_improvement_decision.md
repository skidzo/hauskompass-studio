# Workshop Project Next Improvement Decision

**Date:** 2026-05-20
**Status:** implemented

## Candidate Comparison

### Improvement Candidate: A. WorkshopScene Editor Completion
Problem:
The scene editor exists, but the scene detail and export flow still rely partly on flattened scene text and do not fully expose linked evidence as first-class reviewable material.

User Value:
Medium to high. Better curation improves workshop preparation directly.

Responsible Scope:
Workshop scene editing, scene detail rendering, selected evidence references, publication UX.

Affected Domain Objects:
`WorkshopScene`, `Asset`, `Observation`, `Claim`, `Question`

Affected Components:
`WorkshopSceneEditor`, `WorkshopSceneViewer`, `WorkshopRoute`

Affected Persistence:
Possibly none, because the required reference fields already exist.

Risks:
Can sprawl into a full presentation editor.

Technical Debt Impact:
Moderate reduction if source-linked rendering replaces duplicated text dependence.

Maintainability Impact:
Positive if scene behavior becomes more evidence-first.

Test Strategy:
Component logic tests and scene persistence tests.

Estimated Effort:
Medium.

Decision:
Defer. Useful, but export safety is more urgent.

### Improvement Candidate: B. Field Capture Readiness Improvements
Problem:
Field capture works, but there is no visit-level workflow for backup reminders, capture sessions, or explicit follow-up completeness after a site visit.

User Value:
High for real fieldwork.

Responsible Scope:
Capture flow, completeness indicators, backup reminders, possible capture session model.

Affected Domain Objects:
`Asset`, `Observation`, possibly new `CaptureSession`

Affected Components:
`AssetIngestPanel`, `BulkImportPanel`, zone completeness UI

Affected Persistence:
Likely yes if a capture session concept is added.

Risks:
Could add workflow surface faster than the current architecture can absorb.

Technical Debt Impact:
Moderate reduction if capture rules are centralized.

Maintainability Impact:
Positive if kept small.

Test Strategy:
Pure logic tests plus capture-flow tests.

Estimated Effort:
Medium.

Decision:
Defer. Valuable, but publication/export safety is a sharper current risk.

### Improvement Candidate: C. Evidence Graph / Link Inspector
Problem:
The relationship between evidence objects is not surfaced strongly enough for review.

User Value:
High for trust and reviewability.

Responsible Scope:
Evidence linkage inspection, unsupported claims/gaps display, possibly zone or scene evidence tree.

Affected Domain Objects:
`Asset`, `Observation`, `Interpretation`, `Claim`, `Question`, `WorkshopScene`

Affected Components:
New inspector UI, scene and zone detail integration

Affected Persistence:
Probably none initially.

Risks:
UI and interaction design can grow quickly.

Technical Debt Impact:
High positive if it becomes the shared evidence-inspection surface.

Maintainability Impact:
Positive if implemented list/tree first.

Test Strategy:
Pure derivation tests plus limited rendering tests.

Estimated Effort:
Medium to large.

Decision:
Defer. Strong future candidate, but broader than the safest next sprint.

### Improvement Candidate: D. Spatial Confidence and Source-Bound Geometry
Problem:
Map and 3D views are present and useful, but confidence communication is uneven and could still overstate certainty.

User Value:
High for trustworthiness.

Responsible Scope:
Spatial confidence propagation, badges, warnings, geometry/source review, map/3D wording.

Affected Domain Objects:
`Asset` spatial fields, spatial context objects, possibly `Zone`/`Place`

Affected Components:
`WorkshopMapPanel`, `Workshop3DPanel`, `GpsMetadataPanel`

Affected Persistence:
Possibly modest.

Risks:
Touches a wide area of the product surface.

Technical Debt Impact:
High positive.

Maintainability Impact:
Positive if done incrementally.

Test Strategy:
Spatial helper tests and UI warning tests.

Estimated Effort:
Medium to large.

Decision:
Defer. Important, but not the smallest safe sprint.

### Improvement Candidate: E. Assessment Stubs for Workshop Projects
Problem:
The system collects evidence but only weakly supports provisional judgement.

User Value:
Medium to high.

Responsible Scope:
Zone-level assessment stubs and evidence-bound rationales.

Affected Domain Objects:
`CampusAssessment`, `Zone`, `Asset`, `Claim`, `Question`

Affected Components:
New assessment panels and supporting queries

Affected Persistence:
Yes.

Risks:
Easy to become fake scoring.

Technical Debt Impact:
Could help, but only if evidence-linking is strict.

Maintainability Impact:
Neutral to positive.

Test Strategy:
Assessment derivation tests and persistence tests.

Estimated Effort:
Medium.

Decision:
Reject for now. Too easy to formalize judgement before the evidence/export layer is safer.

### Improvement Candidate: F. Public/Internal Export Hardening
Problem:
Workshop material has internal/public distinctions, but current scene export safety only normalizes against selected assets and does not evaluate linked observations, claims, or questions. There is no preview or redaction report.

User Value:
Very high. Prevents publication mistakes and makes export trustworthy.

Responsible Scope:
Scene safety evaluation, export filtering, export preview/reporting, scene editor warnings.

Affected Domain Objects:
`WorkshopScene`, `Asset`, `Observation`, `Claim`, `Question`

Affected Components:
`sceneSafety.ts`, `WorkshopSceneEditor`, `WorkshopRoute` export bar, `workshopExport.ts`

Affected Persistence:
No schema change required.

Risks:
Must avoid turning into a full review workflow. Manual scene text still cannot be auto-classified semantically.

Technical Debt Impact:
High reduction. Centralizes publication policy that is currently scattered.

Maintainability Impact:
High positive.

Test Strategy:
Unit tests for linked-evidence export filtering, editor downgrade logic, and export reporting.

Estimated Effort:
Small to medium.

Decision:
Accept.

### Improvement Candidate: G. Memory and Consent Workflow
Problem:
Memory data has fields for sensitivity, release, and citability, but the workflow is still thin.

User Value:
High for archival credibility and ethics.

Responsible Scope:
Memory review defaults, consent clarity, citability cues, provenance notes.

Affected Domain Objects:
`Memory`

Affected Components:
`MemoryPanel`, export logic, maybe cards/viewers

Affected Persistence:
Likely no schema change required.

Risks:
Can overpromise legal/compliance support.

Technical Debt Impact:
Moderate.

Maintainability Impact:
Positive.

Test Strategy:
Memory policy tests and export tests.

Estimated Effort:
Small to medium.

Decision:
Defer. Important, but export safety should first cover the broader linked evidence path.

### Improvement Candidate: H. Workshop Project Template System
Problem:
Different projects need different starting structures.

User Value:
Medium.

Responsible Scope:
Project templates, starter zones/questions/scenes.

Affected Domain Objects:
`WorkshopProject`, `Zone`, `Question`, `WorkshopScene`

Affected Components:
Quick-start flow and seed/template loading

Affected Persistence:
Yes.

Risks:
Premature generalization and hidden project-type hardcoding.

Technical Debt Impact:
Neutral or negative if rushed.

Maintainability Impact:
Mixed.

Test Strategy:
Template integrity tests.

Estimated Effort:
Medium.

Decision:
Reject for this sprint.

## Selected Sprint

Selected Sprint:
WorkshopScene export hardening with linked-evidence safety checks and export preview reporting

Why this sprint:
The codebase already has real scene creation, editing, backup, map/3D evidence navigation, and public/internal export. The highest-value gap is trust: public export safety is currently narrower than the actual evidence graph used by scenes. Hardening that gap improves workshop usefulness, risk reduction, maintainability, and data safety without introducing a broad new domain concept.

Why not the others now:
- A is partially already implemented and is less urgent than export safety.
- B is valuable but less risky than publication mistakes.
- C and D are broader.
- E is premature before evidence/export rules are stronger.
- G is narrower than the current cross-entity export problem.
- H is premature generalization.

Expected value:
- safer public export
- clearer editor warnings
- transparent exclusion reasons
- stronger alignment between WorkshopScene curation and publication logic
- better confidence that public/internal split is real

Acceptance criteria:
- scene safety evaluation checks linked assets, observations, claims, and questions
- public export excludes scenes with non-public linked evidence
- export UI shows why scenes are excluded from public export
- scene editor warns when linked evidence blocks public publication
- core logic is covered by tests

Out of scope:
- PDF renderer
- drag-and-drop scene ordering
- cloud sharing
- AI-generated scene text
- full evidence graph UI
- legal/compliance workflow for memories
