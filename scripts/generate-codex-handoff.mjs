#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(rootDir, 'src/features/renovation-planning/renovationPlanningSeed.json');
const outputPath = path.join(rootDir, 'docs/CODEX_HANDOFF.md');
const statePath = path.join(rootDir, 'docs/CODEX_HANDOFF_STATE.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

function gitStatusSummary() {
  try {
    const lines = execFileSync('git', ['status', '--short'], { cwd: rootDir, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    const modified = lines.filter((line) => !line.startsWith('??')).length;
    const untracked = lines.filter((line) => line.startsWith('??')).length;
    return lines.length === 0 ? 'clean working tree' : `${modified} modified/staged entries, ${untracked} untracked entries`;
  } catch {
    return 'git status unavailable';
  }
}

function list(items, render) {
  return items.map((item) => `- ${render(item)}`).join('\n');
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function currentModelState() {
  return {
    generatedAt: new Date().toISOString(),
    seedHash: stableHash(seed),
    counts: {
      artifacts: seed.artifacts.length,
      facts: seed.buildingFacts.length,
      assumptions: seed.assumptions.length,
      measurementNeeds: seed.measurementNeeds.length,
      risks: seed.risks.length,
      decisions: seed.renovationDecisions.length,
      evidenceItems: seed.evidenceItems.length,
    },
    ids: {
      facts: seed.buildingFacts.map((item) => item.id).sort(),
      assumptions: seed.assumptions.map((item) => item.id).sort(),
      measurementNeeds: seed.measurementNeeds.map((item) => item.id).sort(),
      risks: seed.risks.map((item) => item.id).sort(),
      decisions: seed.renovationDecisions.map((item) => item.id).sort(),
      evidenceItems: seed.evidenceItems.map((item) => item.id).sort(),
    },
  };
}

function readPreviousState() {
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

function idDiff(previousIds = [], currentIds = []) {
  return {
    added: currentIds.filter((id) => !previousIds.includes(id)),
    removed: previousIds.filter((id) => !currentIds.includes(id)),
  };
}

function stateDiff(previous, current) {
  if (!previous) return ['No previous handoff state found; this run establishes the baseline snapshot.'];
  if (previous.seedHash === current.seedHash) return ['No planning seed changes since the previous handoff snapshot.'];
  const lines = [`Planning seed changed: ${previous.seedHash} -> ${current.seedHash}`];
  for (const key of Object.keys(current.counts)) {
    const before = previous.counts?.[key] ?? 0;
    const after = current.counts[key];
    if (before !== after) lines.push(`${key}: ${before} -> ${after}`);
  }
  for (const key of Object.keys(current.ids)) {
    const diff = idDiff(previous.ids?.[key] ?? [], current.ids[key]);
    if (diff.added.length > 0) lines.push(`${key} added: ${diff.added.join(', ')}`);
    if (diff.removed.length > 0) lines.push(`${key} removed: ${diff.removed.join(', ')}`);
  }
  return lines;
}

const previousState = readPreviousState();
const currentState = currentModelState();
const diffLines = stateDiff(previousState, currentState);

const handoff = `# Codex Handoff

Generated: ${new Date().toISOString()}

## Repository Status

${gitStatusSummary()}

## Model State Diff

${list(diffLines, (item) => item)}

## App Capabilities

- Local-first Vite/React renovation planning app.
- Site, Building, Assessment & Reuse, Data and Planning sections.
- LoD2/terrain/IFC-oriented viewers and generated Part 1 planning sheets.
- Metadata validation for schemas, references, privacy and modeling boundaries.
- Rule-based agentic reasoning panel that separates facts, assumptions, risks, missing information and next actions.

## Data Artifacts

${list(seed.artifacts, (item) => `${item.label} (${item.kind}, ${item.status}) -> \`${item.path}\``)}

## Current Known Facts

${list(seed.buildingFacts, (item) => `${item.label}: ${item.value} ${item.unit} [${item.confidence}]`)}

## Assumptions

${list(seed.assumptions, (item) => `${item.statement} Status: ${item.status}. Verification: ${item.required_verification}`)}

## Missing Measurements

${list(seed.measurementNeeds, (item) => `${item.priority}: ${item.description}. Method: ${item.suggested_method}`)}

## Risks

${list(seed.risks, (item) => `${item.category}/${item.impact}: ${item.description}. Mitigation: ${item.mitigation}`)}

## Renovation Decisions

${list(seed.renovationDecisions, (item) => `${item.current_status}: ${item.decision_title}. Next: ${item.next_action}`)}

## Next Implementation Tasks

${list(seed.nextImplementationTasks, (item) => item)}

## Guardrails For Future Codex Work

- Do not treat generated dimensions as measured as-built facts.
- Keep private address data, exact coordinates, photos and scans out of commits unless explicitly anonymized and approved.
- Update \`docs/CURRENT_STATE.md\` and \`CHANGELOG.md\` after meaningful changes.
- Preserve existing generated artifacts unless there is a clear technical reason to replace them.
- Keep BIM/IFC/BCF/IDS/AAS support standards-informed but lightweight until real exchange requirements exist.
`;

fs.writeFileSync(outputPath, handoff);
fs.writeFileSync(statePath, JSON.stringify(currentState, null, 2));
console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
console.log(`Wrote ${path.relative(rootDir, statePath)}`);
