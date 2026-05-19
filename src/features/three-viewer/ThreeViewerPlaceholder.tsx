import type { BuildingHull } from '@/domain/BuildingHull';

export function ThreeViewerPlaceholder({ hull }: { hull: BuildingHull }) {
  return (
    <div className="viewer-placeholder">
      <div className="house-shape">
        <div className="roof-plane roof-left" />
        <div className="roof-plane roof-right" />
        <div className="house-body" />
      </div>
      <div className="viewer-meta">
        <strong>{hull.source.toUpperCase()} hull placeholder</strong>
        <span>{hull.roofSurfaces.length} roof candidates, {hull.wallSurfaces.length} wall candidates</span>
        <span>Terrain loaded: {hull.surroundingContext.terrainLoaded ? 'yes' : 'no'}</span>
      </div>
    </div>
  );
}
