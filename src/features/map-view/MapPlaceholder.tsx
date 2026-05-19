export function MapPlaceholder({ lat, lon }: { lat?: number; lon?: number }) {
  const hasLocation = lat !== undefined && lon !== undefined;

  return (
    <div className="map-placeholder">
      <div className="site-block main-building" />
      <div className="site-block extension" />
      <div className="road-line" />
      <div className="north-arrow">N</div>
      <div className="map-meta">
        <strong>{hasLocation ? 'Local coordinate configured' : 'Coordinate not configured'}</strong>
        <span>{hasLocation ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : 'Set VITE_PROJECT_LAT and VITE_PROJECT_LON in .env.local'}</span>
      </div>
    </div>
  );
}
