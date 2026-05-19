# First Architecture Slice: Status und Ausblick

**Version:** 1.0.0 — 2026-05-17  
**Bearbeitungsstand:** vollständig implementiert

Dieses Dokument beschreibt den aktuellen Entwicklungsstand als **konkretes professionelles Fundament**, erklärt was bewusst weggelassen wurde und zeigt den nächsten Schritt.

---

## Was ist implementiert

### Technischer Stack

| Schicht | Technologie | Version |
|---------|-------------|---------|
| UI-Framework | React | 18 |
| Sprache | TypeScript (strict) | 5 |
| Build | Vite | 8 |
| Persistenz | Dexie.js auf IndexedDB | v4 |
| Reaktive Bindungen | dexie-react-hooks (`useLiveQuery`) | v4 |
| Karte | MapLibre GL + react-map-gl | 4 / 7 |
| Icons | lucide-react | aktuell |
| Tests | Vitest + @testing-library/react | v4 / v16 |
| Tiles | OpenFreeMap (kein API-Key) | — |

**Testzustand:** 137 Tests in 12 Dateien, alle grün.  
**Build:** sauber (TypeScript strict, keine Fehler).  
**Dev-Port:** `localhost:5175`

---

### Domain-Modell

39 TypeScript-Typen in `src/domain/workshop/types.ts`. Der vollständige Evidenzfluss ist implementiert:

```
Asset → Observation → Interpretation → Claim → Question → Assessment → Scenario → WorkshopScene
```

Alle Entitäten tragen `sensitivityLevel` und `publicationStatus`. Der Typ `EpistemicType` erzwingt eine klare Trennung zwischen Tatsache, Beobachtung, Deutung, Erinnerung, Hypothese, Streitthese und offener Frage.

→ Vollständige Typenreferenz: [`docs/domain_model.md`](domain_model.md)

---

### Persistenzschicht

Dexie-Datenbank (`src/features/workshop/db/workshopDb.ts`) mit 15 + 1 Tabellen, Schema-Version 3. Alle CRUD-Funktionen kapseln den DB-Zugriff; Komponenten greifen nie direkt auf Dexie zu.

→ Vollständige Beschreibung: [`docs/persistence_strategy.md`](persistence_strategy.md)

---

### Seed-Daten: Eiermann-Campus

`examples/eiermann/` enthält den gesamten Ausgangsbestand für den Eiermann-Campus Stuttgart-Vaihingen (IBM-Hauptverwaltung, Egon Eiermann). Seed-Version: `'4'`.

- 12 Zonen (Parkdecks, Pavillons, NuCOS-Büro, Kantine, Zugang, …)
- 8 Ereignisphasen (1960er Bau → IBM-Betrieb → Leerstand → NuCOS-Übernahme → …)
- 5 Claims, 8 Fragen, 6 Beobachtungen, 5 Workshop-Szenen, 3 Memories
- Sensitivität und Publikationsstatus auf allen Einträgen explizit gesetzt

**Fachliche Korrektheit (Stand 2026-05):** Die Parkdecks sind **nicht** formal denkmalgeschützt. Der Workshop nutzt diese Spannung (Pavillons geschützt, Parkdecks nicht) als produktiven Diskussionsgegenstand.

---

### UI-Komponenten

| Komponente | Ort | Funktion |
|------------|-----|---------|
| `WorkshopRoute` | `src/features/workshop/` | Root-Layout, Tab-Navigation |
| `ZoneDetailPanel` | in WorkshopRoute | Zonen-Detail mit vollständiger Evidenzkette |
| `AssetIngestPanel` | `components/` | Datei-Drop + mobile Kamera-Capture |
| `ObservationPanel` | `components/` | Beobachtungen erfassen und verwalten |
| `InterpretationPanel` | `components/` | Deutungen aus Beobachtungen ableiten |
| `MemoryPanel` | `components/` | Erinnerungen erfassen (konservative Defaults) |
| `QuestionsBoard` | `components/` | Offene Fragen nach Priorität |
| `WorkshopMap` | `components/` | MapLibre-Karte mit Zone-Overlay |
| `WorkshopExportBar` | in WorkshopRoute | Export-Trigger für Szenen-Mappe |
| `IFCViewerPanel` | `components/` | IFC-Metadaten-Viewer |
| `LocalRegistersPanel` | `components/` | Lokale Planungsregister |

---

