/**
 * NamedEntityFields — shared controlled form fields used for creating and
 * editing named spatial entities such as Workshop Zones or Renovation Rooms.
 *
 * Reuse:
 *   - Workshop: CreateZoneInline, ZoneDetailEdit
 *   - Renovation: future "Raum anlegen" / "Bereich anlegen" panel
 *
 * The caller owns the state and passes values + change handlers down.
 * This component renders only the field group, no submit button.
 */

import type { DocumentationPriority, SensitivityLevel } from '@/domain/workshop/types';

export interface NamedEntityValues {
    name: string;
    description: string;
    documentationPriority: DocumentationPriority;
    sensitivityLevel: SensitivityLevel;
}

export const NAMED_ENTITY_DEFAULTS: NamedEntityValues = {
    name: '',
    description: '',
    documentationPriority: 'medium',
    sensitivityLevel: 'internal',
};

interface NamedEntityFieldsProps {
    values: NamedEntityValues;
    onChange: (patch: Partial<NamedEntityValues>) => void;
    /** Show the sensitivity level field. Default true. */
    showSensitivity?: boolean;
    /** Autofocus the name input. Default false. */
    autoFocusName?: boolean;
    /** compact = tighter layout for inline forms. Default false. */
    compact?: boolean;
}

const PRIORITY_OPTIONS: { value: DocumentationPriority; label: string }[] = [
    { value: 'critical', label: 'Kritisch' },
    { value: 'high', label: 'Hoch' },
    { value: 'medium', label: 'Mittel' },
    { value: 'low', label: 'Niedrig' },
];

const SENSITIVITY_OPTIONS: { value: SensitivityLevel; label: string }[] = [
    { value: 'public', label: 'Öffentlich' },
    { value: 'internal', label: 'Intern' },
    { value: 'sensitive_personal', label: 'Sensibel' },
    { value: 'restricted', label: 'Privat' },
];

export function NamedEntityFields({
    values,
    onChange,
    showSensitivity = true,
    autoFocusName = false,
    compact = false,
}: NamedEntityFieldsProps) {
    const cls = compact ? 'nef-compact' : '';
    return (
        <div className={`named-entity-fields ${cls}`}>
            <label className="nef-label">
                Name *
                <input
                    className="nef-input nef-input-name"
                    type="text"
                    value={values.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="Zonenname …"
                    autoFocus={autoFocusName}
                    maxLength={80}
                    required
                />
            </label>
            <label className="nef-label">
                Beschreibung
                <input
                    className="nef-input"
                    type="text"
                    value={values.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Kurze Beschreibung (optional)"
                    maxLength={200}
                />
            </label>
            <div className="nef-row">
                <label className="nef-label nef-label-half">
                    Priorität
                    <select
                        className="nef-select"
                        value={values.documentationPriority}
                        onChange={(e) => onChange({ documentationPriority: e.target.value as DocumentationPriority })}
                    >
                        {PRIORITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </label>
                {showSensitivity && (
                    <label className="nef-label nef-label-half">
                        Sensitivität
                        <select
                            className="nef-select"
                            value={values.sensitivityLevel}
                            onChange={(e) => onChange({ sensitivityLevel: e.target.value as SensitivityLevel })}
                        >
                            {SENSITIVITY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
        </div>
    );
}
