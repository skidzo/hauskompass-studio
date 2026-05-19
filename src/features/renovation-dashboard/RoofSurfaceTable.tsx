import type { RoofSurface } from '@/domain/RoofSurface';

export function RoofSurfaceTable({ roofSurfaces }: { roofSurfaces: RoofSurface[] }) {
  return (
    <section className="panel">
      <div className="panel-title">Dachflächen-Kandidaten</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fläche</th>
              <th>Relevanz</th>
              <th>Konfidenz</th>
            </tr>
          </thead>
          <tbody>
            {roofSurfaces.map((surface) => (
              <tr key={surface.id}>
                <td>
                  <strong>{surface.label ?? surface.id}</strong>
                  <span>{surface.classification}</span>
                </td>
                <td>{surface.renovationRelevance.slice(0, 3).join(', ')}</td>
                <td>
                  <span className={`badge confidence-${surface.confidence}`}>{surface.confidence}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
