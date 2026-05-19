# Release Decision — Hauskompass Studio

**Datum:** 2026-05-19  
**Bewertet durch:** Code-Review + statische Analyse  
**Basis:** Aktueller Stand `apps/hauskompass-studio/`

---

## Entscheidung

**NEEDS_CLEANUP** — Veröffentlichung erst nach Bereinigung möglich.

Der Kern-Framework (TypeScript-Domänenmodell, React-Komponenten, Dexie-Schema)
ist konzeptuell robust und kann veröffentlicht werden. Mehrere Blocker verhindern
eine direkte Veröffentlichung ohne Datenschutzrisiko.

---

## Blocker

| # | Datei | Problem | Schwere |
|---|-------|---------|---------|
| B-01 | `src/features/deconstruction/generated/solarPvPlanData.ts` | Exakte Privatadresse im Quellcode | **critical** |
| B-02 | `src/features/welcome/WelcomeScreen.tsx:149` | Persönlicher Lokalpfad im Code-Beispiel | **major** |
| B-03 | `src/app/App.tsx:50` | Privates Projekt-Label als Fallback hardcodiert | **major** |
| B-04 | `src/features/project-home/ProjectHome.tsx:36` | Privates Projekt hardcodiert | **major** |
| B-05 | `public/projects/eiermann-campus-pascalstrasse-100/` | Echte Projektdaten im `public/`-Ordner (nicht gitignored) | **major** |
| B-06 | `public/local-media/eiermann-campus-pascalstrasse-100/` | Mediendaten lokal generiert, aber Ordner nicht in `.gitignore` | **major** |
| B-07 | `output/` | Nicht in `.gitignore` — enthält lokale Dateipfade | **major** |
| B-08 | `README.md` | Nennt real-world Adressen als Anwendungsbeispiele | **minor** |
| B-09 | Keine `LICENSE`-Datei | Code ist technisch „All Rights Reserved" | **major** |
| B-10 | `docs/FOTOLISTE_BEGEHUNG_S01_S20.md` u.a. | Projekt-interne Felddokumente im Repo | **minor** |

---

## Was sicher veröffentlicht werden kann

- **`src/domain/`** — Vollständiges TypeScript-Domänenmodell (generisch, keine Projektdaten)
- **`src/features/`** — React-Komponenten (nach Entfernen der hardcodierten Labels/Pfade)
- **`utils/find-local-media-eiermann.mjs`** — nach Umbenennung zu `find-local-media.mjs` und Parametrisierung des Campus-Zentrums
- **`utils/generate-media-manifest.mjs`** — generisch, keine Eiermann-Spezifika im Code
- **`utils/tests/`** — alle Tests
- **`src/domain/spatial/types.ts`** — Verifikations-Vokabular
- **`docs/adrs/`** (zukünftige ADRs), **`docs/AGENTIC_BEHAVIOR.md`** — konzeptuelle Docs

---

## Was aus dem OSS-Branch ausgeschlossen werden muss

1. `src/features/deconstruction/generated/` — projektspezifisch generierte Dateien
2. `public/projects/eiermann-campus-pascalstrasse-100/` → ersetzen durch Demo-Datensatz
3. `public/local-media/` → gitignore, nur Ordnerstruktur behalten
4. `output/` → in `.gitignore` aufnehmen
5. `docs/FOTOLISTE_BEGEHUNG_S01_S20.md`, `docs/PART1_FIRST_SITE_VISIT_GUIDE.md`, alle Feldbesuchs-Checklisten
6. Alle `.md`-Dateien mit privaten Adressen in `docs/`

---

## Empfohlene Schritte für Release-Readiness

In dieser Reihenfolge abarbeiten:

1. **LICENSE** — `MIT` oder `AGPL-3.0` wählen und Datei anlegen  
   _Begründung:_ Ohne License ist der Code All Rights Reserved. MIT = maximale Offenheit, AGPL = Copyleft-Schutz für SaaS-Nutzung.

2. **B-01 beheben** — `solarPvPlanData.ts` entweder löschen oder Adresse durch Platzhalter ersetzen (`DEMO_PROJECT_ADDRESS`)

3. **B-02/03/04 beheben** — Labels und Pfade per `import.meta.env` parametrisieren oder durch generische Platzhalter ersetzen; `VITE_PROJECT_LABEL` Default → `'Mein Projekt'`

4. **output/ gitignoren** — `.gitignore` erweitern um `output/`

5. **public/local-media/ gitignoren** — `.gitignore` erweitern um `public/local-media/` (Ordner-Struktur per `.gitkeep` erhalten)

6. **Demo-Datensatz** — `public/projects/demo-campus/` mit anonymisierten Koordinaten als Beispielprojekt erstellen; reale Eiermann-Daten aus Repo entfernen oder in separates privates Datenrepo auslagern

7. **README bereinigen** — Adressen entfernen, generischen Workflow beschreiben, `npm run dev` Demo dokumentieren

8. **`utils/find-local-media-eiermann.mjs` verallgemeinern** — Campus-Koordinaten als CLI-Parameter (`--lat --lon --radius`), nicht hardcodiert; Datei umbenennen zu `find-local-media.mjs`

9. **CI/CD** — GitHub Actions: `npm run build` + alle Tests auf Push

10. **`version` auf `0.1.0`** — nach Abschluss der obigen Punkte

---

## Zeitlicher Aufwand (geschätzt)

| Schritt | Aufwand |
|---------|---------|
| 1 (LICENSE) | 10 min |
| 2–4 (Datenschutz-Blocker) | 1–2h |
| 5–6 (gitignore + Demo) | 2–4h |
| 7–8 (README + Utils) | 1h |
| 9 (CI) | 1h |
| **Gesamt** | **~1 Tag** |

---

## Empfehlung

Veröffentlichung als OSS **nach einem dedizierten Cleanup-Sprint** (~1 Tag).  
Nicht jetzt — zu viele Datenschutz-Blocker im Quellcode.

Mittelfristig: Trennung zwischen  

- `hauskompass-studio` (OSS Framework)  
- `eiermann-campus-data` (privates Datenprojekt, eigenes Repo)
