export const confirmedBuildingParts = [
  {
    rank: 1,
    candidateId: 'DEBY_LOD2_6944727',
    role: 'old-farmhouse',
    label: 'Part 1 - old farming house',
    notes: 'Confirmed part of the object of interest. Historic farming house / older residential-farm building part.',
    geometryAdjustment: 'Translated by approximately -3.07 m east / +2.19 m north to better align with OSM building 31.',
  },
  {
    rank: 2,
    candidateId: 'DEBY_LOD2_6945465',
    role: 'later-agricultural-building',
    label: 'Part 2 - later farming and storage building',
    notes:
      'Confirmed part of the object of interest. Built later for farming, livestock keeping and barn/storage use. Nowadays the more modern building part.',
  },
] as const;

export const neighborReferenceParts = [
  {
    rank: 4,
    candidateId: 'DEBY_LOD2_14772',
    label: 'Reference 4 - neighbour context',
    notes: 'Keep as neighbour reference for later viewpoints and overall site functionality.',
  },
  {
    rank: 6,
    candidateId: 'DEBY_LOD2_42384223',
    label: 'Reference 6 - neighbour context',
    notes: 'Keep as neighbour reference for later viewpoints and overall site functionality.',
  },
  {
    rank: 5,
    candidateId: 'DEBY_LOD2_6945456',
    label: 'Reference 5 - neighbour context',
    notes: 'Keep as neighbour reference for later viewpoints and overall site functionality.',
  },
  {
    rank: 3,
    candidateId: 'DEBY_LOD2_6944726',
    label: 'Reference 3 - neighbour context',
    notes: 'Keep as neighbour reference for later viewpoints and overall site functionality.',
  },
  {
    rank: 9,
    candidateId: 'DEBY_LOD2_6944729',
    label: 'Reference 9 - neighbour context',
    notes: 'Keep as neighbour reference for later viewpoints and overall site functionality.',
  },
] as const;

export const activeCandidateIds = [
  ...confirmedBuildingParts.map((part) => part.candidateId),
  ...neighborReferenceParts.map((part) => part.candidateId),
];

export const futureHullPlanningNote =
  'Future building hull planning may unify the roof geometry across parts 1 and 2. This is a later planning variant and is not part of the current evidence geometry.';

export function getConfirmedPart(candidateId: string) {
  return confirmedBuildingParts.find((part) => part.candidateId === candidateId);
}

export function isConfirmedBuildingPart(candidateId: string) {
  return confirmedBuildingParts.some((part) => part.candidateId === candidateId);
}

export function getNeighborReference(candidateId: string) {
  return neighborReferenceParts.find((part) => part.candidateId === candidateId);
}

export function isNeighborReference(candidateId: string) {
  return neighborReferenceParts.some((part) => part.candidateId === candidateId);
}

export function isActiveCandidate(candidateId: string) {
  return activeCandidateIds.some((id) => id === candidateId);
}
