# Renovation Planning Workflow Specification

## Purpose

Specify the app-facing workflow for facts, assumptions, missing measurements, decisions, local registers, site-visit import and expert-preparation outputs.

## Requirements

### Requirement: Planning registers separation

The system SHALL show facts, assumptions, missing measurements, decisions, local editable registers, site-visit imports and rule-based reasoning as separate planning surfaces.

#### Scenario: Planning section is opened

- **WHEN** a user opens the Planning section
- **THEN** the app provides separate tabs or views for facts, assumptions, missing measurements, decisions, local registers, site-visit import and agentic reasoning
- **AND** the surfaces do not merge assumptions into measured facts.

### Requirement: Local assessment package import

The system SHALL support generic, address-agnostic local assessment package imports that can preview metadata and merge planning registers into browser-local storage.

#### Scenario: A local package is loaded

- **WHEN** a user loads a local assessment package JSON
- **THEN** the app previews package metadata
- **AND** imported planning registers remain browser-local unless intentionally exported through a privacy-safe workflow.

### Requirement: Site-visit evidence preparation

The system SHALL maintain site-visit tasks and photo capture guidance that convert unresolved assumptions into field evidence collection.

#### Scenario: A site visit is prepared

- **WHEN** the user reviews S01-S20 photo or measurement guidance
- **THEN** each capture block supports laser-distance or verification metadata where applicable
- **AND** the guidance prioritizes measurements needed for renovation assessment.

### Requirement: Handoff and showcase outputs

The system SHALL provide sanitized handoff and showcase outputs without leaking private data.

#### Scenario: Generated outputs are refreshed

- **WHEN** the handoff or showcase PDF generation scripts run
- **THEN** generated files summarize the current safe project state
- **AND** public-facing outputs exclude private addresses, exact coordinates, land-record identifiers, private photos and exact property identifiers.

