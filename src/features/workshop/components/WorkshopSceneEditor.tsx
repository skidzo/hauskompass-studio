import type {
    Claim,
    Observation,
    PublicationStatus,
    Question,
    SensitivityLevel,
    WorkshopScene,
    WorkshopSceneExportStatus,
    WorkshopSceneVisibility,
} from '@/domain/workshop/types';
import type { AssetRecord } from '@/features/workshop/db/workshopDb';
import { saveWorkshopScene } from '@/features/workshop/db/workshopDb';
import { normalizeScenePublicationForAssets } from '@/features/workshop/sceneSafety';
import { AlertTriangle, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface WorkshopSceneEditorProps {
    projectId: string;
    scene?: WorkshopScene | null;
    scenes: WorkshopScene[];
    assets: AssetRecord[];
    observations: Observation[];
    claims: Claim[];
    questions: Question[];
    onCancel: () => void;
    onSaved: (sceneId: string) => void;
}

interface SceneFormState {
    title: string;
    guidingQuestion: string;
    contextText: string;
    discussionPrompt: string;
    dramaturgy: string;
    targetAudience: string;
    selectedAssetIds: string[];
    selectedObservationIds: string[];
    selectedClaimIds: string[];
    selectedQuestionIds: string[];
    manualObservations: string;
    manualInterpretations: string;
    manualQuestions: string;
    exportStatus: WorkshopSceneExportStatus;
    visibility: WorkshopSceneVisibility;
    sensitivityLevel: SensitivityLevel;
    publicationStatus: PublicationStatus;
}

function generateSceneId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `WS-${ts}-${rnd}`;
}

