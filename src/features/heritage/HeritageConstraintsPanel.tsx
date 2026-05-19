import { Landmark } from 'lucide-react';
import { heritageConstraints } from './heritageConstraints';

export function HeritageConstraintsPanel() {
  return (
    <section className="panel">
      <div className="panel-title">
        <Landmark size={18} />
        Heritage Constraints
      </div>
      <p className="panel-copy">
        DenkmalAtlas coordinate search found no direct JSON result within 150 m. Nearby heritage records start at about
        {` ${heritageConstraints.summary.nearestResultDistanceM.toFixed(1)} m`}; keep them as planning context.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Distance</th>
              <th>Typ</th>
              <th>Number</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {heritageConstraints.nearestResults.map((item) => (
              <tr key={item.fileNumber}>
                <td>{item.distanceM.toFixed(1)} m</td>
                <td><span className="badge confidence-medium">{item.objectType}</span></td>
                <td>{item.fileNumber}</td>
                <td>
                  <strong>{item.function ?? 'Bodendenkmal'}</strong>
                  <span>{item.label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine-print">{heritageConstraints.caveat}</p>
    </section>
  );
}
