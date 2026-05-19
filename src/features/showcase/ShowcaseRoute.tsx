import { loadLocalPlanningRegisters, mergePlanningDataWithLocalRegisters } from '@/features/renovation-planning/localPlanningRegisters';
import { renovationPlanningData } from '@/features/renovation-planning/renovationPlanningSelectors';
import { useEffect, useState } from 'react';
import {
  introBullets,
  positioningBadges,
  showcasePages,
  workflowSteps,
  type ShowcaseBadge,
} from './showcaseData';
import { buildShowcasePlanningModel } from './showcasePlanningMapper';

function Badge({ badge }: { badge: ShowcaseBadge }) {
  return <span className={`showcase-badge showcase-badge-${badge.tone}`}>{badge.label}</span>;
}

function PageHeader({ index }: { index: number }) {
  const page = showcasePages[index];

  return (
    <header className="showcase-header">
      <div>
        <p className="showcase-eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
      </div>
      <span className="showcase-page-number">Page {index + 1} / 5</span>
    </header>
  );
}

function PageFooter({ index, note }: { index: number; note: string }) {
  return (
    <footer className="showcase-footer">
      <strong>Core message: {showcasePages[index].coreMessage}</strong>
      <span>{note}</span>
    </footer>
  );
}

function SanitizedBuildingDiagram() {
  return (
    <svg viewBox="0 0 760 410" role="img" aria-label="Sanitized building hull and terrain diagram">
      <defs>
        <linearGradient id="showcase-roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f8f83" />
          <stop offset="1" stopColor="#365e54" />
        </linearGradient>
      </defs>
      <path d="M20 330 C140 305 250 330 360 307 C480 282 580 298 735 260" fill="none" stroke="#8a7358" strokeLinecap="round" strokeWidth="7" />
      <path d="M100 238 L255 155 L445 238 Z" fill="url(#showcase-roof)" stroke="#284a43" strokeWidth="4" />
      <rect x="120" y="238" width="300" height="86" rx="4" fill="#fffdf8" stroke="#4d6f66" strokeWidth="4" />
      <path d="M450 248 L565 185 L675 248 Z" fill="#86a997" stroke="#4d6f66" strokeWidth="4" />
      <rect x="462" y="248" width="190" height="62" rx="4" fill="#fffdf8" stroke="#4d6f66" strokeWidth="4" />
      <rect x="132" y="260" width="42" height="38" rx="3" fill="#dcebf2" stroke="#315f7d" strokeWidth="3" />
      <rect x="196" y="260" width="42" height="38" rx="3" fill="#dcebf2" stroke="#315f7d" strokeWidth="3" />
      <rect x="306" y="260" width="64" height="38" rx="3" fill="#f3e1c6" stroke="#a26522" strokeWidth="3" />
      <line x1="105" y1="353" x2="421" y2="353" stroke="#315f7d" strokeWidth="3" />
      <text x="196" y="378" fill="#315f7d" fontSize="24" fontWeight="800">Part 1 axis: generated</text>
      <line x1="452" y1="333" x2="655" y2="333" stroke="#315f7d" strokeWidth="3" />
      <text x="486" y="360" fill="#315f7d" fontSize="24" fontWeight="800">Part 2 context</text>
      <text x="33" y="54" fill="#3f6f61" fontSize="22" fontWeight="900">Estimated terrain line</text>
      <text x="33" y="88" fill="#a26522" fontSize="22" fontWeight="900">Generated hull baseline</text>
    </svg>
  );
}

