# Changelog

## v0.1.0 — 2026-05-19

- **ZIP-Backup mit Fotos**: `exportWorkshopBundleZip()` / `importWorkshopBundleZip()` via fflate; DataBackupBar bietet "ZIP-Backup (mit Fotos)" und "JSON (nur Metadaten)"; Startseite akzeptiert .zip und .json beim Import

- **Backup-Import auf Startseite**: `importWorkshopBundle()`, Datei-Picker-Button "Aus Backup wiederherstellen", kein Neustart und keine Umgebungsvariable nötig

- **Robustheit**: `.catch()`-Handler auf allen `seedProject()`-Aufrufen — Ladeanzeige friert nicht mehr ein wenn Seed-Dateien fehlen

- **README neu**: vollständige Laien-Anleitung (Schnellstart, Datenschutz, Installation, Backup/Restore), technische Details in aufklappbarem `<details>`-Block

- **Laien-Usability: Workshop-Schnellstart**: "Workshop starten"-CTA auf Startseite, `WorkshopQuickStartDialog`, `createQuickStartWorkshop()`, `QUICK_START_MARKER` verhindert seedProject-Überschreibung, ObservationForm vereinfacht, 18 Usability-Tests (LW-01–LW-07)

 "Workshop starten"-CTA auf Startseite, `WorkshopQuickStartDialog` (nur Name → sofort Zonen + Struktur, keine Pipeline), `createQuickStartWorkshop()` in IndexedDB, ObservationForm vereinfacht (Konfidenz/Sensitivität hinter "Weitere Optionen"), 14 neue Usability-Tests (LW-01–LW-06). Build: 0 TS-Fehler, 1705 Module.

- **GitHub-Readiness**: Standalone Git-Repo in `apps/hauskompass-studio/` initialisiert (Branch `main`), erster öffentlicher Commit `5d243b9` mit 272 Dateien. Alle privaten Strings aus src/ + docs/ bereinigt (0 Treffer), project-spezifische Scripts (find-local-media-eiermann, generate-eiermann-spatial-context) gitignored, build_output-Logs gitignored, docs/RELEASE_DECISION.md + initial_repository_assessment.md + ADR-0003 generalisiert.

- Release-Readiness Cleanup: alle privaten Projekt-Strings aus src/ entfernt (Schönseer, Oberviechtach, Eiermann-IDs, /home/johannes-Pfade), seedLoader.ts generalisiert (seedProject/isProjectSeeded/clearProjectSeed), generated-Dateien durch leere Stubs ersetzt, public/projects/index.json auf [], .gitignore um output/, public/local-media/, examples/eiermann/, private Docs ergänzt. Build: 0 TS-Fehler, 1704 Module.

- Codex-Session 019e3bed vorbereitet: RELEASE_DECISION.md (NEEDS_CLEANUP, 10 priorisierte Schritte), ADR-0003-python-utility-layer.md (Entscheidung: Option B — utils/py/ CLI-Layer), Code-Review-Befunde dokumentiert (seedLoader Eiermann-spezifisch: major; Utils: minor)

- Media Enrichment Pipeline abgeschlossen: 9 Web-Kandidaten (Wikimedia CC-BY/CC-BY-SA) in eiermann-web-media-candidates.json, Manifest generiert (74 Assets: 69 lokal + 5 web), graceful error handling für HTTP 429, Pipeline-Szenarien P1–P5 in usability-scenarios.md, Codex-Prompt in docs/handoffs/codex-prompt-media-enrichment.md gespeichert

- Spatial Working Model 1984 Review: UG-Widerspruch behoben (P1 + P4 haben UG, nicht nur P1); spatial_context.json um `undergroundLevels`/`undergroundNote` für P1 und P4 ergänzt; Review-Tabelle R-01–R-05 in Arbeitsdokument eingefügt

- 3D-Evidence-Panel wertet kuratierte Asset-Raumbezuege jetzt aus: `selectedAssetId` kann ein verknuepftes 3D-Objekt aktivieren, `linkedSpatialObjectId` priorisiert direkt verknuepfte Foto-Assets pro Objekt und das Objekt-Detail zeigt die Anzahl direkter Medienlinks

- Lage-Foto-Review erweitert: Im GPS-/Lage-Foto-Preview koennen `spatialAnchorType`, `targetZoneId`, `linkedSpatialObjectId`, `bearingConfidence` und `spatialNotes` jetzt direkt bearbeitet und gespeichert werden; neue DB-API `updateAssetSpatialContext()` fuer kuratierbare raeumliche Asset-Semantik

