# Asset Data Model

This document defines the first practical model boundary for renovation planning. The core rule is:

```text
BuildingElement = geometry/context/lifecycle
AssetType = product/system specification
AssetInstance = planned/installed/retained/removed instance
Measurement = observed value from or about an asset instance
EvidenceDocument = source material for claims
Requirement = lightweight information or performance requirement
AssessmentFinding = internal issue linking photos, defects, requirements and decisions
```

Do not duplicate full asset specifications into building elements.

## BuildingElement

Represents a physical or spatial building object such as roof, wall, beam, foundation, cellar, opening, terrain, planned PV zone or temporary support context.

Required fields:

- `id`
- `type`
- `name`
- `description`
- `location`
- `geometryRef`
- `status`: `existing | planned | retained | demolished | temporary | unknown`
- `linkedAssetIds`
- `evidenceIds`
- `sourceIds`

Use `linkedAssetIds` to point to asset instances. Do not store manufacturer, model, serial number, product datasheet or warranty data here.

## RoomOrZone

Represents a room, attic, cellar, roof zone, service zone or environmental monitoring zone.

Required fields:

- `id`
- `name`
- `floor`
- `function`
- `geometryRef`
- `environmentalRequirements`
- `linkedAssetIds`

`environmentalRequirements` can hold practical targets such as humidity range, temperature range, ventilation need or moisture monitoring requirement. Detailed sensor specification belongs in `AssetType` and `AssetInstance`.

## AssetType

Represents a reusable product, system or component type. It is not tied to one physical location.

Required fields:

- `id`
- `name`
- `manufacturer`
- `model`
- `category`
- `technicalData`
- `documentationRefs`
- `environmentalData`
- `serviceLife`
- `warrantyTemplate`
- `sourceIds`

Examples: insulation system, vapor barrier, roof window, PV module, inverter, mounting system, humidity sensor, temperature sensor.

## AssetInstance

Represents one planned, existing, installed, removed, replaced or unknown asset instance.

Required fields:

- `id`
- `assetTypeId`
- `name`
- `status`: `existing | planned | installed | removed | replaced | unknown`
- `locationRef`
- `buildingElementRefs`
- `serialNumber`
- `installationDate`
- `warrantyStart`
- `warrantyEnd`
- `condition`
- `maintenanceEvents`
- `measurementRefs`
- `evidenceIds`
- `sourceIds`

`assetTypeId` may be empty only when the type is genuinely unknown. Once a datasheet or product candidate exists, use an `AssetType` and reference it.

## Measurement

Represents a value measured about an asset instance or by an asset instance.

Required fields:

- `id`
- `assetInstanceId`
- `measurementType`
- `timestamp`
- `value`
- `unit`
- `method`
- `confidence`
- `sourceId`

Every measurement must reference an asset instance. For example, humidity readings reference a humidity sensor instance; manual moisture readings can reference a temporary manual measurement asset instance if needed.

## EvidenceDocument

Represents a source artifact such as photo, PDF, scan, manual, quote, invoice, datasheet, inspection note or plain note.

Required fields:

- `id`
- `type`: `photo | pdf | scan | manual | quote | invoice | datasheet | inspection | note`
- `title`
- `filePath`
- `sourceDate`
- `capturedAt`
- `relatedBuildingElementIds`
- `relatedAssetInstanceIds`
- `notes`

Real files with private property data should stay in local-only folders. Committed examples must use fictional placeholder paths.

## Requirement

Represents a lightweight information, performance, placement or validation requirement.

Required fields:

- `id`
- `appliesTo`
- `requirementType`
- `description`
- `minValue`
- `maxValue`
- `unit`
- `source`
- `priority`
- `validationStatus`

`Requirement` is IDS-inspired but intentionally smaller. Requirements can later be checked against known measurements, geometry and asset metadata.

## AssessmentFinding

Represents a lightweight internal issue or assessment finding. It is inspired by BCF but does not implement BCF exchange.

Required fields:

- `id`
- `title`
- `findingType`
- `description`
- `status`: `open | in_review | resolved | deferred | rejected | superseded`
- `severity`
- `priority`
- `relatedBuildingElementIds`
- `relatedAssetInstanceIds`
- `evidenceIds`
- `requirementIds`
- `decisionIds`
- `location`
- `viewpoint`
- `createdAt`
- `updatedAt`
- `sourceIds`

Use `AssessmentFinding` for defects, missing information, requirement gaps, design issues, maintenance issues and deconstruction issues. A finding may reference photos, model geometry, planned assets, requirements and renovation decisions. This provides the useful BCF pattern without starting full BCF import/export.

## Renovation-Specific Mapping

### Roof Renovation

Model with `BuildingElement`:

- existing roof structure
- retained visible timber elements
- demolished elements
- temporary support structures
- planned insulation layers
- planned PV zones
- snow/rain protection extensions
- wind exposure zones

Model with `AssetType` and `AssetInstance`:

- insulation system
- vapor barrier
- roof window
- PV module
- inverter
- mounting system
- humidity sensor
- temperature sensor

### Building Services

Use asset type and asset instance separation for:

- heating
- ventilation
- electrical
- water
- drainage
- smart-home sensors
- monitoring devices

### Deconstruction

Every relevant element should be classifiable as:

- existing and retained
- existing and removed
- new
- temporary
- unknown

Use `status` on `BuildingElement` and `AssetInstance` first. Add disposal/reuse information as optional technical or environmental data until a dedicated deconstruction schema is needed.

### Sustainability

The model allows future storage of:

- CO2 data
- EPD references
- service life
- recyclability
- material composition
- reuse potential

This data is optional in sprint one because most values will not be known before product selection and site verification.

## Validation Rules In Sprint One

- Every asset instance must have a stable ID.
- Every asset instance may reference an asset type; if it does, the asset type must exist.
- Every measurement must reference an asset instance.
- Every building element may reference multiple asset instances; referenced instances must exist.
- Status fields must use controlled vocabularies.
- Source/evidence links must remain explicit.
- Building elements must not contain full asset/product/operation fields.
- Assessment findings must reference existing building elements, evidence, requirements and decisions where those links are provided.
