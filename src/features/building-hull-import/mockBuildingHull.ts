import type { BuildingHull } from '@/domain/BuildingHull';

export const mockBuildingHull: BuildingHull = {
  id: 'mock-building-hull',
  projectId: 'private-house-baseline',
  source: 'mock',
  coordinateReferenceSystem: 'unknown',
  footprint: undefined,
  roofSurfaces: [
    {
      id: 'roof-east-south-candidate',
      label: 'Candidate east/south roof plane',
      classification: 'main-roof',
      solarSuitability: 'unknown',
      renovationRelevance: ['pv', 'insulation', 'summer-heat', 'rain-protection', 'roof-extension', 'needs-manual-check'],
      evidence: [
        {
          id: 'assumption-roof-1',
          sourceType: 'assumption',
          label: 'Known renovation interest in large east/south roof area',
          confidence: 'low',
        },
      ],
      confidence: 'low',
    },
    {
      id: 'roof-north-east-exposure',
      label: 'Candidate cold wind exposure roof/side',
      classification: 'main-roof',
      solarSuitability: 'unknown',
      renovationRelevance: ['insulation', 'north-east-wind', 'snow-load', 'needs-manual-check'],
      evidence: [],
      confidence: 'unknown',
    },
  ],
  wallSurfaces: [
    {
      id: 'wall-street-side',
      label: 'Street-side wall candidate',
      exposure: ['street-side', 'driving-rain'],
      renovationRelevance: ['insulation', 'windows', 'facade', 'needs-manual-check'],
      evidence: [],
      confidence: 'low',
    },
  ],
  buildingParts: [
    {
      id: 'main-building',
      label: 'Main building',
      type: 'main-volume',
      confidence: 'low',
    },
    {
      id: 'north-west-extension',
      label: 'Possible north-west extension',
      type: 'extension',
      confidence: 'low',
    },
  ],
  surroundingContext: {
    buildingsLoaded: false,
    terrainLoaded: false,
    vegetationLoaded: false,
  },
  evidence: [],
  confidence: 'low',
  manualCorrections: [],
};