- Asset-Spatial-Semantik eingefuehrt: Assets koennen jetzt explizit `spatialAnchorType`, `targetZoneId`, `linkedSpatialObjectId`, `bearingConfidence` und `spatialNotes` tragen; neue Inferenzlogik normalisiert GPS-Fotos automatisch zu `viewpoint`-Assets mit EXIF-Richtung, `saveAsset()` wendet diese Semantik zentral an, die Lage-Foto-Ansicht zeigt den raeumlichen Bezug sichtbar an und das 3D-Evidence-Panel kennzeichnet Asset-Eintraege mit ihrem raeumlichen Ankertyp

- Medienordner auf Projekt-Slug-Konvention erweitert: neuer Pfad `public/local-media/eiermann-campus-pascalstrasse-100/` angelegt, Manifest-URLs dorthin umgeschrieben und `generate-media-manifest.mjs` auf die slug-basierte Medienstruktur umgestellt

- Projektbezogener Medien-Restore: `public/projects/index.json` traegt nun `mediaManifestUrl`; `projectDataLoader` loest den Manifest-Pfad pro Projekt auf und `seedLoader.ts` verwendet ihn fuer den Restore statt eines festen Eiermann-Medienpfads

- Workshop-Persistenz pro Projekt isoliert: Seed-Version und Media-Restore-Version werden jetzt ueber projektbezogene `localStorage`-Keys gespeichert; Bundle-Export liest die Seed-Version ebenfalls aus dem projektspezifischen Schluesselraum

- Workshop-Kontext dynamisiert: `App.tsx` und `ProjectHome.tsx` leiten den aktiven Workshop jetzt aus dem gewaehlten Built-in-Projekt inklusive `projectId` und `siteId` ab; `WorkshopApp` laeuft nicht mehr implizit gegen fest verdrahtete Eiermann-Konstanten

- Projekt-Registry aktiviert: `public/projects/index.json` traegt jetzt `slug`, `projectId` und `siteId`; `projectDataLoader` nutzt diese Registry als Primaerquelle fuer die Runtime-Aufloesung und faellt nur noch bei Bedarf auf einen kleinen internen Fallback zurueck

- Runtime-Projektdaten zentralisiert: neuer `projectDataLoader` loest `projectId` auf `slug/siteId` auf; `WorkshopMapPanel`, `Workshop3DPanel`, `BulkImportPanel` und `seedLoader.ts` laden Projektdaten jetzt ueber zentrale Projekt-URLs statt ueber verstreute harte Pfade; Pipeline in `docs/project_data_pipeline.md` dokumentiert

- Gebäudehöhen aus ZITRONENWOLF-Geschosszählung (2016) aktualisiert: P1=16m (EG+UG+3OG), P2=17m, P3=14m, P4=17m, Kantine=8m; Working Model bereinigt (keine Absolutpfade, Geschosszahlen ergänzt); project_materials/ ins Projektverzeichnis kopiert; Handoff + codex-cli-Prompt erstellt in docs/handoffs/

- Migration F: Build grün (tsc + vite); 12 migrierte JSON-Dateien aus `examples/eiermann/` entfernt; verbleiben: `project_materials/`, GeoJSON-Referenzdateien

- Migration E: verbleibende 4 static imports aus `examples/eiermann/` in Komponenten durch fetch() ersetzt (`Workshop3DPanel`, `WorkshopMapPanel`, `BulkImportPanel`); Geodateien nach `public/projects/eiermann-campus-pascalstrasse-100/` kopiert

- Migration D: `seedLoader.ts` — 9 statische JSON-Imports durch `fetchSeedBundle()` ersetzt; Seed-JSON nach `public/projects/eiermann-campus-pascalstrasse-100/seed/` kopiert

- Migration C: `ProjectHome` lädt Projektliste aus `public/projects/index.json` (fetch, Fallback auf Inline-Daten); `BUILTIN_PROJECTS`-Export entfernt

- Migration B: `WorkshopRoute` akzeptiert nun `projectId`/`siteId` als Props (mit Defaults); `App.tsx` übergibt `WS_PROJECT_ID`/`WS_SITE_ID` explizit — Hardcodes im Komponenten-Scope entfernt

