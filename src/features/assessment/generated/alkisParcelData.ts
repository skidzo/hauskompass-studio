/**
 * alkisParcelData.ts — generated project data
 * Replace with your project's ALKIS cadastral data.
 * Generate using: python scripts/generate_assessment_data.py
 */
export const alkisParcelData = {
    officialExtract: {
        obtained: false,
        date: null as string | null,
        issuedBy: '',
    },
    parcel: null as null | {
        id: string;
        area: number | null;
        gemarkung: string;
        gemeinde: string;
        lkr: string;
        bundesland: string;
    },
    boundary: {
        approximate: true,
        source: '',
        vertices: [] as Array<{ label: string; e: number; n: number }>,
        adjacentParcels: {} as Record<string, string[]>,
    },
    heritage: {
        building: { listed: false as boolean | null, note: '' },
        archaeological: { listed: false as boolean | null, note: '' },
        buildingListedNote: '',
    },
    setbacks: null as null | Record<string, unknown>,
    access: { roads: [] as string[], footprint: '' },
    context: { description: '' },
    planning: {
        bebauungsplanNote: '',
        abstandsflaechenNote: '',
        gaBauordnungsrechtlicheSonderthemenNote: '',
        missingDataEntries: [] as string[],
    },
};

export type AlkisParcelData = typeof alkisParcelData;
