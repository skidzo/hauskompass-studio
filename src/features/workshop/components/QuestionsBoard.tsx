/**
 * QuestionsBoard — Alle offenen Prüffragen über alle Zonen, nach Priorität sortiert.
 *
 * Handoff-Anforderung §4.8: "Offene-Prüffragen-Liste: Alle wichtigen offenen Fragen
 * sind sichtbar, priorisiert und mit möglichen Prüfwegen versehen."
 */

import type { Question, Zone } from '@/domain/workshop/types';
import { HelpCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
    critical: { label: 'Kritisch', color: '#b71c1c' },
    high: { label: 'Hoch', color: '#e65100' },
    medium: { label: 'Mittel', color: '#1565c0' },
    low: { label: 'Niedrig', color: '#546e7a' },
};

const TYPE_LABEL: Record<string, string> = {
    spatial: 'Räumlich',
    historical: 'Historisch',
    technical: 'Technisch',
    ecological: 'Ökologisch',
    governance: 'Governance',
    social: 'Sozial',
    other: 'Sonstige',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuestionsBoardProps {
    questions: Question[];
    zones: Zone[];
    onSelectZone?: (zoneId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestionsBoard({ questions, zones, onSelectZone }: QuestionsBoardProps) {
    const zoneMap = new Map(zones.map((z) => [z.id, z]));

    const open = questions
        .filter((q) => q.status === 'open' || q.status === 'in_progress')
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

    if (open.length === 0) {
        return (
            <div className="qb-empty">
                <HelpCircle size={28} color="#90a4ae" />
                <p>Keine offenen Prüffragen vorhanden.</p>
            </div>
        );
    }

    // Group by priority bucket
    const buckets: Record<string, Question[]> = {};
    for (const q of open) {
        const key = q.priority ?? 'medium';
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(q);
    }

    const bucketOrder = ['critical', 'high', 'medium', 'low'];

    return (
        <div className="qb-board">
            <div className="qb-summary">
                <HelpCircle size={14} />
                {open.length} offene Prüffragen in {Object.keys(buckets).length} Prioritätsstufen
            </div>

            {bucketOrder.filter((b) => buckets[b]?.length > 0).map((bucket) => {
                const style = PRIORITY_LABEL[bucket] ?? { label: bucket, color: '#90a4ae' };
                return (
                    <div key={bucket} className="qb-bucket">
                        <h4 className="qb-bucket-heading" style={{ borderColor: style.color }}>
                            <span className="qb-priority-dot" style={{ background: style.color }} />
                            {style.label} — {buckets[bucket].length} Fragen
                        </h4>
                        <ul className="qb-list">
                            {buckets[bucket].map((q) => (
                                <QuestionItem
                                    key={q.id}
                                    question={q}
                                    zone={q.zoneId ? zoneMap.get(q.zoneId) : undefined}
                                    onSelectZone={onSelectZone}
                                />
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Single question item
// ---------------------------------------------------------------------------

function QuestionItem({
    question,
    zone,
    onSelectZone,
}: {
    question: Question;
    zone: Zone | undefined;
    onSelectZone?: (zoneId: string) => void;
}) {
    const typeLabel = TYPE_LABEL[question.questionType] ?? question.questionType;

    return (
        <li className="qb-item">
            <div className="qb-item-header">
                <span className="qb-type-badge">{typeLabel}</span>
                {question.status === 'in_progress' && (
                    <span className="qb-status-badge qb-status-progress">In Bearbeitung</span>
                )}
                {zone && (
                    <button
                        className="qb-zone-link"
                        onClick={() => onSelectZone?.(zone.id)}
                        type="button"
                        title={`Zone öffnen: ${zone.name}`}
                    >
                        {zone.name}
                    </button>
                )}
            </div>

            <p className="qb-item-text">{question.text}</p>

            {question.nextCheckStep && (
                <p className="qb-next-step">
                    <strong>Nächster Schritt:</strong> {question.nextCheckStep}
                </p>
            )}

            {question.requiredExpertise && question.requiredExpertise.length > 0 && (
                <div className="qb-expertise">
                    {question.requiredExpertise.map((e) => (
                        <span key={e} className="qb-expertise-tag">{e}</span>
                    ))}
                </div>
            )}
        </li>
    );
}
