import type { WorkshopScene } from '@/domain/workshop/types';
import { ChevronRight, Lightbulb, MessageCircle, Pencil } from 'lucide-react';
import { SensitivityBadge } from './Badges';

// ---------------------------------------------------------------------------
// WorkshopSceneCard — summary card for scene list
// ---------------------------------------------------------------------------

interface WorkshopSceneCardProps {
    scene: WorkshopScene;
    isSelected: boolean;
    onClick: () => void;
}

export function WorkshopSceneCard({ scene, isSelected, onClick }: WorkshopSceneCardProps) {
    const statusColor = scene.exportStatus === 'ready' ? '#2e7d32'
        : scene.exportStatus === 'draft' ? '#e65100' : '#90a4ae';
    return (
        <button
            className={`ws-scene-card${isSelected ? ' ws-scene-card-active' : ''}`}
            onClick={onClick}
            type="button"
        >
            <div className="ws-scene-card-header">
                <span className="ws-scene-number">#{scene.sortOrder ?? '–'}</span>
                <span className="ws-scene-title">{scene.title}</span>
                <ChevronRight size={14} className="ws-zone-chevron" />
            </div>
            <p className="ws-scene-question">{scene.guidingQuestion}</p>
            <div className="ws-zone-counts">
                <span style={{ fontSize: '0.68rem', color: statusColor, fontWeight: 700 }}>
                    {scene.exportStatus === 'ready' ? '✓ Bereit' : scene.exportStatus === 'draft' ? '⏳ Entwurf' : 'Nicht bereit'}
                </span>
                <SensitivityBadge level={scene.sensitivityLevel} />
            </div>
        </button>
    );
}

// ---------------------------------------------------------------------------
// WorkshopSceneDetail — full scene view
// ---------------------------------------------------------------------------

interface WorkshopSceneDetailProps {
    scene: WorkshopScene;
    onBack: () => void;
    onEdit?: () => void;
}

export function WorkshopSceneDetail({ scene, onBack, onEdit }: WorkshopSceneDetailProps) {
    return (
        <div className="ws-scene-detail">
            <div className="ws-scene-detail-actions">
                <button className="ws-back-btn" onClick={onBack} type="button">← Zurück</button>
                {onEdit && (
                    <button className="ws-add-btn" onClick={onEdit} type="button">
                        <Pencil size={14} /> Bearbeiten
                    </button>
                )}
            </div>

            <div className="ws-scene-detail-header">
                <h3 className="ws-scene-detail-title">{scene.title}</h3>
                <p className="ws-scene-guiding-question">
                    <strong>Leitfrage:</strong> {scene.guidingQuestion}
                </p>
                {scene.dramaturgy && (
                    <p className="ws-scene-dramaturgy">{scene.dramaturgy}</p>
                )}
            </div>

            <div className="ws-scene-detail-body">
                {/* Context */}
                <section className="ws-detail-section">
                    <h4 className="ws-detail-heading">Kontext</h4>
                    <p className="ws-detail-text">{scene.contextText}</p>
                </section>

                {/* Observations */}
                {scene.observations.length > 0 && (
                    <section className="ws-detail-section">
                        <h4 className="ws-detail-heading">Beobachtungen</h4>
                        <ul className="ws-detail-list">
                            {scene.observations.map((obs, i) => (
                                <li key={i} className="ws-detail-list-item">{obs}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Interpretations */}
                {scene.interpretations.length > 0 && (
                    <section className="ws-detail-section ws-detail-section-interp">
                        <h4 className="ws-detail-heading">
                            <Lightbulb size={14} /> Deutungen
                        </h4>
                        <ul className="ws-detail-list">
                            {scene.interpretations.map((int, i) => (
                                <li key={i} className="ws-detail-list-item ws-detail-interpretation">{int}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Open questions */}
                {scene.openQuestions.length > 0 && (
                    <section className="ws-detail-section ws-detail-section-questions">
                        <h4 className="ws-detail-heading">Offene Prüffragen</h4>
                        <ul className="ws-detail-list">
                            {scene.openQuestions.map((q, i) => (
                                <li key={i} className="ws-detail-list-item ws-detail-question">? {q}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Discussion prompt */}
                <section className="ws-detail-section ws-detail-prompt">
                    <h4 className="ws-detail-heading">
                        <MessageCircle size={14} /> Diskussionsprompt
                    </h4>
                    <blockquote className="ws-prompt-quote">
                        {scene.discussionPrompt}
                    </blockquote>
                </section>

                {/* Media placeholder */}
                {scene.selectedAssetIds.length === 0 && (
                    <div className="ws-media-placeholder">
                        <Camera16 /> <span>Noch keine Medien verknüpft — Medien werden nach Vor-Ort-Erfassung hinzugefügt.</span>
                    </div>
                )}
            </div>

            <div className="ws-scene-footer">
                <SensitivityBadge level={scene.sensitivityLevel} />
                {scene.targetAudience && <span className="ws-scene-audience">Zielgruppe: {scene.targetAudience}</span>}
            </div>
        </div>
    );
}

// Inline SVG to avoid extra import
function Camera16() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}
