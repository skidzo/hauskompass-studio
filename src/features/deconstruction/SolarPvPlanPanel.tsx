import { roofWindowDaylightData } from '@/features/deconstruction/generated/roofWindowDaylightData';
import { solarPvPlanData } from '@/features/deconstruction/generated/solarPvPlanData';

const summaryMetrics = [
  ['Realistische Nutzfläche Dach', `${solarPvPlanData.totals.realisticUsableAreaM2.toFixed(2)} m²`],
  ['Modulanzahl', solarPvPlanData.totals.moduleCount.toLocaleString('de-DE')],
  ['Installierte Leistung', `${solarPvPlanData.totals.kwp.toFixed(2)} kWp`],
  ['Jährlicher PV-Ertrag', `${solarPvPlanData.totals.annualYieldKwh.toLocaleString('de-DE')} kWh/a`],
] as const;

const comparisonMetrics = [
  ['Altes Konzept', `${solarPvPlanData.oldVsNew.old.moduleCount} Module · ${solarPvPlanData.oldVsNew.old.kwp.toFixed(2)} kWp · ${solarPvPlanData.oldVsNew.old.annualYieldKwh.toLocaleString('de-DE')} kWh/a`],
  ['Revidiertes Konzept', `${solarPvPlanData.oldVsNew.revised.moduleCount} Module · ${solarPvPlanData.oldVsNew.revised.kwp.toFixed(2)} kWp · ${solarPvPlanData.oldVsNew.revised.annualYieldKwh.toLocaleString('de-DE')} kWh/a`],
  ['Differenz', `${solarPvPlanData.oldVsNew.delta.moduleCount} Module · ${solarPvPlanData.oldVsNew.delta.kwp.toFixed(2)} kWp · +${solarPvPlanData.oldVsNew.delta.annualYieldKwh.toLocaleString('de-DE')} kWh/a (${solarPvPlanData.oldVsNew.delta.annualYieldPercent.toFixed(1)}%)`],
] as const;

export function SolarPvPlanPanel() {
  return (
    <section className="panel">
      <div className="panel-title">Solar & PV Konzept</div>
      <p className="panel-copy">{solarPvPlanData.sourceNote}</p>

      <div className="pv-summary-grid">
        {summaryMetrics.map(([label, value]) => (
          <article key={label} className="pv-summary-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="deconstruction-card-grid" style={{ marginTop: 14 }}>
        <article className="reuse-card">
          <div className="reuse-card-head">
            <strong>Planungsannahmen</strong>
          </div>
          <dl className="reuse-metric-list">
            <div>
              <dt>Modulfussabdruck</dt>
              <dd>{solarPvPlanData.assumptions.moduleFootprintM2.toFixed(2)} m²</dd>
            </div>
            <div>
              <dt>Modulleistung</dt>
              <dd>{solarPvPlanData.assumptions.modulePowerKw.toFixed(2)} kWp</dd>
            </div>
            <div>
              <dt>Systemverlust</dt>
              <dd>{solarPvPlanData.assumptions.systemLossPercent}%</dd>
            </div>
            <div>
              <dt>Brutto-Dachbasis</dt>
              <dd>{solarPvPlanData.totals.grossRoofAreaM2.toFixed(2)} m²</dd>
            </div>
          </dl>
          <p className="fine-print">{solarPvPlanData.assumptions.layoutNote}</p>
          <p className="fine-print" style={{ marginTop: 8 }}>{solarPvPlanData.assumptions.setbackNote}</p>
        </article>

        <article className="reuse-card">
          <div className="reuse-card-head">
            <strong>Leistungspaket</strong>
          </div>
          <div className="pv-pill-row">
            {solarPvPlanData.stagePackage.map((item) => (
              <span key={item} className="gate-pill">
                {item}
              </span>
            ))}
          </div>
          <div className="pv-comparison-list">
            {comparisonMetrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </div>
          <p className="fine-print" style={{ marginTop: 10 }}>{solarPvPlanData.atticDaylightNote}</p>
        </article>
      </div>

      <div className="deconstruction-card-grid" style={{ marginTop: 14 }}>
        <article className="reuse-card">
          <div className="reuse-card-head">
            <strong>Dachfenster-Taglichtstudie</strong>
          </div>
          <p className="fine-print">{roofWindowDaylightData.methodNote}</p>
          <dl className="reuse-metric-list">
            <div>
              <dt>Gewähltes Layout</dt>
              <dd>{roofWindowDaylightData.chosenLayout.windowCount} Ostdachfenster</dd>
            </div>
            <div>
              <dt>Nennmaß</dt>
              <dd>{roofWindowDaylightData.chosenLayout.nominalSizeM} m</dd>
            </div>
            <div>
              <dt>Platzierung</dt>
              <dd>{roofWindowDaylightData.chosenLayout.heightZone}</dd>
            </div>
            <div>
              <dt>Abstand</dt>
              <dd>{roofWindowDaylightData.chosenLayout.spacingRule}</dd>
            </div>
            <div>
              <dt>Direkter Tageslichtwert</dt>
              <dd>{roofWindowDaylightData.chosenPerformance.directSunPct.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Diffuser Himmelswert</dt>
              <dd>{roofWindowDaylightData.chosenPerformance.diffuseSkyPct.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Lichter Abstand</dt>
              <dd>{roofWindowDaylightData.chosenPerformance.clearSpacingM.toFixed(2)} m</dd>
            </div>
          </dl>
          <p className="fine-print">{roofWindowDaylightData.designDecision}</p>
          <div className="pv-comparison-list">
            {roofWindowDaylightData.rationale.map((item) => (
              <div key={item}>
                <dd>{item}</dd>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Dachfläche</th>
              <th>Orient.</th>
              <th>Bruttofläche</th>
              <th>Nutzfläche</th>
              <th>Module</th>
              <th>kWp</th>
              <th>Spez. Ertrag</th>
              <th>Jahresertrag</th>
              <th>Hinweise</th>
            </tr>
          </thead>
          <tbody>
            {solarPvPlanData.roofSurfaces.map((surface) => (
              <tr key={surface.id}>
                <td>{surface.label}</td>
                <td>{surface.orientation}</td>
                <td>{surface.grossAreaM2.toFixed(2)} m²</td>
                <td>
                  {surface.usableAreaM2.toFixed(2)} m²
                  <div className="pv-table-subline">{Math.round(surface.usableRatio * 100)}% usable</div>
                </td>
                <td>{surface.moduleCount}</td>
                <td>{surface.kwp.toFixed(2)}</td>
                <td>{surface.specificYieldKwhPerKwp.toFixed(2)} kWh/kWp/a</td>
                <td>{surface.annualYieldKwh.toLocaleString('de-DE')} kWh/a</td>
                <td>{surface.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
