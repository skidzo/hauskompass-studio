import { useMemo, useState } from 'react';
import { PRIORITY_COLORS, STREAM_COLORS, type ReuseStream } from './deconstructionTypes';
import { inspectionShotList, reconstructionCaptureProtocol } from './inspectionShotList';
import { measurementTasksById } from './measurementTasks';

const FILTERS: Array<{ id: 'all' | ReuseStream; label: string }> = [
  { id: 'all', label: 'Alle' },
  { id: 'timber', label: 'Holz' },
  { id: 'masonry', label: 'Mauerwerk' },
  { id: 'finishes', label: 'Ausbau/Deckung' },
  { id: 'documentation', label: 'Dokumentation' },
];

const STREAM_LABELS_DE: Record<ReuseStream, string> = {
  timber: 'Holz',
  masonry: 'Mauerwerk',
  finishes: 'Ausbau/Deckung',
  documentation: 'Dokumentation',
};

const ZONE_COLORS: Record<(typeof inspectionShotList)[number]['zone'], string> = {
  'exterior-south': '#2a4a6a',
  'exterior-north': '#2a4a6a',
  'exterior-east': '#2a4a6a',
  'exterior-west': '#2a4a6a',
  attic: '#5a3a1a',
  'ground-floor': '#2a3a2a',
  cellar: '#2a3a2a',
  junction: '#3a2a4a',
  'roof-surface': '#4a3a1a',
};

const ZONE_LABELS: Record<(typeof inspectionShotList)[number]['zone'], string> = {
  'exterior-south': 'Außen Süd',
  'exterior-north': 'Außen Nord',
  'exterior-east': 'Außen Ost',
  'exterior-west': 'Außen West',
  attic: 'Dachraum',
  'ground-floor': 'Erdgeschoss',
  cellar: 'Keller',
  junction: 'Anschluss',
  'roof-surface': 'Dachfläche',
};

export function InspectionShotListPanel() {
  const [filter, setFilter] = useState<'all' | ReuseStream>('all');

  const shots = useMemo(
    () => inspectionShotList.filter((shot) => filter === 'all' || shot.linkedReuseStreams.includes(filter)),
    [filter],
  );

  return (
    <section className="panel">
      <div className="panel-title">Fotoliste für Begehung und 3D-Rekonstruktion</div>
      <p className="panel-copy">
        Jeder Eintrag S01-S20 ist ein Aufnahmeblock, kein einzelnes Foto. Pro Block mehrere überlappende Fotos aufnehmen
        und mindestens eine Laserdistanz vom Foto-Standort zu einem festen, sichtbaren Referenzpunkt protokollieren.
      </p>
      <div className="inspection-protocol">
        {reconstructionCaptureProtocol.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="filter-pill-row" style={{ marginBottom: 14 }}>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            className={`filter-pill ${filter === item.id ? 'filter-pill-active' : ''}`}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="shot-grid">
        {shots.map((shot) => (
          <article key={shot.id} className="shot-card">
            <div className="shot-card-head">
              <span className="shot-index">{shot.id}</span>
              <span className="shot-zone" style={{ background: `${ZONE_COLORS[shot.zone]}15`, color: ZONE_COLORS[shot.zone] }}>
                {ZONE_LABELS[shot.zone]}
              </span>
            </div>
            <div className="shot-streams">
              {shot.linkedReuseStreams.map((stream) => (
                <span key={stream} className="stream-inline" style={{ color: STREAM_COLORS[stream] }}>
                  {STREAM_LABELS_DE[stream]}
                </span>
              ))}
            </div>
            <strong className="shot-subject">{shot.subject}</strong>
            <div className="shot-detail"><span>Stand</span>{shot.standoff}</div>
            <div className="shot-detail"><span>Blick</span>{shot.angle}</div>
            <div className="shot-detail"><span>Referenzpunkt</span>{shot.reference}</div>
            <div className="shot-detail"><span>Foto-Serie</span>{shot.captureSeries}</div>
            <div className="shot-detail"><span>Laserdistanz</span>{shot.laserMeasurement}</div>
            <div className="shot-detail"><span>3D-Nutzen</span>{shot.reconstructionUse}</div>
            <div className="shot-purpose">{shot.purpose}</div>
            <div className="shot-task-row">
              {shot.linkedTaskIds.map((taskId) => {
                const task = measurementTasksById[taskId];
                return (
                  <span key={taskId} className="task-link-pill" style={{ borderColor: `${PRIORITY_COLORS[task.priority]}55` }}>
                    {task.label}
                    <i style={{ background: PRIORITY_COLORS[task.priority] }} />
                  </span>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
