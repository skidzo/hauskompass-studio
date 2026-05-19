import { getConfirmedPart, getNeighborReference, isConfirmedBuildingPart } from '@/features/building-hull-import/confirmedBuildingParts';
import type { lod2CandidateGeometry } from '@/features/building-hull-import/generated/lod2CandidateGeometry';
import { siteContextData } from './generated/siteContextData';

type Lod2Candidate = (typeof lod2CandidateGeometry.candidates)[number];

export function LocationContextPanel({
  candidates,
  addressPoint,
  selectedCandidateId,
  onSelectCandidate,
}: {
  candidates: readonly Lod2Candidate[];
  addressPoint: typeof lod2CandidateGeometry.addressPointUtm32;
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
}) {
  const minE = siteContextData.mapWindowUtm32.minE;
  const maxE = siteContextData.mapWindowUtm32.maxE;
  const minN = siteContextData.mapWindowUtm32.minN;
  const maxN = siteContextData.mapWindowUtm32.maxN;
  const widthM = maxE - minE;
  const depthM = maxN - minN;
  const terrainValues = siteContextData.terrain.map((s) => s.z);
  const minTerrain = Math.min(...terrainValues);
  const maxTerrain = Math.max(...terrainValues);

  // SVG coordinate helpers — north points up (y=0), east points right (x=0)
  function sx(easting: number) { return easting - minE; }
  function sy(northing: number) { return depthM - (northing - minN); }
  function pts(points: readonly { e: number; n: number }[]) {
    return points.map((p) => `${sx(p.e)},${sy(p.n)}`).join(' ');
  }

  function terrainColor(z: number) {
    const t = (z - minTerrain) / Math.max(0.01, maxTerrain - minTerrain);
    return `hsl(92 24% ${90 - t * 28}%)`;
  }

  // Marker dimensions in SVG units (meters) — scale with the map
  const markerR = widthM * 0.027;
  const fontSize = widthM * 0.024;
  const geocodeR = widthM * 0.016;

  return (
    <div className="evidence-map">
      <svg
        viewBox={`0 0 ${widthM} ${depthM}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="Site context with terrain, streets and LoD2 footprints"
      >
        {/* Terrain heatmap */}
        {siteContextData.terrain.map((sample) => (
          <rect
            className="terrain-cell"
            fill={terrainColor(sample.z)}
            height={8}
            key={`${sample.e}-${sample.n}`}
            width={8}
            x={sx(sample.e)}
            y={sy(sample.n)}
          />
        ))}
        {/* OSM buildings */}
        {siteContextData.osmBuildings.map((building) => (
          <polygon className="osm-building" key={building.id} points={pts(building.points)} />
        ))}
        {/* Roads */}
        {siteContextData.roads.map((road) => (
          <polyline className={`road-line road-${road.type}`} key={road.id} points={pts(road.points)} />
        ))}
        {/* LoD2 candidate footprints */}
        {candidates.map((candidate) => (
          <polygon
            className={`candidate-polygon ${candidate.id === selectedCandidateId ? 'candidate-selected' : ''} ${isConfirmedBuildingPart(candidate.id) ? 'candidate-confirmed' : 'candidate-reference'}`}
            key={candidate.id}
            onClick={() => onSelectCandidate(candidate.id)}
            points={candidate.surfaces.ground.flatMap((s) => s.points).map((p) => `${sx(p.e)},${sy(p.n)}`).join(' ')}
          />
        ))}
        {/* Street labels from site context data */}
        {siteContextData.roads
          .slice(0, 3)
          .map((road) => {
            if (!road.points.length) return null;
            const p = road.points[Math.floor(road.points.length / 2)];
            return (
              <text
                className="street-label"
                dominantBaseline="middle"
                fontSize={fontSize}
                key={`label-${road.name}`}
                textAnchor="middle"
                x={sx(p.e)}
                y={sy(p.n)}
              >
                {road.name}
              </text>
            );
          })}
        {/* Candidate markers — inside SVG so they scale correctly */}
        {candidates.map((candidate, index) => {
          const cx = sx((candidate.bboxUtm32.minE + candidate.bboxUtm32.maxE) / 2);
          const cy = sy((candidate.bboxUtm32.minN + candidate.bboxUtm32.maxN) / 2);
          const isSelected = candidate.id === selectedCandidateId;
          const isConfirmed = isConfirmedBuildingPart(candidate.id);
          const label = getConfirmedPart(candidate.id)?.rank ?? getNeighborReference(candidate.id)?.rank ?? index + 1;
          return (
            <g key={candidate.id} onClick={() => onSelectCandidate(candidate.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={cx} cy={cy} r={markerR}
                className={`map-marker-circle${isSelected ? ' map-marker-selected' : ''}${isConfirmed ? ' map-marker-confirmed' : ''}`}
              />
              <text
                dominantBaseline="central"
                fontSize={fontSize}
                textAnchor="middle"
                x={cx} y={cy}
                className={`map-marker-label${isSelected ? ' map-marker-label-selected' : ''}`}
              >
                {label}
              </text>
            </g>
          );
        })}
        {/* Geocode address point */}
        <circle
          cx={sx(addressPoint.easting)}
          cy={sy(addressPoint.northing)}
          r={geocodeR}
          className="geocode-point-svg"
        />
      </svg>
      <div className="map-meta">
        <strong>Terrain · OSM streets · LoD2 footprints</strong>
        <span>{widthM.toFixed(0)} m × {depthM.toFixed(0)} m · terrain {minTerrain.toFixed(0)}–{maxTerrain.toFixed(0)} m</span>
      </div>
    </div>
  );
}