- Räumliches Grounding-Workflow eingeführt: `verificationStatus` (verified/inferred/placeholder/unknown_geometry) zu allen Spatial-Typen hinzugefügt; alle Gebäudehüllen auf `confidence: imported` und `verificationStatus: inferred_geometry` (LGL-BW LOD2 + GPS-verifiziert) gesetzt; Vegetation und Terrain als `placeholder_geometry` markiert; GML-IDs in spatial_context.json eingetragen; Quellen-Registrierung konsolidiert; drei neue Docs-Dateien: eiermann_spatial_grounding_report.md, eiermann_spatial_data_needed.md, spatial_confidence_model.md

- Workshop 3D Topologie & Vegetation: Verbindungslinie P4→P3 auf P4→P2 korrigiert (P4 liegt in der Achse von P2, nicht P3); veg-edge-autobahn von NE (z=-117) nach SE (z=+121) verschoben — entspricht Richtung der Autobahn

- 3D-Ansicht neu orientiert: z-Achse invertiert (Nord=-z, Süd=+z) für korrekte Three.js Nord-oben-Perspektive; Kamera von SE blickend nordwärts; Kompass-Overlay (N/S/O/W) als SVG-Badge unten rechts; spatial_context.json neu generiert; Working Model Koordinatenkonvention aktualisiert

- 3D-Hull-Positionen korrigiert: P1/P3-Vertauschung im Generate-Script rückgängig gemacht; Pavillon 1 verwendet jetzt z-pavillon-1 (geo Nord, cz≈+58m), Pavillon 3 z-pavillon-3 (geo Süd, cz≈-60m) — entspricht den korrekten ws-map-location-label Positionen aus maplibregl; spatial_context.json neu generiert

- Workshop 3D P1/P3-Korrektur: 3D-Generator trennt nun Geometriequelle und Workshop-Zonenidentität; Pavillon 1 verwendet in der 3D-Ansicht die bisherige Pavillon-3-Geometrieposition, Pavillon 3 die bisherige Pavillon-1-Geometrieposition; lokaler 3D-Ursprung wird aus dem Mittel der Hauptpavillons statt aus einer einzelnen Pavillonnummer gebildet

- Workshop 3D from corrected 2D geometry: `scripts/generate-eiermann-spatial-context.mjs` ergänzt und `spatial_context.json` aus den bestätigten 2D-Zonenpolygonen neu erzeugt; die 2D-Lageansicht ist damit Quelle der 3D-Gebäudeplatzierung; Viewer-Extrusion auf triangulierte Footprints umgestellt, damit echte Polygonformen statt frei geschätzter Ersatzrechtecke funktionieren

- Pavillon-Nummerierung nach Nutzerkorrektur synchronisiert: In der 2D-Ansicht wurde die bisherige Position von Pavillon 3 als Pavillon 2 und die bisherige Position von Pavillon 2 als Pavillon 3 korrigiert; Pavillon 1 und Pavillon 4/NuCOS bleiben unverändert; Pavillon 5 als planned_not_built-Zone, Marker und 2D-Schemafläche ergänzt; 3D-Spatial-Seed und Projektmaterialien auf diese Nummerierung umgestellt; Seed-Version auf 9 angehoben

- Workshop 3D Geometrie-Kalibrierung: Zusatzmaterial zum Eiermann-Areal ab 1984 in `examples/eiermann/project_materials/eiermann_spatial_working_model_1984.md` gesichert; Spatial Seed auf die Zeichnungs-/Schema-Logik umgestellt; Pavillon 5 als planned_not_built-Ghost ergänzt; Quellen SFP Architekten, ZITRONENWOLF Rundgang und Projektzeichnungen in `spatial_context.json` referenziert

- Workshop 3D Evidence-Navigation: Evidence-Items im 3D-Seitenpanel sind interaktiv; Klick auf Asset/Observation/Interpretation/Claim/Question wechselt in den Workshop-Kontext, öffnet die passende Zone und fokussiert das Evidenzobjekt; Fotos öffnen den Viewer, Szenen öffnen direkt die WorkshopScene-Detailansicht

- Workshop 3D Stage 4 begonnen: 3D-Objekte sind nun mit der Workshop-Evidenz zurückgekoppelt; Auswahl eines Hüll-/Vegetationsobjekts setzt die Zone und zeigt im 3D-Seitenpanel zonenbezogene Assets, Observations, Interpretations, Claims, Questions und referenzierende WorkshopScenes; `spatial_context.json` enthält nun einen expliziten Scene-Link für die Sukzessionsvegetation

