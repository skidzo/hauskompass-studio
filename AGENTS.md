# Agent Instructions

This repository supports a private, software-driven building renovation planning project.

Future coding agents must:

- preserve existing data, generated artifacts and documentation unless explicitly asked to replace them;
- distinguish measured facts from imported, generated, estimated or assumed values;
- avoid overclaiming model accuracy;
- keep renovation reasoning evidence-based;
- document assumptions and unresolved uncertainties;
- avoid destructive refactors and avoid deleting local/private workflows;
- update `docs/CURRENT_STATE.md` and `CHANGELOG.md` after meaningful changes;
- keep private address data, exact coordinates, photos, scans, quotes and measurements local and out of commits unless explicitly anonymized and approved;
- keep source files, generated files and local-only private artifacts clearly separated;
- prefer small, coherent, reviewable changes over large rewrites;
- do not implement full BIM, IFC, BCF, IDS or AAS infrastructure unless the project explicitly reaches that stage.

The project goal is a practical renovation knowledge system first: stable IDs, source-aware facts, explicit assumptions, evidence links, missing measurements, risks, decisions and expert-preparation outputs.
