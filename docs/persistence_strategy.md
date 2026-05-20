# Persistence Strategy

**Version:** 1.0.0 — 2026-05-17  
**Status:** implementiert

Dieses Dokument beschreibt die aktuell implementierte Datenhaltungsstrategie und den geplanten Migrationspfad.

---

## Entscheidung: Dexie.js auf IndexedDB

### Was ist implementiert

- **Dexie.js v4** als typsicherer ORM auf IndexedDB (Browser-nativ)
- **15 Tabellen + 1 Blob-Tabelle** (`assetBlobs`)
- **Schema-Version 3** (Standalone-Upgrades, immer additiv)
- **`useLiveQuery` (dexie-react-hooks)** für reaktive UI-Bindungen ohne expliziten State

### Begründung

| Anforderung | Lösung |
|-------------|--------|
| Offline-first, kein Backend benötigt | IndexedDB — läuft vollständig im Browser |
| Direkte Feldkaptur on-site | kein Netz benötigt, kein Login, kein Sync |
| Sensible Daten (Memories, Personen) | verbleiben lokal, kein ungewollter Cloud-Upload |
| Schnelle Entwicklungsiteration | kein Datenbankserver, kein Schema-Deployment |
| React-Integration ohne Boilerplate | `useLiveQuery` statt Redux/Zustand + Fetch-Loops |

### Einschränkungen (bewusst akzeptiert)

- **Kein Cross-Device-Sync** — Daten liegen im Browser-Origin des Geräts
- **Kein Server-Backup** — Export-Funktion muss regelmäßig genutzt werden
- **Blob-Größe begrenzt** durch Browser-Quotas (~50 % des freien Speichers je Origin)
- **Kein Volltextindex** — Suchfunktionen durchlaufen aktuell alle Datensätze

---

## Schema-Versionen

Dexie-Upgrades sind **immer additiv**. Bestehende Daten werden nie gelöscht.

```typescript
// v1: 14 core tables
db.version(1).stores({ projects: 'id, slug', ... });

// v2: assetBlobs table hinzugefügt
db.version(2).stores({ assetBlobs: 'id' });

// v3: interpretations erhält zoneId-Index für Zonen-Queries
db.version(3).stores({
  interpretations: 'id, projectId, zoneId, epistemic, confidence'
});
```

Neue Felder werden durch Dexie ohne Upgrade automatisch gespeichert (IndexedDB ist schema-optional). Neue **Indizes** erfordern eine neue `db.version()`.

---

## Seed-Versionierung

Seed-Daten werden einmalig beim Erststart geladen und bei Versionsänderung neu eingespielt.

```typescript
const SEED_VERSION = '4';
const SEED_VERSION_KEY = 'eiermann-seed-version';

// Bei Versionsänderung: clearEiermannSeed() → re-seed → localStorage setItem
```

**Wichtig:** Seed-Daten sind Ausgangsstand, keine Autorität. Benutzeranpassungen (Ingest, ObservationPanel, InterpretationPanel) überschreiben den Seed nach erstem Laden nicht automatisch.

---

## Asset-Blob-Speicher

Assets bestehen aus zwei getrennten DB-Einträgen:

```
assets[id]      → Metadaten (Asset-Interface)
assetBlobs[id]  → Blob (ArrayBuffer oder File)
```

Diese Trennung hält Metadaten-Queries schnell. `getAssetObjectUrl(id)` lädt den Blob on demand und erzeugt eine temporäre `blob://`-URL.

---

## Export: WorkshopProjectBundle

Das `WorkshopProjectBundle`-Interface (in `types.ts`) beschreibt das vollständige Projekt als JSON-serialisierbares Objekt. Es dient als:

1. **Lokaler Snapshot** (geplant): JSON-Download für Backup
2. **Migrationspfad** zu einer Datenbank-Backend-Variante (s. u.)
3. **Test-Fixture** in `tests/` und `examples/workshop/`

---

## Migrationspfad: Browser → Server

Die Architektur unterstützt eine spätere Migration auf SQLite oder PostgreSQL/PostGIS:

### Schritt 1: JSON-Export

`WorkshopProjectBundle` ist JSON-serialisierbar. Alle IDs sind stabile Strings (kein Auto-Increment). Ein JSON-Dump enthält den vollständigen Stand für Import in eine relationale DB.

### Schritt 2: Adapter-Schicht

```
src/db/adapters/
  dexie.ts        ← current (browser)
  sqlite.ts       ← planned (Electron / Tauri)
  postgres.ts     ← planned (server-side)
```

Alle Komponenten kommunizieren ausschließlich über `workshopDb.ts`-Funktionen, nicht direkt über Dexie. Ein Austausch der Adapter-Implementierung ist strukturell vorbereitet.

### Schritt 3: PostGIS-Erweiterung

- `Zone.spatialRef` und `Place.geocode` können direkt in PostGIS-Felder gemappt werden
- Zone-GeoJSON liegt bereits als `public/zone_geometry.json` vor

---

## Datenschutz und lokale Datenhaltung

Memories, Zeitzeugenaussagen und personenbezogene Inhalte sind in ihrer Sensititivität explizit typisiert (`SensitivityLevel`, `PublicationStatus`, `Citability`, `MemoryReleaseStatus`). Die lokale Datenhaltung ist **kein Zufall**, sondern bewusste Designentscheidung:

- Keine ungewollte Übertragung an externe Server
- Freigabeentscheidungen sind explizit (`releaseStatus: 'not_released'` als Default)
- Export-Filter (`do_not_publish`) ist hart kodiert, nicht konfigurierbar

Für Cloud-Sync oder Mehrbenutzer-Szenarien muss das Freigabemodell vor Implementierung geprüft werden.
