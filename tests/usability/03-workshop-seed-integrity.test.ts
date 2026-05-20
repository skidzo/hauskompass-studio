/**
 * Usability Test 3 — Workshop Seed-Daten Integrität
 *
 * Schwerpunkt: Alle JSON-Seed-Dateien des Eiermann-Campus müssen
 * vollständig, konsistent und strukturell korrekt sein.
 * Tests sichern ab, dass Pflichtfelder vorhanden, IDs eindeutig und
 * Referenzen (zoneId, siteId, projectId) auflösbar sind.
 */

import { describe, expect, it } from 'vitest';
import claimsRaw from '../../examples/workshop/claims.json';
import eventPhasesRaw from '../../examples/workshop/event_phases.json';
import projectRaw from '../../examples/workshop/project.json';
import questionsRaw from '../../examples/workshop/questions.json';
import siteRaw from '../../examples/workshop/site.json';
import workshopScenesRaw from '../../examples/workshop/workshop_scenes.json';
import zonesRaw from '../../examples/workshop/zones.json';

const PROJECT_ID = (projectRaw as { id: string }).id;
const SITE_ID = (siteRaw as { id: string }).id;
const ZONE_IDS = new Set((zonesRaw as Array<{ id: string }>).map((z) => z.id));

describe('Usability Test 3: Workshop Seed-Daten Integrität', () => {

    describe('project.json', () => {
        const project = projectRaw as Record<string, unknown>;

        it('hat alle Pflichtfelder', () => {
            expect(project.id).toBeTruthy();
            expect(project.slug).toBeTruthy();
            expect(project.title).toBeTruthy();
            expect(project.siteId).toBeTruthy();
            expect(project.sensitivityDefault).toBeTruthy();
            expect(project.publicationDefault).toBeTruthy();
        });

        it('projectMode ist ein gültiger Wert', () => {
            expect(['active', 'archived', 'reference']).toContain(project.projectMode);
        });

        it('createdAt ist ISO-8601-Datum', () => {
            const d = new Date(project.createdAt as string);
            expect(d.getTime()).not.toBeNaN();
        });
    });

    describe('site.json', () => {
        const site = siteRaw as Record<string, unknown>;

        it('hat alle Pflichtfelder', () => {
            expect(site.id).toBeTruthy();
            expect(site.projectId).toBe(PROJECT_ID);
            expect(site.name).toBeTruthy();
            expect(site.sensitivityLevel).toBeTruthy();
            expect(site.publicationStatus).toBeTruthy();
        });

        it('currentAccess ist ein gültiger Wert', () => {
            expect(['open', 'restricted', 'closed', 'unknown']).toContain(site.currentAccess);
        });
    });

    describe('zones.json', () => {
        const zones = zonesRaw as Array<Record<string, unknown>>;

        it('enthält mindestens 10 Zonen', () => {
            expect(zones.length).toBeGreaterThanOrEqual(10);
        });

        it('alle Zonen haben eindeutige IDs', () => {
            const ids = zones.map((z) => z.id as string);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('alle Zonen referenzieren die korrekte siteId', () => {
            for (const zone of zones) {
                expect(zone.siteId).toBe(SITE_ID);
            }
        });

        it('alle Zonen haben einen documentationPriority-Wert', () => {
            const validPriorities = ['critical', 'high', 'medium', 'low'];
            for (const zone of zones) {
                expect(validPriorities).toContain(zone.documentationPriority);
            }
        });

        it('sortOrder-Werte sind eindeutig und vollständig', () => {
            const orders = zones
                .map((z) => z.sortOrder as number)
                .filter((o) => o !== undefined);
            const uniqueOrders = new Set(orders);
            // Darf keine Duplikate haben
            expect(uniqueOrders.size).toBe(orders.length);
        });

        it('sensitivityLevel und publicationStatus sind immer gesetzt', () => {
            for (const zone of zones) {
                expect(zone.sensitivityLevel).toBeTruthy();
                expect(zone.publicationStatus).toBeTruthy();
            }
        });
    });

    describe('claims.json', () => {
        const claims = claimsRaw as Array<Record<string, unknown>>;

        it('enthält Claims', () => {
            expect(claims.length).toBeGreaterThan(0);
        });

        it('alle Claims haben IDs, projectId und claimType', () => {
            for (const claim of claims) {
                expect(claim.id).toBeTruthy();
                expect(claim.projectId).toBe(PROJECT_ID);
                expect(claim.claimType).toBeTruthy();
            }
        });

        it('Claims mit zoneId referenzieren existierende Zonen', () => {
            for (const claim of claims) {
                if (claim.zoneId) {
                    expect(ZONE_IDS.has(claim.zoneId as string)).toBe(true);
                }
            }
        });

        it('epistemic ist ein gültiger Wert', () => {
            const valid = ['verified_fact', 'observation', 'interpretation', 'memory', 'hypothesis', 'disputed_claim', 'open_question'];
            for (const claim of claims) {
                expect(valid).toContain(claim.epistemic);
            }
        });

        it('IDs sind eindeutig', () => {
            const ids = claims.map((c) => c.id as string);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('questions.json', () => {
        const questions = questionsRaw as Array<Record<string, unknown>>;

        it('enthält Questions', () => {
            expect(questions.length).toBeGreaterThan(0);
        });

        it('alle Questions haben Pflichtfelder', () => {
            for (const q of questions) {
                expect(q.id).toBeTruthy();
                expect(q.projectId).toBe(PROJECT_ID);
                // Feldname ist 'text' (nicht 'body') — dokumentiert die API
                expect(q.text).toBeTruthy();
                expect(q.priority).toBeTruthy();
            }
        });

        it('priority ist ein gültiger Wert', () => {
            const valid = ['critical', 'high', 'medium', 'low'];
            for (const q of questions) {
                expect(valid).toContain(q.priority);
            }
        });
    });

    describe('event_phases.json', () => {
        const phases = eventPhasesRaw as Array<Record<string, unknown>>;

        it('enthält EventPhases', () => {
            expect(phases.length).toBeGreaterThan(0);
        });

        it('alle Phasen haben sortOrder', () => {
            for (const p of phases) {
                expect(typeof p.sortOrder).toBe('number');
            }
        });

        it('sortOrder-Werte sind aufsteigend geordnet (1..N)', () => {
            const orders = phases.map((p) => p.sortOrder as number).sort((a, b) => a - b);
            for (let i = 0; i < orders.length; i++) {
                expect(orders[i]).toBe(i + 1);
            }
        });
    });

    describe('workshop_scenes.json', () => {
        const scenes = workshopScenesRaw as Array<Record<string, unknown>>;

        it('enthält WorkshopScenes', () => {
            expect(scenes.length).toBeGreaterThan(0);
        });

        it('alle Scenes haben projectId und exportStatus', () => {
            for (const s of scenes) {
                expect(s.projectId).toBe(PROJECT_ID);
                expect(s.exportStatus).toBeTruthy();
            }
        });

        it('exportStatus ist ein gültiger Wert', () => {
            const valid = ['not_ready', 'draft', 'ready'];
            for (const s of scenes) {
                expect(valid).toContain(s.exportStatus);
            }
        });
    });

    describe('Kreuz-Referenz-Integrität', () => {
        it('project.siteId zeigt auf existierende site.id', () => {
            const project = projectRaw as { siteId: string };
            expect(project.siteId).toBe(SITE_ID);
        });

        it('site.projectId zeigt auf existierendes project.id', () => {
            const site = siteRaw as { projectId: string };
            expect(site.projectId).toBe(PROJECT_ID);
        });
    });
});
