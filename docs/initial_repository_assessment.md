# Initial Repository Assessment

**Datum:** 2026-05-17  
**Anlass:** Erweiterung des Projekts zum digitalen Workshopmodell Eiermann-Campus

---

## 1. Framework und Technologie-Stack

| Aspekt | Ist-Zustand |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 8 |
| Testing | Vitest + @testing-library/react |
| 3D | Three.js + web-ifc (IFC-Parser) |
| Kartographie | MapLibre GL 4 + react-map-gl 7 |
| Validierung | Zod 3 |
| Icons | lucide-react |
| Backend | **keiner** — rein clientseitig |
| Persistenz | **localStorage** — kein echtes DB-System |
| Build | Vite Dev-Server (`npm run dev`) |

**Start lokal:**

```bash
cd software/house-renovation-baseline
npm install
npm run dev          # Dev-Server auf http://localhost:5173 (oder nächster freier Port)
npm test             # Unit-Tests
npm run validate:metadata  # JSON-Schema-Validierung
```

---

## 2. Verzeichnisstruktur (Ist)

```
src/
  app/            App.tsx (1400+ Zeilen Hauptkomponente), Hooks, Styles
  domain/         Shared TypeScript-Typen (EvidenceItem, DataConfidence, Geometrie)
  features/       ~20 Feature-Module (assessment, renovation-planning, map-view, …)
  validation/     Zod-Schemas für Formvalidierung
docs/             Umfangreiche Architekturdokumentation (Sanierungs-fokussiert)
schemas/          JSON-Schemas (BIM/AAS-inspiriert, Sanierungsobjekte)
examples/         Beispiel-Datensätze für die Workshop-Funktion
scripts/          Node-Hilfsskripte (Validierung, Handoff-Generator, PDF)
tests/            Vitest-Tests für Schemas, Selektoren, Adapter
utils/            Python-Utilities (IFC-Export, Terrain, LoD2-Download)
cache/            Heruntergeladene Geodaten (gitignore)
local/          Lokale Sensitivdaten (gitignore)
```

---

## 3. Start-Befehl

```bash
npm run dev
# VITE_PROJECT_LABEL=AltesHaus  (aus .env.local — konfiguriert Demo-Projekt)
# Ports: 5173–5179 (Vite wählt nächsten freien)
```

---

## 4. Bestehendes Daten-/Domänen-Modell

### Vorhanden (Sanierungsfokus)

```typescript
// src/domain/
EvidenceItem     — Foto, Messung, Notiz, Scan, Dokument
DataConfidence   — 'unknown' | 'low' | 'medium' | 'high'
BuildingHull     — LoD2-Geometrie, Oberflächen
Lod2Candidate    — LoD2-Gebäude aus GML-Daten

// src/features/project-store/types.ts
ImportedProject  — slug, Adresse, Geocoding, LoD2-Kandidaten, bestätigte IDs
```

### JSON-Schemas (schemas/)

`building-project`, `building-element`, `asset-type`, `asset-instance`, `measurement`,  
`evidence-document`, `evidence-item`, `requirement`, `assumption`, `renovation-decision`,  
`assessment-finding`, `observation-stream`, `room-zone`

### Fehlend für Workshop-/Campus-Assessment

| Domain-Objekt | Status |
|---|---|
| `Site` (Areal als Gesamtobjekt) | ❌ nicht vorhanden |
| `Zone` (räumlicher Bereich) | ❌ nicht vorhanden |
| `Place` (konkreter Ort) | ❌ nicht vorhanden |
| `Asset` (Mediendatei mit Sensitivität) | ❌ fehlt Sensitivity/Publication-Status |
| `Observation` | ❌ nicht vorhanden |
| `Interpretation` | ❌ nicht vorhanden |
| `Claim` (bewertbare Aussage) | ❌ nicht vorhanden |
| `Question` (offene Prüffrage) | ❌ nicht vorhanden |
| `Memory` (Erinnerung/Nachlassmaterial) | ❌ nicht vorhanden |
| `EventPhase` (historische Phase) | ❌ nicht vorhanden |
| `CampusAssessment` | ❌ nicht vorhanden |
| `Scenario` | nur rudimentär (Renovierungsszenarien) |
| `WorkshopScene` | ❌ nicht vorhanden |
| Sensitivity-Level | ❌ nicht im Datenmodell |
| Publication-Status | ❌ nicht im Datenmodell |

---

## 5. Persistenz-Ansatz (Ist)

**localStorage** für alle Projektdaten:

- `hk_project_list` — Liste der Projekt-Slugs
- `hk_project_{slug}` — ImportedProject-Objekte
- `hk_active_project` — aktiver Slug

**Bewertung:**

- Ausreichend für Demo-Nutzung mit wenigen Projekten
- Grenze: ~5 MB Gesamtspeicher
- Keine Queries, keine Transaktionen, kein Relationen-Graphing
- Kein Migrationskonzept
- Kein Backup
- Medien werden nicht gespeichert (nur Pfad-Referenzen)

---

## 6. Bestehende UI-Konzepte

