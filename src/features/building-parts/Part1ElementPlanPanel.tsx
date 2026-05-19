import { part1ElementPlan } from '@/features/building-parts/generated/part1ElementPlan';
import { part1ElevationPhotoStudy } from '@/features/building-parts/generated/part1ElevationPhotoStudy';
import { part1SchematicFloorPlan } from '@/features/building-parts/generated/part1SchematicFloorPlan';

function shortSurfaceId(surfaceId: string) {
  const [, , candidateId, uuid] = surfaceId.split('_');
  return `${candidateId ?? 'surface'}:${uuid?.slice(0, 8) ?? surfaceId.slice(-8)}`;
}

function polygonPoints(points: readonly { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function wallRingPath(outer: readonly { x: number; y: number }[], inner: readonly { x: number; y: number }[]) {
  const outerPath = outer.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const innerPath = [...inner].reverse().map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return `${outerPath} Z ${innerPath} Z`;
}

function elevationPoints(points: readonly { xM: number; zRelM: number }[]) {
  return points.map((point) => `${point.xM},${-point.zRelM}`).join(' ');
}

function pointBounds(points: readonly { x: number; y: number }[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function Part1ElementPlanPanel() {
  const footprintBounds = pointBounds(part1SchematicFloorPlan.outerFootprint);
  const planPadding = 1.8;
  const floorPlanViewBox = [
    footprintBounds.minX - planPadding,
    footprintBounds.minY - planPadding,
    footprintBounds.maxX - footprintBounds.minX + planPadding * 2,
    footprintBounds.maxY - footprintBounds.minY + planPadding * 2,
  ].join(' ');

  return (
    <div className="assessment-layout">
      <section className="panel">
        <div className="panel-title">Teil 1 — Schematischer Grundriss</div>
        <p className="panel-copy">{part1SchematicFloorPlan.note}</p>
        <div className="floor-plan-grid">
          {part1SchematicFloorPlan.levels.map((level) => (
            <article key={level.id} className="floor-plan-card">
              <div className="reuse-card-head">
                <strong>{level.label}</strong>
                <span className="gate-pill">north up / west left</span>
              </div>
              <svg className="floor-plan-svg" viewBox={floorPlanViewBox} role="img" aria-label={`Schematic floor plan ${level.label}`}>
                <defs>
                  <clipPath id={`${level.id}-footprint-clip`}>
                    <polygon points={polygonPoints(part1SchematicFloorPlan.outerFootprint)} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${level.id}-footprint-clip)`}>
                  {level.areas.map((area) => {
                    const labelAnchor = area.labelPoint ?? area.polygon.reduce(
                      (sum, point) => ({ x: sum.x + point.x / area.polygon.length, y: sum.y + point.y / area.polygon.length }),
                      { x: 0, y: 0 },
                    );
                    return (
                      <g key={area.id}>
                        <polygon className="floor-plan-area" fill={area.fill} points={polygonPoints(area.polygon)} />
                        <text className="floor-plan-label" x={labelAnchor.x} y={labelAnchor.y}>
                          {area.label}
                        </text>
                      </g>
                    );
                  })}
                  {part1SchematicFloorPlan.exteriorWallEstimate.appliesToLevelIds.includes(level.id) && (
                    <path
                      className="floor-plan-wall-estimate"
                      d={wallRingPath(
                        part1SchematicFloorPlan.exteriorWallEstimate.outerPolygon,
                        part1SchematicFloorPlan.exteriorWallEstimate.innerPolygon,
                      )}
                      fillRule="evenodd"
                    />
                  )}
                </g>
                {level.id === 'part1-level-eg' &&
                  part1SchematicFloorPlan.groundFloorRectangles.map((rectangle, index) => {
                    const labelAnchor = rectangle.polygon.reduce(
                      (sum, point) => ({
                        x: sum.x + point.x / rectangle.polygon.length,
                        y: sum.y + point.y / rectangle.polygon.length,
                      }),
                      { x: 0, y: 0 },
                    );
                    return (
                      <g key={rectangle.id}>
                        <polygon className="floor-plan-rectangle" points={polygonPoints(rectangle.polygon)} />
                        <text className="floor-plan-rectangle-label" x={labelAnchor.x} y={labelAnchor.y - 0.9}>
                          R{index + 1}
                        </text>
                      </g>
                    );
                  })}
                <polygon className="floor-plan-footprint" points={polygonPoints(part1SchematicFloorPlan.outerFootprint)} />
              </svg>
              <div className="reuse-gates">
                {level.areas.map((area) => (
                  <span key={area.id} className="gate-pill">
                    {area.label}: {area.role}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="floor-plan-meta">
          <div>
            <strong>Koordinatenstatus</strong>
            <span>{part1SchematicFloorPlan.coordinateSystem}</span>
          </div>
          <div>
            <strong>LoD2-Grundriss</strong>
            <span>
              {part1SchematicFloorPlan.footprintDimensionsM.widthEastWest} m Ost-West ×{' '}
              {part1SchematicFloorPlan.footprintDimensionsM.depthNorthSouth} m Nord-Süd; Quelle{' '}
              {shortSurfaceId(part1SchematicFloorPlan.outerFootprintSourceSurfaceId)}
            </span>
          </div>
          <div>
            <strong>{part1SchematicFloorPlan.exteriorWallEstimate.label}</strong>
            <span>
              {part1SchematicFloorPlan.exteriorWallEstimate.status}; applies to R1 on EG/DG; verify at one opening.
            </span>
          </div>
          {part1SchematicFloorPlan.doorMetadata.map((door) => (
            <div key={door.id}>
              <strong>{door.label}</strong>
              <span>{door.placementHint}; not drawn in plan; evidence: {door.evidenceState}</span>
            </div>
          ))}
        </div>
        <div className="floor-plan-rectangles">
          {part1SchematicFloorPlan.groundFloorRectangles.map((rectangle, index) => (
            <article key={rectangle.id}>
              <strong>R{index + 1}: {rectangle.label}</strong>
              <span>
                Kandidat-Verknüpfung: {rectangle.candidateElementId}; Achsgrenzen L{' '}
                {rectangle.buildingAxisBoundsM.longitudinalMin}-{rectangle.buildingAxisBoundsM.longitudinalMax} m / T{' '}
                {rectangle.buildingAxisBoundsM.transverseMin}-{rectangle.buildingAxisBoundsM.transverseMax} m.
              </span>
            </article>
          ))}
          <article>
            <strong>Keller: {part1SchematicFloorPlan.basementVault.label}</strong>
            <span>
              {part1SchematicFloorPlan.basementVault.dimensionsM.widthAcrossMainAxis} m x{' '}
              {part1SchematicFloorPlan.basementVault.dimensionsM.lengthAlongMainAxis} m;{' '}
              {part1SchematicFloorPlan.basementVault.vaultDirection};{' '}
              {part1SchematicFloorPlan.basementVault.placement}.
            </span>
          </article>
        </div>
        <div className="floor-plan-vertical">
          <div className="reuse-card-head">
            <strong>Vertikaler CAD-Ausgangspunkt</strong>
            <span className="gate-pill">{part1SchematicFloorPlan.verticalCadSeed.status}</span>
          </div>
          <div className="floor-plan-levels">
            {part1SchematicFloorPlan.verticalCadSeed.levels.map((level) => (
              <article key={level.id}>
                <strong>{level.label}</strong>
                <span>{level.zM.toFixed(2)} m</span>
                <small>{level.reference}</small>
              </article>
            ))}
          </div>
          <p className="panel-copy">
            Nominale Geschosshöhe: {part1SchematicFloorPlan.verticalCadSeed.assumptions.nominalStoreyHeightM.toFixed(2)} m.
            First über geschätztem EG-Boden: {part1SchematicFloorPlan.verticalCadSeed.derived.ridgeAboveGroundFloorM.toFixed(2)} m.
            Osteingang Gelände über LoD2-Hüllbasis:{' '}
            {part1SchematicFloorPlan.verticalCadSeed.derived.entranceTerrainAboveHullBaseM.toFixed(2)} m.
          </p>
          <div className="reuse-gates">
            {part1SchematicFloorPlan.verticalCadSeed.siteVisitChecks.map((check) => (
              <span key={check} className="gate-pill">
                {check}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Teil 1 — Foto-Ansichtsstudie</div>
        <p className="panel-copy">{part1ElevationPhotoStudy.purpose}</p>
        <div className="elevation-study-grid">
          {part1ElevationPhotoStudy.views.map((view) => {
            const viewBox = [-1, -view.zMaxRelM, view.widthM + 2, view.zMaxRelM - view.zMinRelM].join(' ');
            return (
              <article key={view.id} className="elevation-card">
                <div className="reuse-card-head">
                  <strong>{view.label}</strong>
                  <span className="gate-pill">{view.type}</span>
                </div>
                <svg className="elevation-svg" viewBox={viewBox} role="img" aria-label={view.label}>
                  {view.detailSurfaces?.map((surface) => (
                    <polygon
                      className={`elevation-surface elevation-surface-${surface.kind}`}
                      key={surface.id}
                      points={elevationPoints(surface.points)}
                    />
                  ))}
                  <polygon className="elevation-building" points={elevationPoints(view.buildingOutline)} />
                  <polyline className="elevation-terrain" points={elevationPoints(view.terrain)} />
                  {view.detailLines?.map((line) => (
                    <g key={line.id}>
                      <polyline
                        className={`elevation-detail-line elevation-detail-line-${line.kind}`}
                        points={elevationPoints(line.points)}
                      />
                      <text
                        className="elevation-detail-label"
                        x={line.points[Math.floor(line.points.length / 2)].xM}
                        y={-line.points[Math.floor(line.points.length / 2)].zRelM - 0.12}
                      >
                        {line.label}
                      </text>
                    </g>
                  ))}
                  {view.levelLines.map((level) => (
                    <g key={level.id}>
                      <line className="elevation-level-line" x1="0" x2={view.widthM} y1={-level.zRelM} y2={-level.zRelM} />
                      <text className="elevation-level-label" x={view.widthM + 0.25} y={-level.zRelM + 0.12}>
                        {level.label}
                      </text>
                    </g>
                  ))}
                  {view.windowMarkers.map((window) => (
                    <g key={window.id}>
                      <rect
                        className="elevation-window"
                        height={window.headZRelM - window.sillZRelM}
                        width={window.widthM}
                        x={window.xCenterM - window.widthM / 2}
                        y={-window.headZRelM}
                      />
                      <text className="elevation-window-label" x={window.xCenterM} y={-window.headZRelM - 0.14}>
                        {window.label}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className="reuse-gates">
                  {view.notes.map((note) => (
                    <span key={note} className="gate-pill">
                      {note}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="reference-target-grid">
          {part1ElevationPhotoStudy.referenceTargets.map((target) => (
            <article key={target.id} className="reference-target-card">
              <strong>{target.label}</strong>
              <p>{target.targetDescription}</p>
              <span>Verwendung für: {target.useForViews.join(', ')}</span>
              <div className="reuse-gates">
                {target.record.map((item) => (
                  <span key={item} className="gate-pill">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Teil 1 — Unterelemente für künftige Erkennung</div>
        <p className="panel-copy">{part1ElementPlan.note}</p>
        <div className="deconstruction-card-grid">
          {part1ElementPlan.elements.map((element) => (
            <article key={element.id} className="reuse-card">
              <div className="reuse-card-head">
                <strong>{element.label}</strong>
                <span className="gate-pill">{element.role}</span>
              </div>
              <dl className="reuse-metric-list">
                <div>
                  <dt>Ebene</dt>
                  <dd>{element.level}</dd>
                </div>
                <div>
                  <dt>Reihenfolge</dt>
                  <dd>{element.order}</dd>
                </div>
                <div>
                  <dt>Detailgrad</dt>
                  <dd>{element.parameters.detailState}</dd>
                </div>
              </dl>
              <p className="fine-print">Offene Fragen</p>
              <div className="reuse-gates">
                {element.openQuestions.map((question) => (
                  <span key={question} className="gate-pill">
                    {question}
                  </span>
                ))}
              </div>
              <p className="fine-print">LoD2-Zuordnung: {element.lod2Mapping.confidence} Konfidenz</p>
              <p className="panel-copy">{element.lod2Mapping.rationale}</p>
              <div className="reuse-gates">
                {element.lod2Mapping.surfaces.map((surface) => (
                  <span key={surface.surfaceId} className="gate-pill" title={surface.surfaceId}>
                    {surface.kind}: {surface.label} ({shortSurfaceId(surface.surfaceId)})
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Sechstes Erkennungsziel</div>
        <p className="panel-copy">
          Dieses Ziel bleibt ein semantisches Teil-1-Ziel für die Befundaufnahme. Es wird erst als
          auswählbares interpoliertes Volumen dargestellt, wenn Messgeometrie oder verlässliche
          Fotomarkierungen vorliegen.
        </p>
        <div className="deconstruction-card-grid">
          {part1ElementPlan.knownSubParts.map((subPart) => (
            <article key={subPart.id} className="reuse-card">
              <div className="reuse-card-head">
                <strong>{subPart.label}</strong>
                <span className="gate-pill">{subPart.role}</span>
              </div>
              <dl className="reuse-metric-list">
                <div>
                  <dt>Ebene</dt>
                  <dd>{subPart.level}</dd>
                </div>
                <div>
                  <dt>Übergeordnetes Element</dt>
                  <dd>{subPart.parentElementId}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{subPart.status}</dd>
                </div>
              </dl>
              <p className="fine-print">LoD2-Zuordnung: {subPart.lod2Mapping.confidence} Konfidenz</p>
              <p className="panel-copy">{subPart.lod2Mapping.rationale}</p>
              <div className="reuse-gates">
                {subPart.lod2Mapping.surfaces.map((surface) => (
                  <span key={surface.surfaceId} className="gate-pill" title={surface.surfaceId}>
                    {surface.kind}: {surface.label} ({shortSurfaceId(surface.surfaceId)})
                  </span>
                ))}
              </div>
              <p className="fine-print">Benötigte Befunde</p>
              <div className="reuse-gates">
                {subPart.evidenceNeeded.map((item) => (
                  <span key={item} className="gate-pill">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Konsistenzregeln Zusammenbau</div>
        <div className="deconstruction-card-grid">
          {part1ElementPlan.consistencyRules.map((rule) => (
            <article key={rule} className="reuse-card">
              <p className="fine-print" style={{ margin: 0 }}>{rule}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
