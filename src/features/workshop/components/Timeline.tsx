import type { EventPhase } from '@/domain/workshop/types';

const PHASE_COLOR: Record<string, string> = {
    planning: '#1565c0',
    construction: '#1b5e20',
    operation: '#2e7d32',
    transition: '#e65100',
    vacancy: '#546e7a',
    reuse: '#6a1b9a',
    workshop: '#6a1b9a',
    documentation: '#827717',
    other: '#90a4ae',
};

const PHASE_LABEL: Record<string, string> = {
    planning: 'Planung',
    construction: 'Bau',
    operation: 'Betrieb',
    transition: 'Wandel',
    vacancy: 'Leerstand',
    reuse: 'Nachnutzung',
    workshop: 'Workshop',
    documentation: 'Dokumentation',
    other: 'Sonstiges',
};

interface TimelineProps {
    phases: EventPhase[];
}

export function Timeline({ phases }: TimelineProps) {
    if (phases.length === 0) {
        return <p className="ws-empty-state">Keine historischen Phasen geladen.</p>;
    }

    return (
        <div className="ws-timeline">
            {phases.map((phase, i) => {
                const color = PHASE_COLOR[phase.phaseType] ?? '#90a4ae';
                const label = PHASE_LABEL[phase.phaseType] ?? phase.phaseType;
                const yearRange = [phase.startYear, phase.endYear]
                    .filter(Boolean).join('–');
                return (
                    <div key={phase.id} className="ws-timeline-item">
                        <div className="ws-timeline-indicator">
                            <div className="ws-timeline-dot" style={{ background: color }} />
                            {i < phases.length - 1 && <div className="ws-timeline-line" />}
                        </div>
                        <div className="ws-timeline-content">
                            <div className="ws-timeline-header">
                                <span className="ws-timeline-type" style={{ color, borderColor: color + '44', background: color + '12' }}>
                                    {label}
                                </span>
                                {yearRange && (
                                    <span className="ws-timeline-years">{yearRange}</span>
                                )}
                            </div>
                            <h4 className="ws-timeline-title">{phase.title}</h4>
                            <p className="ws-timeline-desc">{phase.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
