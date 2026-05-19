# Usability Testing Notes

## Runde 1 — P1–P6 (intern, fiktiv)

**Befunde (behoben):**

- P1: Planung-Tabs englisch → DE-Übersetzung
- P2: Planning-Overflow ohne Scroll → overflow-x: auto
- P3: IFC-Toggle-Labels unklar → „+Planung" / „Bestand"
- P4: Demo-Kontext nicht erkennbar → Evidence-Banner (amber)
- P5: Sidebar-Stat kein Link → klickbar → Data-Inventory
- P6: Projektname fehlte im Planning-Panel → VITE_PROJECT_LABEL

---

## Runde 2 — Büsnauer Str. 29 (fiktiver User "Anna M.", Mai 2026)

**Aufgabe:** Neues Projekt für Büsnauer Str. 29, 70563 Stuttgart anlegen, Daten importieren, prüfen ob alles korrekt ist.

**Befunde (behoben):**

- B1: Dialog-Header scrollte bei aufgeklappter Anleitung aus dem Viewport → `align-items: flex-start` + `margin: auto` auf `.welcome-inner`
- B2: ESC-Taste schloss Dialog nicht → `useEffect` mit `document.addEventListener('keydown', ...)` in `WelcomeScreen` und `NewProjectWizard`
- B3 (Inhalt): Ausgedehnte englische Inhalte in Sidebar-Nav, Section-Headings, Building/Site-Tabs, Planning-Panel → vollständig ins Deutsche übersetzt

**Import-Flow getestet:**

1. Adresse eingeben (Büsnauer Str. 29) → Geocodierung: E 507239 / N 5398056 · Tile 507_5398 · BW ✅
2. GML-Upload (Demo-GML Bayern 748_5484.gml) → 625 Gebäude geparst ✅
3. Kandidatenauswahl (DEBY_LOD2_8718888 auto-gewählt) → „Projekt aktivieren" ✅
4. Sidebar zeigt „Importiertes Projekt" + Adresse ✅
5. Lage-Section: Geocode-Karte, 625 Kandidaten, 1 bestätigt ✅
6. „Demo-Projekt öffnen" → Rückwechsel zur Demo ✅

**Offene Punkte nach Runde 2:**

- „Zur Projektansicht"-Button in Wizard-Step 4 fehlt (muss ESC/X verwenden) → Prio: mittel
- Demo-GML hat ~255 km Distanz (Kachel aus Bayern) → in echtem Flow nicht relevant

---

## Runde 3 — Navigation-Redesign (fiktiver User "Anna M.", Mai 2026)

**Aufgabe:** Vollständigen Projekt-Zyklus mit neuer Icon-Rail-Navigation durchführen.

**Redesign-Konzept umgesetzt:**

- 220px-Sidebar → 52px Icon-Rail (Compass + 5 Sektions-Icons + +)
- Compass-Button öffnet Projekt-Drawer (Overlay, 268px, ESC/X/Außen-Click schließen)
- Nav-Reihenfolge: **Lage → Gebäude → Bewertung → Planung → Daten**
- Standard-Sektion: Lage (statt Planung)
- Hover-Tooltips via CSS `::after` + `data-label`
- Responsiv: Icon-Rail wird zu horizontaler Leiste unter 840px/900px

**Interaktionstest (Playwright, Mai 2026):**

| Aktion | Ergebnis |
|---|---|
| App laden | Icon-Rail sichtbar, Lage-Section aktiv, Karte sofort sichtbar ✅ |
| Compass klicken | Projekt-Drawer öffnet mit Name, Privacy-Pill, Stats ✅ |
| ESC drücken | Drawer schließt ✅ |
| X-Button klicken | Drawer schließt ✅ |
| Klick außerhalb | Drawer schließt ✅ |
| Gebäude-Icon | Section wechselt, LoD2-Viewer zeigt ✅ |
| Importiertes Projekt | Drawer zeigt „Demo-Projekt öffnen"-Button ✅ |
| „Neues Projekt" (+) | Wizard öffnet ✅ |

**Offene Punkte nach Runde 3:**

- „Zur Projektansicht"-Button in Wizard-Step 4 immer noch fehlend → Prio: mittel
- Drawer bricht auf Mobilgeräten noch nicht perfekt (partial visible) → Prio: niedrig
- Tooltips erscheinen hinter der Karte (z-index) → Prio: niedrig

---

## Runde 4 — Offene Punkte + Lage-Karte (fiktiver User "Anna M.", Mai 2026)

**Fixes aus Runde 3:**

- ✅ „Zur Projektansicht"-Button: Wizard blieb offen nach Aktivierung (Bug: `setShowNewProject(false)` im `onProjectActivated`-Callback entfernt) — Step 4 bleibt sichtbar
- ✅ Tooltip-z-index: nav-rail z-index 100 → 300, Tooltips erscheinen über Karten-Inhalt

**Lage-View für importierte Projekte komplett neu:**

- OSM-Embed-Iframe zentriert auf Geocode-Koordinaten (±0.005°lat, ±0.007°lon Bounding Box)
- Zoom- und Pan-Controls über native OSM-Embed-UI (+/- Buttons, Maus-Scroll)
- Transparentes `map-meta`-Overlay (glass-morphism: `backdrop-filter: blur(10px)`, `background: rgb(255 253 248 / 0.72)`) zeigt Adresse, UTM, Tile, GML-Quelle, Kandidaten-Count
- Kandidatenliste bleibt im Gebäudebefund-Tab unterhalb der Karte
- Demo-Karte (SVG): Höhe auf 62vh erhöht, map-meta ebenfalls transparent

**Interaktionstest (Playwright, Mai 2026):**

| Aktion | Ergebnis |
|---|---|
| Neues Projekt anlegen → Geocodierung | ✅ E 507239 / N 5398056 · Tile 507_5398 · BW |
| GML-Upload, Kandidat auswählen, „Projekt aktivieren" | ✅ Step 4 bleibt offen |
| „Zur Projektansicht" | ✅ Wizard schließt korrekt |
| Lage — OSM-Karte | ✅ Karte zeigt Stuttgart-Vaihingen mit grünem Adress-Marker |
| Zoom-Controls | ✅ +/- Buttons in Karte sichtbar, Karte zoombar |
| map-meta | ✅ transparent, Adresse + Koordinaten + Tile + GML + Kandidaten |
| Gebäudebefund-Tab | ✅ Kandidatenliste 625 Gebäude |
| Compass-Drawer mit importiertem Projekt | ✅ „Importiertes Projekt" + Adresse + Stats |
| „Demo-Projekt öffnen" | ✅ Demo-SVG-Karte (62vh) sichtbar |

**Offene Punkte nach Runde 4:**

- Marker im OSM-Embed zeigt fehlende Übersetzung im title-Attribut → OSM-intern, nicht behebbar
- Kandidatendistanzen (~255km) da Demo-GML aus Bayern → bei echtem BW-Tile korrekte kurze Distanzen
- Mobilansicht: nav-rail unter 900px als horizontale Leiste (noch nicht vollständig getestet)

---

## Nächste Testaufgaben (vorgeschlagen)

1. **Vollzyklus mit echtem BW-Tile**: 507_5398.gml von LGL BW herunterladen, Upload testen, Distanzen prüfen (sollten < 100 m sein)
2. **Gebäude-Sektion**: Teil-Auswahl, IFC-Viewer, Seitenansichten
3. **Bewertung-Sektion**: Gebäudehülle, Planungsreife
4. **Mobilansicht**: Navigation unter 900px Breite
