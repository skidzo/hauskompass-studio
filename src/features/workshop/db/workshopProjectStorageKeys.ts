export function getWorkshopSeedVersionKey(projectId: string): string {
    return `workshop-seed-version:${projectId}`;
}

export function getWorkshopMediaRestoreVersionKey(projectId: string): string {
    return `workshop-media-restore-version:${projectId}`;
}
