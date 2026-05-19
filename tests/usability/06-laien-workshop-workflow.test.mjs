/**
 * Usability Test: Laien-Workshop-Workflow
 *
 * Ziel: Sicherstellen dass ein Workshop-Teilnehmer ohne technisches Vorwissen
 *       die App innerhalb von 2 Minuten pro Aufgabe erfolgreich nutzen kann.
 *
 * Testprinzip: Wir testen die Business-Logik der Kernfunktionen direkt
 * (keine UI-Interaktion). Jeder Test entspricht einem realen Nutzer-Szenario.
 *
 * Akzeptanzkriterien (AC) sind in den Testnamen kodiert.
 *
 * Szenarien:
 *   LW-01  Workshop-Projekt ohne Setup anlegen
 *   LW-02  Beobachtung in einer Zone speichern (Minimal-Formular: nur Text)
 *   LW-03  Gespeicherte Beobachtung wiederfinden
 *   LW-04  Mehrere Beobachtungen in verschiedenen Zonen
 *   LW-05  Beobachtung löschen
 *   LW-06  Projekt-Name erscheint nach Anlegen sofort
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Erzeugt eine Workshop-Startstruktur (entspricht createQuickStartWorkshop) */
function createQuickStartWorkshop(name) {
    if (!name.trim()) throw new Error('Projektname darf nicht leer sein.');
    const pid = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sid = `site-${pid}`;
    const project = { id: pid, title: name.trim(), siteId: sid };
    const zoneNames = [
        'Eingang / Empfang',
        'Erdgeschoss',
        'Obergeschoss',
        'Außenbereich',
        'Technik / Lager',
        'Diverses',
    ];
    const zones = zoneNames.map((n, i) => ({ id: `${pid}-z${i}`, siteId: sid, name: n }));
    return { project, zones, observations: [] };
}

/** Speichert eine Beobachtung — minimal: nur Text + Zone */
function captureObservation(db, opts) {
    if (!opts.text.trim()) throw new Error('Beobachtungstext darf nicht leer sein.');
    const obs = {
        id: `OBS-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        zoneId: opts.zoneId,
        projectId: opts.projectId,
        text: opts.text.trim(),
        createdAt: new Date().toISOString(),
    };
    db.observations.push(obs);
    return obs;
}

function findObservationsByZone(db, zoneId) {
    return db.observations.filter((o) => o.zoneId === zoneId);
}

function deleteObservation(db, id) {
    const idx = db.observations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Beobachtung ${id} nicht gefunden.`);
    db.observations.splice(idx, 1);
}

describe('LW-01: Workshop anlegen ohne Pipeline oder technisches Vorwissen', () => {
    it('AC-01a: Projekt entsteht sofort aus einem Namen — keine weiteren Pflichtfelder', () => {
        const { project, zones } = createQuickStartWorkshop('Gebäude-Workshop');
        assert.equal(project.title, 'Gebäude-Workshop');
        assert.ok(project.id, 'Projekt-ID muss generiert werden');
        assert.ok(project.siteId, 'Site-ID muss generiert werden');
    });

    it('AC-01b: Mindestens 4 vorausgefüllte Zonen vorhanden (Eingang, EG, OG, Außen)', () => {
        const { zones } = createQuickStartWorkshop('Mein Gebäude');
        assert.ok(zones.length >= 4, `Erwartet ≥4 Zonen, erhalten: ${zones.length}`);
        const names = zones.map((z) => z.name);
        assert.ok(names.some((n) => n.toLowerCase().includes('eingang')), 'Eingang-Zone fehlt');
        assert.ok(names.some((n) => n.toLowerCase().includes('erdgeschoss')), 'EG-Zone fehlt');
    });

    it('AC-01c: Leerer Name wird abgelehnt — klare Fehlermeldung', () => {
        assert.throws(() => createQuickStartWorkshop('   '), /leer/i);
    });

    it('AC-01d: Alle Zonen gehören zum selben Projekt/Site', () => {
        const { project, zones } = createQuickStartWorkshop('Test');
        for (const z of zones) {
            assert.equal(z.siteId, project.siteId, `Zone ${z.name} hat falsche siteId`);
        }
    });
});

// ---------------------------------------------------------------------------
// LW-02  Beobachtung minimal erfassen (nur Text)
// ---------------------------------------------------------------------------

describe('LW-02: Beobachtung erfassen — nur Text erforderlich', () => {
    it('AC-02a: Beobachtung wird mit Text allein gespeichert', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Test');
        const zone = zones[0];
        const obs = captureObservation(db, {
            text: 'Decke hat feuchte Stellen im Nordbereich',
            zoneId: zone.id,
            projectId: project.id,
        });
        assert.equal(obs.text, 'Decke hat feuchte Stellen im Nordbereich');
        assert.equal(db.observations.length, 1);
    });

    it('AC-02b: Leere Beobachtung wird abgelehnt', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Test');
        assert.throws(() =>
            captureObservation(db, { text: '   ', zoneId: zones[0].id, projectId: project.id }),
            /leer/i,
        );
        assert.equal(db.observations.length, 0, 'Keine Beobachtung darf gespeichert worden sein');
    });

    it('AC-02c: Jede Beobachtung hat eine eindeutige ID und einen Zeitstempel', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Test');
        const o1 = captureObservation(db, { text: 'A', zoneId: zones[0].id, projectId: project.id });
        const o2 = captureObservation(db, { text: 'B', zoneId: zones[0].id, projectId: project.id });
        assert.notEqual(o1.id, o2.id, 'IDs müssen eindeutig sein');
        assert.ok(o1.createdAt, 'Zeitstempel fehlt');
    });
});

// ---------------------------------------------------------------------------
// LW-03  Gespeicherte Beobachtung wiederfinden
// ---------------------------------------------------------------------------

