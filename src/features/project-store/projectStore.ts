import type { ImportedProject } from './types';

const KEY_LIST = 'hk_project_list';
const keyForSlug = (slug: string) => `hk_project_${slug}`;
const KEY_ACTIVE = 'hk_active_project';

export function listProjects(): string[] {
    try {
        return JSON.parse(localStorage.getItem(KEY_LIST) ?? '[]') as string[];
    } catch {
        return [];
    }
}

export function saveProject(project: ImportedProject): void {
    try {
        const slugs = listProjects();
        if (!slugs.includes(project.slug)) {
            localStorage.setItem(KEY_LIST, JSON.stringify([...slugs, project.slug]));
        }
        localStorage.setItem(keyForSlug(project.slug), JSON.stringify(project));
    } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
            throw new Error(
                'Browserspeicher voll. Bitte löschen Sie alte Projekte, um Platz zu schaffen.',
            );
        }
        throw err;
    }
}

export function loadProject(slug: string): ImportedProject | null {
    try {
        const raw = localStorage.getItem(keyForSlug(slug));
        return raw ? (JSON.parse(raw) as ImportedProject) : null;
    } catch {
        return null;
    }
}

export function deleteProject(slug: string): void {
    const slugs = listProjects().filter((s) => s !== slug);
    localStorage.setItem(KEY_LIST, JSON.stringify(slugs));
    localStorage.removeItem(keyForSlug(slug));
    if (getActiveSlug() === slug) clearActiveSlug();
}

export function getActiveSlug(): string | null {
    return localStorage.getItem(KEY_ACTIVE);
}

export function setActiveSlug(slug: string | null): void {
    if (slug) {
        localStorage.setItem(KEY_ACTIVE, slug);
    } else {
        localStorage.removeItem(KEY_ACTIVE);
    }
}

export function clearActiveSlug(): void {
    localStorage.removeItem(KEY_ACTIVE);
}
