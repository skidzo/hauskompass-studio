import type { ImportedProject, Lod2Candidate } from '@/features/project-store/types';
import { useState } from 'react';
import { LocalAssessmentPackagePanel } from './LocalAssessmentPackagePanel';
import { LocalRegistersPanel } from './LocalRegistersPanel';
import { RenovationPhotoPlacementPanel } from './RenovationPhotoPlacementPanel';
import { SiteVisitImportPanel } from './SiteVisitImportPanel';
import {
  buildAgenticReasoningSnapshot,
  formatFactValue,
  getBlockedDecisions,
  getHighPriorityMeasurementNeeds,
  getOpenAssumptions,
  getRelevantRisks,
  renovationPlanningData,
} from './renovationPlanningSelectors';
import type { BuildingFact } from './renovationPlanningTypes';

type PlanningTab = 'overview' | 'photos' | 'facts' | 'assumptions' | 'measurements' | 'decisions' | 'reasoning' | 'package' | 'local' | 'siteVisit';

const DEMO_TABS: Array<{ id: PlanningTab; label: string }> = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'photos', label: 'Fotos' },
  { id: 'facts', label: 'Fakten' },
  { id: 'assumptions', label: 'Annahmen' },
  { id: 'measurements', label: 'Messungen' },
  { id: 'decisions', label: 'Entscheidungen' },
  { id: 'reasoning', label: 'KI-Bewertung' },
  { id: 'package', label: 'Paket' },
  { id: 'local', label: 'Register' },
  { id: 'siteVisit', label: 'Begehung' },
];

const PROJECT_TABS: Array<{ id: PlanningTab; label: string }> = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'photos', label: 'Fotos' },
  { id: 'facts', label: 'Gebäudefakten' },
  { id: 'measurements', label: 'Messungen' },
  { id: 'decisions', label: 'Entscheidungen' },
  { id: 'local', label: 'Register' },
  { id: 'siteVisit', label: 'Begehung' },
];

const planningProjectLabel = import.meta.env.VITE_PROJECT_LABEL;

const STATUS_DE: Record<string, string> = {
  not_started: 'Nicht begonnen',
  blocked: 'Blockiert',
  under_review: 'In Prüfung',
  ready_for_expert: 'Bereit für Experte',
  decided: 'Entschieden',
  deferred: 'Verschoben',
  confirmed: 'Bestätigt',
  estimated: 'Geschätzt',
  generated: 'Generiert',
  documented: 'Dokumentiert',
  open: 'Offen',
  resolved: 'Gelöst',
  priority: 'Prio',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
  ready_for_visit: 'Begehungsbereit',
  available: 'Verfügbar',
  generated_model: 'Generiertes Modell',
  ifc: 'IFC-Modell',
  site_check: 'Begehung',
  schema: 'Schema',
  'metadata-first': 'Metadaten-Basis',
};

function StatusPill({ children }: { children: string }) {
  const label = STATUS_DE[children] ?? children;
  return <span className={`planning-pill planning-pill-${children.replace(/_/g, '-')}`}>{label}</span>;
}

function ReasoningSection({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="reasoning-section">
      <strong>{title}</strong>
      {items.length === 0 ? <p>Keine verlässlichen Informationen verfügbar.</p> : items.map((item) => <p key={item}>{item}</p>)}
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="panel-copy" style={{ color: '#7a8a7a', fontStyle: 'italic', padding: '1rem 0' }}>
      {label}
    </p>
  );
}

