import fs from 'node:fs';
import path from 'node:path';

const schemaFiles = {
  project: 'building-project.schema.json',
  buildingElements: 'building-element.schema.json',
  assets: 'asset.schema.json',
  evidence: 'evidence-item.schema.json',
  assumptions: 'assumption.schema.json',
  decisions: 'renovation-decision.schema.json',
  observationStreams: 'observation-stream.schema.json',
};

const exampleFiles = {
  project: 'project.example.json',
  buildingElements: 'building-elements.example.json',
  assets: 'assets.example.json',
  evidence: 'evidence.example.json',
  assumptions: 'assumptions.example.json',
  decisions: 'decisions.example.json',
  observationStreams: 'observation-streams.example.json',
};

const buildingAssessmentSchemaFiles = {
  buildingElements: 'building-element.schema.json',
  roomZones: 'room-zone.schema.json',
  assetTypes: 'asset-type.schema.json',
  assetInstances: 'asset-instance.schema.json',
  measurements: 'measurement.schema.json',
  evidenceDocuments: 'evidence-document.schema.json',
  requirements: 'requirement.schema.json',
  assessmentFindings: 'assessment-finding.schema.json',
  decisions: 'renovation-decision.schema.json',
};

const buildingAssessmentExampleFiles = {
  buildingElements: 'building-elements.example.json',
  roomZones: 'room-zones.example.json',
  assetTypes: 'asset-types.example.json',
  assetInstances: 'asset-instances.example.json',
  measurements: 'measurements.example.json',
  evidenceDocuments: 'evidence-documents.example.json',
  requirements: 'requirements.example.json',
  assessmentFindings: 'assessment-findings.example.json',
  decisions: 'decisions.example.json',
};

const privateKeyPattern = /(address|street|postcode|postalCode|latitude|longitude|easting|northing|cadastral|parcel)/i;
const privateStringPatterns = [
  { name: 'email', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { name: 'phone-like', pattern: /(?:\+?\d[\s().-]?){8,}/ },
  { name: 'address-like', pattern: /\b(street|strasse|straße|str\.|road|avenue|postcode|postal code)\b/i },
  { name: 'decimal-coordinate-like', pattern: /\b\d{1,3}\.\d{5,}\b/ },
];

const nonPrivateDateKeys = new Set([
  'createdAt',
  'updatedAt',
  'capturedAt',
  'timestamp',
  'sourceDate',
  'installationDate',
  'warrantyStart',
  'warrantyEnd',
]);

export function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadMetadataDataset(rootDir) {
  const examplesDir = path.join(rootDir, 'examples');
  const schemasDir = path.join(rootDir, 'schemas');
  return {
    schemas: Object.fromEntries(
      Object.entries(schemaFiles).map(([key, file]) => [key, loadJson(path.join(schemasDir, file))]),
    ),
    examples: Object.fromEntries(
      Object.entries(exampleFiles).map(([key, file]) => [key, loadJson(path.join(examplesDir, file))]),
    ),
  };
}

export function loadBuildingAssessmentDataset(rootDir) {
  const examplesDir = path.join(rootDir, 'examples', 'building-assessment');
  const schemasDir = path.join(rootDir, 'schemas');
  return {
    schemas: Object.fromEntries(
      Object.entries(buildingAssessmentSchemaFiles).map(([key, file]) => [key, loadJson(path.join(schemasDir, file))]),
    ),
    examples: Object.fromEntries(
      Object.entries(buildingAssessmentExampleFiles).map(([key, file]) => [key, loadJson(path.join(examplesDir, file))]),
    ),
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function validateValueAgainstSchema(value, schema, pointer, errors) {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${pointer}: expected object`);
      return;
    }
    for (const field of schema.required ?? []) {
      if (!(field in value)) errors.push(`${pointer}: missing required field "${field}"`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!schema.properties?.[key]) errors.push(`${pointer}: unexpected field "${key}"`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) validateValueAgainstSchema(value[key], childSchema, `${pointer}.${key}`, errors);
    }
    return;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${pointer}: expected array`);
      return;
    }
    value.forEach((item, index) => validateValueAgainstSchema(item, schema.items ?? {}, `${pointer}[${index}]`, errors));
    return;
  }

  if (schema.type && typeof value !== schema.type) {
    errors.push(`${pointer}: expected ${schema.type}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${pointer}: unsupported value "${value}"`);
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${pointer}: does not match pattern ${schema.pattern}`);
  }
  if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${pointer}: shorter than ${schema.minLength}`);
  }
  if (schema.format === 'date-time' && typeof value === 'string' && Number.isNaN(Date.parse(value))) {
    errors.push(`${pointer}: invalid date-time`);
  }
}

