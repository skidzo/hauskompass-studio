/**
 * InterpretationPanel — Verbindungsglied in der Evidenzkette: Beobachtungen → Deutungen → Aussagen
 *
 * Deutungen (Interpretations) verdichten Beobachtungen zu einem interpretativen Rahmen,
 * bevor sie zu gesicherten Aussagen (Claims) werden. Sie können mehrere Beobachtungen
 * aus einer Zone verknüpfen und enthalten explizite Gegenpositionen.
 */

import type { DataConfidence } from '@/domain/DataConfidence';
import type { Interpretation, ObservationRecord } from '@/features/workshop/db/workshopDb';
import { deleteInterpretation, saveInterpretation } from '@/features/workshop/db/workshopDb';
import { Brain, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InterpretationPanelProps {
    zoneId: string;
    projectId: string;
    interpretations: Interpretation[];
    /** Available zone observations, so user can link them. */
    observations: ObservationRecord[];
    focusedInterpretationId?: string;
}

interface InterpretationFormProps {
    zoneId: string;
    projectId: string;
    observations: ObservationRecord[];
    onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INT-${ts}-${rnd}`;
}

const CONFIDENCE_LABELS: Record<DataConfidence, string> = {
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
    unknown: 'Unbekannt',
};

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function InterpretationPanel({
    zoneId,
    projectId,
    interpretations,
    observations,
    focusedInterpretationId,
}: InterpretationPanelProps) {
    const [showForm, setShowForm] = useState(false);

    return (
        <section className="ws-detail-section">
            <div className="ws-detail-heading-row">
                <h4 className="ws-detail-heading">
                    <Brain size={14} /> Deutungen ({interpretations.length})
                </h4>
                <button
                    className="ws-add-btn"
                    onClick={() => setShowForm((v) => !v)}
                    type="button"
                >
                    <PlusCircle size={14} />
                    {showForm ? 'Schließen' : 'Neue Deutung'}
                </button>
            </div>

            {showForm && (
                <InterpretationForm
                    zoneId={zoneId}
                    projectId={projectId}
                    observations={observations}
                    onSaved={() => setShowForm(false)}
                />
            )}

            {interpretations.length > 0 ? (
                <ul className="interp-list">
                    {interpretations.map((i) => (
                        <InterpretationItem
                            key={i.id}
                            interp={i}
                            observations={observations}
                            focused={i.id === focusedInterpretationId}
                        />
                    ))}
                </ul>
            ) : (
                !showForm && (
                    <p className="ws-empty-state">
                        Noch keine Deutungen. Beobachtungen zu einem Interpretationsrahmen
                        verdichten — Zwischenschritt zur Aussagenbildung.
                    </p>
                )
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Interpretation form
// ---------------------------------------------------------------------------

function InterpretationForm({
    zoneId,
    projectId,
    observations,
    onSaved,
}: InterpretationFormProps) {
    const [text, setText] = useState('');
    const [confidence, setConfidence] = useState<DataConfidence>('medium');
    const [epistemic, setEpistemic] = useState<'interpretation' | 'hypothesis'>('interpretation');
    const [selectedObsIds, setSelectedObsIds] = useState<string[]>([]);
    const [counterText, setCounterText] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    function toggleObs(id: string) {
        setSelectedObsIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    async function handleSave() {
        if (!text.trim()) { setError('Deutungstext ist erforderlich.'); return; }
        setError('');
        setSaving(true);

        const interp: Interpretation = {
            id: generateId(),
            projectId,
            zoneId,
            text: text.trim(),
            basedOnObservationIds: selectedObsIds,
            confidence,
            epistemic,
            counterPositions: counterText.trim() ? [counterText.trim()] : [],
            sensitivityLevel: 'internal',
            publicationStatus: 'needs_review',
            createdAt: new Date().toISOString(),
        };

        try {
            await saveInterpretation(interp);
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="interp-form">
            {/* Observation linker */}
            {observations.length > 0 && (
                <div className="interp-form-obs-picker">
                    <label className="interp-form-label">
                        Gestützt auf Beobachtungen (optional):
                    </label>
                    <div className="interp-obs-checkboxes">
                        {observations.map((o) => (
                            <label key={o.id} className="interp-obs-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={selectedObsIds.includes(o.id)}
                                    onChange={() => toggleObs(o.id)}
                                />
                                <span className="interp-obs-preview">
                                    {o.text.slice(0, 70)}{o.text.length > 70 ? '…' : ''}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Interpretation text */}
            <label className="interp-form-label">
                Deutung *
            </label>
            <textarea
                className="obs-form-textarea interp-form-textarea"
                onChange={(e) => setText(e.target.value)}
                placeholder="Was bedeuten diese Beobachtungen? Welches Muster oder welche These ergibt sich?"
                rows={4}
                value={text}
            />

            {/* Type + confidence row */}
            <div className="obs-form-row">
                <div>
                    <label className="interp-form-label">Typ</label>
                    <select
                        className="obs-form-select"
                        value={epistemic}
                        onChange={(e) => setEpistemic(e.target.value as 'interpretation' | 'hypothesis')}
                    >
                        <option value="interpretation">Interpretation — belegt</option>
                        <option value="hypothesis">Hypothese — spekulativ</option>
                    </select>
                </div>
                <div>
                    <label className="interp-form-label">Belastbarkeit</label>
                    <select
                        className="obs-form-select"
                        value={confidence}
                        onChange={(e) => setConfidence(e.target.value as DataConfidence)}
                    >
                        {(Object.keys(CONFIDENCE_LABELS) as DataConfidence[]).map((k) => (
                            <option key={k} value={k}>{CONFIDENCE_LABELS[k]}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Counter-position */}
            <label className="interp-form-label">
                Gegenposition (optional)
            </label>
            <textarea
                className="obs-form-textarea"
                onChange={(e) => setCounterText(e.target.value)}
                placeholder="Welches Argument spricht gegen diese Deutung?"
                rows={2}
                value={counterText}
            />

            {error && <p className="obs-form-error">{error}</p>}

            <div className="obs-form-actions">
                <button
                    className="obs-save-btn"
                    disabled={saving}
                    onClick={handleSave}
                    type="button"
                >
                    {saving ? 'Speichert …' : 'Deutung speichern'}
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Interpretation item
// ---------------------------------------------------------------------------

function InterpretationItem({
    interp,
    observations,
    focused,
}: {
    interp: Interpretation;
    observations: ObservationRecord[];
    focused?: boolean;
}) {
    const [confirming, setConfirming] = useState(false);

    const linkedObs = observations.filter((o) =>
        interp.basedOnObservationIds.includes(o.id),
    );

    async function handleDelete() {
        if (!confirming) { setConfirming(true); return; }
        await deleteInterpretation(interp.id);
    }

    return (
        <li className={`interp-item${focused ? ' ws-focused-evidence' : ''}`}>
            <div className="interp-item-header">
                <span className={`interp-epistemic-badge interp-epistemic-${interp.epistemic}`}>
                    {interp.epistemic === 'interpretation' ? 'Deutung' : 'Hypothese'}
                </span>
                <span className="interp-confidence-label">
                    {CONFIDENCE_LABELS[interp.confidence]}
                </span>
                <button
                    className={`obs-delete-btn ${confirming ? 'obs-delete-btn-confirm' : ''}`}
                    onClick={handleDelete}
                    onBlur={() => setConfirming(false)}
                    type="button"
                    title={confirming ? 'Nochmal klicken zum Löschen' : 'Deutung entfernen'}
                >
                    <Trash2 size={11} />
                    {confirming ? '?' : ''}
                </button>
            </div>

            <p className="interp-text">{interp.text}</p>

            {linkedObs.length > 0 && (
                <div className="interp-obs-links">
                    <span className="interp-obs-links-label">Gestützt auf:</span>
                    {linkedObs.map((o) => (
                        <span key={o.id} className="interp-obs-link-tag">
                            {o.text.slice(0, 55)}{o.text.length > 55 ? '…' : ''}
                        </span>
                    ))}
                </div>
            )}

            {interp.counterPositions && interp.counterPositions.length > 0 && (
                <div className="interp-counter">
                    <span className="interp-counter-label">Gegenposition:</span>
                    {interp.counterPositions.map((cp, i) => (
                        <span key={i} className="interp-counter-text">{cp}</span>
                    ))}
                </div>
            )}
        </li>
    );
}
