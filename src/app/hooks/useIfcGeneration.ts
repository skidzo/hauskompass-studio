import { computeProjectSourceFingerprint } from '@/features/project-store/derivedData';
import type { ImportedProject } from '@/features/project-store/types';
import { useEffect, useMemo, useState } from 'react';

export interface UseIfcGenerationReturn {
    lod2IfcContent: string | null;
    setGenerated: (content: string) => void;
    resetGeneration: () => void;
}

export function useIfcGeneration(
    activeProject: ImportedProject | null,
    updateProject: (project: ImportedProject) => void,
): UseIfcGenerationReturn {
    const [lod2IfcContent, setLod2IfcContent] = useState<string | null>(null);
    const sourceFingerprint = useMemo(
        () => (activeProject ? computeProjectSourceFingerprint(activeProject) : null),
        [activeProject],
    );

    useEffect(() => {
        const persisted = activeProject?.derivedData?.ifc;
        if (persisted && persisted.sourceFingerprint === sourceFingerprint) {
            setLod2IfcContent(persisted.payload);
            return;
        }
        setLod2IfcContent(null);
    }, [activeProject, sourceFingerprint]);

    const setGenerated = (content: string) => {
        setLod2IfcContent(content);
        if (!activeProject || !sourceFingerprint) return;
        updateProject({
            ...activeProject,
            derivedData: {
                ...activeProject.derivedData,
                ifc: {
                    sourceFingerprint,
                    generatedAt: new Date().toISOString(),
                    generatorVersion: 'lod2-ifc-v1',
                    payload: content,
                },
            },
        });
    };

    const resetGeneration = () => {
        setLod2IfcContent(null);
        if (!activeProject || !activeProject.derivedData?.ifc) return;
        updateProject({
            ...activeProject,
            derivedData: {
                ...activeProject.derivedData,
                ifc: undefined,
            },
        });
    };

    return { lod2IfcContent, setGenerated, resetGeneration };
}
