# Project Context

This repository supports a private, local-first building assessment and renovation planning workflow.

The first product goal is a computable as-is baseline for an existing building. The baseline should capture what is known, what is inferred, what is assumed, and what still needs field verification.

The project is not a full BIM authoring tool, not a full Asset Administration Shell server, and not a construction-ready engineering model. It is a structured evidence and decision workspace for early renovation planning.

## Core Questions

- What do we know about the existing building?
- Which facts are measured, imported, estimated, or assumed?
- Which building elements are relevant for renovation decisions?
- Which evidence supports each element, asset, assumption, and decision?
- Which decisions are blocked by missing information?

## Initial Scope

- Metadata-first baseline model
- JSON schemas for core renovation planning objects
- Fictional example data
- Local validation for schema shape, references, and privacy guardrails
- Documentation for evidence, identifiers, decisions, and privacy rules

## Non-Goals

- Full IFC authoring
- Full AAS server implementation
- Facility management platform
- Structural verification
- Permit or construction documentation
- Committed private address, coordinate, cadastral, photo, or personal data
