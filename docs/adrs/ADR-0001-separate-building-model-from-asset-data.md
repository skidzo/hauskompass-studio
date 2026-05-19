# ADR-0001: Separate Building Model From Asset Data

## Status

Accepted.

## Context

The project already combines building hull geometry, LoD2 context, terrain, IFC export experiments, Part 1 sub-part identification, roof intervention scenarios, PV assessment, inspection photo planning and metadata validation.

Without a stricter model boundary, the next likely failure mode is duplication: roof elements, rooms, PV plans, sensor plans and product information would each start carrying partial copies of the same asset specifications. That would make later correction, site evidence, product replacement and as-built documentation unreliable.

The uploaded BIM/AAS-inspired architecture reference recommends a metadata-first foundation: stable IDs, evidence links, source awareness, lifecycle states, and future compatibility with IFC, BCF, IDS and AAS without implementing full standards infrastructure immediately.

## Decision

Separate building geometry/context from asset/product/operation data.

Building elements describe physical building context: roof, wall, beam, cellar, zone, terrain, geometry reference, lifecycle status and links.

Asset types describe product or system specifications: manufacturer, model, technical data, documentation, environmental data, service life and warranty template.

Asset instances describe planned, installed, retained, removed or replaced instances: location, linked building elements, serial number, installation date, warranty, condition, maintenance events, measurement references and evidence.

Measurements reference asset instances. Evidence documents and source IDs remain linkable.

## Motivation

- Avoid data duplication.
- Support a long project lifecycle with partial knowledge.
- Allow later IFC/AAS/IDS/BCF integration.
- Support measured evidence and future as-built documentation.
- Keep renovation decisions traceable across baseline, assessment and intervention packages.
- Allow product choice to change without rewriting the building model.
- Allow sensors, maintenance and monitoring data to attach to installed/planned asset instances.

## Consequences

- All relevant objects need stable IDs.
- Geometry objects may reference asset instances.
- Asset instances may reference product types.
- Operational data must reference asset instances.
- Source evidence must be linkable.
- Building elements must not duplicate full asset specifications such as manufacturer, model, serial number, technical data or warranty data.
- The model needs validation rules for controlled status fields and broken internal references.
- The repository can stay lightweight now while preserving a path toward IFC, BCF, IDS and AAS later.

## Non-Goals

- Do not implement a full AAS server.
- Do not implement full IFC parsing in this sprint.
- Do not require proprietary BIM authoring tools.
- Do not expose private address data in examples.
- Do not hard-code real property coordinates.
- Do not assume all data is already known.
- Do not overcomplicate the first version with industrial-level semantics.

## Future Integration Backlog

- IFC import/export mapping from internal `BuildingElement` and `RoomOrZone` to IFC entities.
- BCF-inspired `AssessmentFinding` model for annotated renovation problems, without BCF exchange in the first step.
- IDS-inspired requirement checking for known data completeness and technical constraints.
- AAS package generation from `AssetType`, `AssetInstance`, documentation and measurements.
- AAS server integration only if local JSON and evidence workflows become insufficient.
- Sensor data ingestion once real devices exist and privacy rules are defined.
