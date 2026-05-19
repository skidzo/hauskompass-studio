# Hauskompass Studio

Ein lokales, source-gebundenes Arbeitsstudio für die Analyse, Dokumentation und workshopfähige Aufbereitung komplexer Gebäude- und Campusorte.

## Zweck

Das System verbindet räumliche, historische, ökologische, soziale und organisatorische Informationen über einen Ort so, dass er in Workshops besser verstanden, diskutiert und weiterentwickelt werden kann.

**Workshop-Anwendungsfall:** Strukturierte Dokumentation von Campusorten, Baudenkmälern und komplexen Gebäuden — Zonen, Beobachtungen, Szenen, interaktiver Export.

**Renovierungs-Anwendungsfall:** Evidenzbasiertes Sanierungsmodell mit LoD2-Geometrie, Geländeschnitt, Bestandsbefund und lokaler Renovierungsplanung.

## Bring Your Own Data

Das Projekt enthält keine Projektdaten im Repository. Eigene Projekte werden über eine `project.config.json` eingebunden:

```bash
export HAUSKOMPASS_PROJECT_CONFIG=$HOME/projekte/<mein-projekt>/project.config.json
npm run dev
```

Projektdaten (Seed-JSONs, Mediendateien) liegen lokal in `public/projects/<slug>/` — dieses Verzeichnis ist gitignored.

## Kein fertiges BIM-Modell

Das System ist kein vollständiges BIM-Modell, kein AAS-Server und keine Baukonstruktionsplanung. Es ist ein quellenbewusstes Erkenntnissystem, das Unsicherheiten sichtbar macht statt sie zu glätten.

## Datenschutz & Sensitivität

Adressdaten, Fotos, Scans, Messdaten und Nachlassmaterial bleiben lokal und sind aus git ausgeschlossen. `.env.local`, `private/` und `cache/` für reale Projektdaten. Jedes Datenobjekt hat einen `sensitivityLevel` (`public | internal | sensitive_personal | restricted | unknown`) und einen `publicationStatus`.

## Domain-Modell

Das Fachmodell folgt diesem Evidenz-Fluss:

```
Ort (Zone/Place) → Asset → Observation → Interpretation → Claim → Question
                 → Assessment → Scenario → WorkshopScene → Export
```

Vollständige Typen: `src/domain/workshop/types.ts`  
Fachmodell-Dokumentation: `docs/domain_model.md`

## Architectural References

OpenPV and simshady are references for map, 3D geometry and shading/PV analysis patterns. OpenPV website code must not be copied directly because of AGPL-3.0 license implications. `@openpv/simshady` can be evaluated later as an isolated optional dependency.

## Development

```bash
npm install
npm run dev             # Dev-Server (http://localhost:5173 oder nächster freier Port)
npm test                # Unit-Tests
npm run validate:metadata   # JSON-Schema-Validierung
npm run handoff:codex   # Codex-Handoff generieren
```

## Struktur

```txt
src/domain/workshop/types.ts   — Domain-Typen für Workshop-Assessment (Zone, Asset, Claim, ...)
src/domain/                    — Shared-Typen (DataConfidence, EvidenceItem, Geometrie)
src/features/                  — Feature-Module (assessment, renovation, map-view, ...)
examples/                      — Beispiel-Schemata und JSON-Vorlagen
docs/domain_model.md           — Domain-Modell-Dokumentation
docs/project_vision.md         — Projektvision
docs/implementation_plan.md    — Iterationsplan
schemas/                       — JSON-Schemas (BIM/AAS-inspiriert, Sanierungsobjekte)
```

## Architektur-Kernprinzipien

- **Quellengebundenheit**: Jeder Claim braucht mindestens eine Quellreferenz
- **Epistemic-Typen**: `verified_fact | observation | interpretation | memory | hypothesis | disputed_claim | open_question` — keine Glättung
- **Sensitivity-Level**: `public | internal | sensitive_personal | restricted | unknown` — jedes Objekt
- **Capture-first**: Vor-Ort-Material hat Vorrang vor technischer Ausarbeitung
- **Local-first**: kein Cloud-Zwang, persönliche Daten bleiben lokal

Key architecture documents:

```txt
docs/sources/README.md
docs/concepts/bim-aas-integration-for-renovation.md
docs/adrs/ADR-0001-separate-building-model-from-asset-data.md
docs/architecture/asset-data-model.md
```

Future IFC, BCF, IDS and AAS support is treated as a standards-informed backlog, not as a first-sprint implementation requirement.

## Showcase PDF

Run `npm run generate:showcase-pdf` to regenerate the sanitized public-facing prototype extract at `docs/showcase/renovation_planning_prototype_5page.pdf` from the app route `/showcase`.

The showcase source lives in `src/features/showcase/` as typed data plus a dedicated React route. It maps selected Planning seed data into the showcase panels instead of duplicating full content. The browser view can opt into local register data with `/showcase?includeLocalRegisters=1`, but the generated public PDF uses sanitized seed data only. It must not include private addresses, coordinates, land-record identifiers, private photos or exact property identifiers, and generated or estimated values must remain labeled as such.

## Lokale Projektordner

Reale Projektmaterialien liegen außerhalb dieses Git-Repositories in einem lokalen Projektordner deiner Wahl. Konfiguration über Umgebungsvariable:

```bash
export HAUSKOMPASS_PROJECT_CONFIG=$HOME/projekte/<mein-projekt>/project.config.json
npm run dev
```

Ohne diese Umgebungsvariable nutzen die Python-Skripte `project.config.example.json`.

## Manual Smoke Test

1. Run `npm run validate:metadata`.
2. Run `npm test -- --run`.
3. Run `npm run dev`.
4. Open the local Vite URL and verify the sidebar shows `Planning`, `Site`, `Building`, `Assessment & Reuse`, and `Data`.
5. In `Planning`, check that facts, assumptions, missing measurements, decisions, local registers, site-visit import and agentic reasoning are shown as separate tabs.
6. Confirm generated or estimated values are visibly labeled and not presented as measured reality.
