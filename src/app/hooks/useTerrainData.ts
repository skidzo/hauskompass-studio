import type { ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import { fetchTerrainProfile } from '@/features/lod2-derived/fetchTerrainProfile';
import type { ImportedProject } from '@/features/project-store/types';
import { useEffect, useState } from 'react';

export type TerrainFetchState = 'idle' | 'loading' | 'error';

export interface UseTerrainDataReturn {
    terrainData: ImportedTerrainData | null;
    terrainFetchState: TerrainFetchState;
    terrainFetchError: string;
    fetchTerrain: () => Promise<void>;
    resetTerrain: () => void;
}

export function useTerrainData(activeProject: ImportedProject | null): UseTerrainDataReturn {
    const [terrainData, setTerrainData] = useState<ImportedTerrainData | null>(null);
    const [terrainFetchState, setTerrainFetchState] = useState<TerrainFetchState>('idle');
    const [terrainFetchError, setTerrainFetchError] = useState('');

    const resetTerrain = () => {
        setTerrainData(null);
        setTerrainFetchState('idle');
        setTerrainFetchError('');
    };

    // Terrain wird beim Projekt-Wechsel zurückgesetzt
    useEffect(() => {
        resetTerrain();
    }, [activeProject?.slug]);

    const fetchTerrain = async () => {
        if (!activeProject) return;
        setTerrainFetchState('loading');
        setTerrainFetchError('');
        try {
            const data = await fetchTerrainProfile(activeProject.geocode);
            setTerrainData(data);
            setTerrainFetchState('idle');
        } catch (e: unknown) {
            setTerrainFetchState('error');
            setTerrainFetchError(e instanceof Error ? e.message : String(e));
        }
    };

    return { terrainData, terrainFetchState, terrainFetchError, fetchTerrain, resetTerrain };
}
