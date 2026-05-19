# Privacy And Local Data Specification

## Purpose

Keep the repository safe to commit while allowing private renovation evidence to remain useful locally.

## Requirements

### Requirement: Private data exclusion

The system SHALL keep exact address data, exact coordinates, photos, scans, private measurements, quotes, permits, reports, personal data and identifying cadastral records out of committed files unless explicitly anonymized and approved.

#### Scenario: Committed examples are prepared

- **WHEN** example metadata, generated showcase output or documentation is committed
- **THEN** it uses fictional or privacy-safe values
- **AND** it does not include private addresses, exact coordinates, private photos or exact property identifiers.

### Requirement: Local-only storage paths

The system SHALL direct real project data and downloaded geodata into ignored or machine-local locations such as `.env.local`, `private/`, `cache/` or external local folders.

#### Scenario: Local assessment material is imported

- **WHEN** private assessment registers or source packages are used
- **THEN** the import path is local-only
- **AND** only address-agnostic or sanitized derived content is allowed into committed examples.

### Requirement: Privacy validation guardrails

The system SHALL provide validation guardrails that scan committed examples for common private-data patterns.

#### Scenario: Metadata validation runs

- **WHEN** the metadata validator checks committed example data
- **THEN** it flags common coordinate, contact and address-like patterns
- **AND** the result is treated as a guardrail rather than a complete privacy audit.

