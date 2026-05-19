# Project Context Specification

## Purpose

Capture the baseline identity, limits and operating rules of the renovation planning system.

## Requirements

### Requirement: Local-first renovation baseline

The system SHALL operate as a local-first renovation baseline for a private house, focused on evidence organization and uncertainty reduction before renovation decisions.

#### Scenario: Repository purpose is presented

- **WHEN** a contributor reads the project context
- **THEN** it identifies the repository as a local, private renovation planning prototype
- **AND** it frames the first milestone as a traceable as-is baseline rather than a finished planning model.

### Requirement: Explicit model limits

The system SHALL state that current outputs are not a complete BIM model, digital twin, construction-ready CAD/BIM, structural proof, energy design, moisture diagnosis, PV installation design or legal/permitting assessment.

#### Scenario: Generated model output is reviewed

- **WHEN** generated geometry, terrain, IFC, PV, assessment or scenario data is shown
- **THEN** the output remains labeled as generated, estimated, assumed or requiring verification where applicable
- **AND** the system does not present it as measured reality.

### Requirement: Evidence-based renovation reasoning

The system SHALL organize renovation reasoning around stable IDs, source-aware facts, explicit assumptions, evidence links, missing measurements, risks, decisions and expert-preparation outputs.

#### Scenario: New planning content is added

- **WHEN** a contributor adds planning content
- **THEN** measured facts, imported data, generated outputs, estimates and assumptions remain distinguishable
- **AND** unresolved uncertainties are documented instead of hidden.

