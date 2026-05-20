#!/usr/bin/env node
/**
 * inspect-workshop-seed.mjs — Developer inspection utility for workshop seed data.
 *
 * Usage (from project root):
 *   node tools/dev/inspect-workshop-seed.mjs
 *   node tools/dev/inspect-workshop-seed.mjs --json        # print full bundle as JSON
 *   node tools/dev/inspect-workshop-seed.mjs --zone z-parkdeck-1
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const EXAMPLES = resolve(ROOT, 'examples', 'workshop');

function load(file) {
    const path = resolve(EXAMPLES, file);
    return JSON.parse(readFileSync(path, 'utf-8'));
}

// ── load all seed files ──────────────────────────────────────────────────────
const project = load('project.json');
const site = load('site.json');
const zones = load('zones.json');
const eventPhases = load('event_phases.json');
const claims = load('claims.json');
const questions = load('questions.json');
const observations = load('observations.json');
const workshopScenes = load('workshop_scenes.json');
const memories = load('memories.json');

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const zoneFilter = (() => {
    const idx = args.indexOf('--zone');
    return idx !== -1 ? args[idx + 1] : null;
})();

if (jsonMode) {
    console.log(JSON.stringify({
        project, site, zones, eventPhases,
        claims, questions, observations, workshopScenes, memories
    }, null, 2));
    process.exit(0);
}

// ── helpers ──────────────────────────────────────────────────────────────────
const COL = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
    red: '\x1b[31m', magenta: '\x1b[35m',
};

const c = (color, str) => `${COL[color]}${str}${COL.reset}`;
const h1 = (str) => console.log(`\n${c('bold', c('cyan', '═══ ' + str + ' ═══'))}`);
const h2 = (str) => console.log(`\n${c('bold', str)}`);
const row = (label, value) => console.log(`  ${c('dim', label.padEnd(24))} ${value}`);

// ── overview ─────────────────────────────────────────────────────────────────
h1('Workshop Seed Inspection');
row('Project', `${project.title}  [${project.id}]`);
row('Site', `${site.name}  [${site.id}]`);
row('Heritage Status', site.heritageStatus ?? '—');
row('Current Access', site.currentAccess);
row('Project Mode', project.projectMode);

h1('Zähler');
row('Zonen', zones.length);
row('Ereignisphasen', eventPhases.length);
row('Claims', claims.length);
row('Fragen', questions.length);
row('Beobachtungen', observations.length);
row('Workshop-Szenen', workshopScenes.length);
row('Memories', memories.length);

// ── zones ─────────────────────────────────────────────────────────────────────
h1('Zonen');
const filteredZones = zoneFilter
    ? zones.filter(z => z.id === zoneFilter)
    : zones;

for (const z of filteredZones.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))) {
    const prio = z.documentationPriority;
    const prioColor = prio === 'critical' ? 'red' : prio === 'high' ? 'yellow' : 'dim';
    console.log(`\n  ${c('bold', z.name)}  ${c('dim', z.id)}`);
    console.log(`    Prio: ${c(prioColor, prio.padEnd(8))}  Status: ${z.documentationStatus}`);
    console.log(`    Sensitivity: ${z.sensitivityLevel}  Publication: ${z.publicationStatus}`);
    if (z.description) {
        const desc = z.description.length > 100 ? z.description.slice(0, 97) + '…' : z.description;
        console.log(`    ${c('dim', desc)}`);
    }

    // linked observations
    const zoneObs = observations.filter(o => o.zoneId === z.id);
    if (zoneObs.length) {
        console.log(`    Observations (${zoneObs.length}):`);
        for (const o of zoneObs) {
            const text = o.text.length > 80 ? o.text.slice(0, 77) + '…' : o.text;
            console.log(`      ${c('dim', '●')} [${o.epistemic}/${o.confidence}] ${text}`);
        }
    }

    // linked questions
    const zoneQ = questions.filter(q => q.zoneId === z.id);
    if (zoneQ.length) {
        console.log(`    Fragen (${zoneQ.length}):`);
        for (const q of zoneQ) {
            const text = q.text.length > 80 ? q.text.slice(0, 77) + '…' : q.text;
            console.log(`      ${c('yellow', '?')} [${q.priority}/${q.status}] ${text}`);
        }
    }
}

// ── event phases ──────────────────────────────────────────────────────────────
h1('Ereignisphasen');
for (const e of [...eventPhases].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const years = [e.startYear, e.endYear].filter(Boolean).join('–');
    console.log(`  ${c('bold', e.title)}  ${c('dim', years ? '(' + years + ')' : '')}  [${e.phaseType}]`);
}

// ── claims ────────────────────────────────────────────────────────────────────
h1('Claims');
for (const cl of claims) {
    const text = cl.statement.length > 90 ? cl.statement.slice(0, 87) + '…' : cl.statement;
    const statusColor = cl.reviewStatus === 'confirmed' ? 'green' : cl.reviewStatus === 'rejected' ? 'red' : 'yellow';
    console.log(`  ${c(statusColor, cl.reviewStatus.padEnd(12))} [${cl.epistemic}/${cl.confidence}] ${text}`);
}

// ── questions ─────────────────────────────────────────────────────────────────
h1('Offene Fragen');
for (const q of questions) {
    const text = q.text.length > 90 ? q.text.slice(0, 87) + '…' : q.text;
    const statusColor = q.status === 'open' ? 'yellow' : q.status === 'answered' ? 'green' : 'dim';
    console.log(`  ${c(statusColor, q.status.padEnd(12))} [${q.priority}/${q.questionType}] ${text}`);
}

// ── memories ──────────────────────────────────────────────────────────────────
h1('Memories');
for (const m of memories) {
    const pubColor = m.publicationStatus === 'do_not_publish' ? 'red' :
        m.publicationStatus === 'publishable' ? 'green' : 'yellow';
    console.log(`\n  ${c('bold', m.title)}  ${c('dim', m.id)}`);
    console.log(`    Release: ${c(pubColor, m.releaseStatus)}  Citability: ${m.citability}`);
    console.log(`    Sensitivity: ${m.sensitivityLevel}  Publication: ${c(pubColor, m.publicationStatus)}`);
    if (m.zoneId) console.log(`    Zone: ${m.zoneId}`);
    const sum = m.summary.length > 100 ? m.summary.slice(0, 97) + '…' : m.summary;
    console.log(`    ${c('dim', sum)}`);
}

// ── workshop scenes ───────────────────────────────────────────────────────────
h1('Workshop-Szenen');
for (const s of workshopScenes.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))) {
    const pubColor = s.publicationStatus === 'publishable' ? 'green' :
        s.publicationStatus === 'do_not_publish' ? 'red' : 'yellow';
    console.log(`\n  ${c('bold', s.title)}  ${c('dim', s.id)}`);
    console.log(`    Export: ${s.exportStatus}  Visibility: ${s.visibility}  Publication: ${c(pubColor, s.publicationStatus)}`);
    console.log(`    ${c('cyan', s.guidingQuestion)}`);
    if (s.openQuestions?.length) {
        console.log(`    Offene Fragen (${s.openQuestions.length}):`);
        for (const q of s.openQuestions) {
            const qt = q.length > 80 ? q.slice(0, 77) + '…' : q;
            console.log(`      ${c('yellow', '?')} ${qt}`);
        }
    }
}

console.log('\n' + c('dim', '─── Ende ───') + '\n');
