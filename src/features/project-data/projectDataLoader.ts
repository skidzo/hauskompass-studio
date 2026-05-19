export interface RuntimeProjectConfig {
    projectId: string;
    siteId: string;
    slug: string;
    mediaManifestUrl: string;
}

interface ProjectIndexEntry {
    id: string;
    title: string;
    subtitle: string;
    type: 'workshop' | 'renovation';
    location: string;
    description: string;
    slug?: string;
    projectId?: string;
    siteId?: string;
    mediaManifestUrl?: string;
}

const PROJECTS_INDEX_URL = '/projects/index.json';

const RUNTIME_PROJECTS_FALLBACK: RuntimeProjectConfig[] = [];

let projectIndexPromise: Promise<ProjectIndexEntry[]> | null = null;

async function loadProjectIndex(): Promise<ProjectIndexEntry[]> {
    if (!projectIndexPromise) {
        projectIndexPromise = fetch(PROJECTS_INDEX_URL, { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) throw new Error(`[projectDataLoader] Failed to fetch projects index: ${response.status}`);
                return response.json() as Promise<ProjectIndexEntry[]>;
            })
            .catch(() => []);
    }
    return projectIndexPromise;
}

export async function resolveRuntimeProjectConfig(projectId: string): Promise<RuntimeProjectConfig> {
    const projectIndex = await loadProjectIndex();
    const fromIndex = projectIndex.find((entry) => entry.projectId === projectId && entry.siteId && entry.slug && entry.mediaManifestUrl);
    if (fromIndex?.siteId && fromIndex.slug && fromIndex.mediaManifestUrl) {
        return { projectId, siteId: fromIndex.siteId, slug: fromIndex.slug, mediaManifestUrl: fromIndex.mediaManifestUrl };
    }

    const fallback = RUNTIME_PROJECTS_FALLBACK.find((entry) => entry.projectId === projectId);
    if (fallback) return fallback;

    throw new Error(`[projectDataLoader] No runtime config for projectId "${projectId}"`);
}

async function getProjectBaseUrl(projectId: string): Promise<string> {
    const config = await resolveRuntimeProjectConfig(projectId);
    return `/projects/${config.slug}`;
}

async function getProjectDataUrl(projectId: string, fileName: string): Promise<string> {
    return `${await getProjectBaseUrl(projectId)}/${fileName}`;
}

async function getProjectSeedUrl(projectId: string, fileName: string): Promise<string> {
    return `${await getProjectBaseUrl(projectId)}/seed/${fileName}`;
}

export async function getProjectMediaManifestUrl(projectId: string): Promise<string> {
    return (await resolveRuntimeProjectConfig(projectId)).mediaManifestUrl;
}

export async function fetchProjectJson<T>(projectId: string, fileName: string): Promise<T> {
    const response = await fetch(await getProjectDataUrl(projectId, fileName), { cache: 'no-store' });
    if (!response.ok) throw new Error(`[projectDataLoader] Failed to fetch ${fileName}: ${response.status}`);
    return response.json() as Promise<T>;
}

export async function fetchProjectSeedJson<T>(projectId: string, fileName: string): Promise<T> {
    const response = await fetch(await getProjectSeedUrl(projectId, fileName), { cache: 'no-store' });
    if (!response.ok) throw new Error(`[projectDataLoader] Failed to fetch seed/${fileName}: ${response.status}`);
    return response.json() as Promise<T>;
}
