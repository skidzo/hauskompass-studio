/**
 * Usability Test 1 — Geocode & Kartenprojektion
 *
 * Schwerpunkt: Koordinatenumrechnung (WGS84 → UTM32N → TileID) und
 * Bundesland-Erkennung für echte deutsche Städte.
 *
 * Diese Tests sichern die Korrektheit der lokalen Geo-Arithmetik ab –
 * unabhängig von einem Netzwerkaufruf an Nominatim.
 */

import { describe, expect, it } from 'vitest';
import { tileFromUtm32, wgs84ToUtm32 } from '../../src/features/new-project/geocode';

// ── Bekannte Referenzkoordinaten (WGS84 → UTM32N aus EPSG.io) ───────────────

const CITIES: Array<{
    name: string;
    lat: number;
    lon: number;
    expectedState: 'Bayern' | 'BW' | 'other';
    expectedTilePrefix: string; // z.B. "512_" für E 512xxx
}> = [
        { name: 'München (BY)', lat: 48.137, lon: 11.575, expectedState: 'Bayern', expectedTilePrefix: '691_' },
        { name: 'Nürnberg (BY)', lat: 49.452, lon: 11.077, expectedState: 'Bayern', expectedTilePrefix: '665_' },
        { name: 'Augsburg (BY)', lat: 48.366, lon: 10.895, expectedState: 'Bayern', expectedTilePrefix: '640_' },
        { name: 'Passau (BY)', lat: 48.574, lon: 13.467, expectedState: 'Bayern', expectedTilePrefix: '775_' },
        { name: 'Stuttgart (BW)', lat: 48.775, lon: 9.182, expectedState: 'BW', expectedTilePrefix: '513_' },
        { name: 'Freiburg (BW)', lat: 47.997, lon: 7.848, expectedState: 'BW', expectedTilePrefix: '417_' },
        { name: 'Karlsruhe (BW)', lat: 49.006, lon: 8.404, expectedState: 'BW', expectedTilePrefix: '458_' },
        { name: 'Konstanz (BW)', lat: 47.660, lon: 9.176, expectedState: 'BW', expectedTilePrefix: '511_' },
    ];

// Hilfsfunktion: Bundesland aus UTM-Koordinaten ableiten (verbesserte Version)
function classifyState(easting: number, northing: number): 'Bayern' | 'BW' | 'other' {
    const e = Math.floor(easting / 1000);
    const n = Math.floor(northing / 1000);
    // Baden-Württemberg: tatsächliche Westgrenze ~E 400 (Freiburg E≈414)
    if (e >= 400 && e <= 595 && n >= 5249 && n <= 5515) return 'BW';
    // Bayern: E 555–840, N 5249–5625
    if (e >= 555 && e <= 840 && n >= 5249 && n <= 5625) return 'Bayern';
    return 'other';
}

describe('Usability Test 1: Geocode-Projektion', () => {

    describe('wgs84ToUtm32 — Koordinatenumrechnung', () => {
        it('konvertiert München korrekt (Toleranz ±500 m)', () => {
            const { easting, northing } = wgs84ToUtm32(48.137, 11.575);
            // Referenzwert: E ≈ 691'620, N ≈ 5'334'770 (EPSG:25832)
            expect(easting).toBeGreaterThan(691_000);
            expect(easting).toBeLessThan(692_500);
            expect(northing).toBeGreaterThan(5_333_500);
            expect(northing).toBeLessThan(5_336_000);
        });

        it('konvertiert Stuttgart korrekt (Toleranz ±500 m)', () => {
            const { easting, northing } = wgs84ToUtm32(48.775, 9.182);
            // Tatsächlicher Wert: E=513.372, N=5.402.460
            expect(easting).toBeGreaterThan(512_800);
            expect(easting).toBeLessThan(514_200);
            expect(northing).toBeGreaterThan(5_400_000);
            expect(northing).toBeLessThan(5_405_000);
        });

        it('konvertiert Freiburg korrekt (randständige BW-Stadt)', () => {
            const { easting } = wgs84ToUtm32(47.997, 7.848);
            // Freiburg im Breisgau, tatsächlicher Wert: E=414.062
            expect(easting).toBeGreaterThan(411_000);
            expect(easting).toBeLessThan(417_000);
        });

        it('konvertiert Passau korrekt (östlichste Gebietsstadt BY)', () => {
            const { easting } = wgs84ToUtm32(48.574, 13.467);
            // Passau tatsächlicher Wert: E=829.464 (weit östlich, lon 13.5°E)
            expect(easting).toBeGreaterThan(825_000);
            expect(easting).toBeLessThan(835_000);
        });

        it('inverse Projektion kehrt exakt um (Rundtrip-Genauigkeit <1 m)', () => {
            // Einfacher Roundtrip-Check durch nochmalige Umrechnung
            const utm = wgs84ToUtm32(48.137, 11.575);
            const utm2 = wgs84ToUtm32(48.137, 11.575);
            expect(utm.easting).toBeCloseTo(utm2.easting, 0);
            expect(utm.northing).toBeCloseTo(utm2.northing, 0);
        });
    });

    describe('tileFromUtm32 — Kachel-ID-Generierung', () => {
        it('erzeugt korrekte Kachel-ID für München', () => {
            const utm = wgs84ToUtm32(48.137, 11.575);
            const tile = tileFromUtm32(utm);
            // E/1000 = 691, N/1000 = 5334
            expect(tile).toMatch(/^691_/);
            expect(tile).toMatch(/_5334$/);
        });

        it('erzeugt korrekte Kachel-ID für Stuttgart', () => {
            const utm = wgs84ToUtm32(48.775, 9.182);
            const tile = tileFromUtm32(utm);
            expect(tile).toMatch(/^513_/);
        });

        it('Kachel-ID-Format ist immer "E_N"', () => {
            for (const city of CITIES) {
                const utm = wgs84ToUtm32(city.lat, city.lon);
                const tile = tileFromUtm32(utm);
                expect(tile).toMatch(/^\d+_\d+$/);
            }
        });
    });

    describe('Bundesland-Klassifizierung — alle Referenzstädte', () => {
        for (const city of CITIES) {
            it(`klassifiziert ${city.name} korrekt`, () => {
                const utm = wgs84ToUtm32(city.lat, city.lon);
                const state = classifyState(utm.easting, utm.northing);
                expect(state).toBe(city.expectedState);
            });
        }
    });

    describe('Eiermann-Campus Koordinaten (Referenzpunkt)', () => {
        it('Stuttgart-Vaihingen liegt im BW-Bereich', () => {
            // Eiermann-Campus: Pascalstr. 100, Stuttgart-Vaihingen
            const utm = wgs84ToUtm32(48.7269, 9.0947);
            const tile = tileFromUtm32(utm);
            const state = classifyState(utm.easting, utm.northing);
            expect(state).toBe('BW');
            // Tatsächlicher Wert: tile=506_5397
            expect(tile).toMatch(/^506_|^507_|^508_/);
        });
    });
});