function deriveProjectBuildingFacts(
  project: ImportedProject,
  confirmed: Lod2Candidate[],
): BuildingFact[] {
  const today = new Date().toISOString().slice(0, 10);
  const source = `LoD2-Import · ${project.geocode.tileId}`;
  const facts: BuildingFact[] = [];

  confirmed.forEach((c, idx) => {
    const groundArea = c.surfaces.ground.reduce((s, f) => s + f.areaM2, 0);
    const roofArea = c.surfaces.roof.reduce((s, f) => s + f.areaM2, 0);
    const wallArea = c.surfaces.wall.reduce((s, f) => s + f.areaM2, 0);
    const maxPitch = c.surfaces.roof.length > 0
      ? Math.max(...c.surfaces.roof.map((s) => s.pitchDeg))
      : 0;
    const width = c.bboxUtm32.maxE - c.bboxUtm32.minE;
    const depth = c.bboxUtm32.maxN - c.bboxUtm32.minN;
    const n = idx + 1;

    facts.push(
      { id: `t${n}-height`, label: `Teil ${n}: Höhe (LoD2)`, value: c.measuredHeightM.toFixed(2), unit: 'm', source, confidence: 'generated', last_updated: today, evidence_links: [c.id] },
      { id: `t${n}-ground`, label: `Teil ${n}: Grundfläche`, value: groundArea.toFixed(1), unit: 'm²', source, confidence: 'generated', last_updated: today, evidence_links: [c.id] },
      { id: `t${n}-roof`, label: `Teil ${n}: Dachfläche`, value: roofArea.toFixed(1), unit: 'm²', source, confidence: 'generated', last_updated: today, evidence_links: [c.id] },
      { id: `t${n}-wall`, label: `Teil ${n}: Wandfläche`, value: wallArea.toFixed(1), unit: 'm²', source, confidence: 'generated', last_updated: today, evidence_links: [c.id] },
      { id: `t${n}-bbox`, label: `Teil ${n}: Grundriss-BBox`, value: `${width.toFixed(1)} × ${depth.toFixed(1)}`, unit: 'm', source, confidence: 'generated', last_updated: today, evidence_links: [c.id] },
      { id: `t${n}-pitch`, label: `Teil ${n}: Max. Dachneigung`, value: maxPitch.toFixed(1), unit: '°', source, confidence: 'generated', last_updated: today, evidence_links: [c.id] },
    );
  });

  if (confirmed.length > 1) {
    const total = {
      ground: confirmed.reduce((s, c) => s + c.surfaces.ground.reduce((ss, f) => ss + f.areaM2, 0), 0),
      roof: confirmed.reduce((s, c) => s + c.surfaces.roof.reduce((ss, f) => ss + f.areaM2, 0), 0),
      wall: confirmed.reduce((s, c) => s + c.surfaces.wall.reduce((ss, f) => ss + f.areaM2, 0), 0),
    };
    facts.push(
      { id: 'total-ground', label: 'Gesamtgrundfläche', value: total.ground.toFixed(1), unit: 'm²', source, confidence: 'generated', last_updated: today, evidence_links: confirmed.map((c) => c.id) },
      { id: 'total-roof', label: 'Gesamtdachfläche', value: total.roof.toFixed(1), unit: 'm²', source, confidence: 'generated', last_updated: today, evidence_links: confirmed.map((c) => c.id) },
      { id: 'total-wall', label: 'Gesamtwandfläche', value: total.wall.toFixed(1), unit: 'm²', source, confidence: 'generated', last_updated: today, evidence_links: confirmed.map((c) => c.id) },
    );
  }

  facts.push({
    id: 'geocode',
    label: 'Koordinaten UTM32',
    value: `E ${project.geocode.utm32.easting.toFixed(0)} / N ${project.geocode.utm32.northing.toFixed(0)}`,
    unit: 'm',
    source: 'Nominatim / OpenStreetMap',
    confidence: 'documented',
    last_updated: today,
    evidence_links: [],
  });

  return facts;
}

