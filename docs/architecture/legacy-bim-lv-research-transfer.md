# Legacy BIM/LV Research Transfer Sprint

This note records the first curated transfer from a private legacy BIM/LV research repository into Hauskompass.

The transfer is intentionally selective. It does not import legacy application code, real IFC files, BoQ files, PDFs, logs, addresses, parcel data or project branding. It turns useful research concepts into Hauskompass-native evidence concepts.

## Imported Concepts

The useful concept set is:

- source references for model, document, measurement and expert evidence;
- evidence quality flags instead of automatic truth labels;
- building element evidence separated from document evidence;
- match candidates as reviewable suggestions;
- explicit review states;
- findings and recommended actions;
- evidence reports that prepare expert conversations.

These concepts now have a small TypeScript foundation in `src/domain/EvidenceInspection.ts` and synthetic tests in `tests/evidenceInspection.test.ts`.

## Sprint Boundary

Included in this transfer sprint:

- neutral architecture note;
- ADR for evidence inspection before matching;
- TypeScript domain types and small deterministic helpers;
- synthetic benchmark-style tests;
- documentation of the future code path.

Excluded from this transfer sprint:

- IFC parsing;
- GAEB, Excel, PDF or OCR parsing;
- matching against real project documents;
- direct adoption of legacy Python or Rust matcher code;
- multi-user workflow;
- cost estimation;
- claims about automatic matching accuracy.

## Future Code Path

The final implementation should be split into three layers:

1. `ifc-inspector`
   Reads IFC-derived metadata and emits `BuildingElementEvidence`. This can later wrap `web-ifc` or another parser, but its output should stay stable.

2. `document-evidence-extractor`
   Reads normalized document inputs and emits `DocumentEvidence`. Each extraction needs source references and quality flags.

3. `evidence-matcher`
   Accepts building and document evidence, emits ranked `MatchCandidate` records and never marks a match as true without review.

The current code only defines the shared evidence vocabulary and review helpers. Parser and matcher implementations should come later behind tested module boundaries.

## Implementation Working Mode

The follow-up code work should use the repository's AI-assisted development discipline:

- write or update the design note before broad implementation;
- keep each implementation wave small enough to review;
- prefer typed boundaries and synthetic tests over broad generated code;
- use context tools for reading/searching and native patches for edits;
- avoid parallel code changes unless file ownership is clearly separated;
- gate larger parser or matcher work with an explicit proposal before coding.

## Review Rules

- Generated or parsed evidence is never measured reality by itself.
- A match score is a sorting aid, not a decision.
- Conflicts and low scores must require human review.
- Findings should lead to inspection, measurement, document request, model update or expert review actions.
- Synthetic fixtures should cover complete, incomplete, ambiguous and contradictory cases before real data is connected.
