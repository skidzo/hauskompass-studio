# ADR-0003: Python Utility Layer

## Status

**Proposed** (2026-05-19) — Entscheidung empfohlen, aber noch nicht umgesetzt.

## Kontext

Hauskompass Studio ist eine lokal-first App (Vite + React 18 + TypeScript +
Dexie.js). Keine Server-Abhängigkeit; alle Daten bleiben auf dem lokalen Gerät
des Nutzers. Utility-Scripts für schwere Datenverarbeitung (EXIF-Scan,
Manifest-Generation) laufen als Node.js-CLI-Tools in `utils/`.

Folgende Aufgaben sind mit Node.js/JavaScript nicht optimal lösbar:

| Aufgabe | Aktueller Weg | Limitation |
|---------|---------------|------------|
| IFC-Verarbeitung | Manuell / keine Automatisierung | `web-ifc` (JS) ist unvollständig; `ifcopenshell` (Python) ist der Industriestandard |
| Geodaten (GML, GeoJSON, Shapefiles) | Manuell importiert | `geopandas` / `shapely` wären geeigneter als Node.js-Geo-Bibliotheken |
| LOD2-GML → JSON | Einmalige manuelle Konvertierung | Kein reproduzierbarer Script |
| PDF/Zeichnungsverarbeitung | Nicht vorhanden | `pdfplumber` / `PyMuPDF` (Python) |
| Sentinel-2 / PVGIS API | Keine Automatisierung | Python-Ökosystem deutlich reifer |

Eine `requirements.txt` und `.venv` existieren bereits im Repo-Root — Python ist also bereits eingesetzt (oder vorbereitet).

## Optionen

### Option A: Kein Python — Node.js-Utilities reichen

Node.js bleibt die einzige Scripting-Sprache. Schwere Verarbeitung wird manuell
durch externe Tools erledigt.

**Pro:** Einheitlicher Stack, keine Python-Abhängigkeit für Contributor  
**Con:** IFC-Verarbeitung nicht automatisierbar; GML-Pipeline ist fragil und
manuell; technischer Schulden-Aufbau bei jeder neuen IFC-Datei  
**Wann sinnvoll:** Wenn das Projekt dauerhaft klein bleibt und keine neuen
IFC-Dateien verarbeitet werden müssen

---

### Option B: Python CLI-Layer in `utils/py/` (lokal ausgeführt)

Python-Scripts leben in `utils/py/` neben den `.mjs`-Scripts. Kein API-Server,
kein Daemon. Aufruf: `python utils/py/process-ifc.py --input output/...`.

Die vorhandene `.venv` im Repo-Root wird genutzt. Abhängigkeiten in
`utils/py/requirements.txt`.

**Pro:**

- Lokal-first Modell bleibt vollständig erhalten
- `ifcopenshell`, `geopandas`, `shapely` verfügbar
- Gleiches Ausführungsmuster wie Node.js-Utilities
- Kein Hosting nötig
- Tests mit `pytest` möglich

**Con:**

- Zwei Scripting-Sprachen im Repo (Node.js + Python)
- Contributor müssen Python-Umgebung einrichten
- Kein Echtzeit-Datenaustausch zwischen Frontend und Python

---

### Option C: Python API-Server (FastAPI, lokal)

Ein lokaler `uvicorn`-Server läuft als Dev-Dependency und stellt REST-Endpoints
für die React-App bereit.

**Pro:** Echtzeitverarbeitung von IFC/Geo-Daten direkt aus der App  
**Con:**

- Bricht das lokal-first Modell (App hat eine Laufzeit-Abhängigkeit)
- Komplexerer Entwicklungsstart (`npm run dev` + `uvicorn` gleichzeitig)
- CORS-Konfiguration nötig
- Kein echter Mehrwert gegenüber CLI-Layer für geplante Use Cases

---

### Option D: Python API-Server deployed

Gehosteter Python-Backend-Service. Bricht das lokal-first Modell vollständig.

**Pro:** Multi-User, Cloud-Persistenz  
**Con:** Hosting-Kosten, Datenschutzprobleme (Fotos, Projektdaten), komplexe
Infrastruktur, widerspricht dem Kernprinzip der App  
**Wann sinnvoll:** Erst wenn explizit Multi-User / SaaS angestrebt wird

## Entscheidung

**Option B — Python CLI-Layer in `utils/py/`**

Begründung:

1. `ifcopenshell` ist der einzige realistische Weg, IFC-Dateien reproduzierbar
   zu verarbeiten. Die vorhandene `hauskompass_lod2_baseline.ifc` kann damit
   in JSON-Geometrie konvertiert werden.
2. Das lokal-first Modell bleibt unberührt — kein Server, keine Netzwerkabhängigkeit.
3. Das Ausführungsmuster (`node utils/...` → `python utils/py/...`) ist konsistent.
4. Die Python-Umgebung existiert bereits (`.venv` im Repo-Root).
5. Option C/D wird nicht benötigt, solange kein Multi-User-Bedarf besteht.

## Konsequenzen

**Positiv:**

- IFC → JSON-Konvertierung wird reproduzierbar und automatisierbar
- GML-LOD2-Pipeline kann als Python-Script dokumentiert und re-ausgeführt werden
- Testerbarkeit: `pytest utils/py/tests/`
- Klare Sprach-Trennung: Node.js für Web-nahe Utilities, Python für schwere Geodaten-Verarbeitung

**Negativ:**

- Contributor müssen `python -m venv .venv && pip install -r utils/py/requirements.txt` ausführen
- Zwei Sprachen erhöhen die Einstiegshürde leicht
- Kein Live-Datenaustausch zwischen App und Python (OK für geplante Use Cases)

**Offen:**

- Welche Python-Version? → `≥3.11` empfohlen (entspricht vorhandener `.venv`)
- Soll `utils/py/` eine eigene `pyproject.toml` bekommen oder reicht `requirements.txt`?
- Wie werden Python-Utility-Tests in die CI-Pipeline integriert?

## Umsetzungsschritte (wenn akzeptiert)

1. `utils/py/` Ordner anlegen
2. `utils/py/requirements.txt` mit `ifcopenshell`, `shapely`, `geopandas`, `pytest`
3. Ersten Script: `utils/py/ifc-to-building-hulls.py` — liest `output/*.ifc`, schreibt `output/building-hulls.json`
4. Test: `utils/py/tests/test_ifc_to_building_hulls.py`
5. README-Abschnitt: „Python Utilities"
6. In `docs/RELEASE_DECISION.md` Schritt 9 (CI) um `pytest` ergänzen
