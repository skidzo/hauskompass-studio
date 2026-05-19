# Checkliste Ortsbegehung — Eiermann Campus

Diese Checkliste begleitet Begehungen des Eiermann-Campus (IBM-Areal, Stuttgart-Vaihingen).
Dokumentationsstand je Zone wird im Workshop-Tab (`/workshop`) angezeigt.

---

## Vor der Begehung

- [ ] App öffnen: `http://localhost:5175/workshop`
- [ ] Sicherstellen, dass Gerät genug Speicher für Bilder/Videos hat (>2 GB frei)
- [ ] GPS aktivieren (für Exif-Koordinaten in Fotos)
- [ ] Aktuelle Zonen-Completeness prüfen (Fortschrittsleiste oben im Zonen-Tab)
- [ ] Offene Prüffragen pro Zone im Tab „Prüffragen" sichten
- [ ] JSON-Backup exportieren (`Backup exportieren`-Button, linkes Panel unten) und sichern

---

## Während der Begehung

### Für jede Zone

1. **Zone auswählen** im Zonen-Tab → „Hinzufügen" öffnet Asset-Ingest-Panel
2. **Fotos / Videos**: mehrere Perspektiven, Mängel nahaufnahme, Orientierungsaufnahme
3. **Standort-Notiz** (ohne Medium): über „Standort-Notiz hinzufügen"-Button wenn kein Bild möglich
4. **Beobachtung erfassen** direkt am Asset: Kategorie, kurze Beschreibung, Schadensbild
5. **Interpretation hinzufügen**: Ursache, Empfehlung, Priorität
6. Fortschrittsindikator sollte sich von `leer` → `mit Medien` → `beobachtet` → `interpretiert` entwickeln

### Allgemeines

- [ ] Außenhülle: alle Fassadenseiten, Dach, Sockel / Kellerlichtschächte
- [ ] Innenkern: Treppenhaus, Flure, Sanitäranlagen, Technikräume
- [ ] Besondere Schäden / Auffälligkeiten direkt als Asset mit Notiz festhalten
- [ ] Zugang unmöglich → Standort-Notiz mit Vermerk „Zugang verweigert" oder „gesperrt"

---

## Zonen-Übersicht (Stand: Mai 2025)

| Zone-ID | Name | Prio | Status |
|---------|------|------|--------|
| z-kantine-gemeinschaft | Kantine / Gemeinschaftsbereich | high | — |
| z-nucos-gebaeude | NuCOS / Gebäude 4 | high | — |
| z-pavillon-1 | Pavillon 1 (Eiermann) | high | — |
| z-pavillon-2 | Pavillon 2 (Eiermann) | high | — |
| z-pavillon-3 | Pavillon 3 (Eiermann) | high | — |
| z-aussenanlage | Außenanlage | medium | — |
| z-parkhaus-1 | Parkhaus 1 | low | — |
| z-parkhaus-2 | Parkhaus 2 | low | — |

*(Weitere Zonen: z-dach-*, z-keller-*, z-fassade-* je Gebäude)*

---

## Nach der Begehung

- [ ] JSON-Backup erneut exportieren und archivieren (Dateiname: `backup_YYYY-MM-DD.json`)
- [ ] Completeness-Fortschritt dokumentieren (Screenshot oder manuelle Notiz)
- [ ] Offene Prüffragen als beantwortet markieren
- [ ] Alle `interpreted`-Zonen in `docs/05_renovation_decision_register.md` eintragen
- [ ] CHANGELOG.md aktualisieren

---

## Qualitätskriterien

| Kriterium | Mindestanforderung |
|-----------|-------------------|
| Fotos pro Zone | ≥ 3 (Überblick, Detail, Schadensbild) |
| Beobachtungen | ≥ 1 pro Asset mit Medium |
| Interpretationen | ≥ 1 pro Schadenszone (für Entscheidungsregister) |
| GPS-Genauigkeit | Exif-Koordinaten oder manuelle Verortung (<50 m) |
| Dateiformat Fotos | JPEG, ≥ 2 MP |

---

*Dokument-Version: 1.0 · Erstellt: 2025-05 · Zugehöriges Projekt: house-renovation-baseline*
