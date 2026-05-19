import { CheckCircle2, Hammer } from 'lucide-react';
import { confirmedBuildingParts, futureHullPlanningNote } from './confirmedBuildingParts';
import type { lod2CandidateGeometry } from './generated/lod2CandidateGeometry';

type Lod2Candidate = (typeof lod2CandidateGeometry.candidates)[number];

export function ConfirmedObjectPanel({ candidates }: { candidates: readonly Lod2Candidate[] }) {
  return (
    <section className="panel">
      <div className="panel-title">Bestätigtes Untersuchungsobjekt</div>
      <div className="confirmed-part-grid">
        {confirmedBuildingParts.map((part) => {
          const candidate = candidates.find((item) => item.id === part.candidateId);
          const width = candidate ? candidate.bboxUtm32.maxE - candidate.bboxUtm32.minE : undefined;
          const depth = candidate ? candidate.bboxUtm32.maxN - candidate.bboxUtm32.minN : undefined;

          return (
            <div className="confirmed-part" key={part.candidateId}>
              <div className="confirmed-part-title">
                <CheckCircle2 size={18} />
                <strong>{part.label}</strong>
              </div>
              <p>{part.notes}</p>
              {'geometryAdjustment' in part ? <span>{part.geometryAdjustment}</span> : null}
              {candidate ? (
                <span>
                  {candidate.id}, {candidate.measuredHeightM.toFixed(2)} m high, bbox {width?.toFixed(1)} m x {depth?.toFixed(1)} m
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="future-note">
        <Hammer size={18} />
        <span>{futureHullPlanningNote}</span>
      </div>
    </section>
  );
}
