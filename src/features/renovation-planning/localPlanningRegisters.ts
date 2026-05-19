import type {
  BuildingFact,
  MeasurementNeed,
  PlanningAssumption,
  PlanningDecision,
  RenovationPlanningData,
} from './renovationPlanningTypes';

export type LocalRegisterType = 'buildingFacts' | 'assumptions' | 'measurementNeeds' | 'renovationDecisions';
export type LocalRegisterRecord = BuildingFact | PlanningAssumption | MeasurementNeed | PlanningDecision;
export type LocalPlanningRegisters = Record<LocalRegisterType, LocalRegisterRecord[]>;

export const localRegisterLabels: Record<LocalRegisterType, string> = {
  buildingFacts: 'Building Facts',
  assumptions: 'Assumptions',
  measurementNeeds: 'Missing Measurements',
  renovationDecisions: 'Renovation Decisions',
};

const registerTypes = Object.keys(localRegisterLabels) as LocalRegisterType[];

const STORAGE_KEY = 'hauskompass.localPlanningRegisters.v1';

const emptyRegisters: LocalPlanningRegisters = {
  buildingFacts: [],
  assumptions: [],
  measurementNeeds: [],
  renovationDecisions: [],
};

export function createRegisterTemplate(type: LocalRegisterType): LocalRegisterRecord {
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
  if (type === 'buildingFacts') {
    return {
      id: `local-fact-${suffix}`,
      label: 'New local fact',
      value: 'unknown',
      unit: '',
      source: 'local site note',
      confidence: 'unknown',
      last_updated: new Date().toISOString().slice(0, 10),
      evidence_links: [],
    };
  }
  if (type === 'assumptions') {
    return {
      id: `local-assumption-${suffix}`,
      statement: 'New local assumption',
      why_it_matters: 'Explain why this affects renovation decisions.',
      confidence: 'unknown',
      affected_decisions: [],
      required_verification: 'Describe how to verify this.',
      status: 'open',
    };
  }
  if (type === 'measurementNeeds') {
    return {
      id: `local-need-${suffix}`,
      description: 'New measurement need',
      location_or_component: 'Location or component',
      reason: 'Why this is needed',
      priority: 'medium',
      suggested_method: 'Suggested method',
      blocks_decisions: [],
    };
  }
  return {
    id: `local-decision-${suffix}`,
    decision_title: 'New renovation decision',
    current_status: 'not_started',
    options: [],
    dependencies: [],
    risks: [],
    evidence_links: [],
    next_action: 'Define next action.',
  };
}

export function parseLocalRegisters(raw: string | null): LocalPlanningRegisters {
  if (!raw) return { ...emptyRegisters };
  try {
    const parsed = JSON.parse(raw) as Partial<LocalPlanningRegisters>;
    return {
      buildingFacts: Array.isArray(parsed.buildingFacts) ? parsed.buildingFacts : [],
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      measurementNeeds: Array.isArray(parsed.measurementNeeds) ? parsed.measurementNeeds : [],
      renovationDecisions: Array.isArray(parsed.renovationDecisions) ? parsed.renovationDecisions : [],
    };
  } catch {
    return { ...emptyRegisters };
  }
}

export function validateLocalRegisterRecord(type: LocalRegisterType, value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['record must be an object'];
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length < 3) errors.push('id is required');

  const requiredFields: Record<LocalRegisterType, string[]> = {
    buildingFacts: ['label', 'value', 'source', 'confidence', 'last_updated', 'evidence_links'],
    assumptions: ['statement', 'why_it_matters', 'confidence', 'affected_decisions', 'required_verification', 'status'],
    measurementNeeds: ['description', 'location_or_component', 'reason', 'priority', 'suggested_method', 'blocks_decisions'],
    renovationDecisions: ['decision_title', 'current_status', 'options', 'dependencies', 'risks', 'evidence_links', 'next_action'],
  };

  for (const field of requiredFields[type]) {
    if (!(field in record)) errors.push(`${field} is required`);
  }
  return errors;
}

export function parseRegisterDraft(type: LocalRegisterType, draft: string) {
  try {
    const parsed = JSON.parse(draft);
    const errors = validateLocalRegisterRecord(type, parsed);
    return { record: errors.length === 0 ? (parsed as LocalRegisterRecord) : null, errors };
  } catch (error) {
    return { record: null, errors: [`invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`] };
  }
}

export function parseLocalRegisterImport(raw: string): { registers: LocalPlanningRegisters | null; errors: string[] } {
  let registers: LocalPlanningRegisters;
  try {
    registers = parseLocalRegisters(JSON.stringify(JSON.parse(raw)));
  } catch (error) {
    return { registers: null, errors: [`invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`] };
  }
  const errors = registerTypes.flatMap((type) =>
    registers[type].flatMap((record, index) =>
      validateLocalRegisterRecord(type, record).map((error) => `${type}[${index}]: ${error}`),
    ),
  );
  return { registers: errors.length === 0 ? registers : null, errors };
}

export function upsertLocalRegisterRecord(
  registers: LocalPlanningRegisters,
  type: LocalRegisterType,
  record: LocalRegisterRecord,
): LocalPlanningRegisters {
  const next = { ...registers, [type]: [...registers[type]] };
  const index = next[type].findIndex((item) => item.id === record.id);
  if (index >= 0) next[type][index] = record;
  else next[type].push(record);
  return next;
}

export function deleteLocalRegisterRecord(registers: LocalPlanningRegisters, type: LocalRegisterType, id: string): LocalPlanningRegisters {
  return { ...registers, [type]: registers[type].filter((item) => item.id !== id) };
}

export function mergeLocalPlanningRegisters(
  current: LocalPlanningRegisters,
  imported: LocalPlanningRegisters,
): LocalPlanningRegisters {
  return registerTypes.reduce(
    (next, type) => {
      for (const record of imported[type]) {
        next = upsertLocalRegisterRecord(next, type, record);
      }
      return next;
    },
    { ...current },
  );
}

export function mergePlanningDataWithLocalRegisters(
  data: RenovationPlanningData,
  registers: LocalPlanningRegisters,
): RenovationPlanningData {
  return {
    ...data,
    buildingFacts: [...data.buildingFacts, ...(registers.buildingFacts as BuildingFact[])],
    assumptions: [...data.assumptions, ...(registers.assumptions as PlanningAssumption[])],
    measurementNeeds: [...data.measurementNeeds, ...(registers.measurementNeeds as MeasurementNeed[])],
    renovationDecisions: [...data.renovationDecisions, ...(registers.renovationDecisions as PlanningDecision[])],
  };
}

export function loadLocalPlanningRegisters(): LocalPlanningRegisters {
  if (typeof window === 'undefined') return { ...emptyRegisters };
  return parseLocalRegisters(window.localStorage.getItem(STORAGE_KEY));
}

export function saveLocalPlanningRegisters(registers: LocalPlanningRegisters) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registers, null, 2));
}