export function RenovationPlanningPanel({ project }: { project?: ImportedProject | null }) {
  const [activeTab, setActiveTab] = useState<PlanningTab>('overview');

  if (project) {
    const confirmed = project.candidates.filter((c) => project.confirmedIds.includes(c.id));
    const buildingFacts = deriveProjectBuildingFacts(project, confirmed);
    const visibleTab = PROJECT_TABS.some((t) => t.id === activeTab) ? activeTab : 'overview';

    return (
      <div className="planning-layout">
        <section className="panel">
          <div className="panel-title">Renovierungsplanung — {project.address}</div>
          <p className="panel-copy">
            Planungsgrundlage aus importierten LoD2-Daten. Gebäudefakten sind automatisch abgeleitet;
            Messungen und Entscheidungen werden nach Begehung ergänzt.
          </p>
          <div className="tab-strip planning-tab-strip">
            {PROJECT_TABS.map((tab) => (
              <button
                className={`tab-btn ${visibleTab === tab.id ? 'tab-btn-active' : ''}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {visibleTab === 'overview' && (
          <>
            <section className="planning-hero panel">
              <div>
                <p className="eyebrow">Projektstatus</p>
                <h3>{project.address}</h3>
                <p>Bestandsaufnahme — LoD2-Import</p>
                <p>{confirmed.length} Gebäudete{confirmed.length === 1 ? 'il' : 'ile'} bestätigt · {project.candidates.length} Kandidaten in Kachel {project.geocode.tileId}</p>
              </div>
              <div className="planning-stat-grid">
                <div><strong>{buildingFacts.length}</strong><span>Fakten</span></div>
                <div><strong>{confirmed.length}</strong><span>Gebäudeteile</span></div>
                <div><strong>0</strong><span>offene Annahmen</span></div>
                <div><strong>0</strong><span>Entscheidungen</span></div>
              </div>
            </section>
            <section className="planning-grid">
              <article className="panel">
                <div className="panel-title">Verfügbare Datenartefakte</div>
                <div className="planning-list">
                  <div><strong>LoD2 Gebäudemodell</strong><span>Importiert · {project.candidates.length} Kandidaten</span></div>
                  <div><strong>Bestätigte Teile</strong><span>{confirmed.length} Gebäudete{confirmed.length === 1 ? 'il' : 'ile'}</span></div>
                  <div><strong>Geocoding</strong><span>{project.geocode.displayName}</span></div>
                </div>
              </article>
              <article className="panel">
                <div className="panel-title">Nächste Schritte</div>
                <div className="planning-list">
                  <div><strong>Vor-Ort-Begehung</strong><span>Fotos, Aufmaß, Konstruktionsinspektion</span></div>
                  <div><strong>Geländedaten laden</strong><span>Gelände-Tab → DGM1 abrufen</span></div>
                  <div><strong>IFC generieren</strong><span>Gebäude-Tab → Detail-Tabs freischalten</span></div>
                  <div><strong>Begehungs-Log</strong><span>Begehung-Tab → Fotos und Notizen erfassen</span></div>
                </div>
              </article>
            </section>
          </>
        )}

        {visibleTab === 'photos' && <RenovationPhotoPlacementPanel project={project} />}

        {visibleTab === 'facts' && (
          <section className="panel">
            <div className="panel-title">Gebäudefakten — automatisch aus LoD2</div>
            <p className="panel-copy" style={{ color: '#7a8a7a', fontSize: '0.82rem' }}>
              Alle Werte sind aus dem importierten LoD2-Modell berechnet. Konfidenz: generiert — kein Ersatz für Aufmaß.
            </p>
            <div className="planning-table">
              {buildingFacts.map((fact) => (
                <article key={fact.id}>
                  <strong>{fact.label}</strong>
                  <b>{fact.value}{fact.unit ? ` ${fact.unit}` : ''}</b>
                  <span>{fact.source}</span>
                  <StatusPill>{fact.confidence}</StatusPill>
                  <small>{fact.evidence_links.slice(0, 1).join(', ')}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {visibleTab === 'measurements' && (
          <section className="panel">
            <div className="panel-title">Fehlende Messungen</div>
            <EmptyState label="Noch keine Messungsbedarfe erfasst. Nach der Begehung können hier fehlende Messungen eingetragen werden." />
          </section>
        )}

        {visibleTab === 'decisions' && (
          <section className="panel">
            <div className="panel-title">Entscheidungsboard</div>
            <EmptyState label="Noch keine Renovierungsentscheidungen erfasst. Entscheidungen werden nach Abschluss der Bestandsaufnahme und Begehung angelegt." />
          </section>
        )}

        {visibleTab === 'local' && <LocalRegistersPanel />}
        {visibleTab === 'package' && <LocalAssessmentPackagePanel />}
        {visibleTab === 'siteVisit' && <SiteVisitImportPanel />}
      </div>
    );
  }

  const reasoning = buildAgenticReasoningSnapshot();
  const openAssumptions = getOpenAssumptions();
  const highPriorityNeeds = getHighPriorityMeasurementNeeds();
  const blockedDecisions = getBlockedDecisions();
  const relevantRisks = getRelevantRisks();

  return (
    <div className="planning-layout">
      <section className="panel">
        <div className="panel-title">Agentic Renovierungsplanung</div>
        <p className="panel-copy">
          Lokale Planungsansicht, die Fakten, Annahmen, fehlende Messungen, Risiken und Entscheidungen trennt.
          Generierte Modelldaten gelten als Evidenz — nicht als gemessene Bestandsrealität.
        </p>
        <div className="tab-strip planning-tab-strip">
          {DEMO_TABS.map((tab) => (
            <button
              className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' && (
        <>
          <section className="planning-hero panel">
            <div>
              <p className="eyebrow">Aktueller Projektstatus</p>
              <h3>{planningProjectLabel || renovationPlanningData.projectStatus.label}</h3>
              <p>{renovationPlanningData.projectStatus.phase}</p>
              <p>{renovationPlanningData.projectStatus.latestGeneratedState}</p>
            </div>
            <div className="planning-stat-grid">
              <div><strong>{renovationPlanningData.buildingFacts.length}</strong><span>Fakten</span></div>
              <div><strong>{openAssumptions.length}</strong><span>offene Annahmen</span></div>
              <div><strong>{highPriorityNeeds.length}</strong><span>Prio-Messungen</span></div>
              <div><strong>{blockedDecisions.length}</strong><span>blockierte Entsch.</span></div>
            </div>
          </section>
          <section className="planning-grid">
            <article className="panel">
              <div className="panel-title">Verfügbare Datenartefakte</div>
              <div className="planning-list">
                {renovationPlanningData.artifacts.map((artifact) => (
                  <div key={artifact.id}>
                    <strong>{artifact.label}</strong>
                    <span>{STATUS_DE[artifact.kind] ?? artifact.kind} · <StatusPill>{artifact.status}</StatusPill></span>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel">
              <div className="panel-title">Wichtigste offene Unbekannte</div>
              <div className="planning-list">
                {openAssumptions.slice(0, 4).map((assumption) => (
                  <div key={assumption.id}>
                    <strong>{assumption.statement}</strong>
                    <span>{assumption.required_verification}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}

      {activeTab === 'photos' && <RenovationPhotoPlacementPanel />}

      {activeTab === 'facts' && (
        <section className="panel">
          <div className="panel-title">Gebäudefakten</div>
          <div className="planning-table">
            {renovationPlanningData.buildingFacts.map((fact) => (
              <article key={fact.id}>
                <strong>{fact.label}</strong>
                <b>{formatFactValue(fact)}</b>
                <span>{fact.source}</span>
                <StatusPill>{fact.confidence}</StatusPill>
                <small>{fact.evidence_links.join(', ')}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'assumptions' && (
        <section className="panel">
          <div className="panel-title">Annahmen-Register</div>
          <div className="planning-card-grid">
            {renovationPlanningData.assumptions.map((assumption) => (
              <article className="planning-card" key={assumption.id}>
                <StatusPill>{assumption.status}</StatusPill>
                <strong>{assumption.statement}</strong>
                <p>{assumption.why_it_matters}</p>
                <span>Prüfung: {assumption.required_verification}</span>
                <small>Betrifft: {assumption.affected_decisions.join(', ')}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'measurements' && (
        <section className="panel">
          <div className="panel-title">Fehlende Messungen</div>
          <div className="planning-card-grid">
            {renovationPlanningData.measurementNeeds.map((need) => (
              <article className="planning-card" key={need.id}>
                <StatusPill>{need.priority}</StatusPill>
                <strong>{need.description}</strong>
                <p>{need.reason}</p>
                <span>{need.location_or_component}</span>
                <small>Methode: {need.suggested_method}</small>
                <small>Blockiert: {need.blocks_decisions.join(', ')}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'decisions' && (
        <section className="panel">
          <div className="panel-title">Entscheidungsboard</div>
          <div className="planning-card-grid">
            {renovationPlanningData.renovationDecisions.map((decision) => (
              <article className="planning-card" key={decision.id}>
                <StatusPill>{decision.current_status}</StatusPill>
                <strong>{decision.decision_title}</strong>
                <p>Optionen: {decision.options.join(' · ')}</p>
                <span>Abhängigkeiten: {decision.dependencies.join(', ')}</span>
                <span>Risiken: {decision.risks.join(', ')}</span>
                <small>Nächster Schritt: {decision.next_action}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reasoning' && (
        <section className="panel">
          <div className="panel-title">KI-Bewertungsansicht</div>
          <p className="panel-copy">
            Regelbasierte Erstimplementierung. Fasst den aktuellen Planungsstand zusammen und hält Unsicherheiten sichtbar.
          </p>
          <div className="reasoning-grid">
            <ReasoningSection title="Fakten:" items={reasoning.facts} />
            <ReasoningSection title="Annahmen:" items={reasoning.assumptions} />
            <ReasoningSection title="Risiken:" items={reasoning.risks} />
            <ReasoningSection title="Fehlende Informationen:" items={reasoning.missingInformation} />
            <ReasoningSection title="Empfohlene nächste Schritte:" items={reasoning.suggestedNextActions} />
          </div>
          <div className="planning-risk-strip">
            {relevantRisks.map((risk) => (
              <span key={risk.id}>{risk.category}: {risk.impact}</span>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'local' && <LocalRegistersPanel />}
      {activeTab === 'package' && <LocalAssessmentPackagePanel />}
      {activeTab === 'siteVisit' && <SiteVisitImportPanel />}
    </div>
  );
}
