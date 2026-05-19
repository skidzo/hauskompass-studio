import { materialReuseEstimates } from '@/features/deconstruction/generated/materialReuseEstimates';
import { OUTCOME_COLORS } from './deconstructionTypes';
import { measurementTasksById } from './measurementTasks';

const CONFIDENCE_COLORS: Record<'low' | 'very-low', string> = {
  low: '#e09b39',
  'very-low': '#e05555',
};

const estimateCards = [
  {
    id: 'timber',
    title: 'Timber Reuse',
    metrics: [
      ['Estimated mass', `${materialReuseEstimates.timber.estimatedMassKg.toLocaleString('en-US')} kg`],
      ['Basis', `${materialReuseEstimates.timber.basisM2.toFixed(2)} m² roof area`],
      ['Confidence', materialReuseEstimates.timber.confidence],
      ['Outcome', materialReuseEstimates.timber.reuseOutcome],
    ],
    note: materialReuseEstimates.timber.reuseNote,
    extra: materialReuseEstimates.timber.volumeM3Note,
    inspectionGate: materialReuseEstimates.timber.inspectionGate,
    confidence: materialReuseEstimates.timber.confidence,
    outcome: materialReuseEstimates.timber.reuseOutcome,
  },
  {
    id: 'masonry',
    title: 'Masonry Reuse',
    metrics: [
      ['Estimated volume', `${materialReuseEstimates.masonry.estimatedVolumeMinM3}–${materialReuseEstimates.masonry.estimatedVolumeMaxM3} m³`],
      ['Basis', `${materialReuseEstimates.masonry.basisM2.toFixed(2)} m² wall area`],
      ['Confidence', materialReuseEstimates.masonry.confidence],
      ['Outcome', materialReuseEstimates.masonry.reuseOutcome],
    ],
    note: materialReuseEstimates.masonry.reuseNote,
    extra: `Assumed thickness range ${materialReuseEstimates.masonry.thicknessMinM.toFixed(2)}–${materialReuseEstimates.masonry.thicknessMaxM.toFixed(2)} m.`,
    inspectionGate: materialReuseEstimates.masonry.inspectionGate,
    confidence: materialReuseEstimates.masonry.confidence,
    outcome: materialReuseEstimates.masonry.reuseOutcome,
  },
  {
    id: 'roof-covering',
    title: 'Roof Covering',
    metrics: [
      ['Estimated tile count', materialReuseEstimates.roofCovering.estimatedTileCount.toLocaleString('en-US')],
      ['Estimated mass', `${materialReuseEstimates.roofCovering.estimatedMassKg.toLocaleString('en-US')} kg`],
      ['Confidence', materialReuseEstimates.roofCovering.confidence],
      ['Outcome', materialReuseEstimates.roofCovering.reuseOutcome],
    ],
    note: materialReuseEstimates.roofCovering.reuseNote,
    extra: `Basis ${materialReuseEstimates.roofCovering.basisM2.toFixed(2)} m² roof area.`,
    inspectionGate: materialReuseEstimates.roofCovering.inspectionGate,
    confidence: materialReuseEstimates.roofCovering.confidence,
    outcome: materialReuseEstimates.roofCovering.reuseOutcome,
  },
  {
    id: 'windows',
    title: 'Windows & Doors',
    metrics: [
      ['Opening count estimate', materialReuseEstimates.windows.openingCountEstimate],
      ['Confidence', materialReuseEstimates.windows.confidence],
      ['Outcome', materialReuseEstimates.windows.reuseOutcome],
    ],
    note: materialReuseEstimates.windows.reuseNote,
    extra: 'Field-verified opening dimensions are still missing.',
    inspectionGate: materialReuseEstimates.windows.inspectionGate,
    confidence: materialReuseEstimates.windows.confidence,
    outcome: materialReuseEstimates.windows.reuseOutcome,
  },
];

export function MaterialReusePanel() {
  return (
    <section className="panel">
      <div className="panel-title">Material Reuse Estimates</div>
      <p className="panel-copy">{materialReuseEstimates.sourceNote}</p>
      <div className="deconstruction-card-grid">
        {estimateCards.map((card) => (
          <article key={card.id} className="reuse-card">
            <div className="reuse-card-head">
              <strong>{card.title}</strong>
              <span
                className="outcome-pill"
                style={{ background: `${OUTCOME_COLORS[card.outcome]}18`, color: OUTCOME_COLORS[card.outcome] }}
              >
                {card.outcome}
              </span>
            </div>
            <dl className="reuse-metric-list">
              {card.metrics.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {label === 'Confidence' ? (
                      <span className="confidence-inline">
                        <i style={{ background: CONFIDENCE_COLORS[card.confidence] }} />
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="fine-print">{card.note}</p>
            <p className="fine-print" style={{ marginTop: 8 }}>{card.extra}</p>
            <div className="reuse-gates">
              {card.inspectionGate.map((taskId) => (
                <span key={taskId} className="gate-pill">
                  {measurementTasksById[taskId].label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
