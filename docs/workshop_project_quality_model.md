# Workshop Project Quality Model

**Date:** 2026-05-20

This document defines what "good" means for the Workshop Project implementation in Hauskompass Studio.

## 1. Capture Quality

A good Workshop Project implementation lets a user document a place quickly and reliably.

Required qualities:

- photos can be added with minimal friction
- videos and non-photo assets fit the same evidence model
- placeholder assets are allowed when something must be noted before media exists
- observations can be captured without filling a large form
- zone assignment is visible and editable
- place assignment is possible where needed, but not forced too early
- missing metadata is visible, not hidden
- fieldwork data can be backed up immediately after a visit

Quality bar:

- capture must be usable under time pressure
- placeholders must remain first-class evidence placeholders, not broken records
- missing metadata must create visible follow-up work, not silent ambiguity

## 2. Evidence Quality

The system must preserve epistemic distinctions.

The following are different objects with different responsibilities:

- observation
- interpretation
- claim
- memory
- question
- assessment
- scenario
- workshop scene

Quality bar:

- no UI path should flatten these into generic notes
- linked evidence should remain traceable to source records
- WorkshopScene is a curated view, not a replacement for source evidence
- assessments must cite evidence, not merely summarize intuition

## 3. Spatial Quality

The user must be able to understand where something belongs without the software pretending to know more than it does.

Required spatial layers:

- site
- zone
- place
- map
- optional 3D view
- spatial confidence
- source-bound geometry

Quality bar:

- approximate geometry must look approximate
- inferred positions must not be styled like surveyed facts
- asset location and asset target can differ and should remain distinguishable
- spatial review should preserve source provenance, confidence, and notes

## 4. Workshop Quality

The system must help turn evidence into discussion-ready material.

Required capabilities:

- scenes
- prompts
- selected evidence
- open questions
- internal/public variants
- exportable review packages

Quality bar:

- a scene must clearly state its purpose, question, and source evidence
- public/internal export must be intentional, not implicit
- workshop outputs must remain tied to uncertainty and evidence provenance

## 5. Sensitivity Quality

The system must protect sensitive and not-yet-cleared material by default.

Protected material includes:

- personal memories
- unpublished material
- uncertain claims
- internal notes
- sensitive photos
- do-not-publish assets

Quality bar:

- sensitivity and publication are explicit on relevant entities
- public export cannot silently include blocked material
- uncertainty and release constraints remain visible to the editor
- consent/citability fields are visible for memory-like material

## 6. Assessment Quality

The system should help users move from collected material to structured judgement without pretending that judgement is objective.

Required support:

- documentation status
- uncertainty
- workshop relevance
- decision relevance
- transformation potential
- open risks

Quality bar:

- assessments remain provisional
- assessments must point back to evidence
- scoring must not replace reasoning
- unknowns stay visible

## 7. Maintainability Quality

The implementation must remain understandable, adaptable, and safe to extend.

Required engineering properties:

- domain logic stays out of UI components where possible
- external libraries are wrapped behind thin adapters or focused modules
- shared concepts are reused instead of hardcoding workshop-specific variants
- tests remain green and relevant
- unnecessary dependencies are avoided
- local-first architecture is preserved

Quality bar:

- publication and safety rules should be centralized
- large files should be split when they mix too many concerns
- seed data, persistence, export, and UI must not drift semantically
- docs must describe real behavior, not planned behavior

## Cross-Cutting Quality Rules

- The app should structure complexity, not erase it.
- Uncertainty is a first-class output.
- Scenes and exports must remain evidence-bound.
- Spatial views must not fabricate precision.
- Sensitive content must fail safe.
- The Workshop domain must stay separate from renovation diligence concepts unless the concept is truly shared evidence infrastructure.
