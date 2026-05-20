# Development Workspace Pointer

Repo-governance, ADR, tooling-structure, and architecture-reuse working documents for `hauskompass-studio` now live outside the public app repo at:

- `../../docs/hauskompass-studio-dev/`

Rationale:
- these files support solo development and agent-assisted planning,
- they are not required for app runtime, build, or exchange format compatibility,
- the public source repo should keep executable code, user-facing docs, and product-domain material, not every internal planning artifact.

What stays in the repo:
- runtime source under `src/`
- tests under `tests/`
- executable repo tools under `tools/`
- executable Python utilities under `utils/py/`

What moved out:
- ADRs
- architecture reuse analysis
- OSS/dependency review
- repo governance and structure notes
- utility migration planning
- folder governance README notes