export function ShowcaseRoute() {
  const [showcaseModel, setShowcaseModel] = useState(() => buildShowcasePlanningModel());

  useEffect(() => {
    const includeLocalRegisters = new URLSearchParams(window.location.search).get('includeLocalRegisters') === '1';
    if (!includeLocalRegisters) return;
    const localRegisters = loadLocalPlanningRegisters();
    setShowcaseModel(buildShowcasePlanningModel(mergePlanningDataWithLocalRegisters(renovationPlanningData, localRegisters)));
  }, []);

  return (
    <div className="showcase-document">
      <section className="showcase-page">
        <PageHeader index={0} />
        <main className="showcase-hero showcase-panel">
          <div>
            <p className="showcase-statement">
              This is not a finished BIM model or complete digital twin. It is a local-first planning workflow that organizes evidence, uncertainty and decisions around an existing building.
            </p>
            <div className="showcase-badges">
              {positioningBadges.map((badge) => <Badge badge={badge} key={badge.label} />)}
              <Badge badge={showcaseModel.sourceBadge} />
            </div>
            <div className="showcase-bullets">
              {introBullets.map((bullet) => (
                <div className="showcase-bullet" key={bullet.text}>
                  <span />
                  <p>{bullet.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="showcase-workflow">
            {workflowSteps.map((step, index) => (
              <article className="showcase-workflow-step" data-step={index + 1} key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </article>
            ))}
          </div>
        </main>
        <PageFooter index={0} note="Sanitized prototype extract" />
      </section>

      <section className="showcase-page">
        <PageHeader index={1} />
        <main className="showcase-grid-2">
          <div className="showcase-panel">
            <h2>Sanitized building context view</h2>
            <p className="showcase-muted">Recreated from current app concepts. No address, coordinates, land-record identifiers, private photos or exact property identifiers are included.</p>
            <div className="showcase-model-visual">
              <SanitizedBuildingDiagram />
            </div>
            <div className="showcase-badges">
              <Badge badge={{ label: 'Generated model output', tone: 'generated' }} />
              <Badge badge={{ label: 'Needs site control', tone: 'check' }} />
              <Badge badge={{ label: 'Not construction-ready', tone: 'expert' }} />
            </div>
          </div>
          <div className="showcase-panel showcase-metric-list">
            {showcaseModel.baselineMetrics.map((metric) => (
              <article className="showcase-metric" key={metric.label}>
                <div>
                  <strong>{metric.label}</strong>
                  <span>{metric.note}</span>
                </div>
                <div className="showcase-value">
                  {metric.value}
                  <Badge badge={metric.badge} />
                </div>
              </article>
            ))}
          </div>
        </main>
        <PageFooter index={1} note="Private location data omitted" />
      </section>

      <section className="showcase-page">
        <PageHeader index={2} />
        <main className="showcase-grid-3">
          {showcaseModel.registerColumns.map((column) => (
            <div className="showcase-panel showcase-column" key={column.title}>
              <h2>{column.title}</h2>
              {column.items.map((item) => (
                <article className="showcase-item" key={item.title}>
                  <Badge badge={item.badge} />
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          ))}
        </main>
        <PageFooter index={2} note="Evidence references sanitized" />
      </section>

      <section className="showcase-page">
        <PageHeader index={3} />
        <main className="showcase-decision-grid">
          {showcaseModel.showcaseDecisions.map((decision) => (
            <article className="showcase-card showcase-decision-card" key={decision.title}>
              <div>
                <Badge badge={decision.status} />
                <h2>{decision.title}</h2>
              </div>
              <div className="showcase-decision-meta">
                <p><span>Abhängig von</span>{decision.dependsOn}</p>
                <p><span>Wichtigste Unbekannte</span>{decision.uncertainty}</p>
                <p><span>Expertenprüfung</span>{decision.expertCheck}</p>
                <p><span>Nächster Schritt</span>{decision.nextStep}</p>
              </div>
            </article>
          ))}
        </main>
        <PageFooter index={3} note="No automated decisions claimed" />
      </section>

      <section className="showcase-page">
        <PageHeader index={4} />
        <main className="showcase-reasoning-grid">
          <div className="showcase-panel">
            <h2>Rule-grounded reasoning output</h2>
            <div className="showcase-reasoning-box">
              {showcaseModel.reasoningLines.map((line) => (
                <article className="showcase-reason-line" key={line.heading}>
                  <strong>{line.heading}:</strong>
                  <p>{line.text}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="showcase-side-stack">
            <div className="showcase-screen-frame">
              <div className="showcase-screen-top"><span /><span /><span /></div>
              <div className="showcase-screen-body">
                <div className="showcase-screen-nav">Overview<br />Facts<br />Assumptions<br />Decisions<br />Handoff</div>
                <div className="showcase-screen-content">
                  <div />
                  <div />
                  <div />
                  <div className="showcase-badges">
                    <Badge badge={{ label: 'Fact', tone: 'fact' }} />
                    <Badge badge={{ label: 'Assumption', tone: 'assumption' }} />
                    <Badge badge={{ label: 'Risk', tone: 'risk' }} />
                    <Badge badge={{ label: 'Next action', tone: 'check' }} />
                  </div>
                </div>
              </div>
            </div>
            <article className="showcase-card"><span>Next useful site visit</span><p>S01-S20 photo blocks with multiple photos per station and laser distance to a clearly described reference point.</p></article>
            <article className="showcase-card"><span>Next expert conversation</span><p>Roof build-up, moisture strategy, structural plausibility and PV-ready renovation sequencing.</p></article>
            <article className="showcase-card"><span>Next implementation task</span><p>Import real site-visit evidence into local-only registers and diff it against the previous generated state.</p></article>
          </div>
        </main>
        <PageFooter index={4} note="Generated from typed app data" />
      </section>
    </div>
  );
}
