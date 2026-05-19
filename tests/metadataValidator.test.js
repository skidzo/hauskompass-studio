import { describe, expect, it } from 'vitest';
import {
  buildIdIndex,
  flattenValidationResult,
  validateAssetModelRules,
  validateBuildingAssessmentDataset,
  validateInternalReferences,
  validateMetadataDataset,
  validateNoAssetDataDuplication,
  validatePrivacy,
  validateSchemaShape,
} from '../src/validation/metadataValidator.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('metadata validator', () => {
  it('validates the committed fictional example dataset', () => {
    const result = validateMetadataDataset(rootDir);
    expect(flattenValidationResult(result)).toEqual([]);
  });

  it('validates the committed building assessment example package', () => {
    const result = validateBuildingAssessmentDataset(rootDir);
    expect(flattenValidationResult(result)).toEqual([]);
  });

  it('detects broken internal references', () => {
    const examples = {
      project: { id: 'project://example-renovation' },
      buildingElements: [
        {
          id: 'building://example-renovation/element/a',
          evidenceIds: ['evidence://example-renovation/missing'],
        },
      ],
      assets: [],
      evidence: [],
      assumptions: [],
      decisions: [],
      observationStreams: [],
    };

    expect(buildIdIndex(examples).has('building://example-renovation/element/a')).toBe(true);
    expect(validateInternalReferences(examples)).toContain(
      'examples.buildingElements[0].evidenceIds: broken reference evidence://example-renovation/missing',
    );
  });

  it('detects measurements that do not reference a known asset instance', () => {
    const errors = validateAssetModelRules({
      buildingElements: [],
      assetTypes: [],
      assetInstances: [],
      measurements: [
        {
          id: 'measurement://example-renovation/missing-sensor',
          assetInstanceId: 'asset://example-renovation/instance/missing-sensor',
        },
      ],
    });

    expect(errors).toContain(
      'measurements[0].assetInstanceId: broken asset instance reference asset://example-renovation/instance/missing-sensor',
    );
  });

  it('prevents full asset specifications from being duplicated into building elements', () => {
    const errors = validateNoAssetDataDuplication({
      buildingElements: [
        {
          id: 'building://example-renovation/element/roof',
          manufacturer: 'Should not be here',
          technicalData: {},
        },
      ],
    });

    expect(errors).toContain('buildingElements[0].manufacturer: asset/product/operation data belongs in AssetType or AssetInstance');
    expect(errors).toContain('buildingElements[0].technicalData: asset/product/operation data belongs in AssetType or AssetInstance');
  });

  it('detects assessment findings linked to missing requirements', () => {
    const errors = validateAssetModelRules({
      buildingElements: [{ id: 'building://example-renovation/element/roof' }],
      assetTypes: [],
      assetInstances: [],
      measurements: [],
      evidenceDocuments: [],
      requirements: [],
      assessmentFindings: [
        {
          id: 'finding://example-renovation/missing-requirement',
          relatedBuildingElementIds: ['building://example-renovation/element/roof'],
          relatedAssetInstanceIds: [],
          evidenceIds: [],
          requirementIds: ['requirement://example-renovation/missing'],
        },
      ],
    });

    expect(errors).toContain(
      'assessmentFindings[0].requirementIds: broken requirement reference requirement://example-renovation/missing',
    );
  });

  it('detects forbidden private-data patterns', () => {
    const examples = {
      project: {
        id: 'project://example-renovation',
        privateAddress: 'Example Street 1',
      },
    };

    const errors = validatePrivacy(examples);
    expect(errors.some((error) => error.includes('forbidden private-data key'))).toBe(true);
    expect(errors.some((error) => error.includes('address-like'))).toBe(true);
  });

  it('detects required schema fields', () => {
    const schemas = {
      project: {
        type: 'object',
        required: ['id', 'name'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
    };
    const examples = {
      project: {
        id: 'project://example-renovation',
      },
    };

    expect(validateSchemaShape(examples, schemas)).toContain('project: missing required field "name"');
  });
});
