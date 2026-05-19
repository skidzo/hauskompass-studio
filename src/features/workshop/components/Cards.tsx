import type { ClaimRecord, Question } from '@/features/workshop/db/workshopDb';
import { AlertCircle, CheckCircle2, Circle, Clock, HelpCircle, MessageSquare } from 'lucide-react';
import { EpistemicBadge, SensitivityBadge } from './Badges';

// ---------------------------------------------------------------------------
// ClaimCard
// ---------------------------------------------------------------------------

const REVIEW_ICON: Record<string, React.ReactNode> = {
    confirmed: <CheckCircle2 size={14} color="#2e7d32" />,
    rejected: <AlertCircle size={14} color="#b71c1c" />,
    under_review: <Clock size={14} color="#e65100" />,
    unreviewed: <Circle size={14} color="#90a4ae" />,
    needs_revision: <AlertCircle size={14} color="#827717" />,
};

export function ClaimCard({ claim }: { claim: ClaimRecord }) {
    return (
        <div className="ws-card ws-claim-card">
            <div className="ws-card-badges">
                <EpistemicBadge type={claim.epistemic} />
                <SensitivityBadge level={claim.sensitivityLevel} />
                {REVIEW_ICON[claim.reviewStatus]}
            </div>
            <p className="ws-card-statement">{claim.statement}</p>
            {claim.counterArguments && claim.counterArguments.length > 0 && (
                <details className="ws-card-counter">
                    <summary>
                        <MessageSquare size={12} /> Gegenargument ({claim.counterArguments.length})
                    </summary>
                    {claim.counterArguments.map((ca, i) => (
                        <p key={i} className="ws-card-counter-text">{ca}</p>
                    ))}
                </details>
            )}
            <div className="ws-card-meta">
                <span>{claim.claimType}</span>
                {claim.sourceRefs.length > 0 && <span>Quellen: {claim.sourceRefs.length}</span>}
                <span className="ws-card-id">{claim.id}</span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------

const PRIORITY_COLOR: Record<string, string> = {
    critical: '#b71c1c',
    high: '#e65100',
    medium: '#1565c0',
    low: '#546e7a',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    open: <HelpCircle size={14} color="#e65100" />,
    in_progress: <Clock size={14} color="#1565c0" />,
    answered: <CheckCircle2 size={14} color="#2e7d32" />,
    deferred: <Circle size={14} color="#90a4ae" />,
    out_of_scope: <Circle size={14} color="#cfd8dc" />,
};

export function QuestionCard({ question }: { question: Question }) {
    const color = PRIORITY_COLOR[question.priority] ?? '#546e7a';
    return (
        <div className="ws-card ws-question-card" style={{ borderLeft: `3px solid ${color}` }}>
            <div className="ws-card-badges">
                {STATUS_ICON[question.status]}
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color }}>
                    {question.priority.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#90a4ae' }}>{question.questionType}</span>
            </div>
            <p className="ws-card-statement">{question.text}</p>
            {question.nextCheckStep && (
                <p className="ws-card-hint">→ {question.nextCheckStep}</p>
            )}
            <div className="ws-card-meta">
                {question.requiredExpertise && question.requiredExpertise.length > 0 && (
                    <span>Fachgebiet: {question.requiredExpertise.join(', ')}</span>
                )}
                <span className="ws-card-id">{question.id}</span>
            </div>
        </div>
    );
}
