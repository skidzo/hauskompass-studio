/**
 * ObservationPanel — Beobachtungen für eine Zone anzeigen und erfassen.
 *
 * Capture-first: Schnelles Formular zum Festhalten von Beobachtungen vor Ort.
 * Jede Beobachtung hat Text, Quelle, Konfidenz, Sensitivität und optionale
 * Verknüpfung zu einem Asset.
 */

import type { DataConfidence } from '@/domain/DataConfidence';
import type { PublicationStatus, SensitivityLevel } from '@/domain/workshop/types';
import type { ObservationRecord } from '@/features/workshop/db/workshopDb';
import {
    deleteObservation,
    saveObservation,
} from '@/features/workshop/db/workshopDb';
import { Eye, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SensitivityBadge } from './Badges';

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

function generateObsId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `OBS-${ts}-${rnd}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ObservationPanelProps {
    zoneId: string;
    projectId: string;
    observations: ObservationRecord[];
    focusedObservationId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ObservationPanel({ zoneId, projectId, observations, focusedObservationId }: ObservationPanelProps) {
    const [showForm, setShowForm] = useState(false);

    return (
        <section className="ws-detail-section">
            <div className="ws-detail-heading-row">
                <h4 className="ws-detail-heading">
                    <Eye size={14} /> Beobachtungen ({observations.length})
                </h4>
                <button
                    className="ws-add-btn"
                    onClick={() => setShowForm((v) => !v)}
                    type="button"
                    title="Beobachtung erfassen"
                >
                    <PlusCircle size={14} />
                    {showForm ? 'Schließen' : 'Erfassen'}
                </button>
            </div>

            {showForm && (
                <ObservationForm
                    zoneId={zoneId}
                    projectId={projectId}
                    onSaved={() => setShowForm(false)}
                />
            )}

            {observations.length > 0 ? (
                <ul className="obs-list">
                    {observations.map((obs) => (
                        <ObservationItem key={obs.id} obs={obs} focused={obs.id === focusedObservationId} />
                    ))}
                </ul>
            ) : (
                !showForm && (
                    <p className="ws-empty-state">
                        Noch keine Beobachtungen. Erste Beobachtung über „Erfassen" hinzufügen.
                    </p>
                )
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Single observation item with delete
// ---------------------------------------------------------------------------

function ObservationItem({ obs, focused }: { obs: ObservationRecord; focused?: boolean }) {
    const [confirming, setConfirming] = useState(false);

    async function handleDelete() {
        if (!confirming) { setConfirming(true); return; }
        await deleteObservation(obs.id);
    }

    return (
        <li className={`obs-item${focused ? ' ws-focused-evidence' : ''}`}>
            <div className="obs-item-header">
                <span className="obs-epistemic-badge obs-epistemic-observation">
                    Beobachtung
                </span>
                <SensitivityBadge level={obs.sensitivityLevel} />
                <span className="obs-date">{obs.createdAt.slice(0, 10)}</span>
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
            <p className="obs-text">{obs.text}</p>
            {obs.observer && (
                <p className="obs-meta">Beobachter: {obs.observer}</p>
            )}
            <div className="obs-confidence">
                Konfidenz: <ConfidenceDots confidence={obs.confidence} />
            </div>
        </li>
    );
}

// ---------------------------------------------------------------------------
// Capture form
// ---------------------------------------------------------------------------

const CONFIDENCE_OPTIONS: { value: DataConfidence; label: string }[] = [
    { value: 'high', label: 'Hoch — direkt beobachtet' },
    { value: 'medium', label: 'Mittel — wahrscheinlich' },
    { value: 'low', label: 'Niedrig — unsicher' },
    { value: 'unknown', label: 'Unbekannt' },
];

const SENSITIVITY_OPTIONS: { value: SensitivityLevel; label: string }[] = [
    { value: 'public', label: 'Öffentlich' },
    { value: 'internal', label: 'Intern' },
    { value: 'sensitive_personal', label: 'Persönlich sensibel' },
];

function defaultPublication(s: SensitivityLevel): PublicationStatus {
    if (s === 'public') return 'publishable';
    if (s === 'sensitive_personal') return 'do_not_publish';
    return 'needs_review';
}

interface FormState {
    text: string;
    observer: string;
    confidence: DataConfidence;
    sensitivityLevel: SensitivityLevel;
    saving: boolean;
    error: string | null;
}

function ObservationForm({
    zoneId,
    projectId,
    onSaved,
}: {
    zoneId: string;
    projectId: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<FormState>({
        text: '',
        observer: '',
        confidence: 'medium',
        sensitivityLevel: 'internal',
        saving: false,
        error: null,
    });

    function patch(p: Partial<FormState>) {
        setForm((prev) => ({ ...prev, ...p }));
    }

    async function handleSave() {
        if (!form.text.trim()) {
            patch({ error: 'Beobachtungstext darf nicht leer sein.' });
            return;
        }
        patch({ saving: true, error: null });
        const now = new Date().toISOString();
        const obs: ObservationRecord = {
            id: generateObsId(),
            projectId,
            zoneId,
            text: form.text.trim(),
            observer: form.observer.trim() || undefined,
            observedAt: now,
            linkedAssetIds: [],
            epistemic: 'observation',
            confidence: form.confidence,
            sensitivityLevel: form.sensitivityLevel,
            publicationStatus: defaultPublication(form.sensitivityLevel),
            createdAt: now,
        };
        try {
            await saveObservation(obs);
            onSaved();
        } catch (err) {
            patch({
                saving: false,
                error: err instanceof Error ? err.message : 'Fehler beim Speichern.',
            });
        }
    }

    return (
        <div className="obs-form">
            <label className="obs-form-label">
                Beobachtung *
                <textarea
                    className="obs-form-textarea"
                    rows={3}
                    placeholder="Was ist sichtbar, messbar oder erlebt worden?"
                    value={form.text}
                    onChange={(e) => patch({ text: e.target.value })}
                />
            </label>

            <label className="obs-form-label">
                Beobachter (optional)
                <input
                    className="obs-form-input"
                    type="text"
                    placeholder="Name oder Rolle"
                    value={form.observer}
                    onChange={(e) => patch({ observer: e.target.value })}
                />
            </label>

            <div className="obs-form-row">
                <label className="obs-form-label">
                    Konfidenz
                    <select
                        className="obs-form-select"
                        value={form.confidence}
                        onChange={(e) => patch({ confidence: e.target.value as DataConfidence })}
                    >
                        {CONFIDENCE_OPTIONS.map((o) => (
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

// ---------------------------------------------------------------------------
// Confidence dots visualizer
// ---------------------------------------------------------------------------

function ConfidenceDots({ confidence }: { confidence: DataConfidence }) {
    const map: Record<DataConfidence, number> = { high: 3, medium: 2, low: 1, unknown: 0 };
    const filled = map[confidence] ?? 0;
    const labels: Record<DataConfidence, string> = {
        high: 'Hoch', medium: 'Mittel', low: 'Niedrig', unknown: 'Unbekannt',
    };
    return (
        <span className="obs-confidence-dots" title={labels[confidence] ?? ''}>
            {[1, 2, 3].map((i) => (
                <span key={i} className={`obs-dot ${i <= filled ? 'obs-dot-filled' : 'obs-dot-empty'}`} />
            ))}
            <span className="obs-confidence-label">{labels[confidence] ?? confidence}</span>
        </span>
    );
}
