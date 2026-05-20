# Eiermann-Campus — Räumliches Arbeitsmodell

**Zeitstand:** Nach 1984 (Eiermann-Pavillons 1–3 + Kantine 1972; Pavillon 4 Erweiterung 1983/84)  
**Status:** Projektmaterial / Arbeitsnotiz für räumliche Modellierung  
**Geometrie-Status:** Abgeleitete Orientierungshilfe — kein Aufmaß, kein Kataster

---

## Quellen

- SFP Architekten, „IBM Campus, Stuttgart-Vaihingen": <https://www.sfp-architekten.de/ibm-campus-stuttgart-vaihingen>  
- ZITRONENWOLF Medien, „Eiermann-Campus Stuttgart | Virtueller Rundgang", Fotos vom 30.06. und 27.07.2016: <https://www.zitronenwolf.com/rundgaenge/projekte/160630_Eiermann/index.php>  
- Zeichnungsordner des Projekts: GrundrissFakeEiermann.pdf, ZITRONENWOLF-Navigationsschema  
- LGL-BW LOD2-Grundrisse: GML-IDs DEBW_5221000QjrU (P1), DEBW_5221000QjN0 (P2), DEBW_5221000Qj0P (P3), DEBW_5221000Qlay (P4/NuCOS), DEBW_5221000Qivp (Kantine)

---

## Gebäudekennwerte (aus ZITRONENWOLF-Lageplan, 2016)

Der Pavillion 4 hat auch ein UG, das gilt als gesichert.

| Gebäude | Geschosse | Etagen-Zählung | Höhe geschätzt |
|---------|-----------|----------------|----------------|
| Pavillon 1 | 5 Ebenen | EG + UG + 3 OG | ~16 m |
| Pavillon 2 | 5 Ebenen | EG + 4 OG | ~17 m |
| Pavillon 3 | 4 Ebenen | EG + 3 OG | ~14 m |
| Pavillon 4 / NuCOS | 6 Ebenen | UG, EG, 4 OG | ~17 m |
| Kantine | 2 Ebenen | EG + 1 OG | ~7–8 m |

Pavillon 1 und Pavillon 4/NuCOS haben jeweils ein Untergeschoss (UG). Für beide gilt: UG im 3D-Modell derzeit **nicht modelliert** (nur Außenhülle EG–OG).  
> ⚠️ **Review R-01:** `spatial_context.json` → hull-pavillon-4: `modelingRule` nennt noch `EG+4OG`, UG fehlt. Anpassen oder explizit als `undergroundLevels: 1, not_modelled` kennzeichnen.  
Höhenwerte im 3D-Modell sind Schätzungen (Geschosszahl × typische Bürogeschosshöhe). Kein Aufmaß vorhanden.

---

## Geografische Positionen (LGL-BW LOD2 — authoritative Quelle)

| Gebäude | Zentroid lat | Zentroid lon | Richtung vom Mittelpunkt |
|---------|-------------|-------------|--------------------------|
| Pavillon 1 | 48.72675 | 9.07346 | Nördlichstes, leicht West |
| Pavillon 2 | 48.72631 | 9.07439 | Zentrum, leicht Ost |
| Pavillon 3 | 48.72566 | 9.07369 | Südlichstes, leicht West |
| Pavillon 4 / NuCOS | 48.72632 | 9.07556 | Weitest Ost (~128 m vom Mittelpunkt) |
| Kantine | 48.72603 | 9.07263 | Weitest West (~87 m vom Mittelpunkt) |

Koordinatenkonvention im lokalen 3D-Modell:

- **Nord = negatives Z**, **Süd = positives Z**, **Ost = +X**, **West = −X**
- Ursprung = Mittelwert der Zentroide von P1, P2, P3

---

## Campusstruktur

Die ursprüngliche IBM-Hauptverwaltung ist ein Pavillonsystem in leicht hügeligem Gelände mit altem Baumbestand. Die drei originalen Büropavillons sind durch Stege verbunden; das Kantinengebäude steht separat. Pavillon 4 ist eine spätere Erweiterung, räumlich vom Hauptcluster getrennt.

Gebäudetypen:

- **Pavillons 1–3**: Eiermann 1972, quadratische Hofgebäude, identischer Entwurf (`original_phase`)
- **Kantine**: Eiermann 1972, niedrigeres Gemeinschaftsgebäude, separater Standort (`original_phase`)
- **Pavillon 4**: Kammerer und Belz, 1983/84 (`built_extension_after_original_phase`)
- **Pavillon 5**: nicht realisiert — nur als `planned_not_built` Platzhalter

---

## Topologische Verbindungen (bekannt, Geometrie fehlt)

- Pavillon 1 ↔ Pavillon 2 (Steg)
- Pavillon 2 ↔ Pavillon 3 (Steg)
- Pavillon 3 ↔ Kantine (Verbindung / Nähe)
- Pavillon 4 ist ~128 m östlich, kein Steg zum Hauptcluster

---

## Modellierungsregeln

- Keine Gebäudeposition aus Prosa ableiten — immer LOD2-Quelle oder expliziter Platzhalter
- Jedes räumliche Objekt trägt `verificationStatus`, `confidence` und `sourceId`
- Pavillon 5 bleibt aus der 3D-Standardansicht ausgeschlossen bis Quelldokument vorliegt
- Gebäudehöhen als Schätzwerte kennzeichnen (`confidence: rough`)

---

## Namenshistorie (Archivnotiz)

DEBW_5221000QjN0 und DEBW_5221000Qj0P waren in älteren Dateiversionen vertauscht beschriftet. Korrektur: QjN0 = Pavillon 2, Qj0P = Pavillon 3. Beide Grundflächen ~3644 m², daher leicht verwechselbar. Alle aktuellen JSON-Quellen und das 3D-Modell verwenden die korrigierten Namen.

---

## Review-Punkte (Stand 2026-05-19)

| ID | Datei | Beschreibung | Priorität | Status |
|----|-------|--------------|-----------|--------|
| R-01 | `spatial_context.json` → hull-pavillon-4 | `modelingRule` nennt `EG+4OG`; UG vorhanden aber nicht modelliert → `undergroundLevels: 1, undergroundNote: "not_modelled"` ergänzen | hoch | offen |
| R-02 | Dieses Dokument | Formulierung „Pavillon 1 ist das einzige Gebäude mit UG" widersprach Tabelle und Einleitung — **behoben** | — | erledigt |
| R-03 | `spatial_context.json` → hull-pavillon-4 | GPS-Umring ~848 m² vs. LOD2-Footprint ~3693 m² — Faktor ×4 Diskrepanz; GPS erfasst offenbar nur NuCOS-Teilfläche, nicht Gesamtgebäude | mittel | offen |
| R-04 | `zones.json` ↔ `zone_geometry.json` | Nur 6 von 16 Zonen haben Polygone in `zone_geometry.json`; fehlende Zonen erscheinen im Mediascan als `suggestedZoneId: null` | mittel | offen |
| R-05 | `spatial_context.json` | Topologische Verbindungen P1↔P2 und P2↔P3 (Stege) bekannt, keine `bridge`-Geometrie modelliert | niedrig | offen |

**Nächste Schritte:**  

1. **R-01** — `hull-pavillon-4.modelingRule` und Tabelle in diesem Dokument um UG-Hinweis ergänzen  
2. **R-03** — GPS-Umring P4 mit LOD2-Polygon in QGIS oder via `gml_gps_verification.geojson` abgleichen  
3. **R-04** — Fehlende Zonen-Polygone schätzen oder als `placeholder_geometry` in `zone_geometry.json` ergänzen
