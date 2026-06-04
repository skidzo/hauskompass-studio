- added radius-based bulk building selection to the LoD2 import wizard (step 3): a radius bar (50–1000 m) lets users add all surrounding buildings at once as unnamed context geometry; only the nearest building gets a default name "Hauptgebäude"; the naming panel now separates the single named main building (editable input) from all unnamed context buildings (compact italic hint line)
- Design-Überarbeitung „Werkzeug": semantisches Farbsystem (`empty`-Zonen von Alarm-Rot `#ef5350` auf ruhiges Slate-Grau `#94a3b8`), erweitertes Token-System in `:root` (Typografie-Skala, Abstands-Skala, Status-Tokens, Button-Tokens), Nav-Rail auf 64px mit sichtbaren Micro-Labels unter Icons, Section-Headings im ZoneDetail von ALL-CAPS auf Sentence Case, globales 3-Ebenen-Button-System (`.btn-primary`/`.btn-secondary`/`.btn-ghost`) als normierte Grundsprache für alle Feature-Areas, ZoneList-Karte konsolidiert (Redundanz-Status entfernt, `ws-zone-empty-label` ersetzt `ws-zone-doc-level`-Zeile), NamedEntityFields/ZoneCreate/ZoneEdit auf Design-Tokens umgestellt; 252/252 Vitest grün
- implemented Zone-Management im Workshop: Nutzer können nun Zonen anlegen (inline im Zonenpanel, „+ Neue Zone"-Button mit sofortigem NamedEntityFields-Formular), vorhandene Zonen bearbeiten (Inline-Edit-Modus im ZoneDetailPanel für Name, Beschreibung, Priorität, Sensitivität) und löschen (mit Asset-Guard-Warnung und Bestätigungsschritt); `saveZone`/`deleteZone` in workshopDb; shared `NamedEntityFields`-Komponente (src/lib/studio-core/forms/) für maximale Wiederverwendung in künftigen Renovation-Raumformularen; 252/252 Vitest-Tests grün
- upgraded the address-import wizard into a real building-review step: Baden-Württemberg address loads now keep all found GML files available for reload/switching, the wizard shows a live shape review map, buildings can be selected explicitly instead of only auto-picked, chosen buildings can be named before activation, those names are persisted into the saved project, and the GML parser now normalizes `sourceTile` to the actual tile id instead of storing raw filenames
- stabilized the Renovation `Lage` view surface: removed leftover `ImportedSiteMapPanel` debug spam, restored visible hierarchy between selected / confirmed / surrounding buildings, brought back address + confirmed-part overlays on the live map, and added focused jsdom smoke coverage that verifies building-source creation, layer wiring, overlays, and candidate confirmation toggling in `tests/importedSiteMapPanel.test.tsx`
- added focused Workshop console-hygiene regression coverage: the imported Eiermann Workshop route now fails tests if the previously fixed startup/import error patterns (`No runtime config`, `seedProject failed`, `zone_geometry load failed`, `campus_locations load failed`) reappear on the route
- fixed Workshop runtime regression for the Eiermann project ids `ws-pascal` and `proj-eiermann-campus`: `projectDataLoader` now keeps them resolvable even when `/projects/index.json` is unavailable, media restore skips empty manifests safely, `WorkshopMapPanel` no longer depends on external sprite-heavy bright tiles for this path, and noisy ImportedSiteMapPanel debug logging was removed from the console
- added URL hash routing (`useHashRouter.ts`): App-Mode, Workshop-Section und Renovation-Section werden jetzt in der URL gespiegelt (`#/workshop/map`, `#/renovation/<slug>/site` etc.); Deep-Links und Browser-Back funktionieren; Unit-Tests (250/250 grün) angepasst: `window.location` mit `hash`-Feld gemockt, Test „starts in Renovation via localStorage" durch „starts via URL hash" ersetzt, neuer Test „Home bleibt Standard ohne URL-Hash"; `navigate()` und `replace()` synchronisieren direkt den React-State für jsdom-Kompatibilität
- E2E Playwright smoke suite (12 tests, 6.9s) passes green: Home, all 4 Workshop views, all 5 Renovation views, return-to-Home for both modes; Workshop opened via QuickStart dialog, Renovation via localStorage-injected fixture with correct Lod2Candidate structure; each describe-block uses an isolated BrowserContext; compatible with re-mes/testing/ CDP+Playwright pattern
- extracted `SensitivityLevel` type and `classifyAssetSensitivity` (MIME/filename heuristics) from Workshop-local code into `src/lib/studio-core/media/` (sensitivity.ts + types.ts); `SensitivityLevel` re-exported from `domain/workshop/types` for backward compat; re-export shim left in `workshop/ingest/sensitivityClassifier.ts`; 41/41 tests, build green
- replaced the built-in Eiermann Workshop seed rectangles with the exact outer LoD2 hull rings recovered from cached LGL-BW GML for Pavillon 1–4 and Kantine; kept square courtyard simplifications only where architecturally intended (`Pavillon 1`, `3`, `4`), and removed the courtyard void from `Pavillon 2` because its inner condition is the glazed pyramid/atrium rather than an open courtyard
- fixed the recovered Eiermann Workshop 2D/3D hull alignment by giving `SpatialScene` an optional `mapAnchor` and letting the map fallback project local hull coordinates back through the scene's own anchor instead of the generic campus fallback; the built-in Eiermann seed now uses square courtyard footprints for Pavillons 1–4 instead of generic rectangles, so the maplibre hulls read closer to the actual ensemble layout
- fixed Workshop Lage/Building tabs failing after page refresh: `activeWorkshopProject` is now persisted to `localStorage` (`hk_active_workshop_project`) and restored synchronously on init so that reloading `#workshop/*` retains the active project; when `workshopProjectId` is empty (localStorage cleared or fresh tab), `WorkshopApp` redirects to home instead of hanging on "Karte wird geladen…"; fixed `seedProject` wiping imported backup data (condition `storedVersion !== SEED_VERSION` with a `null` storedVersion was treated as "stale seed" and deleted all imported zones/assets — now `storedVersion === null` is treated as a user-imported project and skips clearing); fixed `WorkshopMapPanel` crash `null.toFixed()` on bearing for assets without a GPS bearing value (`!== undefined` guard replaced with `!= null`)
- improved Workshop batch intake for 300+ image stories: `BulkImportPanel` now derives GPS zone centroids from the builtin spatial scene when `zone_geometry.json` is unavailable (enables auto-zone suggestions for Eiermann imports), added "Alle ohne Zone → Zuweisen" bulk-assign action for GPS-less images, and truncates the entry list at 50 with progressive reveal to keep the UI responsive for large imports; added regression coverage for restored/imported Eiermann map startup (zone geometry and campus marker derivation from builtin scene) in `workshopSpatialScenePreference.test.ts`; 252/252 tests and 7/7 Playwright smoke tests green
 (1) `exif.ts` now reads `GPSHPositioningError` (horizontal accuracy in metres) and `GPSImgDirectionRef` ('T'=True North/'M'=Magnetic) — stored as `gpsHAccuracyM` and `gpsBearingRef` on `Asset`; (2) new `computePositionConfidenceFromExif` / `computeBearingConfidenceFromExif` in `helpers.ts` map measured accuracy to `PlacementConfidence` (verified ≤5 m, likely ≤15 m, approximate ≤50 m, uncertain >50 m); bearing confidence is `verified` only for True North reference; (3) `formatExifTrustLabel` now shows measured accuracy when available ("GPS ±3.2 m · höheres Vertrauen"); (4) `getAssetObjectUrl` auto-detects JPEG/PNG/GIF/WebP from magic bytes for legacy blobs stored as `application/octet-stream` and persists the correction; (5) `GpsAssetThumbnail` fixed: stale blob URL is cleared immediately on cleanup / before new load — no more broken images during transition; lazily generates and persists thumbnails for blobs missing `derivates.thumbnail`; (6) `BulkImportPanel` generates thumbnails in parallel batches of 8 instead of sequentially (~8× faster for 100 images)
- added File System Access API reference-mode storage for large photo imports: `Asset` gets `storageMode` ('blob' | 'fs-reference') and `localPath`; `workshopDb` gets a `folderHandles` table (schema v4) storing a `FileSystemDirectoryHandle` per project; `getAssetObjectUrl` transparently resolves both blob and fs-reference assets; `BulkImportPanel` primary action is now "Verzeichnis verknüpfen" (calls `showDirectoryPicker()`, scans folder recursively, saves handle + metadata only — 0 MB copied to IndexedDB); "Dateien kopieren" still available for small imports; size warning only triggers for blob-mode imports >500 MB

# 2026-05-22 — Release-Smoke Address Corpus Session

- improved the recovered Eiermann Workshop 3D readability: main hulls now render with on-scene building labels, the recovered custom scene uses explicit connector/bridge hulls with dedicated styling instead of only helper lines, and the first camera framing is more elevated and campus-oriented for the Eiermann ensemble so the scene reads closer to the earlier calibrated workshop model

- restored the Eiermann Workshop 3D scene as a project-specific built-in spatial seed for `proj-eiermann-campus` / `ws-pascal`, so the one real Workshop project no longer falls back to generic placeholder geometry when `spatial_context.json` is unavailable; the recovered scene now restores the corrected pavilion numbering, labels the extension building as `Pavillon 4`, and adds explicit estimated connector/bridge hulls so the campus topology reads much closer to the earlier calibrated 3D state

- hardened Workshop 2D fallback loading for restored/generic projects: `WorkshopMapPanel` now keeps the original static `zone_geometry.json` / `campus_locations.json` path when present, but falls back to deriving zone polygons, labels and location markers from the preserved Workshop spatial scene plus GPS-backed asset anchors when those files are missing, so repaired projects no longer lose the 2D Building View entirely

- Workshop spatial scene loading now prefers a richer bundled/static `spatial_context.json` over an older rough fallback stored in localStorage, so repaired or generic projects no longer get stuck with the degraded placeholder 3D scene after restore

- Project Home now shows imported Workshop backup projects in the shared grid, orders visible projects by creation date, and caps the project area with vertical scrolling so the view stays usable when the list grows

- added Workshop 3D scene preservation to the backup envelope: imported projects now derive a rough `spatial_context.json` fallback when missing, and that derived scene is carried through export/import so the 3D Building View remains available after restore

- added a Workshop 3D fallback: imported Workshop backups without a bundled `spatial_context.json` now derive and persist a rough spatial scene from the imported project data instead of stopping at the unavailable-state message

- added a Renovation `Paket` readiness smoke that exports, previews, and restores the live shared backup envelope from the real planning surface

- hardened the release-failure paths: blocked Renovation backups are now marked non-restorable already in the preview, Workshop invalid backup uploads show a stable user-facing error, Workshop asset-ingest save failures keep the panel open with per-entry error feedback, and project-store quota exhaustion is covered by a user-facing regression test
- hardened Workshop legacy-backup compatibility: ProjectHome now shows a safe restore preview for pre-envelope Workshop ZIP/JSON backups instead of assuming modern bundle metadata, and the real Eiermann backup `proj-eiermann-campus-backup-2026-05-20.zip` was repaired into a forward-compatible copy with a modern Hauskompass bundle envelope for real import testing
- added legacy Workshop ZIP regression coverage with embedded media: the release machine now proves that a pre-envelope Workshop ZIP can be inspected, previewed in ProjectHome, and imported with both metadata and blob records restored
- extended Workshop post-import readiness: the release machine now proves that an imported legacy Workshop ZIP opens the real Workshop route, reaches the imported zone detail, and exposes imported media in the UI
- added Renovation post-import/revisit readiness: the release machine now proves that an imported Renovation bundle becomes the active project again on revisit, reuses persisted terrain/IFC derived data, opens the real `Fotos` planning surface, and shows saved local photo evidence in the UI
- extended the evidence-entry release machine with a saved Renovation photo intake check and a real Workshop asset-ingest batch save smoke
- added workflow-readiness smokes for Renovation `Fotos` intake and Workshop `Neue Szene` entry so each mode proves one first usable action
- added an app-shell release smoke for Workshop selection, renovation wizard activation, and direct revisit startup from an active saved project
- added a revisit smoke test for a saved renovation project with persisted terrain and IFC, booted through `ProjectProvider`
- extracted `addressSupport` from `NewProjectWizard` so address support rules are shared between runtime and release-smoke tests
- extended the fixed address corpus with intended entry mode (`builtin` vs `wizard`) plus stable tile/state fixture data
- added fixture-driven release smoke coverage for the address corpus
- added an explicit `ProjectHome` Workshop entry smoke test for `Workshop-Campus Demo, 70569 Stuttgart`

# Changelog

- Renovation derived-data persistence session: imported renovation projects now persist generated terrain and IFC results inside project-scoped derived data with a source fingerprint, reload those results automatically on revisit, and drop them from active use when the confirmed source geometry changes; added `src/features/project-store/derivedData.ts` plus focused hook regression coverage in `tests/renovationDerivedDataPersistence.test.tsx`
- Renovation creation repair session: `NewProjectWizard` now auto-fetches and parses the Baden-Württemberg LoD2 ZIP after successful geocoding, ranks included GML files by distance to the address point, and continues directly to candidate confirmation instead of dead-ending at a manual upload step for supported BW addresses; added the first fixed `tests/fixtures/address-corpus.json` and a focused jsdom regression test in `tests/new-project-wizard.test.tsx` for `Demohaus BW 29, 70563 Stuttgart`
- Renovation Fotos intake workflow pass: `RenovationPhotoPlacementPanel` now works as a batch photo-intake workbench instead of a single-photo form; users can load multiple images at once, keep one large active preview visible while entering room/orientation/confidence metadata in a side rail, move through the queue photo-by-photo, and see unresolved placement/evidence gaps for both the current batch and the saved photo list; extracted shared `studio-core/media/intake` helpers for batch file normalization, EXIF hint reading, preview URLs and default titles, wired both `AssetIngestPanel` and `BulkImportPanel` onto that same commodity path, added shared `studio-core/spatial-reference/presentation` helpers plus a central EXIF trust rule so coordinates+bearing+capture-date automatically raise default placement/orientation confidence in Renovation and surface as higher trust in Workshop GPS review, and standardized professional backup filenames, labels and bundle summaries across Renovation and Workshop from the shared bundle envelope; added focused jsdom coverage in `tests/renovationPhotoIntakePanel.test.tsx` and pure helper coverage in `tests/mediaIntake.test.ts` plus `tests/studio-core-shared-foundation.test.ts`
- Renovation Lage/Gebäude workflow pass: imported-site maps now start from non-animated selected/confirmed building bounds instead of a disturbing fit/fly-in; generated LoD2 `Elemente` and `Ansichten` for imported renovation projects now project the full confirmed ensemble instead of one raw candidate, orient the plan/elevations to the dominant outer-wall axis, replace fixed `Süd`/`Ost` assumptions with axis-based labels, and use responsive elevation sizing instead of clipped fixed-height views; added pure projection-helper regression coverage in `tests/lod2Projection.test.ts`
- Shared backup/export metadata session: added `src/lib/studio-core/backup/` with shared bundle-envelope helpers and compatibility checks; Workshop backup export now emits shared envelope metadata (`format`, `bundleIntent`, `projectMode`, `payloadType`, summaries/counts, transport hint) while keeping the existing Workshop payload and ZIP transport behavior intact; legacy Workshop bundle import/merge remains accepted; Renovation now has a first JSON-first local backup/import path for project state, local planning registers, site-visit imports and photo-placement evidence via the Paket tab; shared import inspection now blocks non-restorable/public-export bundles and blocked validation states before mutation; Workshop JSON import, ZIP import and merge now share one inspection path including project/site metadata extraction and ZIP blob-count warnings; Project Home and the Renovation Paket flow now stage restore previews before mutation so users can verify bundle type, transport and contents before restoring; added helper, Workshop export-shape and Renovation round-trip test coverage

- Documentation surface reduction session: moved most product and historical docs from `apps/hauskompass-studio/docs/` to `../../docs/hauskompass-studio-docs/`; kept only the subset still referenced by runtime seeds, handoff tooling, and showcase export workflows inside the repo
- Legacy utility cleanup session: removed the broken `generate:eiermann-spatial` package entry, dropped stale Vitest exclusion and `.gitignore` rules for retired Eiermann-only helpers, and archived deprecated local/exploratory utilities outside the repo in `../../docs/hauskompass-studio-dev/legacy-utility-archive/`
- Utility inventory and migration planning session: classified every current file in `scripts/` and `utils/` as keep/move/merge/deprecate; documented the target split across `scripts/`, `tools/*` and `utils/py/*`; identified example-specific utilities that should be deprecated instead of endlessly generalized; moved the solo-development planning notes for this cleanup to `../../docs/hauskompass-studio-dev/` while keeping executable utilities in the repo
- Repo governance and tooling structure session: accepted ADR-0004 to keep Hauskompass Studio a local-first frontend with Python restricted to offline tooling; moved solo-development governance and architecture-planning docs to the workspace-level developer area at `../../docs/hauskompass-studio-dev/`; kept executable tooling under `tools/` and `utils/py/` in the repo
- Adapter seam sprint: added shared `studio-core/spatial-rendering` primitives for render-neutral polygon/view-cone geometry; moved Workshop map GeoJSON enrichment and 3D object metadata/selection helpers into dedicated adapter modules so MapLibre and Three.js components keep rendering duties while domain translation leaves the view layer
- Open-source reuse / architecture sprint: added `src/lib/studio-core/` as a new shared boundary for commodity photo/spatial/evidence primitives; moved EXIF parsing into shared media-core; kept `src/features/workshop/ingest/exifReader.ts` as a compatibility re-export; migrated Renovation photo placement to shared origin/placement/orientation/view-direction primitives; added pure shared-helper tests; documented dependency/license posture, architectural decision rules, shared-core extraction plan and bounded sprint decision without adding dependencies

## v0.1.0 — 2026-05-20

- **Renovierungsmodus: Foto-Platzierung**: neuer Tab Fotos in der Renovierungsplanung mit lokaler Registrierung von aktuellen und historischen Fotos samt Raum-, Bauteil-, Oberflächen-, Karten- oder Planbezug
- **Historische Bild-Evidenz**: Renovierungsfotos koennen jetzt als historisch markiert werden und speichern Zustand (`before|during|after|unknown`), Datums-Konfidenz, Sichtbarkeitsnotizen und Entscheidungsnutzen
- **Blickrichtung und Unsicherheit**: Fotoeintraege tragen `viewDirectionLabel`, optionale Gradwerte sowie getrennte Platzierungs- und Orientierungs-Konfidenz; EXIF bleibt Hinweis, nicht Wahrheit
- **Renovierungsbeobachtung / Frage**: aus einem Foto kann direkt eine lokale Beobachtung oder offene Frage erzeugt werden; verdeckte Infrastruktur bleibt bewusst bei `visible | historical_photo_only | inferred | unknown` und kennt keinen impliziten `verified`-Status
- **Projektbezogene Persistenz**: neue lokale Speicherstruktur `hauskompass.renovationPhotoPlacement.v1.<projectSlug>` trennt Renovierungs-Fotoeintraege pro Projekt, ohne Workshop-Persistenz anzutasten
- **Tests erweitert**: neue Suite `tests/renovationPhotoPlacement.test.ts`; Verifikation mit Renovierungs-, Workshop- und Metadata-Suites sowie `npm run build` grün

## v0.1.0 — 2026-05-20

- **Workshop export hardening**: Öffentliche Workshop-Exporte prüfen jetzt die verknüpfte Evidenzkette von Szenen mit (`selectedAssetIds`, `selectedObservationIds`, `selectedClaimIds`, `selectedQuestionIds`) statt nur die Asset-Auswahl
- **Striktere Public-Eligibility**: Öffentlicher HTML-Export verlangt jetzt sowohl `publicationStatus: 'publishable'` als auch `visibility: 'public'`; interne Exporte schließen weiterhin `do_not_publish` aus
- **Export-Vorschau im Szenen-Tab**: `WorkshopExportBar` zeigt jetzt, wie viele Szenen öffentlich exportierbar sind und nennt erste Ausschlussgründe für blockierte Szenen
- **Scene-Editor-Warnungen erweitert**: `WorkshopSceneEditor` bewertet verknüpfte Beobachtungen, Claims und Fragen mit und stuft unsichere öffentliche Szenen beim Speichern wieder auf `internal` / `needs_review` zurück
- **Tests aktualisiert**: neue Export-/Safety-Checks in `tests/workshop-scene-editor.test.ts`; Seed-Integritätstest auf aktuelle `WorkshopScene.exportStatus`-Werte korrigiert
- **Verifikation**: `npm test -- --run tests/workshop-scene-editor.test.ts tests/usability/03-workshop-seed-integrity.test.ts` und `npm run build` grün

## v0.1.0 — 2026-05-19

- **IFC: Alle bestätigten Gebäude gemeinsam**: `generateCombinedIfcStep()` generiert ein einziges IFC für alle bestätigten Kandidaten; gemeinsamer Ursprung, korrekte Relativlage der Gebäude zueinander
- **IFC Flächenauswahl**: Klick auf beliebige IFC-Fläche → transparent schalten (opacity 15 %); Kanten werden gelb; Reset-Button in der Toolbar zeigt Anzahl transparenter Flächen
- **Teil-1/Teil-2-Buttons entfernt**: Kein Wechsel zwischen Gebäudeteilen mehr — alle bestätigten Gebäude werden immer gemeinsam angezeigt
- **LoD2-Vorschau multi-Gebäude**: `LoD2SurfaceViewer` zeigt alle bestätigten Kandidaten im gemeinsamen Koordinatenraum; adaptive Skalierung; Farb-Tints pro Gebäude

- **Editierbare Gebäudeauswahl**: Klick auf Gebäude in der 2D-Lage-Karte togglet `confirmedIds` (grün = bestätigt, grau = Umgebung); Änderungen werden sofort in localStorage persistiert und die Karte aktualisiert sich reaktiv
- **Projekt löschen**: Gespeicherte Renovierungsprojekte auf der Startseite haben jetzt einen Lösch-Button (Mülleimer-Icon), der beim Hover eingeblendet wird
- **ProjectContext.updateProject**: Neuer Callback für in-app Änderungen am aktiven Projekt (confirmedIds, etc.)

- **ZIP-Backup mit Fotos**: `exportWorkshopBundleZip()` / `importWorkshopBundleZip()` via fflate; DataBackupBar bietet "ZIP-Backup (mit Fotos)" und "JSON (nur Metadaten)"; Startseite akzeptiert .zip und .json beim Import

- **Backup-Import auf Startseite**: `importWorkshopBundle()`, Datei-Picker-Button "Aus Backup wiederherstellen", kein Neustart und keine Umgebungsvariable nötig

- **Robustheit**: `.catch()`-Handler auf allen `seedProject()`-Aufrufen — Ladeanzeige friert nicht mehr ein wenn Seed-Dateien fehlen

- **README neu**: vollständige Laien-Anleitung (Schnellstart, Datenschutz, Installation, Backup/Restore), technische Details in aufklappbarem `<details>`-Block

- **Laien-Usability: Workshop-Schnellstart**: "Workshop starten"-CTA auf Startseite, `WorkshopQuickStartDialog`, `createQuickStartWorkshop()`, `QUICK_START_MARKER` verhindert seedProject-Überschreibung, ObservationForm vereinfacht, 18 Usability-Tests (LW-01–LW-07)

 "Workshop starten"-CTA auf Startseite, `WorkshopQuickStartDialog` (nur Name → sofort Zonen + Struktur, keine Pipeline), `createQuickStartWorkshop()` in IndexedDB, ObservationForm vereinfacht (Konfidenz/Sensitivität hinter "Weitere Optionen"), 14 neue Usability-Tests (LW-01–LW-06). Build: 0 TS-Fehler, 1705 Module.

- **GitHub-Readiness**: Standalone Git-Repo in `apps/hauskompass-studio/` initialisiert (Branch `main`), erster öffentlicher Commit `5d243b9` mit 272 Dateien. Alle privaten Strings aus src/ + docs/ bereinigt (0 Treffer), project-spezifische Scripts (find-local-media-eiermann, generate-eiermann-spatial-context) gitignored, build_output-Logs gitignored, docs/RELEASE_DECISION.md + initial_repository_assessment.md + ADR-0003 generalisiert.

- Release-Readiness Cleanup: private Projekt-Strings aus src/ entfernt, seedLoader.ts generalisiert (seedProject/isProjectSeeded/clearProjectSeed), generated-Dateien durch leere Stubs ersetzt, /projects/index.json auf [], .gitignore um output/, public/local-media/, examples/workshop/, private Docs ergänzt. Build: 0 TS-Fehler, 1704 Module.

- Codex-Session 019e3bed vorbereitet: RELEASE_DECISION.md (NEEDS_CLEANUP, 10 priorisierte Schritte), ADR-0003-python-utility-layer.md (Entscheidung: Option B — utils/py/ CLI-Layer), Code-Review-Befunde dokumentiert (seedLoader Eiermann-spezifisch: major; Utils: minor)

- Media Enrichment Pipeline abgeschlossen: 9 Web-Kandidaten (Wikimedia CC-BY/CC-BY-SA) in eiermann-web-media-candidates.json, Manifest generiert (74 Assets: 69 lokal + 5 web), graceful error handling für HTTP 429, Pipeline-Szenarien P1–P5 in usability-scenarios.md, Codex-Prompt in docs/handoffs/codex-prompt-media-enrichment.md gespeichert

- Spatial Working Model 1984 Review: UG-Widerspruch behoben (P1 + P4 haben UG, nicht nur P1); spatial_context.json um `undergroundLevels`/`undergroundNote` für P1 und P4 ergänzt; Review-Tabelle R-01–R-05 in Arbeitsdokument eingefügt

- 3D-Evidence-Panel wertet kuratierte Asset-Raumbezuege jetzt aus: `selectedAssetId` kann ein verknuepftes 3D-Objekt aktivieren, `linkedSpatialObjectId` priorisiert direkt verknuepfte Foto-Assets pro Objekt und das Objekt-Detail zeigt die Anzahl direkter Medienlinks

- Lage-Foto-Review erweitert: Im GPS-/Lage-Foto-Preview koennen `spatialAnchorType`, `targetZoneId`, `linkedSpatialObjectId`, `bearingConfidence` und `spatialNotes` jetzt direkt bearbeitet und gespeichert werden; neue DB-API `updateAssetSpatialContext()` fuer kuratierbare raeumliche Asset-Semantik

- Asset-Spatial-Semantik eingefuehrt: Assets koennen jetzt explizit `spatialAnchorType`, `targetZoneId`, `linkedSpatialObjectId`, `bearingConfidence` und `spatialNotes` tragen; neue Inferenzlogik normalisiert GPS-Fotos automatisch zu `viewpoint`-Assets mit EXIF-Richtung, `saveAsset()` wendet diese Semantik zentral an, die Lage-Foto-Ansicht zeigt den raeumlichen Bezug sichtbar an und das 3D-Evidence-Panel kennzeichnet Asset-Eintraege mit ihrem raeumlichen Ankertyp

- Medienordner auf Projekt-Slug-Konvention erweitert: neuer Pfad `public/local-media/workshop-campus-demo/` angelegt, Manifest-URLs dorthin umgeschrieben und `generate-media-manifest.mjs` auf die slug-basierte Medienstruktur umgestellt

- Projektbezogener Medien-Restore: `/projects/index.json` traegt nun `mediaManifestUrl`; `projectDataLoader` loest den Manifest-Pfad pro Projekt auf und `seedLoader.ts` verwendet ihn fuer den Restore statt eines festen Eiermann-Medienpfads

- Workshop-Persistenz pro Projekt isoliert: Seed-Version und Media-Restore-Version werden jetzt ueber projektbezogene `localStorage`-Keys gespeichert; Bundle-Export liest die Seed-Version ebenfalls aus dem projektspezifischen Schluesselraum

- Workshop-Kontext dynamisiert: `App.tsx` und `ProjectHome.tsx` leiten den aktiven Workshop jetzt aus dem gewaehlten Built-in-Projekt inklusive `projectId` und `siteId` ab; `WorkshopApp` laeuft nicht mehr implizit gegen fest verdrahtete Eiermann-Konstanten

- Projekt-Registry aktiviert: `/projects/index.json` traegt jetzt `slug`, `projectId` und `siteId`; `projectDataLoader` nutzt diese Registry als Primaerquelle fuer die Runtime-Aufloesung und faellt nur noch bei Bedarf auf einen kleinen internen Fallback zurueck

- Runtime-Projektdaten zentralisiert: neuer `projectDataLoader` loest `projectId` auf `slug/siteId` auf; `WorkshopMapPanel`, `Workshop3DPanel`, `BulkImportPanel` und `seedLoader.ts` laden Projektdaten jetzt ueber zentrale Projekt-URLs statt ueber verstreute harte Pfade; Pipeline in `docs/project_data_pipeline.md` dokumentiert

- Gebäudehöhen aus ZITRONENWOLF-Geschosszählung (2016) aktualisiert: P1=16m (EG+UG+3OG), P2=17m, P3=14m, P4=17m, Kantine=8m; Working Model bereinigt (keine Absolutpfade, Geschosszahlen ergänzt); project_materials/ ins Projektverzeichnis kopiert; Handoff + codex-cli-Prompt erstellt in docs/handoffs/

- Migration F: Build grün (tsc + vite); 12 migrierte JSON-Dateien aus `examples/workshop/` entfernt; verbleiben: `project_materials/`, GeoJSON-Referenzdateien

- Migration E: verbleibende 4 static imports aus `examples/workshop/` in Komponenten durch fetch() ersetzt (`Workshop3DPanel`, `WorkshopMapPanel`, `BulkImportPanel`); Geodateien nach `/projects/workshop-campus-demo/` kopiert

- Migration D: `seedLoader.ts` — 9 statische JSON-Imports durch `fetchSeedBundle()` ersetzt; Seed-JSON nach `/projects/workshop-campus-demo/seed/` kopiert

- Migration C: `ProjectHome` lädt Projektliste aus `/projects/index.json` (fetch, Fallback auf Inline-Daten); `BUILTIN_PROJECTS`-Export entfernt

- Migration B: `WorkshopRoute` akzeptiert nun `projectId`/`siteId` als Props (mit Defaults); `App.tsx` übergibt `WS_PROJECT_ID`/`WS_SITE_ID` explizit — Hardcodes im Komponenten-Scope entfernt

- Räumliches Grounding-Workflow eingeführt: `verificationStatus` (verified/inferred/placeholder/unknown_geometry) zu allen Spatial-Typen hinzugefügt; alle Gebäudehüllen auf `confidence: imported` und `verificationStatus: inferred_geometry` (LGL-BW LOD2 + GPS-verifiziert) gesetzt; Vegetation und Terrain als `placeholder_geometry` markiert; GML-IDs in spatial_context.json eingetragen; Quellen-Registrierung konsolidiert; drei neue Docs-Dateien: eiermann_spatial_grounding_report.md, eiermann_spatial_data_needed.md, spatial_confidence_model.md

- Workshop 3D Topologie & Vegetation: Verbindungslinie P4→P3 auf P4→P2 korrigiert (P4 liegt in der Achse von P2, nicht P3); veg-edge-autobahn von NE (z=-117) nach SE (z=+121) verschoben — entspricht Richtung der Autobahn

- 3D-Ansicht neu orientiert: z-Achse invertiert (Nord=-z, Süd=+z) für korrekte Three.js Nord-oben-Perspektive; Kamera von SE blickend nordwärts; Kompass-Overlay (N/S/O/W) als SVG-Badge unten rechts; spatial_context.json neu generiert; Working Model Koordinatenkonvention aktualisiert

- 3D-Hull-Positionen korrigiert: P1/P3-Vertauschung im Generate-Script rückgängig gemacht; Pavillon 1 verwendet jetzt z-pavillon-1 (geo Nord, cz≈+58m), Pavillon 3 z-pavillon-3 (geo Süd, cz≈-60m) — entspricht den korrekten ws-map-location-label Positionen aus maplibregl; spatial_context.json neu generiert

- Workshop 3D P1/P3-Korrektur: 3D-Generator trennt nun Geometriequelle und Workshop-Zonenidentität; Pavillon 1 verwendet in der 3D-Ansicht die bisherige Pavillon-3-Geometrieposition, Pavillon 3 die bisherige Pavillon-1-Geometrieposition; lokaler 3D-Ursprung wird aus dem Mittel der Hauptpavillons statt aus einer einzelnen Pavillonnummer gebildet

- Workshop 3D from corrected 2D geometry: `scripts/generate-eiermann-spatial-context.mjs` ergänzt und `spatial_context.json` aus den bestätigten 2D-Zonenpolygonen neu erzeugt; die 2D-Lageansicht ist damit Quelle der 3D-Gebäudeplatzierung; Viewer-Extrusion auf triangulierte Footprints umgestellt, damit echte Polygonformen statt frei geschätzter Ersatzrechtecke funktionieren

- Pavillon-Nummerierung nach Nutzerkorrektur synchronisiert: In der 2D-Ansicht wurde die bisherige Position von Pavillon 3 als Pavillon 2 und die bisherige Position von Pavillon 2 als Pavillon 3 korrigiert; Pavillon 1 und Pavillon 4/NuCOS bleiben unverändert; Pavillon 5 als planned_not_built-Zone, Marker und 2D-Schemafläche ergänzt; 3D-Spatial-Seed und Projektmaterialien auf diese Nummerierung umgestellt; Seed-Version auf 9 angehoben

- Workshop 3D Geometrie-Kalibrierung: Zusatzmaterial zum Eiermann-Areal ab 1984 in `examples/workshop/project_materials/eiermann_spatial_working_model_1984.md` gesichert; Spatial Seed auf die Zeichnungs-/Schema-Logik umgestellt; Pavillon 5 als planned_not_built-Ghost ergänzt; Quellen SFP Architekten, ZITRONENWOLF Rundgang und Projektzeichnungen in `spatial_context.json` referenziert

- Workshop 3D Evidence-Navigation: Evidence-Items im 3D-Seitenpanel sind interaktiv; Klick auf Asset/Observation/Interpretation/Claim/Question wechselt in den Workshop-Kontext, öffnet die passende Zone und fokussiert das Evidenzobjekt; Fotos öffnen den Viewer, Szenen öffnen direkt die WorkshopScene-Detailansicht

- Workshop 3D Stage 4 begonnen: 3D-Objekte sind nun mit der Workshop-Evidenz zurückgekoppelt; Auswahl eines Hüll-/Vegetationsobjekts setzt die Zone und zeigt im 3D-Seitenpanel zonenbezogene Assets, Observations, Interpretations, Claims, Questions und referenzierende WorkshopScenes; `spatial_context.json` enthält nun einen expliziten Scene-Link für die Sukzessionsvegetation

- Studio-Spatial-Sprint gestartet: Architekturentscheid in `docs/next_spatial_sprint_decision.md`, Masterplan `docs/studio_spatial_master_plan.md`, Workshop-3D-Plan und Projektcharaktermodell ergänzt; neue Studio-Typen für Projektcharakter und Spatial-Layer (`domain/project`, `domain/spatial`); Eiermann-Projekt als hybrides Campus-/Workshopprojekt klassifiziert; erster Workshop-3D-Tab mit rough terrain, inferierten Gebäudehüllen, Vegetationsclustern, Layer-Toggles, Quellen-/Konfidenzhinweis und Zone-Linking aus `examples/workshop/spatial_context.json`; Seed-Version auf 8 angehoben

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
- Workshop-Assessment-Fundament für Eiermann-Campus: Domain-Typen (Zone, Place, Asset, Observation, Claim, Question, Memory, EventPhase, WorkshopScene, Assessment, Scenario mit SensitivityLevel + PublicationStatus + EpistemicType) in src/domain/workshop/types.ts; Seed-Daten in examples/workshop/ (12 Zonen, 8 historische Phasen, 5 Claims, 8 Questions, 3 Workshop-Szenen); docs/domain_model.md, docs/project_vision.md, docs/implementation_plan.md, docs/initial_repository_assessment.md angelegt; README aktualisiert
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
- Usability-Test Runde 2 (Demohaus BW 29): B1-Fix (Dialog-Header scrollte aus Viewport bei aufgeklappter Anleitung → align-items:flex-start + margin:auto); B2-Fix (ESC-Key schließt Dialog); vollständige DE-Übersetzung Sidebar-Navigation + Section-Headings + Building/Site-Tabs + Planning-Panel-Titel und Stat-Labels
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
- OpenSpec baseline: initialized `../../docs/openspec/`, added project context and current-state specs for project context, evidence baseline, privacy/local data, metadata validation and renovation planning workflow
- OpenSpec IFC viewer proposal: added `improve-ifc-model-viewer` change request covering viewport sizing, visual inspection polish, compact controls and evidence-aware model context
- Usability-Test 2 (Workshop-Campus Demo / Eiermann-Campus): Wizard-Verbesserungen (20 Kandidaten-Limit, Gebäudegröße 81×81m in Kandidaten-Karte, Kachelgrenze-Hinweis auf Nachbarkachel, Distanzwarnung >30m), BW-Kachel 505_5396 korrekt identifiziert, 2 Eiermann-Pavillons (DEBW_) bestätigt, IFC-Flachdach-Quader generiert, Projekt-Wechsel Demo↔Demo bidirektional verifiziert

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
