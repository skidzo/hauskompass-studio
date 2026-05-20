# Hauskompass Studio

**Ein digitales Notizbuch für Gebäude-Workshops** — für Architekten, Denkmalpfleger, Stadtplaner und alle, die ein komplexes Gebäude oder Gelände gemeinsam verstehen, dokumentieren und weiterentwickeln wollen.

> Keine Anmeldung. Keine Cloud. Alle Notizen und Fotos bleiben auf Ihrem Computer.

---

## Was ist Hauskompass Studio?

Stellen Sie sich vor, Sie gehen mit einer Gruppe durch ein altes Schulgebäude, ein Baudenkmal oder einen Gewerbekomplex. Jeder sieht etwas anderes: die abblätternde Fassade, das feuchte Kellergewölbe, den ungenutzten Dachboden. Bis jetzt wurden solche Eindrücke auf Notizzetteln oder in verstreuten E-Mails festgehalten — und gingen oft verloren.

**Hauskompass Studio** löst genau das: Es ist eine Browser-Anwendung, die Sie auf einem Laptop mitnehmen können. Im Workshop tragen alle Teilnehmer ihre Beobachtungen, Fotos und Einschätzungen direkt ein — sortiert nach Gebäudebereichen, jederzeit wieder auffindbar.

Das Tool eignet sich für zwei Hauptzwecke:

- **Workshop-Dokumentation:** Gemeinsam vor Ort dokumentieren — Beobachtungen, Fotos, Fragen zu einzelnen Zonen eines Gebäudes oder Geländes.
- **Sanierungsplanung:** Evidenzbasierte Aufbereitung von Bestandsbefund, Sanierungsoptionen und Planungsstand für ein konkretes Projekt.

---

## Schnellstart für Workshop-Teilnehmer

Sie nehmen an einem Workshop teil und möchten sofort loslegen? So geht es:

### Schritt 1 — App starten

Jemand hat die App bereits für Sie gestartet und gibt Ihnen eine Adresse wie `http://localhost:5173`. Öffnen Sie diese Adresse in Chrome, Firefox oder Edge.

*Falls Sie die App selbst starten müssen, siehe Abschnitt „Installation" weiter unten.*

### Schritt 2 — Workshop anlegen

Auf der Startseite sehen Sie ein grünes Banner: **„Workshop dokumentieren?"**

Klicken Sie auf **„Workshop starten"**, geben Sie einen Namen ein (z. B. *„Workshop Hauptgebäude 12. Juni"*) und bestätigen Sie. Das war es — Ihr Projekt ist fertig.

### Schritt 3 — Gebäudebereiche erkunden

Es erscheinen automatisch sechs Gebäudebereiche:

| Bereich | Beispiele |
|---|---|
| Dach & Dachstuhl | Dachdeckung, Dachfenster, Entwässerung |
| Fassade & Außenhülle | Putz, Fenster, Türen |
| Keller & Fundament | Feuchte, Mauerwerk, Zugänge |
| Erdgeschoss & Haustechnik | Heizung, Elektrik, Leitungen |
| Obergeschosse & Innenräume | Decken, Böden, Treppen |
| Außenanlage & Erschließung | Wege, Grünflächen, Parkplätze |

Klicken Sie auf einen Bereich, der Sie interessiert.

### Schritt 4 — Beobachtung hinzufügen

Klicken Sie auf **„Beobachtung hinzufügen"** und schreiben Sie, was Sie sehen — ganz formlos, wie eine Notiz. Optional können Sie ein Foto anhängen. Klicken Sie auf **Speichern**.

Unter **„Weitere Optionen"** finden Sie zusätzliche Felder (Wichtigkeit, Vertraulichkeit), die Sie in den meisten Fällen nicht brauchen.

### Schritt 5 — Alles wiederfinden

Alle Ihre Einträge bleiben gespeichert, solange Sie denselben Browser und denselben Computer verwenden. Sie können jederzeit zurückgehen und nachlesen oder ergänzen.

---

## Wohin gehen meine Daten?

