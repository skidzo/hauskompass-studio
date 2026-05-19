import { assessmentDerivedData } from '@/features/assessment/generated/assessmentDerivedData';
import { Mountain } from 'lucide-react';

export function TerrainSamplingPanel() {
  const confirmed = assessmentDerivedData.terrain.confirmedObject;
  const context = assessmentDerivedData.terrain.activeContext;

  return (
    <section className="panel">
      <div className="panel-title">
        <Mountain size={18} />
        DGM1 Geländeauswertung
      </div>
      <div className="metric-list metric-list-wide">
        <div>
          <dt>Reliefhöhe Objekt</dt>
          <dd>{confirmed.reliefM.toFixed(2)} m</dd>
        </div>
        <div>
          <dt>Mittlere Höhe Objekt</dt>
          <dd>{confirmed.meanElevationM.toFixed(2)} m</dd>
        </div>
        <div>
          <dt>Geländeneigung</dt>
          <dd>{confirmed.approxSlopePercent.toFixed(2)} %</dd>
        </div>
        <div>
          <dt>Entwässerungsrichtung</dt>
          <dd>{confirmed.approxDrainageAzimuthDeg.toFixed(1)}°</dd>
        </div>
        <div>
          <dt>Reliefhöhe Umgebung</dt>
          <dd>{context.reliefM.toFixed(2)} m</dd>
        </div>
        <div>
          <dt>DGM-Messpunkte</dt>
          <dd>{confirmed.sampleCount} / {context.sampleCount}</dd>
        </div>
      </div>
      <p className="fine-print">
        DGM1-Messwerte aus {confirmed.sourceTile}. Reine Geländehöhen ohne Gebäude oder Vegetation.
      </p>
    </section>
  );
}
