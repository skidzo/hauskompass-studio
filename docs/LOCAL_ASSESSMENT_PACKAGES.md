# Local Assessment Packages

Local assessment packages let the app load a private assessment case without committing an exact address, coordinates, parcel records, screenshots or downloaded source files.

The committed app only knows this generic JSON shape. Real packages should stay under ignored paths such as `private/local-assessments/<case>/`.

## Package Shape

```json
{
  "packageVersion": "1",
  "packageId": "local-assessment-example-001",
  "createdAt": "2026-05-16",
  "privacy": {
    "classification": "local_only_private_assessment",
    "storageNote": "Stored under ignored private files.",
    "commitPolicy": "Do not commit exact address data, coordinates, parcel records, screenshots or downloaded source files."
  },
  "subject": {
    "label": "Private assessment case",
    "kind": "campus",
    "description": "Address-agnostic subject summary.",
    "assessmentImplication": "Use ensemble/campus assessment mode."
  },
  "planningRegisters": {
    "buildingFacts": [],
    "assumptions": [],
    "measurementNeeds": [],
    "renovationDecisions": []
  },
  "publicFacts": [],
  "opportunities": [],
  "highPriorityUnknowns": [],
  "sources": [],
  "notes": {
    "currentSoftwareCanCapture": [],
    "mainSoftwareGaps": [],
    "immediateNextSteps": []
  }
}
```

Allowed `subject.kind` values are `single_building`, `ensemble`, `campus`, `pavilion_group`, `site` and `other`.

`planningRegisters` uses the same record shapes as the Planning → Local Registers import:

- `buildingFacts`
- `assumptions`
- `measurementNeeds`
- `renovationDecisions`

## Privacy Boundary

Do not add exact-address fields, coordinates, parcel numbers or local geodata paths to committed package examples. If a private package contains keys such as `address`, `latitude`, `longitude`, `coordinates`, `parcel`, `utm` or `epsg`, the UI loader warns that the file must remain local/private.

## UI Workflow

Use Planning → Local Package to load a package JSON from disk. The app previews package metadata and counts, then can merge the package registers into browser-local planning registers. The browser-local copy is still localStorage only and is not committed automatically.

