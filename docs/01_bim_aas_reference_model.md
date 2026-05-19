# BIM/AAS Reference Model

This project adapts BIM and Asset Administration Shell ideas pragmatically for a private renovation workflow.

## Reference Interpretation

The architectural reference is the BIM/AAS integration pattern described in the handoff document. The useful principle is not a full platform implementation. The useful principle is that building structure, assets, documents, assumptions, and future observations must be linkable through stable identifiers.

## Four Linked Layers

## Building Twin Layer

Represents the physical building and its spatial structure:

- site and terrain
- building hull
- roof surfaces
- walls and facades
- openings
- rooms or zones
- structural and renovation-relevant areas

This layer is IFC-oriented, but the first implementation stores metadata and references only.

## Asset Twin Layer

Represents systems, products, and components:

- heating equipment
- PV components
- windows and doors
- insulation build-ups
- roof elements
- reusable materials
- sensors or technical equipment

The first implementation is AAS-inspired JSON, not a full AAS server.

## Evidence Layer

Represents the local common data environment:

- photos
- measurements
- documents
- geodata extracts
- drawings
- expert notes
- quotes
- assumptions
- decisions

Evidence is the primary trust layer. Every important claim should link back to evidence or clearly declare that it is an assumption.

## Observation Layer

Prepared for later operation or monitoring data:

- humidity
- temperature
- energy consumption
- PV production
- water ingress events
- comfort observations

The first implementation defines `ObservationStream` metadata only. It does not store real sensor data.
