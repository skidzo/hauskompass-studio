# Räumliches Konfidenzmodell — Hauskompass Studio

**Stand:** 2026-05-19  
**Geltungsbereich:** Alle räumlichen Objekte im Workshop-3D-Kontext (Gebäudehüllen, Vegetation, Gelände, Übergänge)

---

## Kernprinzip

> **Keine räumliche Position ohne belegte Quelle.**  
> Räumliche Unsicherheit muss sichtbar sein — im Datenmodell, in der Benutzeroberfläche und in der Dokumentation.

---

## Verifikationsstatus (`verificationStatus`)

Jedes räumliche Objekt trägt einen der folgenden Status:

### `verified_geometry`

Die Geometrie ist durch direkte Vor-Ort-Messung oder eine amtliche Bauvermessung bestätigt.  
**Anforderung:** Aufmaß, Katasterplan mit eingemessenen Gebäuden, oder signierte Baugenehmigungszeichnung.  
**Beispiel:** Nicht vorhanden beim Eiermann-Campus (Stand 2026-05-19).

### `inferred_geometry`

Die Geometrie ist aus einer verlässlichen externen Quelle abgeleitet (LOD2, topografische Karte, GPS-Messung), aber nicht durch eigene Aufnahme bestätigt.  
**Anforderung:** GML-ID oder vergleichbarer Nachweis; Quelle explizit angegeben.  
**Beispiel:** Pavillons 1–4, Kantine — aus LGL-BW LOD2-Daten mit GPS-Zentroid-Verifikation.  
**UI:** Normale Darstellung mit Konfidenzhinweis im Infopanel.

### `placeholder_geometry`

Die Geometrie ist eine grobe Näherung ohne messbare Quelle (Schätzung, Schemazeichnung, Rechteck nach OSM-Bounding-Box).  
**Anforderung:** Keine — explizit als Platzhalter deklariert.  
**Beispiel:** Vegetation, Terrain, Pavillon 5 geplant, Parkdecks.  
**UI:** Gestrichelter Rahmen, Platzhalter-Label, abweichende Farbe.

### `unknown_geometry`

Kein Geometrie-Datenpunkt vorhanden. Objekt wird im System geführt, hat aber keinen räumlichen Ausdruck.  
**Anforderung:** Keine.  
**Beispiel:** Stege/Wege, Flurstücke, weitere Parkdecks.  
**UI:** Nicht in der 3D-Szene dargestellt. Nur in der Sidebar als "Keine Geometrie verfügbar" angezeigt.

---

## Konfidenz-Felder (`SpatialConfidence`)

Ergänzend zum `verificationStatus` beschreibt `confidence` die Qualität der zugrundeliegenden Daten:

| Wert | Bedeutung | Typische Quelle |
|------|-----------|----------------|
| `verified` | Unabhängig bestätigt | Zwei übereinstimmende Messquellen |
| `measured` | Direkte Messung | GPS, Tachymeter, Handaufmaß |
| `imported` | Aus amtlicher / verlässlicher Quelle importiert | LOD2, Kataster, IFC |
| `inferred` | Durch Schlussfolgerung abgeleitet | Aus Grundriss hochgerechnet, Verhältnisberechnung |
| `rough` | Grobe Schätzung | Schrittmaß, Luftbildschätzung |
| `workshop_sketch` | Workshop-Skizze ohne Messgrundlage | Handzeichnung |

---

## Quellenarten (`SpatialSourceKind`)

| Wert | Beschreibung | Verlässlichkeit |
|------|-------------|----------------|
| `lod2` | Amtliche LOD2-Daten (LGL-BW, LDBV, ...) | Hoch |
| `dgm` | Digitales Geländemodell (amtlich) | Hoch |
| `gps` | GPS-Feldmessung | Hoch |
| `osm` | OpenStreetMap | Mittel (freiwillig, ungeprüft) |
| `project_drawing` | Baupläne, Lageplan | Hoch bei Originalplan |
| `web_reference` | Webseiten, Literatur | Niedrig–Mittel |
| `workshop_observation` | Workshop-Beobachtung vor Ort | Mittel |
| `manual_seed` | Manuell eingegeben ohne Quelle | Niedrig |
| `derived` | Rechnerisch aus anderen Quellen erzeugt | Abhängig von Inputquelle |

---

## Kombinations-Leitfaden

Welche Kombination aus `verificationStatus` und `confidence` ist zulässig?

| verificationStatus | confidence | Zulässig? | Anmerkung |
|-------------------|-----------|-----------|-----------|
| verified_geometry | verified | ✅ | Idealfall: Aufmaß + zweite Bestätigung |
| verified_geometry | measured | ✅ | Einmalige direkte Messung |
| inferred_geometry | imported | ✅ | Häufigster Fall für LOD2-Gebäude |
| inferred_geometry | inferred | ✅ | Abgeleitet ohne direkte Messung |
| placeholder_geometry | rough | ✅ | Schätzung mit explizitem Platzhalter |
| placeholder_geometry | workshop_sketch | ✅ | Workshop-Entwurf |
| unknown_geometry | — | ✅ | Kein Konfidenzwert erforderlich |
| verified_geometry | rough | ❌ | Widerspruch — nicht zulässig |
| verified_geometry | workshop_sketch | ❌ | Widerspruch — nicht zulässig |

---

## Agentenregel

Bevor ein räumliches Objekt erstellt oder positioniert wird, müssen intern folgende Fragen beantwortet werden:

1. **Welche Quelle belegt diese Position?** (Dateiname, GML-ID, Koordinaten aus Datei)
2. **Welchen `verificationStatus` hat diese Geometrie?**
3. **Welche `confidence` hat die zugrundeliegende Quelle?**
4. **Würde die Darstellung falsche räumliche Sicherheit erzeugen?**

Wenn Frage 1 nicht beantwortet werden kann: **Nicht modellieren. Stattdessen `placeholder_geometry` mit explizitem Warnhinweis anlegen oder das Objekt weglassen.**

---

## UI-Darstellungsregeln

| Status | 3D-Darstellung | Sidebar-Label |
|--------|---------------|---------------|
| verified_geometry | Volle Deckkraft, normales Material | — |
| inferred_geometry | Volle Deckkraft, normales Material | "Geometrie: abgeleitet (LOD2)" o.ä. |
| placeholder_geometry | Gestrichelt / reduzierte Deckkraft | "Geometrie: Platzhalter" |
| unknown_geometry | Nicht sichtbar in 3D | "Keine Geometrie verfügbar" |

---

## Referenz: Betroffene Datentypen

Folgende TypeScript-Interfaces tragen `verificationStatus`:

- `BuildingHullModel`
- `VegetationModel`  
- `TerrainModel`

Alle drei Typen sind in `src/domain/spatial/types.ts` definiert.
