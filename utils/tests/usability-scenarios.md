# Eiermann Media Usability Scenarios

## U1 — GPS-Foto-Import (vollständiger Pfad)

Vorbedingung: `npm run dev`. Testfoto mit EXIF-GPS `(48.7269, 9.0759)` bereit.

Schritte: Import → Drag & Drop → EXIF prüfen → Zone prüfen → Speichern → Map-Tab → Marker prüfen → Popup prüfen.

- [ ] GPS-Marker auf Karte sichtbar
- [ ] Zone-Vorschlag mit Distanz ≤ 50m korrekt
- [ ] Datum aus EXIF, nicht Datei-mtime
- [ ] Kein JS-Fehler in Browser-Konsole

## U2 — Foto ohne GPS

- [ ] Kein Crash, Zone-Feld leer (keine Fehlermeldung)
- [ ] Manuell wählbare Zone, Asset speicherbar
- [ ] Kein Karten-Marker (korrektes Verhalten)

## U3 — 3D-Ansicht nach Bild-Import

- [ ] Asset-Count in 3D-Sidebar korrekt nach Import
- [ ] "In Workshop öffnen" navigiert korrekt

## U4 — Media-Manifest Restore nach IndexedDB-Reset

- [ ] Asset aus Manifest nach Reload auf Karte sichtbar
- [ ] Keine 404 im Netzwerk-Tab

## U5 — Zone-Dropdown Vollständigkeit

- [ ] Alle 12 Zonen im Dropdown
- [ ] Leerer Eintrag ("überspringen") vorhanden

---

## Pipeline-Szenarien (CLI-Utilities)

Die folgenden Szenarien testen die Utility-Scripts außerhalb der App.  
Ausführung: Terminal in `apps/hauskompass-studio/`.

### P1 — Lokaler Mediascan

**Zweck:** `find-local-media-eiermann.mjs` findet alle campus-nahen GPS-Fotos.

Voraussetzung: mind. 1 Bild mit GPS in `~/Pictures` oder `~/Bilder`.

```
node utils/find-local-media-eiermann.mjs
```

- [ ] `output/eiermann-local-media-candidates.json` wurde erstellt
- [ ] Alle Kandidaten haben `gpsLat`/`gpsLon` innerhalb Campus-Boundingbox
- [ ] `suggestedZoneId` nicht-null für Bilder ≤ ~200m von Zonen-Zentroiden
- [ ] Script läuft durch wenn `~/Pictures` fehlt (kein Crash, 0 Kandidaten)
- [ ] `node utils/tests/find-local-media-eiermann.test.mjs` → 13 pass / 0 fail

### P2 — Manifest generieren (Erstlauf)

**Zweck:** `generate-media-manifest.mjs` erzeugt valides Manifest aus lokal + web.

```
node utils/generate-media-manifest.mjs \
  --local output/eiermann-local-media-candidates.json \
  --web   output/eiermann-web-media-candidates.json \
  --approve all
```

- [ ] `media-manifest.json` erzeugt, valides JSON
- [ ] `merged` ≤ `approved` (Dedup bei gleicher filename+capturedAt)
- [ ] `images/` enthält Dateikopien (sourceKind: local_filesystem)
- [ ] HTTP 429 bei Wikimedia erzeugt WARN-Log, kein Script-Crash; Eintrag mit `url:null`
- [ ] `node utils/tests/generate-media-manifest.test.mjs` → 12 pass / 0 fail

### P3 — Idempotenz (Zweitmallauf)

**Zweck:** Wiederholte Ausführung erzeugt keine Duplikate.

```
BEFORE=$(python3 -c "import json; print(len(json.load(open('public/local-media/eiermann-campus-pascalstrasse-100/media-manifest.json'))['assets']))")
node utils/generate-media-manifest.mjs --local output/eiermann-local-media-candidates.json --web output/eiermann-web-media-candidates.json --approve all
AFTER=$(python3 -c "import json; print(len(json.load(open('public/local-media/eiermann-campus-pascalstrasse-100/media-manifest.json'))['assets']))")
echo "Before=$BEFORE After=$AFTER (should be equal)"
```

- [ ] `BEFORE == AFTER`
- [ ] Keine doppelten `id`-Werte im Manifest
- [ ] `generatedAt` wurde aktualisiert

### P4 — App lädt Manifest (Integration)

**Zweck:** seedLoader.ts erkennt das generierte Manifest und stellt Assets wieder her.

Voraussetzung: `npm run dev`, Manifest vorhanden.

- [ ] Browser-Console: `[seedLoader] media manifest: X assets restored`
- [ ] GPS-Asset `20160911-DSC06207.jpg` (Kantine) erscheint mit Zone `z-kantine-gemeinschaft`
- [ ] Asset mit `url:null` (Web-Referenz) erscheint ohne Thumbnail, aber mit Metadaten
- [ ] Kein 404 im Netzwerk-Tab für manifest-URL

### P5 — Kein Candidates-File (Edge Case)

**Zweck:** Script verarbeitet fehlende Input-Dateien ohne Crash.

```
node utils/generate-media-manifest.mjs --local nonexistent.json --approve all
```

- [ ] Script läuft durch (kein Crash)
- [ ] Manifest entsteht mit 0 neuen Assets (nur ggf. existierende bleiben erhalten)
- [ ] Kein unbehandelter Node.js-Fehler
