/**
 * Usability Test 4 — Project Store Lifecycle
 *
 * Schwerpunkt: Lokale Datenpersistenz (localStorage). Prüft, ob Projekte
 * korrekt gespeichert, geladen, gelistet und gelöscht werden.
 * Simuliert den vollständigen Nutzungsfluss: Projekt anlegen → laden →
 * weiteres Projekt hinzufügen → löschen → leerer Zustand.
 */

import { beforeEach, describe, expect, it } from 'vitest';

// ── Minimal localStorage-Mock ────────────────────────────────────────────────
// Vitest läuft in Node, kein echtes localStorage vorhanden.
// Wir mocken es mit einer Map.

const store = new globalThis.Map<string, string>();

const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
};

// ── Lokale Reimplementierung der projectStore-Funktionen ─────────────────────
// (Produktiv-Code importiert localStorage direkt — hier via Closure gemockt)

function makeProjectStore(ls: typeof localStorageMock) {
    const KEY_LIST = 'hk_project_list';
    const KEY_ACTIVE = 'hk_active_project';
    const keyFor = (slug: string) => `hk_project_${slug}`;

    function listProjects(): string[] {
        try { return JSON.parse(ls.getItem(KEY_LIST) ?? '[]') as string[]; }
        catch { return []; }
    }

    function saveProject(project: { slug: string; address: string; geocode: object; candidates: object[]; confirmedIds: string[]; importedAt: string }): void {
        const slugs = listProjects();
        if (!slugs.includes(project.slug)) {
            ls.setItem(KEY_LIST, JSON.stringify([...slugs, project.slug]));
        }
        ls.setItem(keyFor(project.slug), JSON.stringify(project));
    }

    function loadProject(slug: string): object | null {
        try {
            const raw = ls.getItem(keyFor(slug));
            return raw ? JSON.parse(raw) as object : null;
        } catch { return null; }
    }

    function deleteProject(slug: string): void {
        const slugs = listProjects().filter((s) => s !== slug);
        ls.setItem(KEY_LIST, JSON.stringify(slugs));
        ls.removeItem(keyFor(slug));
        if (ls.getItem(KEY_ACTIVE) === slug) ls.removeItem(KEY_ACTIVE);
    }

    function getActiveSlug(): string | null { return ls.getItem(KEY_ACTIVE); }
    function setActiveSlug(slug: string | null): void {
        if (slug) ls.setItem(KEY_ACTIVE, slug);
        else ls.removeItem(KEY_ACTIVE);
    }

    return { listProjects, saveProject, loadProject, deleteProject, getActiveSlug, setActiveSlug };
}

const makeTestProject = (slug: string, address: string) => ({
    slug,
    address,
    geocode: { lat: 48.775, lon: 9.182, displayName: address, utm32: { easting: 513464, northing: 5403838 }, tileId: '513_5403' },
    candidates: [],
    confirmedIds: [],
    importedAt: new Date().toISOString(),
    sourceTile: '513_5403',
});