| Bereich | Beschreibung |
|---|---|
| Icon-Rail (52px) | Hauptnavigation (Lage, Gebäude, Bewertung, Planung, Daten) |
| Projekt-Drawer | Projektauswahl/-erstellung per Wizard |
| Map-View | MapLibre GL mit OSM-Kacheln + LoD2-GeoJSON-Overlays |
| IFC-Viewer | Three.js / web-ifc 3D-Viewer |
| RenovationPlanningPanel | Doppelmodus: Import-Projekt (LoD2-Fakten) / Demo |
| AssessmentReadinessPanel | Checkliste Datenlagen |
| ScenarioRegistryPanel | Baseline-Szenarien |
| DataInventoryPanel | Datenverfügbarkeit |
| BuildingCandidateTable | LoD2-Kandidatenliste |

Die UI ist auf **Einzelgebäude-Sanierung** ausgelegt. Campus-Assessment, Zonen-Navigation, Workshop-Modus und Medieninventar fehlen vollständig.

---

## 7. Fehlende Kern-Architekturteile

### Kritisch (ohne diese kein belastbares Workshop-System)

1. **Persistenz-Layer**: localStorage reicht nicht. Ziel: SQLite über OPFS (Origin Private File System) + `@sqlite.org/sqlite-wasm`. Migrations-Konzept erforderlich.
2. **Domain-Typen für Campus-Assessment**: `Zone`, `Place`, `Asset`, `Observation`, `Claim`, `Question`, `Memory`, `EventPhase`, `WorkshopScene` (TypeScript-Interfaces)
3. **Sensitivity & Publication Status**: Modell für `public | internal | sensitive_personal | restricted | unknown` und `publishable | needs_review | internal_only | do_not_publish`
4. **Medien-Inventar**: Metadaten-Struktur für Fotos/Videos/Scans mit Derivate-Tracking
5. **Seed-Daten Eiermann-Campus**: Zonen, erste Claims, Questions, eine Workshop-Szene

### Wichtig (nächste Iterationen)

1. **Zonen-Ansicht**: Navigation `Zone → Assets → Claims → Questions → Szenen`
2. **Export-Engine**: Workshop-Paket (HTML/PDF), interne Auswahl, öffentliche Auswahl
3. **Timeline-Ansicht**: Historische Phasen des Campus
4. **Volltext-Suche über Assets/Claims**

### Spätere Phase

1. **PostGIS-Migration**: Geometrien in echter Geodatenbank
2. **KI-Unterstützung**: Tagging, Transkription, Lückenerkennung

---

## 8. Unmittelbare Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| **Zugang zum Eiermann-Campus endet** | Nicht wiederholbares Material verloren | Capture-first-Priorität; Medien-Ingest sofort ermöglichen |
| **localStorage-Limit (~5 MB)** | Projektdaten werden überschrieben | Domain-Modell nicht in localStorage pumpen; JSON-Dateien als primäres Format |
| **Monolithisches App.tsx (1400+ Zeilen)** | Erweiterungen schwer integrierbar | Domain-Typen und Feature-Module getrennt halten |
| **Keine Sensitivitäts-Logik** | Persönliches Nachlassmaterial versehentlich veröffentlicht | Sensitivity-Typ sofort in Domain-Modell aufnehmen |
| **UI auf Sanierung ausgerichtet** | Campus-Workflows passen nicht rein | Neues Feature-Modul `workshop/` parallel aufbauen, nicht bestehende Module umbenennen |
| **Keine Migrationen** | Schema-Änderungen verlieren bestehende Daten | JSON-Dateien als versionierbare Artefakte nutzen |

---

## 9. Empfohlene erste Implementierungsschritte

### Sprint 0 (jetzt — diese Session)

- [x] Repository-Bestand dokumentieren (dieses Dokument)
- [ ] TypeScript-Domain-Typen anlegen: `Zone`, `Place`, `Asset`, `Observation`, `Claim`, `Question`, `Memory`, `EventPhase`, `WorkshopScene`, `SensitivityLevel`, `PublicationStatus`
- [ ] Seed-Daten Eiermann-Campus: 12 Zonen, 5 Claims, 8 Questions, 1 WorkshopScene
- [ ] `docs/domain_model.md`, `docs/project_vision.md`, `docs/implementation_plan.md` anlegen
- [ ] README aktualisieren

### Sprint 1 (nächste Session)

- [ ] Zonen-Ansicht: einfache Liste mit Assets/Claims/Questions pro Zone
- [ ] Asset-Ingest-Workflow: Ordner einlesen, Asset-ID vergeben, Metadaten-Template erzeugen
- [ ] Sensitivity-Label in UI sichtbar machen
- [ ] Navigation um Workshop-Tab erweitern

### Sprint 2

- [ ] Workshop-Szenen-Ansicht mit Medienauswahl, Beobachtung, Deutung, Prüffragen
- [ ] Einfacher Export (JSON-Paket, HTML-Szene)
- [ ] Timeline-Ansicht historische Phasen

### Sprint 3+

- [ ] SQLite WASM als Persistenz-Layer evaluieren und einführen
- [ ] GeoJSON-Zonen-Overlay auf Campus-Karte
- [ ] Volltext-Suche
