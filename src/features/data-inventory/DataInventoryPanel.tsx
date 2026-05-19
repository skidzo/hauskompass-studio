import type { DataInventoryItem } from '@/domain/AddressProject';

export function DataInventoryPanel({ items }: { items: DataInventoryItem[] }) {
  return (
    <section className="panel">
      <div className="panel-title">Daten-Inventar</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Datenschicht</th>
              <th>Status</th>
              <th>Konfidenz</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.label}</strong>
                  <span>{item.sourceName}</span>
                </td>
                <td>
                  <span className={`badge status-${item.status}`}>{item.status}</span>
                </td>
                <td>
                  <span className={`badge confidence-${item.confidence}`}>{item.confidence}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
