import seed from './renovationPlanningSeed.json';
import type {
  AgenticReasoningSnapshot,
  BuildingFact,
  MeasurementNeed,
  PlanningAssumption,
  PlanningDecision,
  PlanningRisk,
  RenovationPlanningData,
} from './renovationPlanningTypes';

export const renovationPlanningData = seed as RenovationPlanningData;

const priorityRank: Record<MeasurementNeed['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function formatFactValue(fact: BuildingFact) {
  return `${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`;
}

export function getOpenAssumptions(data: RenovationPlanningData = renovationPlanningData): PlanningAssumption[] {
  return data.assumptions.filter((assumption) => assumption.status === 'open' || assumption.status === 'needs_site_check');
}

export function getHighPriorityMeasurementNeeds(data: RenovationPlanningData = renovationPlanningData): MeasurementNeed[] {
  return [...data.measurementNeeds]
    .filter((need) => need.priority === 'critical' || need.priority === 'high')
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

export function getBlockedDecisions(data: RenovationPlanningData = renovationPlanningData): PlanningDecision[] {
  return data.renovationDecisions.filter((decision) => decision.current_status === 'blocked');
}

export function getRelevantRisks(data: RenovationPlanningData = renovationPlanningData): PlanningRisk[] {
  return data.risks.filter((risk) => risk.impact === 'critical' || risk.impact === 'high');
}

export function validatePlanningData(data: RenovationPlanningData = renovationPlanningData) {
  const errors: string[] = [];
  const factIds = new Set<string>();
  for (const fact of data.buildingFacts) {
    if (factIds.has(fact.id)) errors.push(`duplicate BuildingFact id: ${fact.id}`);
    factIds.add(fact.id);
    if (fact.confidence === 'measured' && fact.evidence_links.length === 0) {
      errors.push(`measured fact ${fact.id} must have at least one evidence link`);
    }
  }

  const assumptionIds = new Set(data.assumptions.map((item) => item.id));
  const decisionIds = new Set(data.renovationDecisions.map((item) => item.id));
  const riskIds = new Set(data.risks.map((item) => item.id));

  for (const assumption of data.assumptions) {
    for (const decisionId of assumption.affected_decisions) {
      if (!decisionIds.has(decisionId)) errors.push(`assumption ${assumption.id} references missing decision ${decisionId}`);
    }
  }

  for (const need of data.measurementNeeds) {
    for (const decisionId of need.blocks_decisions) {
      if (!decisionIds.has(decisionId)) errors.push(`measurement need ${need.id} references missing decision ${decisionId}`);
    }
  }

  for (const decision of data.renovationDecisions) {
    for (const riskId of decision.risks) {
      if (!riskIds.has(riskId)) errors.push(`decision ${decision.id} references missing risk ${riskId}`);
    }
  }

  for (const risk of data.risks) {
    for (const assumptionId of risk.related_assumptions) {
      if (!assumptionIds.has(assumptionId)) errors.push(`risk ${risk.id} references missing assumption ${assumptionId}`);
    }
    for (const decisionId of risk.related_decisions) {
      if (!decisionIds.has(decisionId)) errors.push(`risk ${risk.id} references missing decision ${decisionId}`);
    }
  }

  return errors;
}

export function buildAgenticReasoningSnapshot(data: RenovationPlanningData = renovationPlanningData): AgenticReasoningSnapshot {
  const generatedOrEstimatedFacts = data.buildingFacts.filter(
    (fact) => fact.confidence === 'generated' || fact.confidence === 'estimated' || fact.confidence === 'unknown',
  );

  return {
    facts: data.buildingFacts
      .slice(0, 5)
      .map((fact) => `${fact.label}: ${formatFactValue(fact)} (${fact.confidence}, source: ${fact.source})`),
    assumptions: getOpenAssumptions(data)
      .slice(0, 5)
      .map((assumption) => `${assumption.statement} Verification: ${assumption.required_verification}`),
    risks: getRelevantRisks(data)
      .slice(0, 5)
      .map((risk) => `${risk.description} Mitigation: ${risk.mitigation}`),
    missingInformation: getHighPriorityMeasurementNeeds(data)
      .slice(0, 5)
      .map((need) => `${need.description} Method: ${need.suggested_method}`),
    suggestedNextActions: [
      ...getBlockedDecisions(data).map((decision) => decision.next_action),
      generatedOrEstimatedFacts.length > 0
        ? 'Treat generated/estimated dimensions as planning aids until the first laser-referenced site visit verifies them.'
        : 'Keep measured facts linked to evidence and update the model after expert review.',
    ].slice(0, 5),
  };
}
