import { fetchTerrainProfile } from '@/features/lod2-derived/fetchTerrainProfile';
import { computeProjectSourceFingerprint } from '@/features/project-store/derivedData';
import type { ImportedProject, ImportedTerrainData } from '@/features/project-store/types';
import { useEffect, useMemo, useState } from 'react';

export type TerrainFetchState = 'idle' | 'loading' | 'error';

export interface UseTerrainDataReturn {
    terrainData: ImportedTerrainData | null;
    terrainFetchState: TerrainFetchState;
    terrainFetchError: string;
    fetchTerrain: () => Promise<void>;
    resetTerrain: () => void;
}

export function useTerrainData(
    activeProject: ImportedProject | null,
    updateProject: (project: ImportedProject) => void,
): UseTerrainDataReturn {
    const [terrainData, setTerrainData] = useState<ImportedTerrainData | null>(null);
    const [terrainFetchState, setTerrainFetchState] = useState<TerrainFetchState>('idle');
    const [terrainFetchError, setTerrainFetchError] = useState('');
    const sourceFingerprint = useMemo(
        () => (activeProject ? computeProjectSourceFingerprint(activeProject) : null),
        [activeProject],
    );

    const resetTerrain = () => {
        setTerrainData(null);
        setTerrainFetchState('idle');
        setTerrainFetchError('');
        if (!activeProject) return;
        if (!activeProject.derivedData?.terrain) return;
        updateProject({
            ...activeProject,
            derivedData: {
                ...activeProject.derivedData,
                terrain: undefined,
            },
        });
    };

    useEffect(() => {
        const persisted = activeProject?.derivedData?.terrain;
        if (persisted && persisted.sourceFingerprint === sourceFingerprint) {
            setTerrainData(persisted.payload);
            setTerrainFetchState('idle');
            setTerrainFetchError('');
            return;
        }
        setTerrainData(null);
        setTerrainFetchState('idle');
        setTerrainFetchError('');
    }, [activeProject, sourceFingerprint]);

    const fetchTerrain = async () => {
        if (!activeProject || !sourceFingerprint) return;
        setTerrainFetchState('loading');
        setTerrainFetchError('');
        try {
            const data = await fetchTerrainProfile(activeProject.geocode);
            setTerrainData(data);
            setTerrainFetchState('idle');
            updateProject({
                ...activeProject,
                derivedData: {
                    ...activeProject.derivedData,
                    terrain: {
                        sourceFingerprint,
                        generatedAt: new Date().toISOString(),
                        generatorVersion: 'terrain-open-meteo-v1',
                        payload: data,
                    },
                },
            });
        } catch (e: unknown) {
            setTerrainFetchState('error');
            setTerrainFetchError(e instanceof Error ? e.message : String(e));
        }
    };

    return { terrainData, terrainFetchState, terrainFetchError, fetchTerrain, resetTerrain };
}