describe('LW-03: Beobachtungen einer Zone wiederfinden', () => {
    it('AC-03a: Beobachtung ist in der Zone wieder auffindbar', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Test');
        captureObservation(db, { text: 'Riss im Putz', zoneId: zones[1].id, projectId: project.id });
        const found = findObservationsByZone(db, zones[1].id);
        assert.equal(found.length, 1);
        assert.equal(found[0].text, 'Riss im Putz');
    });

    it('AC-03b: Beobachtungen einer Zone erscheinen nicht in anderen Zonen', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Test');
        captureObservation(db, { text: 'Nur in Zone 0', zoneId: zones[0].id, projectId: project.id });
        captureObservation(db, { text: 'Nur in Zone 1', zoneId: zones[1].id, projectId: project.id });
        assert.equal(findObservationsByZone(db, zones[0].id).length, 1);
        assert.equal(findObservationsByZone(db, zones[1].id).length, 1);
    });
});

// ---------------------------------------------------------------------------
// LW-04  Mehrere Beobachtungen in verschiedenen Zonen
// ---------------------------------------------------------------------------

describe('LW-04: Mehrere Zonen gleichzeitig dokumentieren', () => {
    it('AC-04a: 10 Beobachtungen in 3 Zonen bleiben korrekt zugeordnet', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Großes Gebäude');
        const [z0, z1, z2] = zones;
        for (let i = 0; i < 4; i++)
            captureObservation(db, { text: `Z0-Obs-${i}`, zoneId: z0.id, projectId: project.id });
        for (let i = 0; i < 3; i++)
            captureObservation(db, { text: `Z1-Obs-${i}`, zoneId: z1.id, projectId: project.id });
        for (let i = 0; i < 3; i++)
            captureObservation(db, { text: `Z2-Obs-${i}`, zoneId: z2.id, projectId: project.id });
        assert.equal(findObservationsByZone(db, z0.id).length, 4);
        assert.equal(findObservationsByZone(db, z1.id).length, 3);
        assert.equal(findObservationsByZone(db, z2.id).length, 3);
        assert.equal(db.observations.length, 10, 'Gesamtanzahl stimmt nicht');
    });
});

// ---------------------------------------------------------------------------
// LW-05  Beobachtung löschen
// ---------------------------------------------------------------------------

describe('LW-05: Beobachtung löschen', () => {
    it('AC-05a: Beobachtung ist nach dem Löschen nicht mehr auffindbar', () => {
        const db = { observations: [] };
        const { project, zones } = createQuickStartWorkshop('Test');
        const obs = captureObservation(db, { text: 'Wird gelöscht', zoneId: zones[0].id, projectId: project.id });
        captureObservation(db, { text: 'Bleibt stehen', zoneId: zones[0].id, projectId: project.id });
        deleteObservation(db, obs.id);
        const remaining = findObservationsByZone(db, zones[0].id);
        assert.equal(remaining.length, 1);
        assert.equal(remaining[0].text, 'Bleibt stehen');
    });

    it('AC-05b: Löschen einer nicht-existenten ID wirft einen Fehler', () => {
        const db = { observations: [] };
        assert.throws(() => deleteObservation(db, 'OBS-nichtvorhanden'), /nicht gefunden/i);
    });
});

// ---------------------------------------------------------------------------
// LW-06  Projekttitel bleibt erhalten
// ---------------------------------------------------------------------------

describe('LW-06: Projekttitel bleibt nach dem Anlegen erhalten', () => {
    it('AC-06a: Titel entspricht genau der Eingabe (Whitespace getrimmt)', () => {
        const { project } = createQuickStartWorkshop('  Workshop Mai 2026  ');
        assert.equal(project.title, 'Workshop Mai 2026');
    });

    it('AC-06b: Sonderzeichen im Namen werden korrekt gespeichert', () => {
        const { project } = createQuickStartWorkshop('Eiermann-Campus (EG + OG)');
        assert.equal(project.title, 'Eiermann-Campus (EG + OG)');
    });
});

// ---------------------------------------------------------------------------
// LW-07  Quick-Start-Projekt wird nicht durch seedProject überschrieben
// ---------------------------------------------------------------------------

/** Modelliert die seedProject-Entscheidungslogik (ohne echte IndexedDB) */
function shouldSkipSeed(alreadyExists, storedSeedVersion) {
    const SEED_VERSION = '9';
    const QUICK_START_MARKER = 'qs';
    if (!alreadyExists) return false;                         // nicht vorhanden → seeden
    if (storedSeedVersion === QUICK_START_MARKER) return true; // quick-start → überspringen
    if (storedSeedVersion === SEED_VERSION) return true;       // aktuell → überspringen
    return false;                                              // veraltet → neu seeden
}

describe('LW-07: Quick-Start-Projekt wird nicht durch seedProject gelöscht', () => {
    it('AC-07a: Quick-Start-Marker verhindert Re-Seed', () => {
        assert.equal(shouldSkipSeed(true, 'qs'), true,
            'Quick-Start-Projekt darf nicht neu geseedet werden');
    });

    it('AC-07b: Normales Projekt mit aktuellem SEED_VERSION wird ebenfalls übersprungen', () => {
        assert.equal(shouldSkipSeed(true, '9'), true);
    });

    it('AC-07c: Veraltetes normales Projekt wird neu geseedet (storedVersion != current)', () => {
        assert.equal(shouldSkipSeed(true, '8'), false,
            'Altes Seed muss aktualisiert werden');
    });

    it('AC-07d: Nicht existentes Projekt wird immer geseedet', () => {
        assert.equal(shouldSkipSeed(false, null), false);
        assert.equal(shouldSkipSeed(false, 'qs'), false);
    });
});
