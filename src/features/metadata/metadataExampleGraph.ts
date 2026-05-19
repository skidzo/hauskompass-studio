import assets from '../../../examples/assets.example.json';
import assumptions from '../../../examples/assumptions.example.json';
import buildingElements from '../../../examples/building-elements.example.json';
import decisions from '../../../examples/decisions.example.json';
import evidence from '../../../examples/evidence.example.json';
import observationStreams from '../../../examples/observation-streams.example.json';
import project from '../../../examples/project.example.json';

type MetadataObject = {
  id: string;
  [key: string]: unknown;
};

export const metadataExampleGraph = {
  project,
  buildingElements,
  assets,
  evidence,
  assumptions,
  decisions,
  observationStreams,
};

const objectGroups: Array<[string, MetadataObject[]]> = [
  ['project', [project]],
  ['building elements', buildingElements],
  ['assets', assets],
  ['evidence', evidence],
  ['assumptions', assumptions],
  ['decisions', decisions],
  ['observation streams', observationStreams],
];

const referenceArrayKeys = new Set([
  'documents',
  'evidenceRefs',
  'assumptionRefs',
  'relatedObjectRefs',
  'evidenceIds',
  'assumptionIds',
  'linkedAssetIds',
]);

export function buildMetadataIndex() {
  const byId = new Map<string, MetadataObject>();
  for (const [, items] of objectGroups) {
    for (const item of items) byId.set(item.id, item);
  }
  return byId;
}

export function getMetadataObjectLabel(item: MetadataObject | undefined) {
  if (!item) return 'Missing object';
  return String(item.name ?? item.title ?? item.statement ?? item.id);
}

export function findBrokenMetadataReferences() {
  const byId = buildMetadataIndex();
  const broken: Array<{ sourceId: string; field: string; targetId: string }> = [];

  const checkObject = (item: MetadataObject) => {
    for (const [field, value] of Object.entries(item)) {
      if (field === 'parentId' && typeof value === 'string' && !byId.has(value)) {
        broken.push({ sourceId: item.id, field, targetId: value });
      }
      if (referenceArrayKeys.has(field) && Array.isArray(value)) {
        for (const targetId of value) {
          if (typeof targetId === 'string' && targetId.includes('://') && !byId.has(targetId)) {
            broken.push({ sourceId: item.id, field, targetId });
          }
        }
      }
    }
  };

  for (const [, items] of objectGroups) {
    for (const item of items) checkObject(item);
  }

  return broken;
}

export function getMetadataGraphStats() {
  return {
    projects: 1,
    buildingElements: buildingElements.length,
    assets: assets.length,
    evidence: evidence.length,
    assumptions: assumptions.length,
    decisions: decisions.length,
    observationStreams: observationStreams.length,
    brokenReferences: findBrokenMetadataReferences().length,
  };
}