**Nirgendwo hin.** Alle Notizen und Fotos werden ausschließlich im Speicher Ihres Browsers abgelegt (sogenannte „IndexedDB" — unsichtbar, aber sicher auf Ihrer Festplatte). Es gibt keinen Server, keine Cloud, keine Anmeldung. Niemand außer Ihnen kann auf diese Daten zugreifen.

Das bedeutet auch: Wenn Sie den Browser-Cache löschen oder einen anderen Computer verwenden, sind die Daten weg. Sichern Sie Ihre Daten regelmäßig mit dem **„ZIP-Backup (mit Fotos)"**-Button, der im Workshop unten in der Leiste erscheint. Die ZIP-Datei enthält alle Notizen und Fotos. Alternativ steht **„JSON (nur Metadaten)"** für ein kleineres Backup ohne Bilder zur Verfügung. Beide Formate können über **„Projekt aus Backup wiederherstellen"** auf der Startseite wieder eingelesen werden — auch auf einem anderen Computer.

---

## Installation (für Personen, die die App selbst betreiben)

Sie brauchen dazu zwei kostenlose Programme:

1. **Node.js** (Version 22 oder neuer) — Download: [nodejs.org](https://nodejs.org)
2. **Git** — Download: [git-scm.com](https://git-scm.com)

Öffnen Sie ein Terminal (unter Windows: „PowerShell" oder „Eingabeaufforderung", unter Mac/Linux: „Terminal") und geben Sie folgende Befehle ein — einen nach dem anderen, jeweils mit Enter bestätigen:

```bash
git clone https://github.com/skidzo/hauskompass-studio.git
cd hauskompass-studio
npm install
npm run dev
```

Nach dem letzten Befehl erscheint eine Adresse wie `http://localhost:5173`. Öffnen Sie diese im Browser. Die App ist bereit.

**Die App läuft nur, solange das Terminal-Fenster offen ist.** Schließen Sie es mit `Strg+C`.

---

## Für Fortgeschrittene: Eigenes Projekt einbinden

Wenn Sie bereits ein vorkonfiguriertes Projekt mit eigenen Gebäudedaten haben (JSON-Seed-Dateien, Medien), können Sie es über eine Konfigurationsdatei einbinden:

```bash
export HAUSKOMPASS_PROJECT_CONFIG=$HOME/projekte/mein-projekt/project.config.json
npm run dev
```

Projektdaten liegen lokal in `/projects/<slug>/` — dieses Verzeichnis ist aus git ausgeschlossen und wird nicht synchronisiert.

---

## Was das Tool nicht ist

- Kein vollständiges BIM-System (kein Revit-Ersatz, keine IFC-Erstellung)
- Keine Baukonstruktionsplanung oder Statik
- Kein Cloud-Dienst — ohne lokale Installation läuft nichts
- Keine fertige App im App Store

Es ist ein **Werkzeug für den Erkenntnisprozess**: Was wissen wir sicher? Was ist eine Vermutung? Was müssen wir noch herausfinden? Jede Beobachtung bleibt als Beobachtung erkennbar und wird nicht zu einer Tatsache hochgeschrieben.

---

## Lizenz

MIT License — siehe [LICENSE](LICENSE)

---

## Für Entwicklerinnen und Entwickler

<details>
<summary>Technische Details aufklappen</summary>

### Stack

- React 18 + TypeScript + Vite
- Dexie.js (IndexedDB-Wrapper) für lokale Datenhaltung
- Three.js (3D-Viewer) + MapLibre (Karte)
- Node.js `node:test` für Tests (keine externen Test-Frameworks)

### Entwicklung

```bash
npm install
npm run dev               # Dev-Server (http://localhost:5173)
npm test                  # Unit-Tests
npm run validate:metadata # JSON-Schema-Validierung
npm run handoff:codex     # Codex-Handoff generieren
```

### Projektstruktur

```txt
src/domain/workshop/types.ts   — Domain-Typen (Zone, Asset, Claim, Observation …)
src/domain/                    — Shared-Typen (DataConfidence, EvidenceItem, Geometrie)
src/features/                  — Feature-Module (workshop, renovation, map-view …)
src/app/                       — App-Shell, Routing, globale Styles
tests/                         — Integrations- und Usability-Tests (.mjs)
utils/tests/                   — Utility-Tests
schemas/                       — JSON-Schemas
docs/                          — Architekturdokumentation
```

### Architektur-Kernprinzipien

- **Quellengebundenheit** — jeder Claim braucht mindestens eine Quellreferenz
- **Epistemic-Typen** — `verified_fact | observation | interpretation | memory | hypothesis | disputed_claim | open_question`
- **Sensitivity-Level** — `public | internal | sensitive_personal | restricted | unknown` pro Objekt
- **Local-first** — kein Cloud-Zwang, persönliche Daten bleiben lokal
- **Capture-first** — Vor-Ort-Material hat Vorrang vor technischer Ausarbeitung

Schlüsseldokumente:

```txt
docs/domain_model.md
docs/adrs/ADR-0001-separate-building-model-from-asset-data.md
docs/architecture/asset-data-model.md
```

### Smoke Test

1. `npm run validate:metadata`
2. `npm test`
3. `npm run dev` → Browser öffnen
4. Sidebar zeigt: `Planning`, `Site`, `Building`, `Assessment & Reuse`, `Data`
5. Geschätzte Werte sind als solche gekennzeichnet

</details>