- Studio-Spatial-Sprint gestartet: Architekturentscheid in `docs/next_spatial_sprint_decision.md`, Masterplan `docs/studio_spatial_master_plan.md`, Workshop-3D-Plan und Projektcharaktermodell ergänzt; neue Studio-Typen für Projektcharakter und Spatial-Layer (`domain/project`, `domain/spatial`); Eiermann-Projekt als hybrides Campus-/Workshopprojekt klassifiziert; erster Workshop-3D-Tab mit rough terrain, inferierten Gebäudehüllen, Vegetationsclustern, Layer-Toggles, Quellen-/Konfidenzhinweis und Zone-Linking aus `examples/eiermann/spatial_context.json`; Seed-Version auf 8 angehoben

- SOUP-Rueckmeldung Kurt Grunow (2026-05-17) in das Eiermann-Seed-Modell aufgenommen: `M-SEED-004`, `C-000006`, `Q-000009`, `Q-000010`, Eventphase `E-soup-brasilien-2023`, Workshop-Szene `WS-006` zu `BRASILIEN`, Max Bense, Brasilia und Urbanistik; Seed-Version auf 5 angehoben; alle neuen Eintraege bewusst `internal` / `needs_review`

- Erste echte Workshop-Szene kuratiert: `WS-REAL-001` im Backup-Domain-State (`backup/eiermann-campus-backup-2026-05-17.json`) aus 6 real erfassten NuCOS-Buero/Flur/Kueche-Assets und Observation `OBS-MP9Z47SV-78I`; Szene bewusst `internal` / `needs_review`, weil alle ausgewaehlten Assets `internal_only` sind; fachliche Kuratierungspruefung in `docs/first_real_scene_review.md`

- Minimal WorkshopScene Editor: `docs/next_sprint_decision.md` dokumentiert Sprint-Entscheidung; WorkshopSceneEditor erlaubt Erstellen/Bearbeiten von Szenen, Auswahl von Assets/Observations/Claims/Questions, Freitextlisten, Sichtbarkeit/Publikationsstatus; `saveWorkshopScene()` DB-API; optionale Scene-Referenzfelder (`selectedObservationIds`, `selectedClaimIds`, `selectedQuestionIds`); Schutzlogik verhindert `publishable`/`public` bei nicht öffentlich freigegebenen Assets; neue Tests in `tests/workshop-scene-editor.test.ts`; 169 Tests gesamt, Build grün

- GPS-Verifikation GML-Gebäude: alle 25 Gebäude in 2 Tiles (505_5396/5397) UTM32N→WGS84 konvertiert (<15m Fehler bestätigt via Aerial-Photo-Referenz); 5 Hauptgebäude mit echten Zone-IDs gemappt (GML_TO_ZONE); zone_geometry.json auf 5 bestätigte Features reduziert (kein z-gml-* Fallback); zones.json auf 15 Zonen erweitert (Pavillons 1–3); Wikimedia-Bilder-Cache (6/10 heruntergeladen, Metadaten in wikimedia_metadata.json); Completeness-Bar in ZoneList (Fortschrittsanzeige aller Zonen); DataBackupBar jetzt tab-unabhängig im linken Panel; Field Visit Checklist (docs/07_field_visit_checklist.md); 2 neue Tests für Completeness-Aggregation; 164 Tests gesamt, alle grün

- Feldbesuch-Simulation + Kartenkorrektur: CAMPUS_CENTER korrigiert (1379m Fehler lon=9.0947→9.0759, kalibriert aus EXIF-GPS April-2026-Fotos); zone_geometry.json aus echtem GML LoD2 (LGL BW, UTM32N→WGS84 konvertiert, 8 Gebäude im 350m-Radius); utils/gml_to_zone_geojson.py (GML→GeoJSON-Konverter mit Zonenmapping und Foto-GPS-Analyse); utils/simulate_field_visit.py (Feldsimulation: 9 Fotos → EXIF-GPS → 2 Zonen zugeordnet); output/field_visit_assets.json (simulierte Asset-Records)

- EXIF-GPS-Import: GPS-Koordinaten (lat/lon/alt) werden beim Foto-Import aus EXIF gelesen (exifr-Library, browser-seitig); EXIF-Aufnahmedatum überschreibt Dateidatum; gpsLat/gpsLon/gpsAlt-Felder in Asset-Typ + AssetRecord; useGpsAssets-Hook; GPS-Marker (📷-Emoji) auf der Karte in WorkshopMapPanel; exifReader.ts-Modul

