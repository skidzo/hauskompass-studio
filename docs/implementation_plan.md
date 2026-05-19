# Implementierungsplan: Workshop-Assessment-System

**Version:** 0.1.0  
**Datum:** 2026-05-17

---

## Arbeitsmodell

### Iterationslogik

```
Discover → Specify → Implement → Capture → Assess → Review → Refine
```

Jede Iteration beantwortet vier Fragen:

1. Welcher konkrete Nutzen entsteht?
2. Welche Domain-Objekte werden benötigt?
3. Welche Daten müssen erfasst werden?
4. Welche Unsicherheiten bleiben sichtbar?

---

## Sprint 0 — Fundament (abgeschlossen / laufend)

**Ziel:** Repository arbeitsfähig machen, Domain-Modell etablieren, Seed-Daten anlegen.

### Erledigte Aufgaben

- [x] Repository-Bestand analysiert (`docs/initial_repository_assessment.md`)
- [x] Projektvision definiert (`docs/project_vision.md`)
- [x] Domain-Modell spezifiziert (`docs/domain_model.md`)

### Laufende Aufgaben

- [ ] TypeScript-Domain-Typen anlegen: `src/domain/workshop/types.ts`
- [ ] Seed-Daten Eiermann-Campus: `examples/eiermann/`
  - `site.json`
  - `zones.json`
  - `event_phases.json`
  - `claims.json`
  - `questions.json`
  - `workshop_scenes.json`
- [ ] README aktualisieren

### Akzeptanzkriterien Sprint 0

- TypeScript kompiliert ohne Fehler
- Seed-Daten lassen sich einlesen
- 12 Zonen definiert
- 5+ Claims angelegt
- 8+ Questions angelegt
- 1 WorkshopScene vollständig

---

## Sprint 1 — Zonen-Ansicht + Asset-Ingest

**Nutzen:** Medien können einem Ort zugeordnet werden. Workshopteilnehmende finden Material nach Zone.

**Scope:**

- Neue Navigation: `Workshop`-Tab in der Icon-Rail
- Zonen-Listenansicht: Zone → Assets → Claims → Questions
- Asset-Ingest-Workflow (Node-Skript oder Browser-Datei-Auswahl)
- Sensitivity-Label sichtbar in UI

**Betroffene Domain-Objekte:** `Zone`, `Place`, `Asset`, `Claim`, `Question`

**Risiken:**

- Asset-Ingest mit vielen Fotos belastet localStorage → JSON-Datei-basierter Ansatz verwenden
- Sensitivity-Label muss von Beginn an sichtbar sein, nicht nachgerüstet werden

**Minimale Umsetzung:**

```
src/features/workshop/
  WorkshopRoute.tsx         — Haupt-Route für Workshop-Modus
  ZoneList.tsx              — Listet alle Zonen mit Kurzinfo
  ZoneDetail.tsx            — Zone mit verknüpften Assets/Claims/Questions
  AssetCard.tsx             — Asset-Karte mit Sensitivity-Badge
  ClaimCard.tsx             — Claim mit Epistemic-Badge
  QuestionCard.tsx          — Frage mit Status-Badge
  SensitivityBadge.tsx      — Wiederverwendbare Komponente
  useWorkshopData.ts        — Daten-Hook (lädt JSON-Seed-Dateien)
```

**Spätere Ausbaustufe:** Karte mit klickbaren Zonen, Asset-Suche, Filter nach Sensitivität

---

## Sprint 2 — Workshop-Szenen-Modus

**Nutzen:** Kuratierte Szenen können in Workshops moderiert werden.

**Scope:**

- Workshop-Szenen-Liste
- Szenen-Detail mit Medienauswahl, Kontext, Beobachtungen, Deutungen, Prüffragen
- Diskussionsprompt sichtbar
- Export-Vorbereitung (JSON-Paket)

**Betroffene Domain-Objekte:** `WorkshopScene`, `Scenario`, `Asset`

**Risiken:**

- Szenen-Dramaturgie braucht gute Medienauswahl → erst Medien erfassen (Sprint 1)
- Export-Format muss Sensitivity respektieren

**Minimale Umsetzung:**

- Szenen-Liste als Karten
- Szene öffnet sich in Vollbild oder Seitenansicht
- Medien werden angezeigt (Pfad/Platzhalter wenn nicht lokal)
- Prüffragen und Diskussionsprompt sichtbar
- Einfacher JSON-Export einer Szene

---

## Sprint 3 — Timeline + Historische Phasen

**Nutzen:** Campus wird als historische Sequenz verständlich, nicht als Momentaufnahme.

**Scope:**

- Timeline-Ansicht mit `EventPhase`-Objekten
- Phasen mit verknüpften Assets und Claims
- Memories einer Phase zuordnebar

**Betroffene Domain-Objekte:** `EventPhase`, `Memory`, `Claim`, `Asset`

---

## Sprint 4 — Persistenz-Upgrade (SQLite WASM)

**Nutzen:** Mehr als ~5 MB Metadaten, echte Queries, Migrationen, Backup.

**Scope:**

- `@sqlite.org/sqlite-wasm` evaluieren
- OPFS als Storage-Backend
- Migration von JSON-Seed-Daten in SQLite
- Einfache Migrations-Skripte

**Risiken:**

- WASM-Setup komplex (SharedArrayBuffer, COOP/COEP-Header)
- Migration muss verlustfrei sein

**Vorbedingung:** JSON-Seed-Daten sind stabil typisiert

---

## Sprint 5 — GeoJSON-Zonen-Overlay + Campuskarte

**Nutzen:** Räumliche Navigation, Zonen klickbar auf Karte.

**Scope:**

- GeoJSON-Polygone für Eiermann-Zonen (manuell oder aus Luftbild georeferenziert)
- Overlay auf MapLibre-Karte
- Klick auf Zone öffnet ZoneDetail

---

## Sprint 6 — Export-Engine

**Nutzen:** Workshop-Pakete für externe Nutzung, interne Review-Pakete, öffentliche Auswahl.

**Scope:**

- JSON-Export-Paket (vollständig, intern, öffentlich)
- HTML-Export (statische Workshop-Website)
- Sensitivitäts-Filter bei allen Exporten

---

## Feature-Aufnahme-Vorlage

Für jedes neue Feature vor der Umsetzung ausfüllen:

```
Feature-Idee: [Name]
Problem: [Was fehlt / was ist schmerzhaft?]
Zielgruppe: [Wer nutzt es konkret?]
Nutzen: [Was wird damit möglich?]
Benötigte Daten: [Welche Domain-Objekte / Assets?]
Betroffene Objekte: [Zone, Asset, Claim, ...?]
Risiken: [Was kann schiefgehen?]
Minimale Umsetzung: [Kleinstes hilfreiches Artefakt]
Spätere Ausbaustufe: [Langfristige Vision]
```

---

## Wochendefinition (Qualitätsprüfung)

Jede Arbeitswoche endet mit einem kurzen Review:

1. Was wurde neu erfasst?
2. Welche Zonen sind besser dokumentiert?
3. Welche Materialien sind sensitiv?
4. Welche Claims wurden ergänzt?
5. Welche offenen Fragen sind neu?
6. Welche Workshop-Szene ist stärker geworden?
7. Was muss vor Ort noch aufgenommen werden?
8. Was muss technisch als Nächstes funktionieren?
