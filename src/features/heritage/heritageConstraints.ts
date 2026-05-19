export const heritageConstraints = {
  status: 'archived-low-priority',
  source: 'Bayerischer Denkmal-Atlas coordinate search',
  sourceUrl: 'https://geoportal.bayern.de/denkmalatlas/',
  queryPointUtm32: {
    easting: 748175.247,
    northing: 5484455.22,
  },
  searchedAt: '2026-05-11',
  localCache: {
    radius250m: 'cache/heritage/denkmalatlas/bykoord_250m.json',
    radius500m: 'cache/heritage/denkmalatlas/bykoord_500m.json',
    radius1000m: 'cache/heritage/denkmalatlas/bykoord_1000m.json',
  },
  summary: {
    directHitWithin150m: false,
    nearestResultDistanceM: 206.87,
    note:
      'No DenkmalAtlas JSON result was returned at 150 m. At 250 m, the official service returned one Bodendenkmal and one nearby Baudenkmal. These are considered likely irrelevant for the active renovation baseline.',
  },
  nearestResults: [
    {
      distanceM: 206.87,
      objectType: 'boden',
      fileNumber: 'D-3-6540-0055',
      function: null,
      label: 'Untertägige Befunde der frühen Neuzeit im Bereich ...',
    },
    {
      distanceM: 212.17,
      objectType: 'bau',
      fileNumber: 'D-3-76-151-8',
      function: 'Ausstattung, Kapelle',
      label: 'Kapelle',
    },
  ],
  caveat:
    'The DenkmalAtlas itself warns that listing/cartography is not the only basis for monument status and does not replace involvement of the responsible permit and heritage authorities.',
} as const;
