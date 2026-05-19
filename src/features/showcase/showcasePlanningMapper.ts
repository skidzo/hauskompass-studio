import {
  buildAgenticReasoningSnapshot,
  formatFactValue,
  getHighPriorityMeasurementNeeds,
  getOpenAssumptions,
  renovationPlanningData,
} from '@/features/renovation-planning/renovationPlanningSelectors';
import type {
  BuildingFact,
  MeasurementNeed,
  PlanningAssumption,
  PlanningDecision,
  RenovationPlanningData,
} from '@/features/renovation-planning/renovationPlanningTypes';
import type {
  ShowcaseBadge,
  ShowcaseBadgeTone,
  ShowcaseDecision,
  ShowcaseMetric,
  ShowcaseReasoningLine,
  ShowcaseRegisterItem,
} from './showcaseData';

function factTone(confidence: BuildingFact['confidence']): ShowcaseBadgeTone {
  if (confidence === 'measured' || confidence === 'documented') return 'fact';
  if (confidence === 'generated') return 'generated';
  return 'assumption';
}

function priorityTone(priority: MeasurementNeed['priority']): ShowcaseBadgeTone {
  return priority === 'critical' || priority === 'high' ? 'check' : 'assumption';
}

function decisionTone(status: PlanningDecision['current_status']): ShowcaseBadgeTone {
  if (status === 'blocked') return 'blocked';
  if (status === 'under_review' || status === 'deferred') return 'generated';
  if (status === 'ready_for_expert') return 'expert';
  return 'check';
}

function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizeAssumption(assumption: PlanningAssumption): ShowcaseRegisterItem {
  return {
    title: assumption.statement.replace(/\.$/, ''),
    text: assumption.why_it_matters,
    badge: { label: labelize(assumption.status), tone: 'assumption' },
  };
}

function summarizeNeed(need: MeasurementNeed): ShowcaseRegisterItem {
  return {
    title: need.description.replace(/\.$/, ''),
    text: need.suggested_method,
    badge: { label: labelize(need.priority), tone: priorityTone(need.priority) },
  };
}

export function buildShowcaseMetrics(data: RenovationPlanningData = renovationPlanningData): ShowcaseMetric[] {
  const preferredFactIds = [
    'fact-confirmed-hull-parts',
    'fact-part1-main-length',
    'fact-storey-height-seed',
    'fact-keller-size',
    'fact-metadata-foundation',
  ];

  return preferredFactIds
    .map((id) => data.buildingFacts.find((fact) => fact.id === id))
    .filter((fact): fact is BuildingFact => Boolean(fact))
    .map((fact) => ({
      label: fact.label,
      value: formatFactValue(fact),
      note: fact.source,
      badge: { label: labelize(fact.confidence), tone: factTone(fact.confidence) },
    }));
}

export function buildShowcaseRegisterColumns(data: RenovationPlanningData = renovationPlanningData) {
  const facts = data.buildingFacts.slice(0, 3).map<ShowcaseRegisterItem>((fact) => ({
    title: fact.label,
    text: `${formatFactValue(fact)}. Source: ${fact.source}.`,
    badge: { label: labelize(fact.confidence), tone: factTone(fact.confidence) },
  }));

  return [
    { title: 'Known facts', items: facts },
    { title: 'Open assumptions', items: getOpenAssumptions(data).slice(0, 3).map(summarizeAssumption) },
    { title: 'Needed site checks', items: getHighPriorityMeasurementNeeds(data).slice(0, 3).map(summarizeNeed) },
  ];
}

export function buildShowcaseDecisions(data: RenovationPlanningData = renovationPlanningData): ShowcaseDecision[] {
  return data.renovationDecisions.slice(0, 4).map((decision) => {
    const linkedRisk = data.risks.find((risk) => decision.risks.includes(risk.id));
    const linkedNeeds = data.measurementNeeds.filter((need) => need.blocks_decisions.includes(decision.id));
    const linkedAssumptions = data.assumptions.filter((assumption) => assumption.affected_decisions.includes(decision.id));

    return {
      title: decision.decision_title,
      status: { label: labelize(decision.current_status), tone: decisionTone(decision.current_status) },
      dependsOn: [...linkedNeeds.map((need) => need.description), ...linkedAssumptions.map((item) => item.statement)]
        .slice(0, 2)
        .join(' '),
      uncertainty: linkedRisk?.description ?? 'Decision still depends on incomplete evidence.',
      expertCheck: linkedRisk?.mitigation ?? 'Expert validation required before implementation.',
      nextStep: decision.next_action,
    };
  });
}

export function buildShowcaseReasoningLines(data: RenovationPlanningData = renovationPlanningData): ShowcaseReasoningLine[] {
  const snapshot = buildAgenticReasoningSnapshot(data);
  return [
    { heading: 'Facts', text: snapshot.facts[0] ?? 'No facts registered yet.' },
    { heading: 'Assumptions', text: snapshot.assumptions[0] ?? 'No open assumptions registered yet.' },
    { heading: 'Risks', text: snapshot.risks[0] ?? 'No high-impact risks registered yet.' },
    { heading: 'Missing information', text: snapshot.missingInformation[0] ?? 'No high-priority measurement needs registered yet.' },
    { heading: 'Suggested next actions', text: snapshot.suggestedNextActions[0] ?? 'Update the project registers after the next site visit.' },
  ];
}

export function buildShowcasePlanningModel(data: RenovationPlanningData = renovationPlanningData): {
  baselineMetrics: ShowcaseMetric[];
  registerColumns: Array<{ title: string; items: ShowcaseRegisterItem[] }>;
  showcaseDecisions: ShowcaseDecision[];
  reasoningLines: ShowcaseReasoningLine[];
  sourceBadge: ShowcaseBadge;
} {
  return {
    baselineMetrics: buildShowcaseMetrics(data),
    registerColumns: buildShowcaseRegisterColumns(data),
    showcaseDecisions: buildShowcaseDecisions(data),
    reasoningLines: buildShowcaseReasoningLines(data),
    sourceBadge: { label: 'Mapped from planning seed', tone: 'fact' },
  };
}
