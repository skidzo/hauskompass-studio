# Web App Data Model

This is the pragmatic data model for the first agentic renovation planning web app. It is intentionally smaller than a full BIM, IFC, AAS, IDS or BCF model.

## Principles

- Keep facts separate from assumptions.
- Keep missing measurements explicit.
- Link risks and decisions to evidence.
- Do not present estimates as measured reality.
- Keep private data local and out of committed examples.
- Prefer stable IDs over display labels.

## BuildingFact

```ts
type BuildingFact = {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  source: string;
  confidence: 'measured' | 'documented' | 'generated' | 'estimated' | 'unknown';
  last_updated: string;
  evidence_links: string[];
};
```

Use for values that the app can state as currently known or derived. If the value is generated or estimated, mark it clearly.

## Assumption

```ts
type Assumption = {
  id: string;
  statement: string;
  why_it_matters: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  affected_decisions: string[];
  required_verification: string;
  status: 'open' | 'needs_site_check' | 'verified' | 'rejected' | 'superseded';
};
```

Use for unresolved statements that influence design, risk or cost.

## MeasurementNeed

```ts
type MeasurementNeed = {
  id: string;
  description: string;
  location_or_component: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggested_method: string;
  blocks_decisions: string[];
};
```

Use for site measurements, photo evidence, inspections or expert checks that unblock decisions.

## RenovationDecision

```ts
type RenovationDecision = {
  id: string;
  decision_title: string;
  current_status: 'not_started' | 'blocked' | 'under_review' | 'ready_for_expert' | 'decided' | 'deferred';
  options: string[];
  dependencies: string[];
  risks: string[];
  evidence_links: string[];
  next_action: string;
};
```

Use for decisions that need traceability across options, constraints and evidence.

## Risk

```ts
type Risk = {
  id: string;
  description: string;
  category: 'moisture' | 'structure' | 'energy' | 'pv' | 'cost' | 'schedule' | 'privacy' | 'data_quality' | 'deconstruction' | 'other';
  likelihood: 'low' | 'medium' | 'high' | 'unknown';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  related_assumptions: string[];
  related_decisions: string[];
};
```

Use for anything that can change design, cost, safety, sequence or evidence confidence.

## EvidenceItem

```ts
type EvidenceItem = {
  id: string;
  title: string;
  type: 'document' | 'photo' | 'generated_model' | 'ifc' | 'terrain' | 'schema' | 'manual_note' | 'site_check' | 'other';
  path_or_reference: string;
  derived_from: string[];
  reliability_notes: string;
};
```

Use for files, generated outputs, source references and local-only evidence pointers.

## Relationship Rules

- A `BuildingFact` can link to one or more `EvidenceItem` records.
- An `Assumption` can affect multiple `RenovationDecision` records.
- A `MeasurementNeed` can block multiple decisions.
- A `Risk` can reference assumptions and decisions.
- A `RenovationDecision` should show dependencies, risks, evidence and next action.
- An agentic response must group output into facts, assumptions, risks, missing information and suggested next actions.

## Local Editable Registers

The first editable implementation stores local working records in browser `localStorage`.

Supported registers:

- `buildingFacts`
- `assumptions`
- `measurementNeeds`
- `renovationDecisions`

These records are local-only working data. They are not automatically committed. Export them before clearing browser data, and move selected records into private or committed project files only after privacy review.

## Site Visit Import

S01-S20 site visit imports use a local JSON format with:

- `visitId`
- `visitDate`
- `device`
- `cameraSettings`
- `blocks`
- `photoFiles`
- `laserMeasurements`

Each laser measurement must include a fixed reference point, distance in meters and station description. This keeps photo context useful for later Gaussian-Splatting, photogrammetry and evidence review without committing private image data.

## What This Model Is Not

- It is not a full IFC schema.
- It is not a full AAS package.
- It is not a BCF issue exchange format.
- It is not a legal or construction specification.
- It is a local reasoning model for evidence-based renovation planning.
