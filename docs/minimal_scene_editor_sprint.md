# Minimal Scene Editor Sprint

**Date:** 2026-05-17  
**Status:** implemented

## Problem

WorkshopScenes konnten angezeigt und exportiert werden, aber nur als Seed-Daten existieren. Aus real erfasstem Material konnte noch keine neue Szene entstehen.

## Zielgruppe

Interne Bearbeiterinnen und Workshop-Vorbereitung: Personen, die nach einer Ortsbegehung Assets, Beobachtungen, Claims und offene Fragen in eine moderierbare Arbeitsansicht kuratieren.

## Nutzen

- Erfasstes Material wird workshopfähig.
- Beobachtungen, Claims und Fragen bleiben als unterschiedliche Eingaben sichtbar.
- Neue Szenen erscheinen sofort im Viewer und im internen Export.
- Öffentliche Freigabe bleibt bewusst prüfpflichtig.

## Betroffene Domänenobjekte

- `WorkshopScene`
- `Asset`
- `Observation`
- `Claim`
- `Question`

## Minimale Umsetzung

- `WorkshopSceneEditor` für Create/Edit.
- `saveWorkshopScene()` in der Dexie-API.
- Optionale Referenzfelder auf `WorkshopScene`: `selectedObservationIds`, `selectedClaimIds`, `selectedQuestionIds`.
- Asset-Auswahl, Observation-Auswahl, Claim-Auswahl, Question-Auswahl.
- Freitextfelder für Beobachtungen, Deutungen/Claims und Fragen.
- Konservative Schutzlogik: Szenen mit nicht öffentlich freigegebenen Assets werden nicht `publishable`.

## Risiken

- Freitext kann sensible Inhalte enthalten; das System erkennt das nicht automatisch.
- Die Szene ist eine kuratierte Sicht, keine fachlich geprüfte Bewertung.
- Claims werden im bestehenden Export weiterhin als Text in der Szene dargestellt, nicht als eigener Abschnitt mit Reviewstatus.

## Akzeptanzkriterien

- Neue Szene kann ohne Seed-Datei erstellt werden.
- Bestehende Szene kann bearbeitet werden.
- Szene erscheint nach dem Speichern im Viewer.
- JSON-Backup enthält die Szene.
- Interner HTML-Export kann die Szene enthalten.
- Öffentlicher HTML-Export respektiert `publicationStatus`.
- Nicht öffentlich freigegebene Assets verhindern versehentliche öffentliche Szenenfreigabe.
- `npm test -- --run` und `npm run build` sind grün.
