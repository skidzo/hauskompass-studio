# Evidence Workflow

Evidence is the trust backbone of the project.

## Workflow

1. Add an `EvidenceItem` with a stable ID and fictional or local-only file path.
2. Link the evidence to related building elements, assets, assumptions, or decisions.
3. Record reliability.
4. Use assumptions when evidence is incomplete.
5. Upgrade confidence only after measurement, document review, or expert review.

## Evidence Types

- `photo`
- `measurement`
- `geodata`
- `document`
- `expert_note`
- `user_note`
- `climate_data`
- `quote`
- `permit`
- `drawing`
- `inspection`

## Reliability

Evidence reliability should reflect the source and certainty:

- `confirmed`
- `high`
- `medium`
- `low`
- `unknown`

## Local File Handling

Example data may use fictional paths such as `local/local-only/example-photo.jpg`. Real files must remain uncommitted unless they are deliberately anonymized and cleared for repository use.