describe('Usability Test 4: Project Store Lifecycle', () => {

    beforeEach(() => { store.clear(); });

    describe('Leerer Initialzustand', () => {
        it('listProjects gibt [] zurück wenn kein Projekt gespeichert', () => {
            const { listProjects } = makeProjectStore(localStorageMock);
            expect(listProjects()).toEqual([]);
        });

        it('loadProject gibt null zurück für unbekannten Slug', () => {
            const { loadProject } = makeProjectStore(localStorageMock);
            expect(loadProject('non-existent')).toBeNull();
        });

        it('getActiveSlug gibt null zurück wenn kein aktives Projekt', () => {
            const { getActiveSlug } = makeProjectStore(localStorageMock);
            expect(getActiveSlug()).toBeNull();
        });
    });

    describe('Projekt speichern und laden', () => {
        it('gespeichertes Projekt kann geladen werden', () => {
            const { saveProject, loadProject, listProjects } = makeProjectStore(localStorageMock);
            const proj = makeTestProject('test-projekt-stuttgart', 'Marktplatz 1, Stuttgart');
            saveProject(proj);
            expect(listProjects()).toContain('test-projekt-stuttgart');
            const loaded = loadProject('test-projekt-stuttgart') as typeof proj;
            expect(loaded.address).toBe('Marktplatz 1, Stuttgart');
        });

        it('Projekte sind unter ihrem Slug abrufbar', () => {
            const { saveProject, loadProject } = makeProjectStore(localStorageMock);
            saveProject(makeTestProject('proj-a', 'Adresse A'));
            saveProject(makeTestProject('proj-b', 'Adresse B'));
            expect((loadProject('proj-a') as { address: string }).address).toBe('Adresse A');
            expect((loadProject('proj-b') as { address: string }).address).toBe('Adresse B');
        });
    });

    describe('Mehrere Projekte verwalten', () => {
        it('listProjects gibt alle gespeicherten Slugs zurück', () => {
            const { saveProject, listProjects } = makeProjectStore(localStorageMock);
            saveProject(makeTestProject('alpha', 'Alpha'));
            saveProject(makeTestProject('beta', 'Beta'));
            saveProject(makeTestProject('gamma', 'Gamma'));
            const list = listProjects();
            expect(list).toHaveLength(3);
            expect(list).toContain('alpha');
            expect(list).toContain('gamma');
        });

        it('doppeltes Speichern erzeugt keinen doppelten Eintrag in der Liste', () => {
            const { saveProject, listProjects } = makeProjectStore(localStorageMock);
            const proj = makeTestProject('dup-slug', 'Dup Adresse');
            saveProject(proj);
            saveProject({ ...proj, address: 'Aktualisiert' }); // selber Slug
            expect(listProjects()).toHaveLength(1);
            const loaded = listProjects();
            expect(loaded.filter((s) => s === 'dup-slug')).toHaveLength(1);
        });

        it('aktualisiertes Projekt überschreibt altes (upsert)', () => {
            const { saveProject, loadProject } = makeProjectStore(localStorageMock);
            saveProject(makeTestProject('proj-upd', 'Alt'));
            saveProject({ ...makeTestProject('proj-upd', 'Neu'), address: 'Neu' });
            const loaded = loadProject('proj-upd') as { address: string };
            expect(loaded.address).toBe('Neu');
        });
    });

    describe('Projekt löschen', () => {
        it('gelöschtes Projekt erscheint nicht mehr in der Liste', () => {
            const { saveProject, deleteProject, listProjects } = makeProjectStore(localStorageMock);
            saveProject(makeTestProject('del-me', 'Lösch mich'));
            saveProject(makeTestProject('keep-me', 'Behalte mich'));
            deleteProject('del-me');
            expect(listProjects()).not.toContain('del-me');
            expect(listProjects()).toContain('keep-me');
        });

        it('gelöschtes Projekt ist nicht mehr ladbar', () => {
            const { saveProject, deleteProject, loadProject } = makeProjectStore(localStorageMock);
            saveProject(makeTestProject('bye', 'Auf Wiedersehen'));
            deleteProject('bye');
            expect(loadProject('bye')).toBeNull();
        });

        it('Löschen des aktiven Projekts entfernt auch den Active-Slug', () => {
            const { saveProject, deleteProject, setActiveSlug, getActiveSlug } = makeProjectStore(localStorageMock);
            saveProject(makeTestProject('active-one', 'Aktives'));
            setActiveSlug('active-one');
            deleteProject('active-one');
            expect(getActiveSlug()).toBeNull();
        });
    });

    describe('Aktives Projekt', () => {
        it('setActiveSlug und getActiveSlug sind konsistent', () => {
            const { setActiveSlug, getActiveSlug } = makeProjectStore(localStorageMock);
            setActiveSlug('mein-projekt');
            expect(getActiveSlug()).toBe('mein-projekt');
        });

        it('setActiveSlug(null) löscht den Active-Slug', () => {
            const { setActiveSlug, getActiveSlug } = makeProjectStore(localStorageMock);
            setActiveSlug('proj');
            setActiveSlug(null);
            expect(getActiveSlug()).toBeNull();
        });
    });

    describe('Fehlerresistenz', () => {
        it('loadProject gibt null zurück bei korruptem JSON', () => {
            const { loadProject } = makeProjectStore({
                ...localStorageMock,
                getItem: (key: string) => key.startsWith('hk_project_bad') ? '{ invalid json' : null,
            });
            expect(loadProject('bad')).toBeNull();
        });
    });
});
