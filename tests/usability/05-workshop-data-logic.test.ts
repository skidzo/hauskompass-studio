/**
 * Usability Test 5 — Workshop Daten-Logik & Query-Funktionen
 *
 * Schwerpunkt: Reine Logik-Tests für Sortier-, Filter- und Aggregations-
 * funktionen des Workshop-Datenlayers — ohne echte IndexedDB-Verbindung.
 * Testet die Algorithmen isoliert mit In-Memory-Daten.
 */

import { describe, expect, it } from 'vitest';
import type { Zone } from '../../src/domain/workshop/types';

// ── Hilfsfunktionen aus workshopDb — isoliert testbar ───────────────────────

/** Lokale Reimplementierung der Sort-Logik */
function sortZonesByOrder(zones: Zone[]): Zone[] {
    return [...zones].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Lokale Reimplementierung der Asset-Count-Logik */
function countAssetsPerZone(
    assets: Array<{ id: string; zoneId?: string }>
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const a of assets) {
        if (a.zoneId) counts[a.zoneId] = (counts[a.zoneId] ?? 0) + 1;
    }
    return counts;
}

/** Sensitivity-Level-Filter */
function filterByMaxSensitivity(
    items: Array<{ sensitivityLevel: string }>,
    maxLevel: 'public' | 'internal' | 'sensitive_personal' | 'restricted'
): Array<{ sensitivityLevel: string }> {
    const ORDER = ['public', 'internal', 'sensitive_personal', 'restricted', 'unknown'];
    const maxIdx = ORDER.indexOf(maxLevel);
    return items.filter((item) => ORDER.indexOf(item.sensitivityLevel) <= maxIdx);
}

/** Dokumentations-Prioritäts-Score (für Sortierung) */
function priorityScore(priority: string): number {
    const map: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return map[priority] ?? 99;
}

const makeZone = (overrides: Partial<Zone>): Zone => ({
    id: `z-test-${Math.random().toString(36).slice(2)}`,
    siteId: 'site-test',
    name: 'Test Zone',
    description: 'Testzone',
    documentationPriority: 'medium',
    documentationStatus: 'not_started',
    openQuestionIds: [],
    linkedAssetIds: [],
    linkedAssessmentIds: [],
    sensitivityLevel: 'public',
    publicationStatus: 'publishable',
    sortOrder: 5,
    ...overrides,
});