### Export: Workshop-Szenen-Mappe

`src/features/workshop/export/workshopExport.ts` generiert eine selbst­enthaltene HTML-Datei mit eingebettetem CSS:

- **Öffentlicher Export** (`mode: 'public'`): nur `publishable`-Inhalte
- **Interner Export** (`mode: 'internal'`): alle Inhalte außer `do_not_publish`
- Enthält: Cover, Inhaltsverzeichnis, Szenen mit Kontext / Beobachtungen / Deutungen / offene Fragen / Diskussionsimpuls
- Druckbar (CSS `@media print` eingebettet)
- Dateiname: `eiermann-campus-workshop-public-2026-05-17.html`

---

## Was bewusst weggelassen wurde

Diese Entscheidungen sind architektonisch, nicht technische Schulden:

| Nicht implementiert | Begründung |
|---------------------|------------|
| 3D-Ansicht / BIM-Viewer | Erfordert IFC.js oder Babylon.js — zu groß für Slice 1; IFC-Adapter-Interface vorbereitet |
| KI/Embeddings/Semantic Search | Transformers.js geplant; `embedding?: number[]` auf Asset/Claim/Observation vorbereitet |
| Cloud-Sync / Backend | Lokale Datenhaltung ist bewusste Designentscheidung (Datenschutz, Offline) |
| Benutzerauthentifizierung | Kein Multi-User-Bedarf in Slice 1; DB-Adapter-Schicht vorbereitet |
| GIS-Backend / PostGIS | Zone-GeoJSON vorhanden; PostGIS-Migrationspfad dokumentiert |
| Mehrprojekt-UI | `projectId` auf allen Entitäten — Switch-Mechanismus nicht implementiert |
| IFC-Upload / BIM-Matching | IFC-Metadaten-Adapter vorhanden, kein Upload-UI |

---

## Wie das Modell die zukünftige Arbeit unterstützt

### Archivarbeit & Datenschutz

Jede Entität trägt `sensitivityLevel` und `publicationStatus`. `Memory` hat zusätzlich `citability` und `releaseStatus`. Freigaben sind niemals implizit. Das erlaubt sicheres Erfassen sensibler Inhalte ohne sofortige Veröffentlichungsentscheidung.

### Capture-First-Workflow

`AssetIngestPanel` unterstützt Datei-Drop und mobile Kamera (`capture="environment"` auf `<input type="file">`). Beobachtungen können direkt nach dem Foto erfasst werden. Die App funktioniert offline (nach erstem Laden).

### Workshop-Szenen und Export

`WorkshopScene` ist eine kuratierte Inszenierung — keine Wahrheitsquelle. Mehrere Szenen können dasselbe Beweismaterial unterschiedlich rahmen. Der Export erlaubt parallele öffentliche und interne Mappen aus demselben Datenstand.

### Semantische Erweiterung

`embedding?: number[]` ist auf `Asset`, `Claim` und `Observation` deklariert (nicht DB-indiziert). Eine Transformers.js-Integration kann Ähnlichkeitssuche auf bestehenden Datensätzen nachrüsten ohne Schema-Migration.

---

## Nächste Schritte (priorisiert)

1. **Asset-Ingest mit echten Fotos** — erste On-Site-Aufnahmen für Prioritätszonen (Parkdecks, Zugang, NuCOS-Büro)
2. **Zone-Detail auffüllen** — Observations + Interpretations für alle 12 Zonen
3. **Export erproben** — erste Workshop-Mappe generieren und im Review-Format verwenden
4. **IFC-Viewer aktivieren** — `IFCViewerPanel` mit Eiermann-IFC-Datei verbinden
5. **Semantische Suche (Spike)** — Transformers.js + `embedding[]` auf Asset-Metadaten
6. **Mehrprojekt-Switch** — projektweites Dropdown wenn zweiter Anwendungsfall definiert ist

---

## Wie man das Modell inspiziert

```bash
# Dev-Server starten
cd software/house-renovation-baseline
npm run dev
# → http://localhost:5175

# Seed-Daten als JSON inspizieren
node utils/inspect_seed.mjs

# Tests ausführen
npx vitest run
```

Die App ist **das primäre Inspektionswerkzeug**: Tab "Zonen" zeigt alle Zonen mit Evidenzkette, Tab "Szenen" zeigt alle Workshop-Szenen mit Export-Funktion, Tab "Karte" zeigt die räumliche Verteilung.
