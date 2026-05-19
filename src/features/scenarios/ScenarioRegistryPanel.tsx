import type { ImportedProject } from '@/features/project-store/types';
import { scenarioRegistry } from '@/features/scenarios/generated/scenarioRegistry';

export function ScenarioRegistryPanel({ project }: { project?: ImportedProject | null }) {
  if (project) {
    const hasConfirmed = project.confirmedIds.length > 0;
    return (
      <section className="panel">
        <div className="panel-title">Szenario-Register</div>
        <p className="panel-copy">
          Automatisch abgeleitetes Basis-Szenario aus dem importierten Projekt. Weitere Szenarien können
          angelegt werden, sobald Bestandsaufnahme und Messungen vorliegen.
        </p>
        <div className="deconstruction-card-grid">
          <article className="reuse-card">
            <div className="reuse-card-head">
              <strong>Bestandsaufnahme</strong>
              <span className="gate-pill">Aktives Szenario</span>
            </div>
            <dl className="reuse-metric-list">
              <div>
                <dt>Status</dt>
                <dd>{hasConfirmed ? 'In Bearbeitung' : 'Initialisiert'}</dd>
              </div>
              <div>
                <dt>Basiert auf</dt>
                <dd>LoD2-Import · {project.geocode.tileId}</dd>
              </div>
              <div>
                <dt>Gebäude</dt>
                <dd>{project.candidates.length} Kandidaten · {project.confirmedIds.length} bestätigt</dd>
              </div>
              <div>
                <dt>Adresse</dt>
                <dd>{project.address}</dd>
              </div>
              <div>
                <dt>Eingriffe</dt>
                <dd>0 — noch keine</dd>
              </div>
              <div>
                <dt>Entscheidungen</dt>
                <dd>0 — noch keine</dd>
              </div>
            </dl>
            <p className="fine-print">
              Weitere Szenarien (z. B. Dachsanierung, Anbau) können nach Abschluss der Bestandsaufnahme
              angelegt werden.
            </p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">Szenario-Register</div>
      <p className="panel-copy">
        Stabile Szenariomodell-Schicht für Bestandsaufnahme, Bewertungen und Maßnahmenpakete.
        Erster Schritt zur szenariobewussten Datenverwaltung.
      </p>
      <div className="deconstruction-card-grid">
        {scenarioRegistry.scenarios.map((scenario) => (
          <article key={scenario.id} className="reuse-card">
            <div className="reuse-card-head">
              <strong>{scenario.label}</strong>
              <span className="gate-pill">
                {scenario.id === scenarioRegistry.activeScenarioId ? 'Aktives Szenario' : scenario.status}
              </span>
            </div>
            <dl className="reuse-metric-list">
              <div>
                <dt>Status</dt>
                <dd>{scenario.status}</dd>
              </div>
              <div>
                <dt>Basiert auf</dt>
                <dd>{scenario.basedOn}</dd>
              </div>
              <div>
                <dt>Eingriffe</dt>
                <dd>{scenario.interventions.length}</dd>
              </div>
              <div>
                <dt>Bewertungen</dt>
                <dd>{scenario.assessments.length}</dd>
              </div>
              <div>
                <dt>Ausgaben</dt>
                <dd>{scenario.outputs.length}</dd>
              </div>
              <div>
                <dt>Annahmen</dt>
                <dd>{scenario.assumptions.length}</dd>
              </div>
            </dl>
            <p className="fine-print">{scenario.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
