import {
  buildMetadataIndex,
  findBrokenMetadataReferences,
  getMetadataGraphStats,
  getMetadataObjectLabel,
  metadataExampleGraph,
} from '@/features/metadata/metadataExampleGraph';

const confidenceClass: Record<string, string> = {
  confirmed: 'confidence-high',
  high: 'confidence-high',
  medium: 'confidence-medium',
  low: 'confidence-low',
  unknown: 'confidence-unknown',
};

function LinkList({ refs }: { refs: string[] }) {
  const byId = buildMetadataIndex();
  if (refs.length === 0) return <span className="fine-print">No links</span>;
  return (
    <div className="reuse-gates">
      {refs.map((ref) => (
        <span key={ref} className="gate-pill" title={ref}>
          {getMetadataObjectLabel(byId.get(ref))}
        </span>
      ))}
    </div>
  );
}

function refsFor(item: object, ...keys: string[]) {
  const record = item as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((ref): ref is string => typeof ref === 'string');
  }
  return [];
}

export function MetadataExplorerPanel() {
  const stats = getMetadataGraphStats();
  const brokenRefs = findBrokenMetadataReferences();

  return (
    <section className="panel">
      <div className="panel-title">Metadaten-Explorer</div>
      <p className="panel-copy">
        Fiktiver Beispiel-Graph für die BIM/AAS-inspirierte Metadaten-Grundlage. Zeigt Link-Integrität, Konfidenz, Befunde,
        Annahmen und Entscheidungsabhängigkeiten — ohne private Projektdaten preiszugeben.
      </p>

      <div className="pv-summary-grid">
        <article className="pv-summary-card">
          <span>Elemente</span>
          <strong>{stats.buildingElements}</strong>
        </article>
        <article className="pv-summary-card">
          <span>Befunde</span>
          <strong>{stats.evidence}</strong>
        </article>
        <article className="pv-summary-card">
          <span>Annahmen</span>
          <strong>{stats.assumptions}</strong>
        </article>
        <article className="pv-summary-card">
          <span>Defekte Referenzen</span>
          <strong>{stats.brokenReferences}</strong>
        </article>
      </div>

      {brokenRefs.length > 0 && (
        <div className="inspection-warning">
          {brokenRefs.map((ref) => `${ref.sourceId} -> ${ref.field} -> ${ref.targetId}`).join('; ')}
        </div>
      )}

      <div className="deconstruction-card-grid" style={{ marginTop: 14 }}>
        {metadataExampleGraph.buildingElements.map((element) => (
          <article key={element.id} className="reuse-card">
            <div className="reuse-card-head">
              <strong>{element.name}</strong>
              <span className={`badge ${confidenceClass[element.confidence] ?? 'confidence-unknown'}`}>
                {element.confidence}
              </span>
            </div>
            <dl className="reuse-metric-list">
              <div>
                <dt>Type</dt>
                <dd>{element.type}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{element.status}</dd>
              </div>
              <div>
                <dt>Geometry</dt>
                <dd>{element.geometryRef}</dd>
              </div>
            </dl>
            <p className="fine-print">{element.description}</p>
            <p className="fine-print">Evidence</p>
            <LinkList refs={refsFor(element, 'evidenceIds', 'evidenceRefs')} />
            <p className="fine-print">Assumptions</p>
            <LinkList refs={refsFor(element, 'assumptionIds', 'assumptionRefs')} />
          </article>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Entscheidung</th>
              <th>Bereich</th>
              <th>Status</th>
              <th>Abhängig von</th>
            </tr>
          </thead>
          <tbody>
            {metadataExampleGraph.decisions.map((decision) => (
              <tr key={decision.id}>
                <td>{decision.title}</td>
                <td>{decision.decisionArea}</td>
                <td>{decision.status}</td>
                <td>
                  <LinkList refs={[...decision.relatedObjectRefs, ...decision.evidenceRefs, ...decision.assumptionRefs]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
