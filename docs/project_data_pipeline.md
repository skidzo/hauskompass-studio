# Project Data Pipeline

Stand: 2026-05-19

## Ziel

Projektbezogene Laufzeitdaten sollen nicht mehr verteilt oder implizit verdrahtet sein. Die App laedt sie ueber eine kleine Runtime-Aufloesung pro Projekt.

## Kanonische Laufzeitquellen

`/projects/{slug}/`

- `zone_geometry.json`
- `campus_locations.json`
- `spatial_context.json`
- `seed/project.json`
- `seed/site.json`
- `seed/zones.json`
- `seed/observations.json`
- `seed/claims.json`
- `seed/questions.json`
- `seed/memories.json`
- `seed/event_phases.json`
- `seed/workshop_scenes.json`

Neue Konvention:

`public/local-media/{project-slug}/`

- `media-manifest.json`
- `images/*`

## Runtime-Aufloesung

`src/features/project-data/projectDataLoader.ts`

- liest `/projects/index.json` als primaere Projekt-Registry
- ordnet `projectId` auf `slug` und `siteId` ab
- erzeugt URLs fuer Projektdateien und Seed-Dateien
- kapselt `fetch()` fuer Map, 3D, Bulk-Import und Seed-Loader
- nutzt nur noch einen kleinen internen Fallback, falls die Registry nicht geladen werden kann

## Aktueller Status

- `App` leitet den Workshop-Modus aus dem gewaehlten Built-in-Projekt inklusive `projectId` und `siteId` ab
- `WorkshopMapPanel` laedt `zone_geometry.json` und `campus_locations.json` ueber den Loader
- `Workshop3DPanel` laedt `spatial_context.json` ueber den Loader
- `BulkImportPanel` laedt `zone_geometry.json` ueber den Loader
- `seedLoader.ts` laedt Seed-JSON ueber den Loader
- Seed-Version und Media-Restore-Version werden pro `projectId` in `localStorage` isoliert gespeichert
- der Media-Manifest-Pfad wird pro Projekt aus `/projects/index.json` aufgeloest
- Eiermann-Medien liegen jetzt auch unter der slug-basierten Struktur `public/local-media/eiermann-campus-pascalstrasse-100/`
- 42 lokale Eiermann-Fotos wurden ueber das Manifest in die laufende Workshop-Ansicht integriert
- Karte und Lage-Foto-Panel teilen jetzt einen gemeinsamen Asset-Fokus statt getrennter UI-Zustaende
- Asset-Metadaten tragen jetzt eine erste explizite raeumliche Semantik (`spatialAnchorType`, `targetZoneId`, `linkedSpatialObjectId`, `bearingConfidence`, `spatialNotes`)

## Review-Stand

Die Infrastruktur-Generalitaet ist fuer den Moment ausreichend, um fachliche Arbeit im Eiermann-Projekt weiterzufuehren. Weitere reine Pipeline-Verallgemeinerung hat aktuell weniger Wert als belastbare raeumliche Semantik und deren Reviewbarkeit.

Wichtiger als ein weiterer Loader-Refactor sind jetzt:

- kontrollierbare raeumliche Zuordnung von Foto-Assets,
- explizite Zielbeziehungen zwischen Blickpunkt und Gebaeude / Zone,
- und sichtbare Quellen-/Unsicherheitskommunikation in den Workshop-Surfaces.

## Nächster sinnvoller Schritt

Der naechste sinnvolle Entwicklungsschritt ist ein **Spatial Semantics Review Workflow**:

- `targetZoneId` pro Asset manuell pruef- und korrigierbar machen
- `linkedSpatialObjectId` an Pavillons, Kantine, Parkflaechen oder andere 3D-Objekte bindbar machen
- `spatialNotes` direkt im Asset-/Lage-Kontext pflegbar machen
- `bearingConfidence` sichtbar zwischen EXIF, geschaetzt und verifiziert unterscheiden
- anschliessend dieselben Felder im 3D-Panel, in Workshop-Szenen und spaeteren Exporten verwenden

Erst danach ist ein weiterer Schritt in Richtung generische Medien-Utilities oder weiterer Multi-Project-Abstraktion wieder der beste Einsatz.
