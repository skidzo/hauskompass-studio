import { getConfirmedPart } from './confirmedBuildingParts';
import type { lod2CandidateGeometry } from './generated/lod2CandidateGeometry';

type Lod2Candidate = (typeof lod2CandidateGeometry.candidates)[number];
type Surface = Lod2Candidate['surfaces']['roof'][number] | Lod2Candidate['surfaces']['wall'][number];

export function SurfaceMetricsTable({ candidate }: { candidate: Lod2Candidate }) {
  const confirmedPart = getConfirmedPart(candidate.id);
  const surfaces: Surface[] = [...candidate.surfaces.roof, ...candidate.surfaces.wall]
    .sort((a, b) => b.areaM2 - a.areaM2)
    .slice(0, 16);

  return (
    <section className="panel">
      <div className="panel-title">Extrahierte LoD2-Flächenmetriken</div>
      <p className="panel-copy">
        {confirmedPart ? `${confirmedPart.label}: ` : null}
        Berechnet aus CityGML-Polygonen. Fläche, Neigung und Azimut dienen nur zur Vorauswahl — bis zum Abgleich mit Aufmaß und Fotos.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Fläche</th>
              <th>Neigung</th>
              <th>Azimut</th>
              <th>Quellpolygon</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((surface) => (
              <tr key={surface.id}>
                <td><span className={`badge ${surface.kind === 'roof' ? 'confidence-medium' : 'confidence-unknown'}`}>{surface.kind}</span></td>
                <td>{surface.areaM2.toFixed(1)} m²</td>
                <td>{surface.pitchDeg.toFixed(1)}°</td>
                <td>{surface.azimuthDeg.toFixed(1)}°</td>
                <td><span>{surface.id}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
