# Site Visit Import Workflow

This workflow imports S01-S20 photo block metadata and laser-distance measurements into the local web app. It does not upload photos and does not commit private image data.

## Purpose

After the site visit, keep the photo capture context useful for Gaussian-Splatting, photogrammetry and later evidence review:

- which S-block was captured;
- which photo files belong to the block;
- which fixed reference point was used;
- laser distance from photo position to reference point;
- camera height and station description where available;
- notes about light, obstructions or uncertainty.

## Privacy Rule

Real photo files stay local. The import records should be stored in browser localStorage first or in ignored private folders such as:

```text
local/site-visits/
```

Do not commit private photos, exact coordinates or address-bearing metadata.

## JSON Format

```json
{
  "visitId": "local-visit-YYYY-MM-DD",
  "visitDate": "YYYY-MM-DD",
  "device": "Fairphone Gen 6",
  "cameraSettings": "4:3, main camera 1x, grid on, flash off, no digital zoom",
  "blocks": [
    {
      "id": "S07",
      "photoFiles": ["YYYY-MM-DD_S07_ostansicht_eingang_01.jpg"],
      "laserMeasurements": [
        {
          "referencePoint": "Lower outside corner of EG entrance threshold left of Wintergarten",
          "distanceM": 6.42,
          "stationDescription": "Standing east of entrance, camera held at eye height",
          "cameraHeightM": 1.5
        }
      ],
      "notes": "Good overlap, no people in frame."
    }
  ]
}
```

## App Workflow

1. Open the app with `npm run dev`.
2. Go to `Planning`.
3. Open `Site Visit Import`.
4. Paste or edit the JSON.
5. Click `Validate and import locally`.
6. Export the local JSON if you want to preserve it outside browser localStorage.

## Validation Rules

- `visitId`, `visitDate` and `device` are required.
- Each block ID must be between `S01` and `S20`.
- A block must have at least one photo filename.
- A block must have at least one laser measurement.
- Laser distance must be greater than zero.
- Reference point and station description are required.
- Duplicate S-block IDs are rejected.

## Relationship To The Printed Shot List

Use `docs/FOTOLISTE_BEGEHUNG_S01_S20.md` in the field. Use this import workflow after the visit to transfer the relevant photo filenames and laser-distance metadata into structured local data.
