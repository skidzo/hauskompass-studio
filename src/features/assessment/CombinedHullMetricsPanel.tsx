import { Combine } from 'lucide-react';
import { assessmentDerivedData } from './generated/assessmentDerivedData';

export function CombinedHullMetricsPanel() {
  const metrics = assessmentDerivedData.confirmedObject;
  const width = metrics.bboxUtm32.maxE - metrics.bboxUtm32.minE;
  const depth = metrics.bboxUtm32.maxN - metrics.bboxUtm32.minN;
  const groundOffset = metrics.parts[1].groundElevationM - metrics.parts[0].groundElevationM;

  return (
    <section className="panel">
      <div className="panel-title">
        <Combine size={18} />
        Hüllmetriken gesamt
      </div>
      <div className="metric-list metric-list-wide">
        <div>
          <dt>Grundfläche</dt>
          <dd>{metrics.combinedGroundAreaM2.toFixed(1)} m²</dd>
        </div>
        <div>
          <dt>Dachfläche</dt>
          <dd>{metrics.combinedRoofAreaM2.toFixed(1)} m²</dd>
        </div>
        <div>
          <dt>Wandfläche</dt>
          <dd>{metrics.combinedWallAreaM2.toFixed(1)} m²</dd>
        </div>
        <div>
          <dt>Hüll-BBox</dt>
          <dd>{width.toFixed(1)} m × {depth.toFixed(1)} m</dd>
        </div>
        <div>
          <dt>Hauptachse</dt>
          <dd>{metrics.principalAxisAzimuthDeg.toFixed(1)}°</dd>
        </div>
        <div>
          <dt>Teil 2 Höhenversatz</dt>
          <dd>{groundOffset > 0 ? '+' : ''}{groundOffset.toFixed(2)} m</dd>
        </div>
      </div>
      <p className="fine-print">{metrics.futureRoofNote}</p>
    </section>
  );
}
