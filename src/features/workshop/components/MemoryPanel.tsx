/**
 * MemoryPanel — Erinnerungen für eine Zone erfassen und anzeigen.
 *
 * Erinnerungen sind sensibler als Beobachtungen: Sie haben einen
 * Freigabestatus, eine Zitierbarkeit und optional Personen- oder Rollenbezug.
 * Das Formular macht diese Felder bewusst sichtbar, damit keine persönlichen
 * Inhalte versehentlich als "öffentlich" markiert werden.
 */

import type {
    Citability,
    MemoryReleaseStatus,
    PublicationStatus,
    SensitivityLevel,
} from '@/domain/workshop/types';
import type { Memory } from '@/features/workshop/db/workshopDb';
import { deleteMemory, saveMemory } from '@/features/workshop/db/workshopDb';
import { BookOpen, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SensitivityBadge } from './Badges';

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

function generateMemoryId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `M-${ts}-${rnd}`;
}

// ---------------------------------------------------------------------------
// Option maps
// ---------------------------------------------------------------------------

const RELEASE_OPTIONS: { value: MemoryReleaseStatus; label: string; hint: string }[] = [
    { value: 'not_released', label: 'Nicht freigegeben', hint: 'Nur intern, keine Weitergabe' },
    { value: 'pending_consent', label: 'Zustimmung ausstehend', hint: 'Noch nicht geklärt' },
    { value: 'released', label: 'Freigegeben', hint: 'Nutzung wie vereinbart möglich' },
];

const CITABILITY_OPTIONS: { value: Citability; label: string }[] = [
    { value: 'not_citable', label: 'Nicht zitierbar' },
    { value: 'internal_only', label: 'Nur intern' },
    { value: 'citable_with_context', label: 'Mit Kontext zitierbar' },
    { value: 'freely_citable', label: 'Frei zitierbar' },
];

const SENSITIVITY_OPTIONS: { value: SensitivityLevel; label: string }[] = [
    { value: 'sensitive_personal', label: 'Persönlich sensibel' },
    { value: 'internal', label: 'Intern' },
    { value: 'public', label: 'Öffentlich' },
];