- Field-Readiness Micro-Sprint: Placeholder-Assets ohne Medium (📍 Standort-Notiz-Button in AssetIngestPanel, saveAsset ohne Blob, MapPin-Anzeige im AssetCard); Asset-Completeness-Indicator (ZoneDocLevel farbkodiert in ZoneList — leer/Medien/beobachtet/interpretiert); JSON-Backup-Export (exportWorkshopBundle, DataBackupBar in Szenen-Tab); completeness.ts als reines Funktions-Modul; useZoneInterpretationCounts-Hook; Feld-Besuchscheckliste in docs/NEXT_SITE_VISIT_TODOS.md; 25 neue Tests in tests/field-readiness.test.ts (162 Tests gesamt, alle grün)

- Architektur-Dokumentation: docs/persistence_strategy.md (Dexie/IndexedDB-Entscheidung, Schema-Versioning, Migrationspfad); docs/first_architecture_slice.md (Implementierungsstand, bewusste Weglassungen, nächste Schritte); docs/domain_model.md v0.2.0 (alle 39 Typen aktuell, Interpretation.zoneId, Memory-Felder, Seed-Tabelle, DB-Indizes); utils/inspect_seed.mjs (Developer-Inspection: Zones/Claims/Questions/Scenes/Memories mit Farbausgabe, --json- und --zone-Flags)

- Asset-Ingest + Evidenzkette + Export: Kamera-Button in AssetIngestPanel (direktes Fotografieren auf Mobilgeräten via capture="environment"); InterpretationPanel (Evidenzkette Beobachtungen→Deutungen→Aussagen: DB-API, Hook, Komponente mit Observation-Linker, Gegenposition, 2-Klick-Löschen, Schema v3); Workshop-Szenen-Export (HTML-Mappe als Download — öffentliche und interne Version, selbstständiges HTML mit CSS, Druckansicht)

