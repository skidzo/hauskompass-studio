import type { lod2CandidateGeometry } from '@/features/building-hull-import/generated/lod2CandidateGeometry';

type Candidate = (typeof lod2CandidateGeometry.candidates)[number];
type Surface = Candidate['surfaces']['roof'][number] | Candidate['surfaces']['wall'][number];

export function LoD2SurfaceViewer({ candidate }: { candidate: Candidate }) {
  const surfaces: Surface[] = [...candidate.surfaces.wall, ...candidate.surfaces.roof];
  const roofArea = candidate.surfaces.roof.reduce((sum, surface) => sum + surface.areaM2, 0);
  const steepestRoof = [...candidate.surfaces.roof].sort((a, b) => b.pitchDeg - a.pitchDeg)[0];
  const points = surfaces.flatMap((surface) => surface.points);
  const minE = Math.min(...points.map((point) => point.e));
  const maxE = Math.max(...points.map((point) => point.e));
  const minN = Math.min(...points.map((point) => point.n));
  const maxN = Math.max(...points.map((point) => point.n));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const scale = 4.0;
  const centerX = 50;
  const centerY = 75;

  function project(point: { e: number; n: number; z: number }) {
    const e = point.e - (minE + maxE) / 2;
    const n = point.n - (minN + maxN) / 2;
    const z = point.z - minZ;
    // Plan-oblique from SW: north goes upper-right, east goes right, Z goes up.
    // n_x adds a slight rightward shift for north so east/west walls are visible.
    return {
      x: centerX + e * scale + n * scale * 0.2,
      y: centerY - n * scale * 0.45 - z * scale,
    };
  }

  // Painter’s algorithm: precompute view-depth (high N+E = far from SW viewer = paint first).
  const depths = new Map(
    surfaces.map((s) => [
      s,
      s.points.reduce((sum, p) => {
        const e = p.e - (minE + maxE) / 2;
        const n = p.n - (minN + maxN) / 2;
        return sum + n + e * 0.2;
      }, 0) / s.points.length,
    ]),
  );
  const sorted = [...surfaces].sort((a, b) => (depths.get(b) ?? 0) - (depths.get(a) ?? 0));

  return (
    <section className="panel">
      <div className="panel-title">LoD2 Oberflächenvorschau</div>
      <p className="panel-copy">
        Plausibilitätsprüfung: Dachflächen, Wandsegmentierung, Höhensprünge und Lagebeziehung der Gebäudeteile. Kein Sanierungsmodell.
      </p>
      <div className="surface-viewer">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`LoD2 surface preview for ${candidate.id}`}>
          {sorted.map((surface) => (
            <polygon
              className={`surface-polygon surface-${surface.kind}`}
              key={surface.id}
              points={surface.points.map((point) => {
                const projected = project(point);
                return `${projected.x.toFixed(2)},${projected.y.toFixed(2)}`;
              }).join(' ')}
            />
          ))}
        </svg>
        <div className="viewer-legend">
          <span><i className="legend-roof" /> Dach</span>
          <span><i className="legend-wall" /> Wand</span>
          <span>{(maxZ - minZ).toFixed(2)} m LoD2 height span</span>
        </div>
      </div>
      <div className="viewer-use-grid">
        <div>
          <strong>Dachprüfung</strong>
          <span>{candidate.surfaces.roof.length} Dachflächen, {roofArea.toFixed(1)} m² gesamt. Steilste Neigung {steepestRoof?.pitchDeg.toFixed(1) ?? 'n/a'}°.</span>
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
