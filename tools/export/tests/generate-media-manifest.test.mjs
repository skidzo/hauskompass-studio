/**
 * Zweck: Unit-Tests für generate-media-manifest.mjs
 * Aufruf: node tools/export/tests/generate-media-manifest.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAssetId, sanitizeFilename, mergeManifest } from '../generate-media-manifest.mjs';

// ── generateAssetId ──────────────────────────────────────────────────────────

test('generateAssetId — deterministisch: gleiche Inputs → gleiche ID', () => {
    const a = generateAssetId('IMG_001.jpg', '2023-04-15');
    const b = generateAssetId('IMG_001.jpg', '2023-04-15');
    assert.equal(a, b);
});

test('generateAssetId — unterschiedliche Dateinamen → unterschiedliche IDs', () => {
    const a = generateAssetId('IMG_001.jpg', '2023-04-15');
    const b = generateAssetId('IMG_002.jpg', '2023-04-15');
    assert.notEqual(a, b);
});

test('generateAssetId — unterschiedliche Daten → unterschiedliche IDs', () => {
    const a = generateAssetId('IMG_001.jpg', '2023-04-15');
    const b = generateAssetId('IMG_001.jpg', '2023-04-16');
    assert.notEqual(a, b);
});

test('generateAssetId — beginnt mit A-', () => {
    assert.ok(generateAssetId('test.jpg', '2023-01-01').startsWith('A-'));
});

// ── sanitizeFilename ─────────────────────────────────────────────────────────

test('sanitizeFilename — Umlaute werden ersetzt', () => {
    assert.equal(sanitizeFilename('Foto von der Straße (2).jpg'), 'foto-von-der-strasse-2.jpg');
});

test('sanitizeFilename — Leerzeichen werden zu Bindestrichen', () => {
    assert.equal(sanitizeFilename('IMG 0001.JPG'), 'IMG-0001.jpg');
});

test('sanitizeFilename — mehrfache Bindestriche werden zusammengeführt', () => {
    const result = sanitizeFilename('test  --  bild.jpg');
    assert.ok(!result.includes('--'), `"${result}" sollte keine doppelten Bindestriche enthalten`);
});

test('sanitizeFilename — Ergebnis ist lowercase für Extension', () => {
    const result = sanitizeFilename('TEST.JPEG');
    assert.ok(result.endsWith('.jpeg'), `"${result}" sollte auf .jpeg enden`);
});

// ── mergeManifest ────────────────────────────────────────────────────────────

test('mergeManifest — fügt neuen Eintrag hinzu', () => {
    const existing = { projectId: 'proj-x', assets: [{ asset: { id: 'A-001' }, url: '/img/a.jpg' }] };
    const newEntry = { asset: { id: 'A-002' }, url: '/img/b.jpg' };
    const result = mergeManifest(existing, [newEntry]);
    assert.equal(result.assets.length, 2);
});

test('mergeManifest — kein Duplikat bei gleicher ID', () => {
    const existing = { projectId: 'proj-x', assets: [{ asset: { id: 'A-001' }, url: '/img/a.jpg' }] };
    const duplicate = { asset: { id: 'A-001' }, url: '/img/a-new.jpg' };
    const result = mergeManifest(existing, [duplicate]);
    assert.equal(result.assets.length, 1);
    // Bestehender Eintrag bleibt unverändert
    assert.equal(result.assets[0].url, '/img/a.jpg');
});

test('mergeManifest — leeres bestehendes Manifest', () => {
    const existing = { projectId: 'proj-x', assets: [] };
    const newEntry = { asset: { id: 'A-001' }, url: '/img/a.jpg' };
    const result = mergeManifest(existing, [newEntry]);
    assert.equal(result.assets.length, 1);
});

test('mergeManifest — generatedAt wird aktualisiert', () => {
    const before = new Date('2020-01-01').toISOString();
    const existing = { projectId: 'proj-x', generatedAt: before, assets: [] };
    const result = mergeManifest(existing, []);
    assert.notEqual(result.generatedAt, before);
});
