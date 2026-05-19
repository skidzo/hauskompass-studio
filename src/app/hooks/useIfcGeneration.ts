import { useState } from 'react';

export interface UseIfcGenerationReturn {
    lod2IfcContent: string | null;
    setGenerated: (content: string) => void;
    resetGeneration: () => void;
}

export function useIfcGeneration(): UseIfcGenerationReturn {
    const [lod2IfcContent, setLod2IfcContent] = useState<string | null>(null);

    const setGenerated = (content: string) => {
        setLod2IfcContent(content);
    };

    const resetGeneration = () => {
        setLod2IfcContent(null);
    };

    return { lod2IfcContent, setGenerated, resetGeneration };
}
