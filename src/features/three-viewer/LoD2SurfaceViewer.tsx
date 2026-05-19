import type { lod2CandidateGeometry } from '@/features/building-hull-import/generated/lod2CandidateGeometry';

type Candidate = (typeof lod2CandidateGeometry.candidates)[number];

const CANDIDATE_TINTS = ['c0', 'c1', 'c2', 'c3'];

export function LoD2SurfaceViewer({
  candidates,
  candidate,
}: {
  candidates?: Candidate[];
  candidate?: Candidate;
}) {
  const allCandidates = candidates ?? (candidate ? [candidate] : []);
  if (allCandidates.length === 0) return null;

  const allPoints = allCandidates.flatMap((c) =>
    [...c.surfaces.wall, ...c.surfaces.roof].flatMap((s) => s.points),
  );
  const minE = Math.min(...allPoints.map((p) => p.e));
  const maxE = Math.max(...allPoints.map((p) => p.e));
  const minN = Math.min(...allPoints.map((p) => p.n));
  const maxN = Math.max(...allPoints.map((p) => p.n));
  const minZ = Math.min(...allPoints.map((p) => p.z));
  const maxZ = Math.max(...allPoints.map((p) => p.z));

  const spanE = Math.max(maxE - minE, 1);
  const spanN = Math.max(maxN - minN, 1);
  const scale = Math.min(4.0, 40 / Math.max(spanE, spanN));
  const centerX = 50;
  const centerY = 75;

  function project(point: { e: number; n: number; z: number }) {
    const e = point.e - (minE + maxE) / 2;
    const n = point.n - (minN + maxN) / 2;
    const z = point.z - minZ;
    return {
      x: centerX + e * scale + n * scale * 0.2,
      y: centerY - n * scale * 0.45 - z * scale,
    };
  }

  const taggedSurfaces = allCandidates.flatMap((c, ci) =>
    [...c.surfaces.wall, ...c.surfaces.roof].map((s) => ({ surface: s, ci })),
  );

  const depths = new Map(
    taggedSurfaces.map(({ surface: s }) => [
      s,
      s.points.reduce((sum, p) => {
        const e = p.e - (minE + maxE) / 2;
        const n = p.n - (minN + maxN) / 2;
        return sum + n + e * 0.2;
      }, 0) / s.points.length,
    ]),
  );
  const sorted = [...taggedSurfaces].sort(
    (a, b) => (depths.get(b.surface) ?? 0) - (depths.get(a.surface) ?? 0),
  );

  const totalRoofArea = allCandidates.reduce(
    (sum, c) => sum + c.surfaces.roof.reduce((s, f) => s + f.areaM2, 0),
    0,
  );

  return (
    <section className="panel">
      <div className="panel-title">LoD2 Oberflächenvorschau</div>
      <p className="panel-copy">
        {allCandidates.length > 1
          ? `${allCandidates.length} bestätigte Gebäude — Plausibilitätsprüfung der Gebäudehüllen, Höhensprünge und Lagebeziehungen.`
          : 'Plausibilitätsprüfung: Dachflächen, Wandsegmentierung, Höhensprünge und Lagebeziehung der Gebäudeteile. Kein Sanierungsmodell.'}
      </p>
      <div className="surface-viewer">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`LoD2 Oberflächenvorschau — ${allCandidates.length} Gebäude`}
        >
          {sorted.map(({ surface, ci }) => (
            <polygon
              className={`surface-polygon surface-${surface.kind}${allCandidates.length > 1 ? ` surface-${CANDIDATE_TINTS[ci % CANDIDATE_TINTS.length]}` : ''}`}
              key={surface.id}
              points={surface.points
                .map((point) => {
                  const projected = project(point);
                  return `${projected.x.toFixed(2)},${projected.y.toFixed(2)}`;
                })
                .join(' ')}
            />
          ))}
        </svg>
        <div className="viewer-legend">
          <span><i className="legend-roof" /> Dach</span>
          <span><i className="legend-wall" /> Wand</span>
          {allCandidates.length > 1 &&
            allCandidates.map((c, ci) => (
              <span key={c.id} className={`viewer-legend-bldg viewer-legend-bldg-${ci}`}>
                <i className={`legend-bldg legend-bldg-${ci}`} /> Geb. {ci + 1}
              </span>
            ))}
          <span>{(maxZ - minZ).toFixed(2)} m Höhe</span>
        </div>
      </div>
      <div className="viewer-use-grid">
        <div>
          <strong>Dachprüfung</strong>
          <span>
            {allCandidates.reduce((s, c) => s + c.surfaces.roof.length, 0)} Dachflächen,{' '}
            {totalRoofArea.toFixed(1)} m² gesamt.
          </span>
        </div>
        <div>
          <strong>Geometrieprüfung</strong>
          <span>Auf geteilte Flächen, störende Wandfragmente oder Dachebenen achten, die nicht mit Fotos/Begehung übereinstimmen.</span>
        </div>
        <div>
          <strong>Nächster Schritt</strong>
          <span>Nach Kandidatenbestätigung: LoD2-Geometrie mit gemessener Dachneigung, Trauf- und Firsthöhen vergleichen.</span>
        </div>
      </div>
    </section>
  );
}
