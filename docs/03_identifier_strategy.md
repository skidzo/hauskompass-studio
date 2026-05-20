# Identifier Strategy

Stable identifiers are required before detailed geometry or automation can be trusted.

## Rules

- Never include private street addresses in IDs.
- Never include exact coordinates in IDs.
- Use project-local pseudonymous IDs.
- Keep IDs stable once evidence or decisions reference them.
- Prefer readable IDs over opaque generated strings when they do not reveal private information.

## URI Patterns

```text
project://{project_id}
building://{project_id}/element/{element_id}
asset://{project_id}/{asset_type}/{asset_id}
evidence://{project_id}/{evidence_id}
assumption://{project_id}/{assumption_id}
decision://{project_id}/{decision_id}
observation://{project_id}/{stream_id}
```

## Private Data Boundary

Committed IDs must be pseudonymous. Private address, cadastral details, exact coordinates, photos, scans, and field measurements belong in ignored local storage such as `.env.local`, `local/`, or another non-committed location.

## Reference Integrity

Any field named `*Refs` must point to known IDs in the local metadata graph. `parentId` fields must point to existing parent objects.
