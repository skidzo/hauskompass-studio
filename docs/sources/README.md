# Source Register

This register tracks architecture, standards and evidence sources used by the committed example model. It does not contain private address data, real coordinates or real property documents.

## `source://uploaded/bim-aas-renovation-guideline`

| Field | Value |
| --- | --- |
| Title | Building model using the Asset Administration Shell |
| Publisher | IDTA / buildingSMART |
| Date | 2025-05 |
| Source type | Uploaded PDF: `2025-05_IDTA_BuildingSmart_BIM-Building-model-using-the-AAS.pdf` |
| Project use | Architecture reference for a metadata-first renovation knowledge model |

### Short Summary

The source describes how a BIM building model can be represented and connected through Asset Administration Shell concepts. For this repository, the useful principle is not to implement a full AAS stack immediately. The useful principle is to keep building structure, assets, product data, operational data, evidence and lifecycle states linkable through stable identifiers.

### Relevance To This Project

The project already contains LoD2-derived hull geometry, IFC export experiments, Part 1 sub-element identification, terrain context, PV/solar assessment, roof intervention scenarios, inspection shot lists and metadata validation. This source provides the standards-informed discipline that prevents the repository from turning into disconnected feature data: geometry and context stay in building elements, product specifications stay in asset types, installed/planned items stay in asset instances, and measurements/evidence link back by stable IDs.

### Key Extracted Principles

- Use stable IDs for every relevant building element, zone, asset type, asset instance, measurement, evidence item, requirement and decision.
- Do not duplicate full product or asset specifications into building elements.
- Separate building model data from asset/product data and operational data.
- Treat the building lifecycle broadly enough to include renovation, operation, deconstruction and disposal.
- Link every important claim to evidence, source material or an explicit assumption.
- Keep IFC, BCF, IDS and AAS compatibility as future integration targets, not first-sprint dependencies.
- Support deconstruction/reuse/disposal planning through lifecycle status and evidence links.
- Allow sustainability data such as CO2, EPD references, service life, recyclability, material composition and reuse potential without requiring it for every object immediately.

### Limitations

- This is an architecture and standards-alignment source, not a measured survey, engineering report or renovation design.
- It does not provide complete IFC, BCF, IDS or AAS implementation requirements.
- It should not be used to infer real property facts, dimensions, coordinates or private address data.
- The current repository implementation must remain smaller than the guideline: schemas and examples first, import/export and server integration later.
- Any standard references such as IFC, BCF, IDS and AAS need verification against official specifications before external exchange or certification work.

## `source://uploaded/codex-bim-aas-renovation-handoff`

| Field | Value |
| --- | --- |
| Title | BIM/AAS-Inspired Building Assessment and Renovation Planning |
| Publisher | Uploaded project handoff / private architecture reference |
| Date | 2026-05-12 |
| Source type | Local markdown handoff |
| Project use | Project-specific interpretation of the PDF principles for this private renovation repository |

### Short Summary

The handoff translates the PDF/source principles into this repository's working rule: create a stable, source-aware, evidence-linked building and asset information model that can later grow toward BIM, IFC, BCF, IDS and AAS compatibility.

### Limitations

- This is project guidance, not an external standard.
- It must not introduce private address data or exact coordinates into committed examples.
- It should guide architecture and backlog priorities without forcing a full BIM/AAS implementation.

## Future Source Register Work

- Add source IDs for official buildingSMART IFC, BCF and IDS documentation once integration work begins.
- Add source IDs for product datasheets only when fictional examples are replaced by local private data.
- Add source IDs for site photos, scans and measurements in local-only private storage, not in committed examples.
