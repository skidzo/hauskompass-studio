# ADR-0002: Evidence Inspection Before Matching

## Status

Accepted.

## Context

Hauskompass already separates measured facts, generated data, assumptions, missing measurements, risks and renovation decisions. Future IFC/document workflows will add another risk: parsed model metadata and document lines may look precise while still being incomplete, stale, ambiguous or contradictory.

Private legacy BIM/LV research contains useful ideas around IFC metadata inspection, document-to-building-evidence matching, evidence reports and human review. It also contains implementation and data artifacts that should not be imported directly.

## Decision

Introduce a Hauskompass-native evidence inspection vocabulary before implementing IFC/document matching.

The first code foundation is `EvidenceInspection.ts`, which defines:

- `EvidenceSourceRef`
- `EvidenceQuality`
- `BuildingElementEvidence`
- `DocumentEvidence`
- `MatchCandidate`
- `ReviewState`
- `EvidenceFinding`
- `RecommendedAction`
- `EvidenceReport`

Match candidates are suggestions. They must carry reasons, conflicts, score and review state. Helpers may rank suggestions and identify review need, but they must not claim automatic correctness.

## Consequences

- Future IFC extraction and document extraction can be built behind stable output types.
- Tests can use synthetic fixtures before any real IFC, BoQ, offer or report data is connected.
- Evidence reports can prepare expert conversations without overclaiming model accuracy.
- Parser and matcher choices remain replaceable.
- Real project files remain local/private unless explicitly anonymized and approved.

## Non-Goals

- Do not implement full IFC parsing in this sprint.
- Do not implement GAEB, Excel, PDF or OCR extraction in this sprint.
- Do not import legacy matcher code directly.
- Do not include private IFC, PDF, quote, offer, scan, photo, parcel or coordinate data.
- Do not claim automated BIM/LV matching accuracy.

## Future Backlog

- Add synthetic IFC metadata fixtures.
- Add synthetic document evidence fixtures.
- Add a small `ifc-inspector` adapter that emits `BuildingElementEvidence`.
- Add a document extractor adapter that emits `DocumentEvidence`.
- Add a matcher implementation only after synthetic contradiction and ambiguity tests exist.
- Surface evidence findings and recommended actions in the Planning or Assessment UI.

