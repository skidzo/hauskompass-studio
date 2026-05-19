# Evidence Baseline Specification

## Purpose

Define how building, site and assessment information is treated as traceable evidence rather than unqualified truth.

## Requirements

### Requirement: Source-aware evidence records

The system SHALL model project knowledge with source references, evidence quality, review states and links to the affected building elements, findings, requirements or decisions.

#### Scenario: Evidence is imported or generated

- **WHEN** public geodata, generated geometry, IFC metadata, document evidence or local assessment records are introduced
- **THEN** the records retain their source context
- **AND** the system exposes whether the information is imported, generated, estimated, assumed or measured.

### Requirement: Reviewable evidence matching

The system SHALL treat automatic or rule-based evidence matches as reviewable suggestions until ambiguity and contradiction tests support stronger claims.

#### Scenario: Evidence candidates are produced

- **WHEN** an adapter emits match candidates between source evidence and building elements
- **THEN** each candidate is presented with review state and quality context
- **AND** the system avoids claiming automatic matching accuracy beyond the available tests.

### Requirement: Missing measurements as tasks

The system SHALL convert unresolved renovation uncertainties into explicit measurement or inspection tasks.

#### Scenario: Serious assessment gaps are displayed

- **WHEN** the app presents missing measurements for roof, walls, moisture, cellar, openings, PV, legal or structural topics
- **THEN** each item explains why it matters and how it should be checked
- **AND** the item remains open until measured evidence or expert assessment resolves it.

