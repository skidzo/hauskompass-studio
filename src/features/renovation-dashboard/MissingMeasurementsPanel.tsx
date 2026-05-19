import { OUTCOME_COLORS, PRIORITY_COLORS, STREAM_COLORS, STREAM_LABELS, type ReuseStream } from '@/features/deconstruction/deconstructionTypes';
import { measurementTasks } from '@/features/deconstruction/measurementTasks';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hauskompass.inspections';
const streams: ReuseStream[] = ['timber', 'masonry', 'finishes', 'documentation'];

export function MissingMeasurementsPanel() {
  const [inspections, setInspections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setInspections(JSON.parse(raw) as Record<string, boolean>);
      }
    } catch {
      // Ignore invalid local state and continue with an empty checklist.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));
  }, [inspections]);

  const groupedTasks = useMemo(
    () =>
      streams.map((stream) => ({
        stream,
        tasks: measurementTasks.filter((task) => task.reuseStream === stream),
      })),
    [],
  );

  return (
    <section className="panel">
      <div className="panel-title">Abbruch-Inspektionskatalog</div>
      <p className="panel-copy">
        Aufgaben sind nach Materialwiederverwendungs-Stream gruppiert, damit bei der Begehung direkte Wiederverwendung, Downcycling oder Entsorgung mit konsistenten Befunden entschieden werden kann.
      </p>
      <div className="stream-section-stack">
        {groupedTasks.map(({ stream, tasks }) => {
          const completed = tasks.filter((task) => inspections[task.id]).length;
          return (
            <section key={stream} className="stream-section" style={{ borderColor: `${STREAM_COLORS[stream]}33` }}>
              <div className="stream-section-head">
                <div>
                  <div className="stream-section-title" style={{ color: STREAM_COLORS[stream] }}>{STREAM_LABELS[stream]}</div>
                  <div className="muted">{tasks.length} Inspektionsaufgaben</div>
                </div>
                <span className="stream-count-badge" style={{ background: `${STREAM_COLORS[stream]}14`, color: STREAM_COLORS[stream] }}>
                  {completed} / {tasks.length} geprüft
                </span>
              </div>
              <div className="stream-task-list">
                {tasks.map((task) => (
                  <article
                    key={task.id}
                    className={`inspection-card ${inspections[task.id] ? 'inspection-card-checked' : ''}`}
                    style={{ borderLeftColor: PRIORITY_COLORS[task.priority] }}
                  >
                    <label className="inspection-check">
                      <input
                        checked={Boolean(inspections[task.id])}
                        onChange={(event) =>
                          setInspections((current) => ({ ...current, [task.id]: event.target.checked }))
                        }
                        type="checkbox"
                      />
                    </label>
                    <div className="inspection-card-head">
                      <div>
                        <strong>{task.label}</strong>
                        <div className="inspection-meta-row">
                          <span className="mini-pill" style={{ color: PRIORITY_COLORS[task.priority], background: `${PRIORITY_COLORS[task.priority]}18` }}>{task.priority}</span>
                          <span className="mini-pill" style={{ color: OUTCOME_COLORS[task.reuseOutcome], background: `${OUTCOME_COLORS[task.reuseOutcome]}18` }}>{task.reuseOutcome}</span>
                          <span className="mini-pill">{task.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="inspection-copy"><strong>Warum:</strong> {task.why}</div>
                    <div className="inspection-copy"><strong>Wie:</strong> {task.how}</div>
                    {task.shotIds.length > 0 && (
                      <div className="inspection-copy"><strong>Fotos:</strong> {task.shotIds.join(', ')}</div>
                    )}
                    {task.blockedBy && (
                      <div className="inspection-warning">{task.blockedBy}</div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
