# Data Model

The metadata model is intentionally small and link-oriented.

## Core Objects

- `BuildingProject`: project-level metadata and privacy mode
- `BuildingElement`: building context, geometry reference and lifecycle status
- `RoomOrZone`: room, attic, cellar, roof zone or monitoring zone context
- `AssetType`: reusable product/system specification such as insulation, PV module, inverter or sensor model
- `AssetInstance`: planned, installed, retained, removed or unknown asset occurrence
- `Measurement`: measured value linked to an asset instance
- `EvidenceDocument` / `EvidenceItem`: document, photo, measurement note, scan, datasheet or inspection source
- `Requirement`: lightweight IDS-inspired requirement that can later be checked
- `Assumption`: explicit unresolved or inferred statement
- `RenovationDecision`: decision record with alternatives, risks, and dependencies
- `ObservationStream`: future sensor or operational data stream metadata

## Relationship Pattern

Objects link to each other by stable IDs:

- building elements link to asset instances, evidence and assumptions
- room/zone records link to asset instances and geometry references
- asset instances link to asset types and building elements
- measurements link to asset instances
- requirements link to building elements and asset instances
- assumptions link to evidence and related objects
- decisions link to related objects, evidence, and assumptions
- observation streams link to related objects

The first validator checks these internal references across the example dataset.

## Building / Asset Separation

Do not duplicate full asset specifications into each building element.

`BuildingElement` should contain only physical context: id, type, name, description, location, geometry reference, lifecycle status, linked asset IDs, evidence IDs and source IDs.

`AssetType` should contain product-level data: manufacturer, model, category, technical data, documentation references, environmental data, service life and warranty template.

`AssetInstance` should contain planned or installed occurrence data: asset type reference, location, host building elements, serial number, installation date, warranty dates, condition, maintenance events, measurement references and evidence.

This separation is required for roof insulation, PV, HVAC, sensors, moisture monitoring and deconstruction planning because product choices and measurements can change without rewriting the geometry model.

## Confidence Model

- `confirmed`: directly measured or verified by trusted document or expert
- `high`: reliable imported or public data, plausibly cross-checked
- `medium`: derived estimate from partial data
- `low`: rough assumption
- `unknown`: placeholder, needs review

## Status Model

Building element lifecycle status:

- `existing`
- `planned`
- `retained`
- `demolished`
- `temporary`
- `unknown`

Asset instance lifecycle status:

- `existing`
- `planned`
- `installed`
- `removed`
- `replaced`
- `unknown`

Legacy metadata records may still use workflow status values such as `draft`, `needs_review`, `verified`, `superseded`, `rejected` and `archived`.