describe('Usability Test 5: Workshop Daten-Logik', () => {

    describe('Zone-Sortierung (sortOrder)', () => {
        it('sortiert Zonen aufsteigend nach sortOrder', () => {
            const zones = [
                makeZone({ sortOrder: 3, name: 'Dritte' }),
                makeZone({ sortOrder: 1, name: 'Erste' }),
                makeZone({ sortOrder: 2, name: 'Zweite' }),
            ];
            const sorted = sortZonesByOrder(zones);
            expect(sorted.map((z) => z.name)).toEqual(['Erste', 'Zweite', 'Dritte']);
        });

        it('Zonen ohne sortOrder werden ans Ende sortiert (Fallback: 99)', () => {
            const zones = [
                makeZone({ sortOrder: undefined, name: 'Kein Order' }),
                makeZone({ sortOrder: 1, name: 'Erste' }),
            ];
            const sorted = sortZonesByOrder(zones);
            expect(sorted[0].name).toBe('Erste');
            expect(sorted[1].name).toBe('Kein Order');
        });

        it('leere Liste liefert leere Liste', () => {
            expect(sortZonesByOrder([])).toEqual([]);
        });

        it('verändert das Original-Array nicht (immutabel)', () => {
            const zones = [makeZone({ sortOrder: 3 }), makeZone({ sortOrder: 1 })];
            const original = [...zones];
            sortZonesByOrder(zones);
            expect(zones[0].sortOrder).toBe(original[0].sortOrder);
        });
    });

    describe('Asset-Count-Aggregation', () => {
        it('zählt Assets korrekt pro Zone', () => {
            const assets = [
                { id: 'a1', zoneId: 'z1' },
                { id: 'a2', zoneId: 'z1' },
                { id: 'a3', zoneId: 'z2' },
            ];
            const counts = countAssetsPerZone(assets);
            expect(counts['z1']).toBe(2);
            expect(counts['z2']).toBe(1);
        });

        it('ignoriert Assets ohne zoneId', () => {
            const assets = [
                { id: 'a1', zoneId: 'z1' },
                { id: 'a2' }, // kein zoneId
            ];
            const counts = countAssetsPerZone(assets);
            expect(counts['z1']).toBe(1);
            expect(Object.keys(counts)).toHaveLength(1);
        });

        it('gibt {} zurück wenn keine Assets vorhanden', () => {
            expect(countAssetsPerZone([])).toEqual({});
        });
    });

    describe('Sensitivity-Filter (Publikationsschutz)', () => {
        const items = [
            { id: 'a', sensitivityLevel: 'public' },
            { id: 'b', sensitivityLevel: 'internal' },
            { id: 'c', sensitivityLevel: 'sensitive_personal' },
            { id: 'd', sensitivityLevel: 'restricted' },
        ];

        it('maxLevel=public gibt nur öffentliche Items zurück', () => {
            const filtered = filterByMaxSensitivity(items, 'public');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].sensitivityLevel).toBe('public');
        });

        it('maxLevel=internal gibt public + internal zurück', () => {
            const filtered = filterByMaxSensitivity(items, 'internal');
            const levels = filtered.map((i) => i.sensitivityLevel);
            expect(levels).toContain('public');
            expect(levels).toContain('internal');
            expect(filtered).toHaveLength(2);
        });

        it('maxLevel=restricted gibt alle Items zurück', () => {
            const filtered = filterByMaxSensitivity(items, 'restricted');
            expect(filtered).toHaveLength(4);
        });
    });

    describe('Prioritäts-Score-Sortierung', () => {
        it('critical hat niedrigsten Score (kommt zuerst)', () => {
            expect(priorityScore('critical')).toBeLessThan(priorityScore('high'));
            expect(priorityScore('high')).toBeLessThan(priorityScore('medium'));
            expect(priorityScore('medium')).toBeLessThan(priorityScore('low'));
        });

        it('Zonen nach Priorität sortieren', () => {
            const zones = [
                makeZone({ documentationPriority: 'low', name: 'Low' }),
                makeZone({ documentationPriority: 'critical', name: 'Critical' }),
                makeZone({ documentationPriority: 'medium', name: 'Medium' }),
            ];
            const sorted = [...zones].sort(
                (a, b) => priorityScore(a.documentationPriority) - priorityScore(b.documentationPriority)
            );
            expect(sorted[0].name).toBe('Critical');
            expect(sorted[2].name).toBe('Low');
        });
    });

    describe('Dokumentations-Status-Vollständigkeit', () => {
        it('not_started + partial + complete decken alle Zones ab', () => {
            const validStatuses = ['not_started', 'partial', 'complete'];
            const zones = [
                makeZone({ documentationStatus: 'not_started' }),
                makeZone({ documentationStatus: 'partial' }),
                makeZone({ documentationStatus: 'complete' }),
            ];
            for (const zone of zones) {
                expect(validStatuses).toContain(zone.documentationStatus);
            }
        });

        it('Fortschrittsberechnung: complete / total', () => {
            const zones = [
                makeZone({ documentationStatus: 'complete' }),
                makeZone({ documentationStatus: 'complete' }),
                makeZone({ documentationStatus: 'partial' }),
                makeZone({ documentationStatus: 'not_started' }),
            ];
            const completed = zones.filter((z) => z.documentationStatus === 'complete').length;
            const progress = completed / zones.length;
            expect(progress).toBeCloseTo(0.5, 2);
        });
    });

    describe('Zone-GeoJSON Integrität', () => {
        it('zone_geometry.json hat korrekte GeoJSON-Struktur', async () => {
            const geoData = await import('../../examples/workshop/zone_geometry.json');
            const fc = geoData.default as { type: string; features: Array<{ properties: { zoneId: string } }> };
            expect(fc.type).toBe('FeatureCollection');
            expect(fc.features.length).toBeGreaterThan(0);
            for (const f of fc.features) {
                expect(f.properties?.zoneId).toBeTruthy();
            }
        });

        it('alle GeoJSON-Zonen sind auch in zones.json vorhanden', async () => {
            const [geoData, zonesData] = await Promise.all([
                import('../../examples/workshop/zone_geometry.json'),
                import('../../examples/workshop/zones.json'),
            ]);
            const geoIds = new Set(
                (geoData.default as { features: Array<{ properties: { zoneId: string } }> })
                    .features.map((f) => f.properties.zoneId)
            );
            const zoneIds = new Set((zonesData.default as Array<{ id: string }>).map((z) => z.id));
            for (const geoId of geoIds) {
                expect(zoneIds.has(geoId)).toBe(true);
            }
        });
    });
});
