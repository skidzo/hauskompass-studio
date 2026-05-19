# Metadata Validation Specification

## Purpose

Define validation expectations for the BIM/AAS-inspired metadata foundation without turning the project into full standards infrastructure.

## Requirements

### Requirement: Schema-backed example metadata

The system SHALL maintain JSON schemas and fictional example metadata for projects, building elements, evidence, assets, measurements, requirements, findings, observations and renovation decisions.

#### Scenario: Example metadata changes

- **WHEN** committed example metadata is modified
- **THEN** it validates against the relevant schema
- **AND** it remains fictional or privacy-safe.

### Requirement: Internal reference validation

The system SHALL validate internal references between example metadata records.

#### Scenario: Linked records are changed

- **WHEN** evidence, findings, requirements, assets, measurements or decisions reference another record
- **THEN** validation detects broken internal references
- **AND** contributors can correct the linked IDs before relying on the example package.

### Requirement: Building model and asset data separation

The system SHALL keep building element records separate from full asset, product, material or datasheet specifications.

#### Scenario: Product-like data is added to a building element

- **WHEN** a building element attempts to duplicate full product or asset specifications
- **THEN** validation or review rejects the duplication
- **AND** the product-specific data belongs in asset type or asset instance records instead.

### Requirement: Standards-informed backlog

The system SHALL treat IFC, BCF, IDS and AAS support as standards-informed backlog unless a focused OpenSpec change explicitly introduces a narrow implementation step.

#### Scenario: A standards-related feature is proposed

- **WHEN** contributors plan IFC, BCF, IDS or AAS work
- **THEN** the proposal identifies the narrow problem being solved
- **AND** it does not introduce full standards infrastructure by default.

