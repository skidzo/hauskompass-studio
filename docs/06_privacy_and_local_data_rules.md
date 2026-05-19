# Privacy And Local Data Rules

This repository must be safe to commit.

## Do Not Commit

- private street address
- exact coordinates
- cadastral extracts with identifying details
- personal names or contact details
- photos of private areas
- scans, quotes, permits, or reports containing private data
- real sensor data tied to the property

## Allowed In Committed Examples

- fictional project names
- pseudonymous IDs
- approximate and non-identifying location descriptions
- fictional paths under `private/local-only/`
- placeholder evidence and decisions

## Local Storage

Private project data should remain in ignored locations such as:

- `.env.local`
- `private/`
- `cache/`
- machine-local external folders

## Validation Guardrails

The metadata validator scans example data for common private data patterns:

- exact coordinate fields such as `latitude`, `longitude`, `easting`, or `northing`
- email-like strings
- phone-like strings
- address-like words in committed examples

This is a guardrail, not a complete privacy audit.
