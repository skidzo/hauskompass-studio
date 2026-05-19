import type { EpistemicType, PublicationStatus, SensitivityLevel } from '@/domain/workshop/types';

// ---------------------------------------------------------------------------
// SensitivityBadge
// ---------------------------------------------------------------------------

const SENSITIVITY_CONFIG: Record<SensitivityLevel, { label: string; color: string }> = {
    public: { label: 'Öffentlich', color: '#2e7d32' },
    internal: { label: 'Intern', color: '#1565c0' },
    sensitive_personal: { label: 'Personenbez.', color: '#b71c1c' },
    restricted: { label: 'Beschränkt', color: '#6a1b9a' },
    unknown: { label: 'Unklassifiziert', color: '#795548' },
};

export function SensitivityBadge({ level }: { level: SensitivityLevel }) {
    const cfg = SENSITIVITY_CONFIG[level];
    return (
        <span
            style={{
                display: 'inline-block',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '4px',
                background: cfg.color + '18',
                color: cfg.color,
                border: `1px solid ${cfg.color}44`,
                letterSpacing: '0.02em',
            }}
        >
            {cfg.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// EpistemicBadge
// ---------------------------------------------------------------------------

const EPISTEMIC_CONFIG: Record<EpistemicType, { label: string; color: string; title: string }> = {
    verified_fact: { label: 'Fakt', color: '#1b5e20', title: 'Geprüfte historische Tatsache' },
    observation: { label: 'Beobachtung', color: '#0d47a1', title: 'Direkt beobachtet / dokumentiert' },
    interpretation: { label: 'Deutung', color: '#e65100', title: 'Aus Beobachtungen abgeleitet' },
    memory: { label: 'Erinnerung', color: '#4a148c', title: 'Persönliche Erinnerung oder Zeitzeugenaussage' },
    hypothesis: { label: 'Hypothese', color: '#827717', title: 'Plausibel, aber ungeprüft' },
    disputed_claim: { label: 'Strittig', color: '#b71c1c', title: 'Strittige These mit Gegenargumenten' },
    open_question: { label: 'Offene Frage', color: '#546e7a', title: 'Noch nicht geklärte Prüffrage' },
};

export function EpistemicBadge({ type }: { type: EpistemicType }) {
    const cfg = EPISTEMIC_CONFIG[type];
    return (
        <span
            title={cfg.title}
            style={{
                display: 'inline-block',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '4px',
                background: cfg.color + '18',
                color: cfg.color,
                border: `1px solid ${cfg.color}44`,
                letterSpacing: '0.02em',
                cursor: 'help',
            }}
        >
            {cfg.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// PublicationBadge
// ---------------------------------------------------------------------------

const PUBLICATION_CONFIG: Record<PublicationStatus, { label: string; color: string }> = {
    publishable: { label: '✓ Freigegeben', color: '#2e7d32' },
    needs_review: { label: '⏳ Prüfen', color: '#e65100' },
    anonymize_before_use: { label: '⚠ Anonymisieren', color: '#b71c1c' },
    internal_only: { label: '⊘ Nur intern', color: '#1565c0' },
    do_not_publish: { label: '✕ Gesperrt', color: '#6a1b9a' },
};

export function PublicationBadge({ status }: { status: PublicationStatus }) {
    const cfg = PUBLICATION_CONFIG[status];
    return (
        <span
            style={{
                display: 'inline-block',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '4px',
                background: cfg.color + '18',
                color: cfg.color,
                border: `1px solid ${cfg.color}44`,
                letterSpacing: '0.02em',
            }}
        >
            {cfg.label}
        </span>
    );
}
