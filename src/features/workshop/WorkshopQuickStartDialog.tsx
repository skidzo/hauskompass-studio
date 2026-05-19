/**
 * WorkshopQuickStartDialog — einfacher Dialog zum Anlegen eines neuen
 * Workshop-Projekts.
 *
 * Kein technisches Vorwissen erforderlich: nur ein Name, dann sofort loslegen.
 */

import { createQuickStartWorkshop, type QuickStartResult } from '@/features/workshop/db/workshopDb';
import { Layers, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    onStarted: (result: QuickStartResult) => void;
    onClose: () => void;
}

export function WorkshopQuickStartDialog({ onStarted, onClose }: Props) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    async function handleStart() {
        const trimmed = name.trim();
        if (!trimmed) { setError('Bitte einen Projektnamen eingeben.'); return; }
        setSaving(true);
        setError(null);
        try {
            const result = await createQuickStartWorkshop(trimmed);
            onStarted(result);
        } catch (err) {
            setSaving(false);
            setError(err instanceof Error ? err.message : 'Fehler beim Anlegen des Projekts.');
        }
    }

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === 'Enter') handleStart();
    }

    return (
        <div className="qs-overlay" role="dialog" aria-modal="true" aria-label="Workshop starten">
            <div className="qs-dialog">
                <header className="qs-header">
                    <Layers size={22} className="qs-icon" />
                    <h2 className="qs-title">Workshop starten</h2>
                    <button className="qs-close" onClick={onClose} aria-label="Schließen" type="button">
                        <X size={18} />
                    </button>
                </header>

                <p className="qs-intro">
                    Gib dem Projekt einen Namen — die App legt sofort Zonen und eine
                    Dokumentationsstruktur an. Fotos und Beobachtungen können direkt
                    hinzugefügt werden.
                </p>

                <label className="qs-label" htmlFor="qs-name">
                    Projektname
                    <input
                        ref={inputRef}
                        id="qs-name"
                        className="qs-input"
                        type="text"
                        placeholder="z.B. Gebäude-Workshop Mai 2026"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(null); }}
                        onKeyDown={handleKey}
                        disabled={saving}
                    />
                </label>

                {error && <p className="qs-error" role="alert">{error}</p>}

                <div className="qs-actions">
                    <button
                        className="qs-btn-secondary"
                        onClick={onClose}
                        type="button"
                        disabled={saving}
                    >
                        Abbrechen
                    </button>
                    <button
                        className="qs-btn-primary"
                        onClick={handleStart}
                        type="button"
                        disabled={saving || !name.trim()}
                    >
                        {saving ? 'Wird angelegt …' : 'Starten →'}
                    </button>
                </div>

                <p className="qs-hint">
                    Vorausgefüllte Zonen: Eingang, EG, OG, Außenbereich, Technik, Diverses.
                    Zonen können später umbenannt werden.
                </p>
            </div>
        </div>
    );
}