export function validateSchemaShape(examples, schemas) {
  const errors = [];
  for (const [key, schema] of Object.entries(schemas)) {
    if (key === 'project') {
      validateValueAgainstSchema(examples.project, schema, 'project', errors);
      continue;
    }
    asArray(examples[key]).forEach((item, index) => validateValueAgainstSchema(item, schema, `${key}[${index}]`, errors));
  }
  return errors;
}

export function buildIdIndex(examples) {
  const index = new Set();
  collectIds(examples, index);
  return index;
}

function collectIds(value, index) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectIds(item, index));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.id === 'string') index.add(value.id);
  for (const child of Object.values(value)) collectIds(child, index);
}

function shouldValidateReference(ref) {
  return (
    typeof ref === 'string' &&
    ref.includes('://') &&
    !ref.startsWith('geometry://') &&
    !ref.startsWith('source://')
  );
}

const referenceArrayKeys = new Set([
  'documents',
  'evidenceRefs',
  'assumptionRefs',
  'relatedObjectRefs',
  'linkedAssetIds',
  'evidenceIds',
  'assumptionIds',
  'documentationRefs',
  'buildingElementRefs',
  'measurementRefs',
  'relatedBuildingElementIds',
  'relatedAssetInstanceIds',
  'requirementIds',
  'decisionIds',
  'appliesTo',
]);

const referenceSingleKeys = new Set(['parentId', 'assetTypeId', 'assetInstanceId', 'locationRef']);

function validateReference(ref, idIndex, errors, pointer) {
  if (shouldValidateReference(ref) && !idIndex.has(ref)) {
    errors.push(`${pointer}: broken reference ${ref}`);
  }
}

function pushReferenceErrors(value, idIndex, errors, pointer = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => pushReferenceErrors(item, idIndex, errors, `${pointer}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}.${key}`;
    if (referenceSingleKeys.has(key)) {
      validateReference(child, idIndex, errors, childPointer);
    }
    if (referenceArrayKeys.has(key) && Array.isArray(child)) {
      child.forEach((ref) => validateReference(ref, idIndex, errors, childPointer));
    }
    pushReferenceErrors(child, idIndex, errors, childPointer);
  }
}

export function validateInternalReferences(examples) {
  const errors = [];
  pushReferenceErrors(examples, buildIdIndex(examples), errors, 'examples');
  return errors;
}

function scanPrivacy(value, errors, pointer = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, errors, `${pointer}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') {
      for (const { name, pattern } of privateStringPatterns) {
        if (pattern.test(value)) errors.push(`${pointer}: forbidden private data pattern (${name})`);
      }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}.${key}`;
    if (privateKeyPattern.test(key)) errors.push(`${childPointer}: forbidden private-data key`);
    if (nonPrivateDateKeys.has(key)) continue;
    scanPrivacy(child, errors, childPointer);
  }
}

export function validatePrivacy(examples) {
  const errors = [];
  scanPrivacy(examples, errors, 'examples');
  return errors;
}

const forbiddenBuildingElementAssetFields = [
  'assetType',
  'assetTypeId',
  'manufacturer',
  'model',
  'technicalData',
  'documentationRefs',
  'environmentalData',
  'serviceLife',
  'warrantyTemplate',
  'serialNumber',
  'installationDate',
  'warrantyStart',
  'warrantyEnd',
  'maintenanceEvents',
  'measurementRefs',
];

export function validateNoAssetDataDuplication(examples) {
  const errors = [];
  for (const [index, element] of asArray(examples.buildingElements ?? []).entries()) {
    for (const field of forbiddenBuildingElementAssetFields) {
      if (field in element) {
        errors.push(`buildingElements[${index}].${field}: asset/product/operation data belongs in AssetType or AssetInstance`);
      }
    }
  }
  return errors;
}

