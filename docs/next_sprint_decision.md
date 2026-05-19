# Next Sprint Decision: Minimal WorkshopScene Editor

**Date:** 2026-05-17  
**Decision:** Sprint Option B — Minimal Scene Editor

## 1. Welche Optionen wurden betrachtet?

- **Option A: Field-Readiness** — Placeholder Assets, JSON Backup Export und Completeness Indicators sind im aktuellen Arbeitsstand bereits implementiert und getestet.
- **Option B: Minimal Scene Editor** — WorkshopScenes sind sichtbar und exportierbar, aber noch nicht aus erfasstem Material erstellbar oder bearbeitbar.
- **Option C: Assessment-Stubs** — fachlich wichtig, aber erst sinnvoll, wenn kuratierbare Szenen aus realem Material entstehen können.

## 2. Was ist jetzt verantwortbar?

Ein minimaler Scene Editor ist verantwortbar, wenn er Szenen als kuratierte Arbeitsansichten behandelt, nicht als Wahrheit. Neue Szenen bleiben konservativ `internal` / `needs_review`, und eine öffentliche Freigabe darf nur möglich sein, wenn die ausgewählten Assets selbst öffentlich und veröffentlichbar sind.

## 3. Was ist jetzt umsetzbar?

Umsetzbar ist eine kleine, lokale UI auf Basis der bestehenden Dexie-Tabelle `workshopScenes`: Szene erstellen, bestehende Szene bearbeiten, Assets und Beobachtungen auswählen, freie Beobachtungen / Claims / Fragen ergänzen und den bestehenden Viewer sowie HTML-Export weiterverwenden.

## 4. Was erzeugt die größte Wertschöpfung?

Der Editor macht aus der Capture-first-Schicht ein workshopfähiges Arbeitsmittel: erfasste Assets und Beobachtungen können unmittelbar in eine moderierbare Szene überführt werden. Das erhöht Wiederauffindbarkeit, macht offene Fragen konkreter und bereitet Review-Exporte vor, ohne Assessment-Autorität vorzutäuschen.

## 5. Was wird bewusst nicht umgesetzt?

- Keine Scenario-API.
- Keine Assessment-Stubs.
- Kein PDF-Renderer.
- Keine automatische Interpretation.
- Keine Drag-and-drop-Sortierung.
- Keine öffentliche Freigabe sensibler Asset-Auswahlen.
- Keine vollständige Medienvorschau in Szenen.

## 6. Welche Risiken bleiben?

- Scene-Observations sind weiterhin Textlisten; ausgewählte Beobachtungen werden nicht als stabile Referenz-IDs gespeichert.
- Freitext kann sensible Inhalte enthalten; die UI kann das nicht automatisch erkennen.
- Bestehende Seed-Szenen bleiben kuratierte Startpunkte und sind nicht als geprüfte Fakten zu verstehen.
- Asset-Auswahl wird zunächst einfach gehalten und ersetzt keine spätere Review- oder Consent-Logik.

## 7. Welche Akzeptanzkriterien gelten?

- Eine WorkshopScene kann ohne Seed-Datei erstellt werden.
- Eine bestehende WorkshopScene kann bearbeitet werden.
- Titel, Leitfrage, Kontext, Prompt, Sichtbarkeit und Publikationsstatus sind erfassbar.
- Assets und vorhandene Observations können ausgewählt werden.
- Freitext-Beobachtungen, Claims/Deutungen und Fragen können ergänzt werden.
- Neue oder geänderte Szenen erscheinen sofort im Viewer.
- Interner HTML-Export enthält erstellte Szenen.
- Öffentlicher Export bleibt durch `publicationStatus` begrenzt.
- Szenen mit nicht öffentlich freigegebenen Assets werden beim Speichern nicht `publishable`.
- Tests und Build bleiben grün.

## Umsetzungsergebnis

Der Sprint wurde als Minimal Scene Editor umgesetzt. Die Field-Readiness-Funktionen wurden nicht erneut verändert, weil sie bereits vorhanden waren. Neue Szenen können erstellt und bestehende Szenen bearbeitet werden; Asset-, Observation-, Claim- und Question-Auswahlen werden gespeichert. Die Publikationsschutzlogik setzt Szenen mit nicht öffentlich freigegebenen Assets automatisch auf `internal` / `needs_review`.

Verifikation:

- `npm test -- --run` — 169 Tests grün
- `npm run build` — erfolgreich