- Workshop Readiness + Memory Layer: MemoryPanel (Erfassung mit Freigabestatus/Zitierbarkeit/Sensitivität, 2-Klick-Löschen); QuestionsBoard (5. Tab „Prüffragen" — alle offenen Fragen nach Priorität, Zone-Link); ZoneList zeigt Beobachtungs-Zähler (Eye-Icon); 2 neue Workshop-Szenen WS-004 „Natur zwischen Pavillons" + WS-005 „Ein Tag bei IBM" (jetzt 5 Szenen); 3 Memory-Seed-Einträge inkl. Holzapfel-Hinweis; versioniertes Seeding (SEED_VERSION, Auto-Re-Seed bei Datenänderungen)

- Observation Capture Layer: DB-API (getObservationsForZone/saveObservation/deleteObservation), useObservations-Hook, ObservationPanel mit Erfassungsformular (Text, Konfidenz, Sensitivität) und Löschen per 2-Klick-Bestätigung; 6 Seed-Beobachtungen; Asset-Card mit Löschen-Button (hover-overlay, 2-Klick-Bestätigung); seedLoader lädt observations.json

- App-Refactoring: Projektstartseite (ProjectHome) als Einstiegspunkt; AppMode-Routing (home / renovation / workshop); Eiermann-Campus als eingebettetes Workshop-Projekt wählbar; Renovierungsprojekte nur noch für Bayern und Baden-Württemberg
- Geocode-Verbesserung: geocodeAddress liefert nominatimState (Bundesland aus Nominatim addressdetails); stateFromTile mit korrekten 2D-UTM-Bounding-Boxes (E+N), Freiburg-Westgrenze auf E≥400km abgesenkt; checkAddressAllowed() prüft Nominatim-Bundesland mit UTM-Fallback
- DB-Bugfix: getClaimsForZone-Signatur bereinigt (totes projectId-Argument entfernt, Call-Site in useWorkshopData.ts aktualisiert)
- CSS Design-Tokens: komplettes `:root`-System (surface, color-primary, color-accent, radius, shadow); ProjectHome-CSS auf warmes Lichtthema umgestellt
- 5 Usability-Tests (137 Tests insgesamt, alle grün): 01 Geocode-Projektion, 02 Adress-Restriktion, 03 Workshop-Seed-Integrität, 04 Projekt-Store-Lifecycle, 05 Workshop-Datenlogik
- GeoJSON-Zonenkarte: WorkshopMapPanel mit MapLibre, 12 approximative Zonenpolygone (zone_geometry.json), Karte-Tab in WorkshopRoute, Prioritäts-Farbkodierung, Popup, Legende, Approximationshinweis

- Metadata-first foundation: BIM/AAS-inspired documentation, JSON schemas, fictional examples, metadata validator, and validation tests
- Asset data model sprint: source register, BIM/AAS renovation concept, ADR-0001, asset data model docs, AssetType/AssetInstance/Measurement/Requirement schemas, fictional building-assessment examples, and validation rules preventing product data duplication in BuildingElement records
- AssessmentFinding issue model: lightweight BCF-inspired internal finding schema and example links photos, roof defects/missing information, requirements, asset instances and renovation decisions without implementing BCF exchange
- Agentic renovation planning app sprint: CURRENT_STATE, renovation loop, pragmatic app data model, agent behavior spec, AGENTS guidance, Planning UI, planning seed data, Codex handoff generator and selector tests
- Building-section redesign: segment control for part selection (Teil 1/2), combined tab+selector bar, context-aware detail tabs (Elemente/Ansichten only when IFC generated), demo-only panels gated for imported projects in Assessment section
- Workshop-Assessment-Fundament für Eiermann-Campus: Domain-Typen (Zone, Place, Asset, Observation, Claim, Question, Memory, EventPhase, WorkshopScene, Assessment, Scenario mit SensitivityLevel + PublicationStatus + EpistemicType) in src/domain/workshop/types.ts; Seed-Daten in examples/eiermann/ (12 Zonen, 8 historische Phasen, 5 Claims, 8 Questions, 3 Workshop-Szenen); docs/domain_model.md, docs/project_vision.md, docs/implementation_plan.md, docs/initial_repository_assessment.md angelegt; README aktualisiert
- Workshop-UI implementiert: Dexie.js + dexie-react-hooks als IndexedDB-Layer (14 Tabellen); idempotenter Seed-Loader; Badges/Cards/ZoneList/Timeline/WorkshopSceneViewer-Komponenten; WorkshopRoute mit Zonen-Tabs, Zone-Detail-Panel und Szenen-Viewer; Workshop-Section in App.tsx-Navigation integriert; schemas/workshop-ontology.jsonld (JSON-LD, aligniert mit bot:, cidoc:, schema.org); Build-Fehler (doppelter Funktionsblock, ReactNode-Import, Confidence-Typ) behoben
- Asset-Ingest-Workflow: Drag-and-Drop-Upload (Fotos, Videos, Dokumente, CAD) direkt in eine Zone; automatische Sensitivity-Klassifizierung via MIME+Dateinamen-Heuristik; Thumbnail-Generierung via Canvas; Blob-Storage in IndexedDB (Dexie v2 mit assetBlobs-Tabelle); AssetIngestPanel mit per-Datei-Metadateneditor; AssetCard mit Thumbnail-Anzeige; Zonen-Detail-Panel mit „Hinzufügen"-Button integriert
- Prototype-fragment audit: demo data leaks into imported project workflow eliminated — RenovationPlanningPanel, DataInventoryPanel, AssessmentReadinessPanel, ScenarioRegistryPanel now derive from real LoD2/project state for imported projects; demo fixtures remain intact for the demo project; MetadataExplorerPanel/BuildingCandidateTable/SurfaceMetricsTable gated to demo-only in data section
- Browser terrain analysis: user-triggered fetch of N-S/E-W elevation profiles (Open-Meteo Elevation API, SRTM/ASTER) for imported projects; TerrainFetchCard, ImportedTerrainSamplingPanel, ImportedTerrainCrossSectionPanel (NS+EW SVG charts with building marker)
- Local planning workflow: browser-local editable planning registers, S01-S20 site-visit JSON import with laser-distance validation, and Codex handoff state diffing
- Project state fixes: selectedCandidateId, lod2GeneratedFor and lod2IfcContent now reset on project change; project drawer shows list of all saved projects for direct switching
- Showcase PDF: sanitized five-page public prototype extract, dedicated `/showcase` app route with typed data, and local Chromium generation script with page-count and private-pattern checks
- Showcase data mapping: `/showcase` now derives facts, assumptions, measurement needs, decisions and reasoning lines from Planning seed data, with mapper tests and an opt-in browser-local register merge
- IFC model view framing: default/reset view now frames visible IFC meshes from an elevated oblique orientation for Part 1 and Part 2 instead of fitting helper geometry
- Scenario registry foundation: baseline and roof-envelope scenario data model for future scenario-aware assessment workflows
- Vollständige UI-Lokalisierung: alle englischen Labels, Überschriften, Tabellenköpfe und Statuswerte in Deutsch übersetzt (CombinedHullMetrics, TerrainSampling, LoD2Viewer, IFCViewer, RenovationPlanning, DataInventory, EvidenceInspection, ConfirmedObject, App-Sektionen)
- Bug-Fixes: Dachneigung-Berechnung (pitch() war invertiert, Flachdächer zeigten 90°), Germany-Bounds-Check für Adress-Geocoding, localStorage-QuotaExceededError-Behandlung mit Fehlermeldung im Wizard
- Architektur-Refaktor: Custom Hooks useTerrainData, useCandidateSelection, useIfcGeneration aus App.tsx extrahiert (src/app/hooks/)
- BW LoD2 data source: correct LGL BW direct download URL (ZIP+GML), tile mismatch detection (>5 km → Fehlermeldung), Python utility `utils/download_lgl_bw_lod2.py`, cached reference tiles for Stuttgart (509_5396, 507_5398)
- Part 1 identification baseline: owner-confirmed four-rectangle Erdgeschoss decomposition, schematic Keller level with 4 m x 7 m vault, estimated 0.5 m main-house exterior wall layer, vertical CAD seed with 2.4 m nominal storeys, photo-elevation study views with terrain/window markers/dimension chains, and first site visit guide for structured evidence capture
- Building Seitenansichten tab: large-format IFC New-off/Baseline elevation sheets with terrain line, key horizontal/vertical dimensions, level datums, roof planes, cellar reference cut and verification notes
- UX onboarding sprint: direkter App-Start mit "GELADENES PROJEKT"-Sidebar-Eyebrow, "Neues Projekt anlegen"-Button öffnet adress-basiertem Pipeline-Wizard (cacheSlug, config-Template, Shell-Anleitung); IFC-Viewer Bug #3 behoben (Terrain-Mesh aus Bounding-Box-Fit ausgeschlossen, rAF-Doppelrefit nach React-Commit)
- Usability-Test P1–P6: Planning-Tabs Deutsch + Overflow-Scroll; Projektname aus VITE_PROJECT_LABEL in Planning-Übersicht; Assessment-Tabs Deutsch (Gebäudehülle/Wiedernutzung/Fotos/Planungsreife/Nachweise); IFC-Toggle "+Planung"/"Bestand"; Evidence-Demo-Banner (amber); Sidebar-Stat "Datenquellen bereit" → Link zu Data-Inventory
- Usability-Test Runde 2 (Büsnauer Str. 29): B1-Fix (Dialog-Header scrollte aus Viewport bei aufgeklappter Anleitung → align-items:flex-start + margin:auto); B2-Fix (ESC-Key schließt Dialog); vollständige DE-Übersetzung Sidebar-Navigation + Section-Headings + Building/Site-Tabs + Planning-Panel-Titel und Stat-Labels
- SVG-Lagekarte Fix: fester 300m-Viewport um bestätigtes Gebäude (vorher: Marker weit außerhalb des Clusters); Bbox-Fallback-Rechteck für Gebäude ohne Bodenfläche; preserveAspectRatio=slice + flex-Layout für korrektes Zentrieren des Markers
- Interaction-Redesign Navigation: 220px-Sidebar ersetzt durch 52px Icon-Rail (Compass-Logo öffnet Projekt-Drawer, 5 Icon-Buttons für Lage/Gebäude/Bewertung/Planung/Daten, CSS-Hover-Tooltips); Projekt-Drawer als Overlay (ESC/X/Außen-Click schließt); Standard-Section ist jetzt "Lage"
- Lage-View Redesign: OSM-Embed-Iframe für importierte Projekte (Zoom/Pan, Adress-Marker), glass-morphism map-meta (backdrop-filter), Demo-Karte auf 62vh; Wizard Step-4-Bug behoben (Wizard blieb nicht offen); Tooltip-z-index-Fix (nav-rail z-index 300)
- German S01-S20 field photo list: each shot is now a multi-photo capture block with laser-distance reference metadata, Fairphone Gen 6 camera settings, print checklist, and Gaussian-Splatting/photogrammetry guidance
- IFC export roof cleanup: generated roof overhang polygons now keep ridge edges locked so added overhang surfaces are trimmed at the Firstkante
- E–W terrain cross-section: `utils/terrain_ew_cross_section.py` + in-app SVG panel (Site → E–W Cross-Section tab); confirms near-flat E-W profile at building latitude with Part 1/2 floor levels
- Field Measurement Checklist: `MissingMeasurementsPanel` upgraded to 13 structured tasks across Roof / Walls / Moisture & Ground / PV & Energy / Legal — each with priority, why, and how-to
- ALKIS Flurkarte confirmed obtained (ADBV Nabburg, 29.04.2025, ref 48 OVI 1345/6); data inventory updated, parcel boundary estimated from BayernAtlas UTM grid (±5 m), aerial vegetation context added
- Local assessment packages: generic address-agnostic package shape, Planning UI loader, parser tests and documentation for importing private assessment registers without committing exact addresses or coordinates
- Legacy BIM/LV research transfer sprint: neutral evidence inspection domain types, ADR-0002, architecture note and synthetic tests for source refs, evidence quality, review states, match candidates and evidence reports
- IFC metadata adapter: NormalizedIfcElement type, ifcMetadataAdapter with quality rules for complete/missing-material/missing-quantity/ambiguous-identity cases, 4 synthetic fixtures, 18 focused tests
- Evidence Inspection Panel: EvidenceInspectionPanel in Assessment → Evidence tab; renders synthetic IFC-adapter output with confidence badges, quality flags and recommended actions
- IFC model viewer redesign: responsive viewport (calc(100svh − 130px)), compact overlay toolbar, 4 named camera presets (Oblique/Top/South/East), collapsible info drawer, in-app focus mode, edge outlines for walls/roofs/ground, narrow-screen stacking; all inline styles moved to named CSS classes
- project.config.json: central per-project config (cacheSlug, dgmTile, targetEasting/Northing, mapElevationM, confirmedLod2Ids, referenceLod2Ids, ifc roof surface IDs); all 4 pipeline scripts (extract_lod2_candidates, generate_site_context_data, generate_assessment_data, export_ifc) now read from this file instead of hardcoded constants
- OpenSpec baseline: initialized `openspec/`, added project context and current-state specs for project context, evidence baseline, privacy/local data, metadata validation and renovation planning workflow
- OpenSpec IFC viewer proposal: added `improve-ifc-model-viewer` change request covering viewport sizing, visual inspection polish, compact controls and evidence-aware model context
- Usability-Test 2 (Pascalstraße 100 / Eiermann-Campus): Wizard-Verbesserungen (20 Kandidaten-Limit, Gebäudegröße 81×81m in Kandidaten-Karte, Kachelgrenze-Hinweis auf Nachbarkachel, Distanzwarnung >30m), BW-Kachel 505_5396 korrekt identifiziert, 2 Eiermann-Pavillons (DEBW_) bestätigt, IFC-Flachdach-Quader generiert, Projekt-Wechsel Demo↔Pascalstraße bidirektional verifiziert

- UI redesign: sidebar + full-viewport app-shell replacing single-page scroll layout
- 4 navigation sections: Building (3D hero viewer), Site (large map), Assessment, Data
- 3D LoD2 viewer is now the dominant hero view with hull metrics and terrain in side panel
- Part 1 / Part 2 selector buttons for switching confirmed building parts
- Data tables (candidate selection, surface metrics) moved to dedicated Data section
- Assessment section surfaces Missing Measurements and Readiness at top level
- Site section: large interactive map with terrain + building evidence side panel
- Site map corrected to N-up orientation with actual UTM meter viewBox
- Site map uses full width; evidence and terrain panels moved to tabs below
- Nav order: Site first (default), Building, Assessment, Data
- Part selector shows only the 2 confirmed building parts
- IFC export: `utils/export_ifc.py` exports Part 1 + Part 2 + DGM1 terrain to `output/hauskompass_lod2_baseline.ifc` with EPSG:25832 geo-referencing via IfcMapConversion
- N–S terrain cross-section: `utils/terrain_cross_section.py` + in-app SVG chart panel (Site → N–S Cross-Section tab); reveals south-slope profile and floor-level relationships

Initial private building baseline prototype.

Planned:

- Vite + React + TypeScript setup
- privacy-safe project configuration
- data inventory model
- building hull domain model
- mock roof surface model
- dashboard
- map placeholder
- 3D viewer placeholder
- first documentation package
