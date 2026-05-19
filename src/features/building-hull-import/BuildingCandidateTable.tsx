import type { lod2CandidateGeometry } from './generated/lod2CandidateGeometry';
import { getConfirmedPart, getNeighborReference, isConfirmedBuildingPart } from './confirmedBuildingParts';

type Lod2Candidate = (typeof lod2CandidateGeometry.candidates)[number];

export function BuildingCandidateTable({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}: {
  candidates: readonly Lod2Candidate[];
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-title">LoD2 Candidate Selection</div>
      <p className="panel-copy">
        Parts 1 and 2 are the confirmed assessment object. References 3, 4, 5, 6 and 9 are retained as neighbour context
        for later viewpoints and site functionality.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Building ID</th>
              <th>Distance</th>
              <th>Size Hint</th>
              <th>LoD2 Content</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, index) => {
              const width = candidate.bboxUtm32.maxE - candidate.bboxUtm32.minE;
              const depth = candidate.bboxUtm32.maxN - candidate.bboxUtm32.minN;

              return (
                <tr className={`${candidate.id === selectedCandidateId ? 'selected-row' : ''} ${isConfirmedBuildingPart(candidate.id) ? 'confirmed-row' : 'reference-row'}`} key={candidate.id}>
                  <td><strong>{getConfirmedPart(candidate.id)?.rank ?? getNeighborReference(candidate.id)?.rank ?? index + 1}</strong></td>
                  <td>
                    <button className="link-button" onClick={() => onSelectCandidate(candidate.id)} type="button">
                      {candidate.id}
                    </button>
                    <span>{getConfirmedPart(candidate.id)?.label ?? getNeighborReference(candidate.id)?.label ?? 'Hidden nearby LoD2 object'}</span>
                  </td>
                  <td>
                    <strong>{candidate.bboxDistanceToGeocodeM.toFixed(1)} m to bbox</strong>
                    <span>{candidate.centroidDistanceToGeocodeM.toFixed(1)} m to centroid</span>
                  </td>
                  <td>{width.toFixed(1)} m x {depth.toFixed(1)} m</td>
                  <td>{candidate.measuredHeightM.toFixed(2)} m high, {candidate.surfaces.roof.length} roof / {candidate.surfaces.wall.length} wall</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
