import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { getConfirmedPart, getNeighborReference, isConfirmedBuildingPart } from './confirmedBuildingParts';
import type { FetchedGeodataSummary } from './fetchedGeodataSummary';
import type { lod2CandidateGeometry } from './generated/lod2CandidateGeometry';

type Lod2Candidate = (typeof lod2CandidateGeometry.candidates)[number];

export function BuildingEvidencePanel({ summary, candidate }: { summary: FetchedGeodataSummary; candidate: Lod2Candidate }) {
  const confirmedPart = getConfirmedPart(candidate.id);
  const neighborReference = getNeighborReference(candidate.id);

  return (
    <div className="evidence-panel">
      <div className="evidence-callout">
        <TriangleAlert size={18} />
        <div>
          <strong>Kandidat zur Prüfung ausgewählt, keine genehmigte Befund-Geometrie</strong>
          <span>
            {confirmedPart
              ? `${confirmedPart.label} ist als Teil des Untersuchungsobjekts bestätigt.`
              : `${neighborReference?.label ?? 'Dieses nahe LoD2-Objekt'} verbleibt als Nachbarkontext und ist nicht Teil der bewerteten Hülle.`}
          </span>
          {confirmedPart && 'geometryAdjustment' in confirmedPart ? <span>{confirmedPart.geometryAdjustment}</span> : null}
        </div>
      </div>

      <dl className="metric-list">
        <div>
          <dt>Gebäudeteil</dt>
          <dd>{confirmedPart?.label ?? neighborReference?.label ?? 'Nahes Objekt'}</dd>
        </div>
        <div>
          <dt>Gemessene Höhe</dt>
          <dd>{candidate.measuredHeightM.toFixed(2)} m</dd>
        </div>
        <div>
          <dt>LoD2-Flächen</dt>
          <dd>{candidate.surfaces.roof.length} Dach / {candidate.surfaces.wall.length} Wand</dd>
        </div>
        <div>
          <dt>Übereinstimmungsqualität</dt>
          <dd>{candidate.bboxDistanceToGeocodeM.toFixed(1)} m zur BBox</dd>
        </div>
      </dl>

      <div className="source-stack">
        <SourceRow label="LoD2 CityGML" value={summary.lod2.tile} />
        <SourceRow label="Ausgewählter Kandidat" value={candidate.id} />
        <SourceRow label="Objektstatus" value={isConfirmedBuildingPart(candidate.id) ? 'Bestätigtes Untersuchungsobjekt' : 'Nachbarreferenz'} />
        <SourceRow label="DGM1-Gelände" value={`${summary.dgm1.tile}, ${summary.dgm1.raster}`} />
      </div>
    </div>
  );
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="source-row">
      <CheckCircle2 size={16} />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}
