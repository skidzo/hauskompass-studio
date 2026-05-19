import type { EventPhase, Zone } from '@/features/workshop/db/workshopDb';
import {
    getAllQuestionsForProject,
    getAssetsForZone,
    getClaimsForZone,
    getEventPhases,
    getInterpretationsForZone,
    getMemoriesForZone,
    getObservationsForZone,
    getQuestionsForZone,
    getWorkshopScenes,
    getZoneAssetCounts,
    getZoneInterpretationCounts,
    getZoneObservationCounts,
    getZonesBySite,
    workshopDb,
} from '@/features/workshop/db/workshopDb';
import { useLiveQuery } from 'dexie-react-hooks';

// ---------------------------------------------------------------------------
// useWorkshopData — master hook
// ---------------------------------------------------------------------------

export function useZones(siteId: string) {
    return useLiveQuery(
        () => getZonesBySite(siteId),
        [siteId],
        [] as Zone[],
    );
}

export function useZoneAssetCounts(siteId: string) {
    return useLiveQuery(
        () => getZoneAssetCounts(siteId),
        [siteId],
        {} as Record<string, number>,
    );
}

export function useZoneDetail(zoneId: string | null, projectId: string) {
    const claims = useLiveQuery(
        () => zoneId ? getClaimsForZone(zoneId) : Promise.resolve([]),
        [zoneId],
        [],
    );
    const questions = useLiveQuery(
        () => zoneId ? getQuestionsForZone(zoneId) : Promise.resolve([]),
        [zoneId],
        [],
    );
    const assets = useLiveQuery(
        () => zoneId ? getAssetsForZone(zoneId) : Promise.resolve([]),
        [zoneId],
        [],
    );
    return { claims, questions, assets };
}

export function useWorkshopScenes(projectId: string) {
    return useLiveQuery(
        () => getWorkshopScenes(projectId),
        [projectId],
        [],
    );
}

export function useEventPhases(projectId: string) {
    return useLiveQuery(
        () => getEventPhases(projectId),
        [projectId],
        [] as EventPhase[],
    );
}

export function useZone(zoneId: string | null): Zone | undefined {
    return useLiveQuery(
        () => zoneId ? workshopDb.zones.get(zoneId) : Promise.resolve(undefined),
        [zoneId],
        undefined,
    ) as Zone | undefined;
}

export function useProject(projectId: string) {
    return useLiveQuery(
        () => workshopDb.projects.get(projectId),
        [projectId],
    );
}

export function useSite(siteId: string) {
    return useLiveQuery(
        () => workshopDb.sites.get(siteId),
        [siteId],
    );
}

export function useObservations(zoneId: string | null) {
    return useLiveQuery(
        () => zoneId ? getObservationsForZone(zoneId) : Promise.resolve([]),
        [zoneId],
        [],
    );
}

export function useMemories(zoneId: string | null) {
    return useLiveQuery(
        () => zoneId ? getMemoriesForZone(zoneId) : Promise.resolve([]),
        [zoneId],
        [],
    );
}

export function useZoneObservationCounts(siteId: string) {
    return useLiveQuery(
        () => getZoneObservationCounts(siteId),
        [siteId],
        {} as Record<string, number>,
    );
}

export function useAllQuestions(projectId: string) {
    return useLiveQuery(
        () => getAllQuestionsForProject(projectId),
        [projectId],
        [],
    );
}

export function useInterpretations(zoneId: string | null) {
    return useLiveQuery(
        () => zoneId ? getInterpretationsForZone(zoneId) : Promise.resolve([]),
        [zoneId],
        [],
    );
}

export function useZoneInterpretationCounts(siteId: string) {
    return useLiveQuery(
        () => getZoneInterpretationCounts(siteId),
        [siteId],
        {} as Record<string, number>,
    );
}

/** Returns all assets for a project that have GPS coordinates in their EXIF data. */
export function useGpsAssets(projectId: string) {
    return useLiveQuery(
        async () => {
            const all = await workshopDb.assets
                .where('projectId').equals(projectId)
                .toArray();
            return all.filter((a) => typeof a.gpsLat === 'number' && typeof a.gpsLon === 'number');
        },
        [projectId],
        [],
    );
}
