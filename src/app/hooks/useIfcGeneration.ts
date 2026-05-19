import { useState } from 'react';

export interface UseIfcGenerationReturn {
    lod2GeneratedFor: string | null;
    lod2IfcContent: string | null;
    setGenerated: (candidateId: string, content: string) => void;
    resetGeneration: () => void;
}

export function useIfcGeneration(): UseIfcGenerationReturn {
    const [lod2GeneratedFor, setLod2GeneratedFor] = useState<string | null>(null);
    const [lod2IfcContent, setLod2IfcContent] = useState<string | null>(null);

    const setGenerated = (candidateId: string, content: string) => {
        setLod2GeneratedFor(candidateId);
        setLod2IfcContent(content);
    };

    const resetGeneration = () => {
        setLod2GeneratedFor(null);
        setLod2IfcContent(null);
    };

    return { lod2GeneratedFor, lod2IfcContent, setGenerated, resetGeneration };
}
