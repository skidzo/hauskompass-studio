# Project Context

## Purpose

House Renovation Baseline is a local-first renovation planning prototype for building an evidence-based baseline of an existing private house before renovation.

The project collects public geodata, local observations and renovation planning metadata into a structured knowledge system with stable IDs, source-aware facts, explicit assumptions, evidence links, missing measurements, risks, decisions and expert-preparation outputs.

## Scope

- Maintain a traceable as-is baseline for the building hull, site context, planning registers and assessment preparation.
- Keep generated, imported, estimated, assumed and measured values distinguishable.
- Preserve fictional committed examples and local-only private project data separation.
- Support expert conversations with architects, engineers, energy consultants and craftspeople.

## Non-Goals

- Do not claim the current model is a complete BIM model, digital twin, structural proof, energy design, moisture diagnosis, construction documentation, PV installation design or legal/permitting assessment.
- Do not implement full BIM, IFC, BCF, IDS or AAS infrastructure until explicitly planned as a later stage.
- Do not commit exact addresses, exact coordinates, photos, scans, private measurements, quotes, permits or identifying cadastral data unless explicitly anonymized and approved.

## Technology

- Vite, React 18, TypeScript and CSS for the frontend.
- Three.js, MapLibre/react-map-gl and web-ifc for 3D, map and IFC viewing surfaces.
- Vitest plus custom JSON schema/reference/privacy/modeling validation.
- Python and Node scripts for generated local data, metadata validation, handoff generation and showcase PDF generation.

## Project Rules

- Preserve existing data, generated artifacts, docs and local/local workflows unless explicitly asked to replace them.
- Keep changes small, coherent and reviewable.
- Update `docs/CURRENT_STATE.md` and `CHANGELOG.md` after meaningful project changes.
- Treat generated artifacts as reasoning aids unless site measurement and expert review confirm them.

