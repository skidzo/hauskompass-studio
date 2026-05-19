# Projektvision: Digitales Assessment-System

**Version:** 0.2.0-vision  
**Datum:** 2026-05-17

---

## Kern-Absicht

Dieses Projekt ist der Anfang einer **professionellen, lokalen Assessment-Software** für die Analyse, Dokumentation und workshopfähige Aufbereitung komplexer Gebäude- und Campusorte.

Es ist kein finales BIM-Modell, keine Marketing-Demo und kein Wegwerf-Prototyp.

Es ist ein **quellengebundener, workshopfähiger Erkenntnisraum**, der räumliche, historische, soziale, ökologische und organisatorische Informationen so zusammenführt, dass Orte in Workshops besser verstanden, diskutiert und weiterentwickelt werden können.

---

## Erster konkreter Anwendungsfall

**Industriegebäude-Campus mit Transformationspotenzial**

Ein ehemaliger Verwaltungscampus eines renommierten Architekten, der heute als Werkstatt- und Workshop-Areal dient und vor einer fundamentalen Transformation steht. Das Modell soll die räumlichen Strukturen, historischen Schichten, persönlichen Erinnerungen, heutigen Widersprüche und möglichen Zukünfte des Campus für Workshops verhandelbar machen.

Kritisch: Der physische Zugang zum Campus ist zeitlich begrenzt. Das System muss sofort die Erfassung, Zuordnung und Wiederauffindbarkeit von Vor-Ort-Material unterstützen.

---

## Zukünftige Anwendungsfälle

Das System ist so zu gestalten, dass es ohne fundamentalen Umbau auch für:

- andere Bestandsgebäude und Sanierungs-Assessments (bestehender Ansatz)
- Quartiers- und Stadtentwicklungs-Assessments
- Denkmalschutz-Dokumentationen
- Partizipative Planungsprozesse

verwendbar ist.

---

## Leitprinzipien

### 1. Quellengebundenheit vor Glättung

Jede Aussage im Modell soll möglichst eine Quelle haben. Unsicherheiten werden sichtbar gemacht, nicht verdeckt.

### 2. Erkenntnistypen unterscheiden

Das System unterscheidet zwischen:

- `verified_fact` — geprüfte historische Tatsache
- `observation` — konkrete Beobachtung vor Ort oder aus Material
- `interpretation` — Deutung aus Beobachtungen
- `memory` — persönliche Erinnerung oder Zeitzeugenaussage
- `hypothesis` — fachliche Annahme
- `disputed_claim` — strittige These
- `open_question` — noch nicht geklärte Prüffrage

Diese Unterscheidung darf niemals durch UI-Glättung aufgelöst werden.

### 3. Capture-first-Priorität

Was nur vor Ort aufgenommen werden kann, hat Vorrang vor technischer Ausarbeitung.

### 4. Lokaler Betrieb, sensibler Umgang

Das System soll lokal betreibbar sein. Sensible Materialien (Nachlassunterlagen, persönliche Erinnerungen) werden nicht automatisch veröffentlicht. Jedes Objekt hat einen Sensitivity-Level und einen Publication-Status.

### 5. Assessment, nicht nur Archiv

Das System sammelt nicht nur Material. Es macht Material für Entscheidungen auswertbar — durch Bewertungsdimensionen, offene Prüffragen und Workshop-Szenen.

### 6. Kein Über-Engineering

Neue Features werden erst umgesetzt, wenn ihr Nutzen klar beschrieben ist. Das Fundament muss solide sein, aber nicht perfekt.

---

## Evidenz-Fluss

```
Ort (Place / Zone)
  → Asset (Foto, Video, Scan, Dokument, Audio)
  → Observation (konkrete Beobachtung)
  → Interpretation (Deutung)
  → Claim (bewertbare Aussage mit Quelle und Sicherheitsgrad)
  → Question (offene Prüffrage)
  → Assessment (fachliche Bewertung nach Dimensionen)
  → Scenario (mögliche Entwicklungsrichtung)
  → WorkshopScene (kuratierte, moderierbare Szene)
  → Export (Workshop-Paket, internes Review, öffentliche Auswahl)
```

Dieser Fluss ist nicht immer linear. Ein Asset kann mehrere Beobachtungen stützen. Eine Frage kann auf mehrere Claims verweisen. Wichtig ist, dass die Rückverfolgbarkeit erhalten bleibt.

---

## Qualitätskriterien für jeden Zwischenstand

Ein guter Stand ist nicht daran erkennbar, dass die UI schön ist. Er ist daran erkennbar, dass folgende Fragen beantwortet werden können:

1. Welche Materialien existieren?
2. Wo gehören sie räumlich hin?
3. Welche Phase oder welches Ereignis betreffen sie?
4. Welche Aussage stützen sie?
5. Welche Unsicherheit bleibt?
6. Darf dieses Material öffentlich gezeigt werden?
7. Welche Szene kann daraus für einen Workshop gebaut werden?
8. Welche wichtige Frage muss noch geprüft werden?

---

## Nicht-Ziele (erste Phase)

- Keine vollständige 3D-Engine / fotorealistisches BIM
- Kein KI-Chatbot
- Keine automatische Interpretation
- Keine öffentliche Kollaboration ohne Rechtekonzept
- Keine perfekte Mobile-Optimierung
- Kein vollständiges BIM/IFC-Austauschformat

---

## Technische Richtung

- **Lokal-first**: kein Backend, kein Cloud-Zwang
- **Persistenz**: localStorage für jetzt, SQLite WASM (OPFS) als nächste Stufe
- **Datenformat**: TypeScript-typisierte JSON-Objekte mit stabilen IDs
- **Medien**: Rohdateien unverändert, Derivate (Thumbnails, Vorschauen) getrennt
- **Migrations-Strategie**: JSON-Dateien als versionierbare Artefakte, spätere DB-Migrationen
- **Erweiterbarkeit**: Domain-Typen in `src/domain/workshop/`, Feature-Module in `src/features/workshop/`
