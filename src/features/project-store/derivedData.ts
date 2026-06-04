import type { ImportedProject } from './types';

export function computeProjectSourceFingerprint(project: ImportedProject): string {
    return JSON.stringify({
        sourceTile: project.sourceTile,
        confirmedIds: [...project.confirmedIds].sort(),
        candidates: project.candidates.map((candidate) => ({
            id: candidate.id,
            bbox: candidate.bboxUtm32,
            surfaceCounts: {
                ground: candidate.surfaces.ground.length,
                wall: candidate.surfaces.wall.length,
                roof: candidate.surfaces.roof.length,
            },
        })),
    });
}