export function validateAssetModelRules(examples) {
  const errors = [];
  const assetTypeIds = new Set(asArray(examples.assetTypes ?? []).map((item) => item.id));
  const assetInstanceIds = new Set(asArray(examples.assetInstances ?? []).map((item) => item.id));
  const buildingElementIds = new Set(asArray(examples.buildingElements ?? []).map((item) => item.id));
  const evidenceIds = new Set(asArray(examples.evidenceDocuments ?? []).map((item) => item.id));
  const requirementIds = new Set(asArray(examples.requirements ?? []).map((item) => item.id));

  asArray(examples.assetInstances ?? []).forEach((asset, index) => {
    if (!asset.id) errors.push(`assetInstances[${index}].id: missing stable ID`);
    if (shouldValidateReference(asset.assetTypeId) && !assetTypeIds.has(asset.assetTypeId)) {
      errors.push(`assetInstances[${index}].assetTypeId: broken asset type reference ${asset.assetTypeId}`);
    }
  });

  asArray(examples.measurements ?? []).forEach((measurement, index) => {
    if (!assetInstanceIds.has(measurement.assetInstanceId)) {
      errors.push(`measurements[${index}].assetInstanceId: broken asset instance reference ${measurement.assetInstanceId}`);
    }
  });

  asArray(examples.buildingElements ?? []).forEach((element, index) => {
    for (const assetId of element.linkedAssetIds ?? []) {
      if (!assetInstanceIds.has(assetId)) {
        errors.push(`buildingElements[${index}].linkedAssetIds: broken asset instance reference ${assetId}`);
      }
    }
  });

  asArray(examples.assessmentFindings ?? []).forEach((finding, index) => {
    for (const elementId of finding.relatedBuildingElementIds ?? []) {
      if (!buildingElementIds.has(elementId)) {
        errors.push(`assessmentFindings[${index}].relatedBuildingElementIds: broken building element reference ${elementId}`);
      }
    }
    for (const assetId of finding.relatedAssetInstanceIds ?? []) {
      if (!assetInstanceIds.has(assetId)) {
        errors.push(`assessmentFindings[${index}].relatedAssetInstanceIds: broken asset instance reference ${assetId}`);
      }
    }
    for (const evidenceId of finding.evidenceIds ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(`assessmentFindings[${index}].evidenceIds: broken evidence reference ${evidenceId}`);
      }
    }
    for (const requirementId of finding.requirementIds ?? []) {
      if (!requirementIds.has(requirementId)) {
        errors.push(`assessmentFindings[${index}].requirementIds: broken requirement reference ${requirementId}`);
      }
    }
  });

  return errors;
}

export function validateBuildingAssessmentDataset(rootDir) {
  const { schemas, examples } = loadBuildingAssessmentDataset(rootDir);
  return {
    schemaErrors: validateSchemaShape(examples, schemas),
    referenceErrors: validateInternalReferences(examples),
    privacyErrors: validatePrivacy(examples),
    modelingErrors: [...validateAssetModelRules(examples), ...validateNoAssetDataDuplication(examples)],
  };
}

export function validateMetadataDataset(rootDir) {
  const legacy = loadMetadataDataset(rootDir);
  const buildingAssessment = validateBuildingAssessmentDataset(rootDir);
  return {
    schemaErrors: [
      ...validateSchemaShape(legacy.examples, legacy.schemas),
      ...buildingAssessment.schemaErrors.map((error) => `building-assessment.${error}`),
    ],
    referenceErrors: [
      ...validateInternalReferences(legacy.examples),
      ...buildingAssessment.referenceErrors.map((error) => `building-assessment.${error}`),
    ],
    privacyErrors: [
      ...validatePrivacy(legacy.examples),
      ...buildingAssessment.privacyErrors.map((error) => `building-assessment.${error}`),
    ],
    modelingErrors: buildingAssessment.modelingErrors.map((error) => `building-assessment.${error}`),
  };
}

export function flattenValidationResult(result) {
  return [
    ...(result.schemaErrors ?? []),
    ...(result.referenceErrors ?? []),
    ...(result.privacyErrors ?? []),
    ...(result.modelingErrors ?? []),
  ];
}