function splitLines(value: string): string[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function unique(items: string[]): string[] {
    return Array.from(new Set(items));
}

function buildInitialState(scene?: WorkshopScene | null): SceneFormState {
    return {
        title: scene?.title ?? '',
        guidingQuestion: scene?.guidingQuestion ?? '',
        contextText: scene?.contextText ?? '',
        discussionPrompt: scene?.discussionPrompt ?? '',
        dramaturgy: scene?.dramaturgy ?? '',
        targetAudience: scene?.targetAudience ?? '',
        selectedAssetIds: scene?.selectedAssetIds ?? [],
        selectedObservationIds: scene?.selectedObservationIds ?? [],
        selectedClaimIds: scene?.selectedClaimIds ?? [],
        selectedQuestionIds: scene?.selectedQuestionIds ?? [],
        manualObservations: scene?.observations.join('\n') ?? '',
        manualInterpretations: scene?.interpretations.join('\n') ?? '',
        manualQuestions: scene?.openQuestions.join('\n') ?? '',
        exportStatus: scene?.exportStatus ?? 'draft',
        visibility: scene?.visibility ?? 'internal',
        sensitivityLevel: scene?.sensitivityLevel ?? 'internal',
        publicationStatus: scene?.publicationStatus ?? 'needs_review',
    };
}

export function WorkshopSceneEditor({
    projectId,
    scene,
    scenes,
    assets,
    observations,
    claims,
    questions,
    onCancel,
    onSaved,
}: WorkshopSceneEditorProps) {
    const [form, setForm] = useState<SceneFormState>(() => buildInitialState(scene));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedAssets = useMemo(
        () => assets.filter((asset) => form.selectedAssetIds.includes(asset.id)),
        [assets, form.selectedAssetIds],
    );

    const hasUnsafePublicAssets = selectedAssets.some(
        (asset) => asset.sensitivityLevel !== 'public' || asset.publicationStatus !== 'publishable',
    );

    function patch(patchState: Partial<SceneFormState>) {
        setForm((prev) => ({ ...prev, ...patchState }));
    }

    function toggleListValue(key: 'selectedAssetIds' | 'selectedObservationIds' | 'selectedClaimIds' | 'selectedQuestionIds', id: string) {
        setForm((prev) => {
            const current = prev[key];
            return {
                ...prev,
                [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            };
        });
    }

    async function handleSave() {
        if (!form.title.trim() || !form.guidingQuestion.trim()) {
            setError('Titel und Leitfrage sind erforderlich.');
            return;
        }
        setSaving(true);
        setError(null);
        const now = new Date().toISOString();
        const observationTexts = observations
            .filter((obs) => form.selectedObservationIds.includes(obs.id))
            .map((obs) => obs.text);
        const claimTexts = claims
            .filter((claim) => form.selectedClaimIds.includes(claim.id))
            .map((claim) => `Claim: ${claim.statement}`);
        const questionTexts = questions
            .filter((question) => form.selectedQuestionIds.includes(question.id))
            .map((question) => question.text);

        const nextScene: WorkshopScene = normalizeScenePublicationForAssets({
            id: scene?.id ?? generateSceneId(),
            projectId,
            scenarioId: scene?.scenarioId,
            title: form.title.trim(),
            guidingQuestion: form.guidingQuestion.trim(),
            dramaturgy: form.dramaturgy.trim() || undefined,
            selectedAssetIds: form.selectedAssetIds,
            selectedObservationIds: form.selectedObservationIds,
            selectedClaimIds: form.selectedClaimIds,
            selectedQuestionIds: form.selectedQuestionIds,
            contextText: form.contextText.trim(),
            observations: unique([...observationTexts, ...splitLines(form.manualObservations)]),
            interpretations: unique([...claimTexts, ...splitLines(form.manualInterpretations)]),
            openQuestions: unique([...questionTexts, ...splitLines(form.manualQuestions)]),
            discussionPrompt: form.discussionPrompt.trim(),
            targetAudience: form.targetAudience.trim() || undefined,
            exportStatus: form.exportStatus,
            visibility: form.visibility,
            sortOrder: scene?.sortOrder ?? ((scenes[scenes.length - 1]?.sortOrder ?? scenes.length) + 1),
            sensitivityLevel: form.sensitivityLevel,
            publicationStatus: form.publicationStatus,
            createdAt: scene?.createdAt ?? now,
            updatedAt: now,
        }, assets);

        await saveWorkshopScene(nextScene);
        setSaving(false);
        onSaved(nextScene.id);
    }

    return (
        <div className="ws-scene-editor">
            <div className="ws-scene-editor-header">
                <div>
                    <h3>{scene ? 'Workshop-Szene bearbeiten' : 'Neue Workshop-Szene'}</h3>
                    <p>Kuratiert eine Arbeitsansicht. Neue öffentliche Freigaben bleiben prüfpflichtig.</p>
                </div>
                <button className="ws-icon-btn" onClick={onCancel} type="button" title="Editor schließen">
                    <X size={16} />
                </button>
            </div>

            <div className="ws-scene-editor-grid">
                <label>
                    Titel
                    <input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
                </label>
                <label>
                    Leitfrage
                    <input value={form.guidingQuestion} onChange={(e) => patch({ guidingQuestion: e.target.value })} />
                </label>
                <label className="ws-editor-span">
                    Kontext
                    <textarea rows={4} value={form.contextText} onChange={(e) => patch({ contextText: e.target.value })} />
                </label>
                <label className="ws-editor-span">
                    Diskussionsprompt
                    <textarea rows={3} value={form.discussionPrompt} onChange={(e) => patch({ discussionPrompt: e.target.value })} />
                </label>
                <label>
                    Sichtbarkeit
                    <select value={form.visibility} onChange={(e) => patch({ visibility: e.target.value as WorkshopSceneVisibility })}>
                        <option value="internal">Intern</option>
                        <option value="public">Öffentlich</option>
                    </select>
                </label>
                <label>
                    Publikationsstatus
                    <select value={form.publicationStatus} onChange={(e) => patch({ publicationStatus: e.target.value as PublicationStatus })}>
                        <option value="needs_review">Review nötig</option>
                        <option value="internal_only">Nur intern</option>
                        <option value="publishable">Veröffentlichbar</option>
                        <option value="anonymize_before_use">Vor Nutzung anonymisieren</option>
                        <option value="do_not_publish">Nicht veröffentlichen</option>
                    </select>
                </label>
                <label>
                    Exportstatus
                    <select value={form.exportStatus} onChange={(e) => patch({ exportStatus: e.target.value as WorkshopSceneExportStatus })}>
                        <option value="not_ready">Nicht bereit</option>
                        <option value="draft">Entwurf</option>
                        <option value="ready">Bereit</option>
                    </select>
                </label>
                <label>
                    Sensitivität
                    <select value={form.sensitivityLevel} onChange={(e) => patch({ sensitivityLevel: e.target.value as SensitivityLevel })}>
                        <option value="public">Öffentlich</option>
                        <option value="internal">Intern</option>
                        <option value="sensitive_personal">Personenbezogen</option>
                        <option value="restricted">Vertraulich</option>
                        <option value="unknown">Unklar</option>
                    </select>
                </label>
            </div>

            {hasUnsafePublicAssets && (form.visibility === 'public' || form.publicationStatus === 'publishable') && (
                <div className="ws-editor-warning">
                    <AlertTriangle size={14} />
                    Ausgewählte Assets sind nicht vollständig öffentlich freigegeben. Beim Speichern wird die Szene auf intern / Review gesetzt.
                </div>
            )}

            <EditorChecklist
                title="Assets"
                emptyText="Noch keine Assets erfasst."
                items={assets}
                selectedIds={form.selectedAssetIds}
                getId={(asset) => asset.id}
                getLabel={(asset) => `${asset.title} (${asset.sensitivityLevel}/${asset.publicationStatus})`}
                onToggle={(id) => toggleListValue('selectedAssetIds', id)}
            />
            <EditorChecklist
                title="Vorhandene Beobachtungen"
                emptyText="Noch keine Beobachtungen erfasst."
                items={observations}
                selectedIds={form.selectedObservationIds}
                getId={(obs) => obs.id}
                getLabel={(obs) => obs.text}
                onToggle={(id) => toggleListValue('selectedObservationIds', id)}
            />
            <EditorChecklist
                title="Claims übernehmen"
                emptyText="Noch keine Claims vorhanden."
                items={claims}
                selectedIds={form.selectedClaimIds}
                getId={(claim) => claim.id}
                getLabel={(claim) => claim.statement}
                onToggle={(id) => toggleListValue('selectedClaimIds', id)}
            />
            <EditorChecklist
                title="Offene Fragen übernehmen"
                emptyText="Noch keine Fragen vorhanden."
                items={questions}
                selectedIds={form.selectedQuestionIds}
                getId={(question) => question.id}
                getLabel={(question) => question.text}
                onToggle={(id) => toggleListValue('selectedQuestionIds', id)}
            />

            <div className="ws-scene-editor-grid">
                <label className="ws-editor-span">
                    Freie Beobachtungen (eine pro Zeile)
                    <textarea rows={4} value={form.manualObservations} onChange={(e) => patch({ manualObservations: e.target.value })} />
                </label>
                <label className="ws-editor-span">
                    Freie Deutungen / Claims (eine pro Zeile)
                    <textarea rows={4} value={form.manualInterpretations} onChange={(e) => patch({ manualInterpretations: e.target.value })} />
                </label>
                <label className="ws-editor-span">
                    Freie Fragen (eine pro Zeile)
                    <textarea rows={3} value={form.manualQuestions} onChange={(e) => patch({ manualQuestions: e.target.value })} />
                </label>
                <label>
                    Dramaturgie
                    <input value={form.dramaturgy} onChange={(e) => patch({ dramaturgy: e.target.value })} />
                </label>
                <label>
                    Zielgruppe
                    <input value={form.targetAudience} onChange={(e) => patch({ targetAudience: e.target.value })} />
                </label>
            </div>

            {error && <p className="ws-editor-error">{error}</p>}

            <div className="ws-scene-editor-actions">
                <button className="ws-secondary-btn" onClick={onCancel} type="button">Abbrechen</button>
                <button className="ws-primary-btn" onClick={handleSave} disabled={saving} type="button">
                    <Save size={14} />
                    {saving ? 'Speichert ...' : 'Szene speichern'}
                </button>
            </div>
        </div>
    );
}

interface EditorChecklistProps<T> {
    title: string;
    emptyText: string;
    items: T[];
    selectedIds: string[];
    getId: (item: T) => string;
    getLabel: (item: T) => string;
    onToggle: (id: string) => void;
}

function EditorChecklist<T>({ title, emptyText, items, selectedIds, getId, getLabel, onToggle }: EditorChecklistProps<T>) {
    return (
        <section className="ws-editor-checklist">
            <h4>{title}</h4>
            {items.length === 0 ? (
                <p>{emptyText}</p>
            ) : (
                <div className="ws-editor-checklist-items">
                    {items.map((item) => {
                        const id = getId(item);
                        return (
                            <label key={id} className="ws-editor-checkitem">
                                <input
                                    checked={selectedIds.includes(id)}
                                    onChange={() => onToggle(id)}
                                    type="checkbox"
                                />
                                <span>{getLabel(item)}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
