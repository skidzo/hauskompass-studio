import { part1ElevationPhotoStudy } from '@/features/building-parts/generated/part1ElevationPhotoStudy';

function elevationPoints(points: readonly { xM: number; zRelM: number }[]) {
  return points.map((point) => `${point.xM},${-point.zRelM}`).join(' ');
}

function sectionPath(points: readonly { xM: number; zRelM: number }[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.xM} ${-point.zRelM}`).join(' ') + ' Z';
}

const drawingCodes: Record<string, string> = {
  'part1-east-side-photo-elevation': 'A-01',
  'part1-gable-photo-elevation': 'A-02',
  'part1-longitudinal-section': 'S-01',
};

const sectionViews = part1ElevationPhotoStudy.views.filter((view) =>
  ['part1-gable-photo-elevation', 'part1-longitudinal-section', 'part1-east-side-photo-elevation'].includes(view.id),
);

export function Part1SectionDrawingsPanel() {
  return (
    <div className="section-drawing-layout">
      <section className="panel">
        <div className="panel-title">Part 1 Seitenansichten mit Hauptmaßen</div>
        <p className="panel-copy">
          Large-format elevation sheets derived from the accepted Part 1 hull, terrain seed and CAD seed. Dimension
          chains show the key building extents and heights to verify on site before measured construction drawings.
        </p>
        <div className="section-sheet-stack">
          {sectionViews.map((view) => {
            const xPad = view.widthM * 0.08;
            const viewBox = [
              -xPad,
              -view.zMaxRelM - 0.55,
              view.widthM + xPad * 2 + 3.4,
              view.zMaxRelM - view.zMinRelM + 1.6,
            ].join(' ');
            return (
              <article className="section-sheet" key={view.id}>
                <header className="section-sheet-title">
                  <div>
                    <strong>{drawingCodes[view.id]} · {view.label}</strong>
                    <span>IFC New-off baseline · datum {part1ElevationPhotoStudy.referenceDatum.zM.toFixed(2)} m</span>
                  </div>
                  <span className="gate-pill">{view.status}</span>
                </header>
                <svg className="section-sheet-svg" viewBox={viewBox} role="img" aria-label={view.label}>
                  <defs>
                    <pattern id={`${view.id}-cut-hatch`} width="0.45" height="0.45" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" x2="0" y1="0" y2="0.45" />
                    </pattern>
                  </defs>
                  <g className="section-grid">
                    {view.levelLines.map((level) => (
                      <line key={level.id} x1="0" x2={view.widthM} y1={-level.zRelM} y2={-level.zRelM} />
                    ))}
                  </g>
                  {view.detailSurfaces?.map((surface) => (
                    <path
                      className={`section-cut-surface section-cut-surface-${surface.kind}`}
                      d={sectionPath(surface.points)}
                      fill={surface.kind === 'roof' || surface.kind === 'cellar' ? `url(#${view.id}-cut-hatch)` : undefined}
                      key={surface.id}
                    />
                  ))}
                  <path className="section-building-outline" d={sectionPath(view.buildingOutline)} />
                  <polyline className="section-terrain-line" points={elevationPoints(view.terrain)} />
                  {view.detailLines?.map((line) => (
                    <g key={line.id}>
                      <polyline className={`section-detail-line section-detail-line-${line.kind}`} points={elevationPoints(line.points)} />
                      <text className="section-detail-label" x={line.points[Math.floor(line.points.length / 2)].xM} y={-line.points[Math.floor(line.points.length / 2)].zRelM - 0.14}>
                        {line.label}
                      </text>
                    </g>
                  ))}
                  {view.levelLines.map((level) => (
                    <g key={level.id}>
                      <line className="section-level-line" x1="-0.5" x2={view.widthM + 0.5} y1={-level.zRelM} y2={-level.zRelM} />
                      <text className="section-level-label" x={view.widthM + 0.72} y={-level.zRelM + 0.12}>
                        {level.label}
                      </text>
                    </g>
                  ))}
                  {view.dimensions?.map((dimension) => {
                    if (dimension.orientation === 'horizontal') {
                      const y = -dimension.zRelM;
                      const witnessTop = -(dimension.witnessZRelM ?? 0);
                      return (
                        <g className="section-dimension" key={dimension.id}>
                          <line className="section-dimension-witness" x1={dimension.x1M} x2={dimension.x1M} y1={witnessTop} y2={y} />
                          <line className="section-dimension-witness" x1={dimension.x2M} x2={dimension.x2M} y1={witnessTop} y2={y} />
                          <line className="section-dimension-line" x1={dimension.x1M} x2={dimension.x2M} y1={y} y2={y} />
                          <line className="section-dimension-tick" x1={dimension.x1M} x2={dimension.x1M} y1={y - 0.13} y2={y + 0.13} />
                          <line className="section-dimension-tick" x1={dimension.x2M} x2={dimension.x2M} y1={y - 0.13} y2={y + 0.13} />
                          <text className="section-dimension-label" x={(dimension.x1M + dimension.x2M) / 2} y={y - 0.16}>
                            {dimension.label}
                          </text>
                        </g>
                      );
                    }

                    const x = dimension.xM;
                    const y1 = -dimension.z1RelM;
                    const y2 = -dimension.z2RelM;
                    const witnessX = dimension.witnessXM ?? view.widthM;
                    return (
                      <g className="section-dimension" key={dimension.id}>
                        <line className="section-dimension-witness" x1={witnessX} x2={x} y1={y1} y2={y1} />
                        <line className="section-dimension-witness" x1={witnessX} x2={x} y1={y2} y2={y2} />
                        <line className="section-dimension-line" x1={x} x2={x} y1={y1} y2={y2} />
                        <line className="section-dimension-tick" x1={x - 0.13} x2={x + 0.13} y1={y1} y2={y1} />
                        <line className="section-dimension-tick" x1={x - 0.13} x2={x + 0.13} y1={y2} y2={y2} />
                        <text className="section-dimension-label section-dimension-label-vertical" x={x + 0.18} y={(y1 + y2) / 2}>
                          {dimension.label}
                        </text>
                      </g>
                    );
                  })}
                  {view.windowMarkers.map((window) => (
                    <g key={window.id}>
                      <rect
                        className="section-window-marker"
                        height={window.headZRelM - window.sillZRelM}
                        width={window.widthM}
                        x={window.xCenterM - window.widthM / 2}
                        y={-window.headZRelM}
                      />
                      <line className="section-window-height-line" x1={window.xCenterM} x2={window.xCenterM} y1={-window.sillZRelM} y2={-window.headZRelM} />
                    </g>
                  ))}
                  <g className="section-scale-bar" transform={`translate(0 ${-view.zMinRelM + 0.35})`}>
                    <line x1="0" x2="5" y1="0" y2="0" />
                    <line x1="0" x2="0" y1="-0.12" y2="0.12" />
                    <line x1="5" x2="5" y1="-0.12" y2="0.12" />
                    <text x="2.5" y="-0.22">5 m</text>
                  </g>
                </svg>
                <div className="section-sheet-notes">
                  {view.notes.map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
