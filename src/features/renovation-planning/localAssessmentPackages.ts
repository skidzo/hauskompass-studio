import {
  mergeLocalPlanningRegisters,
  parseLocalRegisters,
  validateLocalRegisterRecord,
  type LocalPlanningRegisters,
  type LocalRegisterType,
} from './localPlanningRegisters';
import type { Confidence } from './renovationPlanningTypes';

export const localAssessmentPackageVersion = '1';

export type AssessmentSubjectKind = 'single_building' | 'ensemble' | 'campus' | 'pavilion_group' | 'site' | 'other';

export type LocalAssessmentSource = {
  id: string;
  title: string;
  url?: string;
  accessed?: string;
  source_type?: string;
};

export type LocalAssessmentFact = {
  id: string;
  label: string;
  value: string;
  confidence: Confidence;
  source_ids: string[];
};

export type LocalAssessmentOpportunity = {
  id: string;
  label: string;
  current_capability: string;
  gap: string;
  next_step: string;
};

export type LocalAssessmentPackage = {
  packageVersion: typeof localAssessmentPackageVersion;
  packageId: string;
  createdAt: string;
  privacy: {
    classification: string;
    storageNote: string;
    commitPolicy: string;
  };
  subject: {
    label: string;
    kind: AssessmentSubjectKind;
    description?: string;
    assessmentImplication?: string;
  };
  planningRegisters: Partial<LocalPlanningRegisters>;
  publicFacts?: LocalAssessmentFact[];
  opportunities?: LocalAssessmentOpportunity[];
  highPriorityUnknowns?: string[];
  sources?: LocalAssessmentSource[];
  notes?: {
    currentSoftwareCanCapture?: string[];
    mainSoftwareGaps?: string[];
    immediateNextSteps?: string[];
  };
};

export type LocalAssessmentPackageImport = {
  package: LocalAssessmentPackage;
  registers: LocalPlanningRegisters;
  warnings: string[];
};

const registerTypes: LocalRegisterType[] = ['buildingFacts', 'assumptions', 'measurementNeeds', 'renovationDecisions'];
const privateLocationKeys = new Set([
  'address',
  'latitude',
  'longitude',
  'lat',
  'lon',
  'coordinates',
  'coordinate',
  'bounding_box',
  'bbox',
  'parcel',
  'flurkarte',
  'utm',
  'epsg',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function findPrivateLocationKeys(value: unknown, path = '$'): string[] {
  if (!isRecord(value) && !Array.isArray(value)) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findPrivateLocationKeys(item, `${path}[${index}]`));
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const normalizedKey = key.toLowerCase();
    const current = privateLocationKeys.has(normalizedKey) ? [`${path}.${key}`] : [];
    return [...current, ...findPrivateLocationKeys(child, `${path}.${key}`)];
  });
}

function validateStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return [`${path} must be an array`];
  return value.flatMap((item, index) => (typeof item === 'string' ? [] : [`${path}[${index}] must be a string`]));
}

function validateOptionalFactArray(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ['publicFacts must be an array'];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [`publicFacts[${index}] must be an object`];
    const errors: string[] = [];
    for (const field of ['id', 'label', 'value', 'confidence']) {
      if (typeof item[field] !== 'string') errors.push(`publicFacts[${index}].${field} must be a string`);
    }
    errors.push(...validateStringArray(item.source_ids, `publicFacts[${index}].source_ids`));
    return errors;
  });
}

function validateOptionalSources(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ['sources must be an array'];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [`sources[${index}] must be an object`];
    const errors: string[] = [];
    if (typeof item.id !== 'string') errors.push(`sources[${index}].id must be a string`);
    if (typeof item.title !== 'string') errors.push(`sources[${index}].title must be a string`);
    return errors;
  });
}

export function validateLocalAssessmentPackage(value: unknown): string[] {
  if (!isRecord(value)) return ['package must be a JSON object'];
  const errors: string[] = [];

  if (value.packageVersion !== localAssessmentPackageVersion) errors.push(`packageVersion must be "${localAssessmentPackageVersion}"`);
  if (typeof value.packageId !== 'string' || value.packageId.length < 3) errors.push('packageId is required');
  if (typeof value.createdAt !== 'string') errors.push('createdAt is required');

  if (!isRecord(value.privacy)) {
    errors.push('privacy is required');
  } else {
    for (const field of ['classification', 'storageNote', 'commitPolicy']) {
      if (typeof value.privacy[field] !== 'string') errors.push(`privacy.${field} is required`);
    }
  }

  if (!isRecord(value.subject)) {
    errors.push('subject is required');
  } else {
    if (typeof value.subject.label !== 'string') errors.push('subject.label is required');
    if (typeof value.subject.kind !== 'string') errors.push('subject.kind is required');
  }

  if (!isRecord(value.planningRegisters)) {
    errors.push('planningRegisters is required');
  } else {
    const registers = parseLocalRegisters(JSON.stringify(value.planningRegisters));
    for (const type of registerTypes) {
      errors.push(
        ...registers[type].flatMap((record, index) =>
          validateLocalRegisterRecord(type, record).map((error) => `planningRegisters.${type}[${index}]: ${error}`),
        ),
      );
    }
  }

  errors.push(...validateOptionalFactArray(value.publicFacts));
  errors.push(...validateOptionalSources(value.sources));
  if (value.highPriorityUnknowns !== undefined) errors.push(...validateStringArray(value.highPriorityUnknowns, 'highPriorityUnknowns'));

  return errors;
}

export function parseLocalAssessmentPackage(raw: string): { importResult: LocalAssessmentPackageImport | null; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { importResult: null, errors: [`invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`] };
  }

  const errors = validateLocalAssessmentPackage(parsed);
  if (errors.length > 0 || !isRecord(parsed)) return { importResult: null, errors };

  const packageValue = parsed as LocalAssessmentPackage;
  const registers = parseLocalRegisters(JSON.stringify(packageValue.planningRegisters));
  const privateLocationPaths = findPrivateLocationKeys(parsed);
  const warnings = privateLocationPaths.length > 0
    ? [`Package contains exact-location shaped fields: ${privateLocationPaths.slice(0, 8).join(', ')}. Keep this file local/private.`]
    : [];

  return {
    importResult: {
      package: packageValue,
      registers,
      warnings,
    },
    errors: [],
  };
}

export function mergeLocalAssessmentPackageRegisters(
  current: LocalPlanningRegisters,
  imported: LocalPlanningRegisters,
): LocalPlanningRegisters {
  return mergeLocalPlanningRegisters(current, imported);
}

export function summarizeLocalAssessmentPackage(importResult: LocalAssessmentPackageImport) {
  const { package: packageValue, registers } = importResult;
  const registerCount = registerTypes.reduce((sum, type) => sum + registers[type].length, 0);
  const publicFactCount = packageValue.publicFacts?.length ?? 0;
  const sourceCount = packageValue.sources?.length ?? 0;
  return {
    title: packageValue.subject.label,
    kind: packageValue.subject.kind,
    packageId: packageValue.packageId,
    createdAt: packageValue.createdAt,
    privacy: packageValue.privacy.classification,
    registerCount,
    publicFactCount,
    sourceCount,
    unknownCount: packageValue.highPriorityUnknowns?.length ?? 0,
    implication: asString(packageValue.subject.assessmentImplication),
  };
}

