export function getWorkshopSeedVersionKey(projectId: string): string {
    return `workshop-seed-version:${projectId}`;
}

export function getWorkshopMediaRestoreVersionKey(projectId: string): string {
    return `workshop-media-restore-version:${projectId}`;
}

/**
 * Marker value stored under the seed-version key for quick-start projects.
 * When present, seedProject() skips all network fetching for this projectId.
 */
export const QUICK_START_MARKER = 'qs';
