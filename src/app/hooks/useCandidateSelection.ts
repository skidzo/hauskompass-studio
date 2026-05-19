import type { ImportedProject, Lod2Candidate } from '@/features/project-store/types';
import { useEffect, useMemo, useState } from 'react';

import { lod2CandidateGeometry } from '@/features/building-hull-import/generated/lod2CandidateGeometry';
import { activeCandidateIds } from '@/features/building-hull-import/confirmedBuildingParts';

export interface UseCandidateSelectionReturn {
    selectedCandidateId: string;
    setSelectedCandidateId: (id: string) => void;
    effectiveCandidateId: string;
    selectedCandidate: Lod2Candidate | undefined;
    activeCandidates: Lod2Candidate[];
    confirmedCandidates: Lod2Candidate[];
    runtimeCandidates: Lod2Candidate[];
    runtimeConfirmedIds: string[];
}

export function useCandidateSelection(
    activeProject: ImportedProject | null,
): UseCandidateSelectionReturn {
    const runtimeCandidates: Lod2Candidate[] =
        activeProject?.candidates ?? (lod2CandidateGeometry.candidates as unknown as Lod2Candidate[]);
    const runtimeConfirmedIds: string[] = activeProject?.confirmedIds ?? activeCandidateIds;

    const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
        () => runtimeCandidates[0]?.id ?? '',
    );

    useEffect(() => {
        const firstConfirmed =
            activeProject?.confirmedIds?.[0] ?? activeProject?.candidates?.[0]?.id;
        if (firstConfirmed) {
            setSelectedCandidateId(firstConfirmed);
        } else {
            setSelectedCandidateId(
                (lod2CandidateGeometry.candidates as unknown as Lod2Candidate[])[0]?.id ?? '',
            );
        }
    }, [activeProject?.slug]);

    const effectiveCandidateId = runtimeCandidates.some((c) => c.id === selectedCandidateId)
        ? selectedCandidateId
        : (runtimeCandidates[0]?.id ?? '');

    const selectedCandidate = useMemo(
        () =>
            runtimeCandidates.find((c) => c.id === effectiveCandidateId) ??
            runtimeCandidates[0],
        [runtimeCandidates, effectiveCandidateId],
    );

    const activeCandidates = useMemo(
        () => runtimeCandidates.filter((c) => runtimeConfirmedIds.some((id) => id === c.id)),
        [runtimeCandidates, runtimeConfirmedIds],
    );

    const confirmedCandidates = useMemo(
        () => activeCandidates.filter((c) => runtimeConfirmedIds.includes(c.id)),
        [activeCandidates, runtimeConfirmedIds],
    );

    return {
        selectedCandidateId,
        setSelectedCandidateId,
        effectiveCandidateId,
        selectedCandidate,
        activeCandidates,
        confirmedCandidates,
        runtimeCandidates,
        runtimeConfirmedIds,
    };
}