function defaultPublication(s: SensitivityLevel, r: MemoryReleaseStatus): PublicationStatus {
    if (r === 'not_released') return 'do_not_publish';
    if (r === 'pending_consent') return 'needs_review';
    if (s === 'sensitive_personal') return 'anonymize_before_use';
    if (s === 'internal') return 'internal_only';
    return 'publishable';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MemoryPanelProps {
    zoneId: string;
    projectId: string;
    memories: Memory[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MemoryPanel({ zoneId, projectId, memories }: MemoryPanelProps) {
    const [showForm, setShowForm] = useState(false);

    return (
        <section className="ws-detail-section">
            <div className="ws-detail-heading-row">
                <h4 className="ws-detail-heading">
                    <BookOpen size={14} /> Erinnerungen ({memories.length})
                </h4>
                <button
                    className="ws-add-btn"
                    onClick={() => setShowForm((v) => !v)}
                    type="button"
                    title="Erinnerung erfassen"
                >
                    <PlusCircle size={14} />
                    {showForm ? 'Schließen' : 'Erfassen'}
                </button>
            </div>

            {showForm && (
                <MemoryForm
                    zoneId={zoneId}
                    projectId={projectId}
                    onSaved={() => setShowForm(false)}
                />
            )}

            {memories.length > 0 ? (
                <ul className="mem-list">
                    {memories.map((m) => (
                        <MemoryItem key={m.id} memory={m} />
                    ))}
                </ul>
            ) : (
                !showForm && (
                    <p className="ws-empty-state">
                        Noch keine Erinnerungen erfasst. Persönliche Erinnerungen, Zeitzeugenhinweise
                        oder Hinweise auf Holzapfel-Material über „Erfassen" hinzufügen.
                    </p>
                )
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Single memory item
// ---------------------------------------------------------------------------

function MemoryItem({ memory }: { memory: Memory }) {
    const [confirming, setConfirming] = useState(false);

    async function handleDelete() {
        if (!confirming) { setConfirming(true); return; }
        await deleteMemory(memory.id);
    }

    const releaseStyle = releaseStatusStyle(memory.releaseStatus);

    return (
        <li className="mem-item">
            <div className="mem-item-header">
                <span className={`mem-release-badge mem-release-${memory.releaseStatus}`}>
                    {releaseStyle.label}
                </span>
                <span className={`mem-citability-badge mem-citability-${memory.citability}`}>
                    {CITABILITY_OPTIONS.find((o) => o.value === memory.citability)?.label ?? memory.citability}
                </span>
                <SensitivityBadge level={memory.sensitivityLevel} />
                <span className="obs-date">{memory.createdAt.slice(0, 10)}</span>
                <button
                    className={`obs-delete-btn ${confirming ? 'obs-delete-confirm' : ''}`}
                    onClick={handleDelete}
                    onBlur={() => setConfirming(false)}
                    type="button"
                    title={confirming ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
                >
                    <Trash2 size={12} />
                    {confirming ? 'Bestätigen?' : ''}
                </button>
            </div>

            <p className="mem-title">{memory.title}</p>
            <p className="mem-summary">{memory.summary}</p>

            {memory.sourceOrPerson && memory.citability !== 'not_citable' && (
                <p className="obs-meta">Quelle / Person: {memory.sourceOrPerson}</p>
            )}
            {memory.timePeriod && (
                <p className="obs-meta">Zeitraum: {memory.timePeriod}</p>
            )}
            {memory.themes.length > 0 && (
                <div className="mem-themes">
                    {memory.themes.map((t) => (
                        <span key={t} className="mem-theme-tag">{t}</span>
                    ))}
                </div>
            )}
        </li>
    );
}

function releaseStatusStyle(status: MemoryReleaseStatus) {
    if (status === 'released') return { label: 'Freigegeben' };
    if (status === 'pending_consent') return { label: 'Zustimmung ausstehend' };
    return { label: 'Nicht freigegeben' };
}

// ---------------------------------------------------------------------------
// Capture form
// ---------------------------------------------------------------------------

interface MemoryFormState {
    title: string;
    summary: string;
    sourceOrPerson: string;
    timePeriod: string;
    themes: string;
    citability: Citability;
    releaseStatus: MemoryReleaseStatus;
    sensitivityLevel: SensitivityLevel;
    saving: boolean;
    error: string | null;
}

function MemoryForm({
    zoneId,
    projectId,
    onSaved,
}: {
    zoneId: string;
    projectId: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<MemoryFormState>({
        title: '',
        summary: '',
        sourceOrPerson: '',
        timePeriod: '',
        themes: '',
        citability: 'internal_only',
        releaseStatus: 'not_released',
        sensitivityLevel: 'sensitive_personal',
        saving: false,
        error: null,
    });

    function patch(p: Partial<MemoryFormState>) {
        setForm((prev) => ({ ...prev, ...p }));
    }

    async function handleSave() {
        if (!form.title.trim()) {
            patch({ error: 'Titel darf nicht leer sein.' });
            return;
        }
        if (!form.summary.trim()) {
            patch({ error: 'Zusammenfassung darf nicht leer sein.' });
            return;
        }
        patch({ saving: true, error: null });
        const now = new Date().toISOString();
        const memory: Memory = {
            id: generateMemoryId(),
            projectId,
            zoneId,
            title: form.title.trim(),
            summary: form.summary.trim(),
            sourceOrPerson: form.sourceOrPerson.trim() || undefined,
            timePeriod: form.timePeriod.trim() || undefined,
            themes: form.themes.split(',').map((t) => t.trim()).filter(Boolean),
            citability: form.citability,
            releaseStatus: form.releaseStatus,
            sensitivityLevel: form.sensitivityLevel,
            publicationStatus: defaultPublication(form.sensitivityLevel, form.releaseStatus),
            createdAt: now,
        };
        try {
            await saveMemory(memory);
            onSaved();
        } catch (err) {
            patch({
                saving: false,
                error: err instanceof Error ? err.message : 'Fehler beim Speichern.',
            });
        }
    }

    return (
        <div className="obs-form mem-form">
            <div className="mem-form-notice">
                Erinnerungen sind sensibles Material. Standardwerte sind auf „Nicht freigegeben"
                und „Nur intern" gesetzt. Bitte bewusst anpassen.
            </div>

            <label className="obs-form-label">
                Titel *
                <input
                    className="obs-form-input"
                    type="text"
                    placeholder="Kurzer, beschreibender Titel"
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                />
            </label>

            <label className="obs-form-label">
                Zusammenfassung *
                <textarea
                    className="obs-form-textarea"
                    rows={3}
                    placeholder="Was wird erinnert? Kontext, Tonalität, inhaltliche Besonderheit."
                    value={form.summary}
                    onChange={(e) => patch({ summary: e.target.value })}
                />
            </label>

            <div className="obs-form-row">
                <label className="obs-form-label">
                    Quelle / Person (optional)
                    <input
                        className="obs-form-input"
                        type="text"
                        placeholder="Anonymisierbar wenn sensibel"
                        value={form.sourceOrPerson}
                        onChange={(e) => patch({ sourceOrPerson: e.target.value })}
                    />
                </label>
                <label className="obs-form-label">
                    Zeitraum (optional)
                    <input
                        className="obs-form-input"
                        type="text"
                        placeholder="z.B. 1978–1994"
                        value={form.timePeriod}
                        onChange={(e) => patch({ timePeriod: e.target.value })}
                    />
                </label>
            </div>

            <label className="obs-form-label">
                Themen (kommagetrennt)
                <input
                    className="obs-form-input"
                    type="text"
                    placeholder="z.B. Kantine, Unternehmenskultur, Abschiede"
                    value={form.themes}
                    onChange={(e) => patch({ themes: e.target.value })}
                />
            </label>

            <div className="obs-form-row">
                <label className="obs-form-label">
                    Freigabestatus
                    <select
                        className="obs-form-select"
                        value={form.releaseStatus}
                        onChange={(e) => patch({ releaseStatus: e.target.value as MemoryReleaseStatus })}
                    >
                        {RELEASE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </label>
                <label className="obs-form-label">
                    Zitierbarkeit
                    <select
                        className="obs-form-select"
                        value={form.citability}
                        onChange={(e) => patch({ citability: e.target.value as Citability })}
                    >
                        {CITABILITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </label>
                <label className="obs-form-label">
                    Sensitivität
                    <select
                        className="obs-form-select"
                        value={form.sensitivityLevel}
                        onChange={(e) => patch({ sensitivityLevel: e.target.value as SensitivityLevel })}
                    >
                        {SENSITIVITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </label>
            </div>

            {form.error && <p className="obs-form-error">{form.error}</p>}

            <div className="obs-form-actions">
                <button
                    className="obs-save-btn"
                    onClick={handleSave}
                    disabled={form.saving}
                    type="button"
                >
                    {form.saving ? 'Wird gespeichert …' : 'Speichern'}
                </button>
            </div>
        </div>
    );
}
