/**
 * siteContextData.ts — generated project data
 * Replace with your project's site context data.
 * Generate using: python scripts/generate_site_context_data.py
 */
export const siteContextData = {
  mapWindowUtm32: { minE: 0, maxE: 0, minN: 0, maxN: 0 },
  terrain: [] as Array<{ e: number; n: number; z: number }>,
  osmBuildings: [] as Array<{
    id: number;
    label: string;
    building: string;
    points: Array<{ e: number; n: number }>;
  }>,
  roads: [] as Array<{
    id: number;
    name: string;
    type: string;
    points: Array<{ e: number; n: number }>;
  }>,
  sources: { osm: '', dgm1: '' },
};

export type SiteContextData = typeof siteContextData;
