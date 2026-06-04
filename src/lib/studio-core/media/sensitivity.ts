/**
 * Automatic sensitivity classification for ingested media assets.
 *
 * Rules (applied in priority order, first match wins):
 *  1. Explicit override by user → always wins
 *  2. MIME = video/* → 'sensitive_personal' (may contain persons)
 *  3. MIME = audio/* → 'internal'
 *  4. MIME = image/* + filename contains person-hint keywords → 'sensitive_personal'
 *  5. MIME = image/* → 'internal'  (default: photos may show faces / location)
 *  6. MIME = application/pdf + filename has 'personal'/'vertrag'/'vertraulich' → 'sensitive_personal'
 *  7. MIME = application/pdf → 'internal'
 *  8. Filename suggests plan/drawing/public document → 'public'
 *  9. Fallback → 'internal'
 *
 * Mode-neutral: usable by Workshop and Renovation capture surfaces.
 * GPS-Exif detection is not done here — callers can flag GPS presence separately.
 */

import type { SensitivityLevel } from './types';

// ---------------------------------------------------------------------------
// Heuristic keyword lists (German + English)
// ---------------------------------------------------------------------------

const PERSON_HINTS = [
    'person', 'face', 'gesicht', 'portrait', 'menschen', 'besucher',
    'nutzer', 'mitarbeiter', 'bewohner', 'eigentuemer', 'user',
];

const SENSITIVE_DOC_HINTS = [
    'personal', 'vertrag', 'vertraulich', 'confidential', 'privat',
    'datenschutz', 'personal_data', 'anstellung', 'mietvertrag',
];

const PUBLIC_HINTS = [
    'plan', 'grundriss', 'lageplan', 'drawing', 'zeichnung', 'schema',
    'overview', 'uebersicht', 'übersicht', 'facade', 'fassade',
    'lod2', 'ifc', 'stadtplan', 'map', 'ortho', 'aerial',
];

// ---------------------------------------------------------------------------
// Classification result
// ---------------------------------------------------------------------------

export interface ClassificationResult {
    sensitivityLevel: SensitivityLevel;
    /** Short human-readable reason for this classification */
    reason: string;
    /** Whether this was auto-detected or set by the user */
    source: 'auto' | 'user';
}

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

/**
 * Classify a file's sensitivity based on MIME type and filename heuristics.
 * Does NOT read file contents — safe to call synchronously before upload.
 */
export function classifyAssetSensitivity(
    mimeType: string,
    fileName: string,
): ClassificationResult {
    const mime = mimeType.toLowerCase().trim();
    const name = fileName.toLowerCase();

    if (mime.startsWith('video/')) {
        return { sensitivityLevel: 'sensitive_personal', reason: 'Videos können Personen zeigen', source: 'auto' };
    }
    if (mime.startsWith('audio/')) {
        return { sensitivityLevel: 'internal', reason: 'Audio-Aufnahme (intern)', source: 'auto' };
    }
    if (mime.startsWith('image/')) {
        if (hasAny(name, PERSON_HINTS)) {
            return { sensitivityLevel: 'sensitive_personal', reason: 'Dateiname deutet auf Personenaufnahme', source: 'auto' };
        }
        if (hasAny(name, PUBLIC_HINTS)) {
            return { sensitivityLevel: 'public', reason: 'Plan/Zeichnung, öffentlich klassifiziert', source: 'auto' };
        }
        return { sensitivityLevel: 'internal', reason: 'Foto standardmäßig intern (Personen möglich)', source: 'auto' };
    }
    if (mime === 'application/pdf' || mime.includes('document') || mime.includes('text/')) {
        if (hasAny(name, SENSITIVE_DOC_HINTS)) {
            return { sensitivityLevel: 'sensitive_personal', reason: 'Dateiname deutet auf personenbezogene Daten', source: 'auto' };
        }
        if (hasAny(name, PUBLIC_HINTS)) {
            return { sensitivityLevel: 'public', reason: 'Planungsdokument, öffentlich klassifiziert', source: 'auto' };
        }
        return { sensitivityLevel: 'internal', reason: 'Dokument standardmäßig intern', source: 'auto' };
    }
    if (mime.includes('step') || mime.includes('iges') || name.endsWith('.ifc') ||
        name.endsWith('.step') || name.endsWith('.stp') || name.endsWith('.fcstd')) {
        return { sensitivityLevel: 'internal', reason: 'CAD/3D-Datei (intern)', source: 'auto' };
    }
    return { sensitivityLevel: 'internal', reason: 'Unbekannter Dateityp, intern als Standard', source: 'auto' };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function hasAny(str: string, keywords: string[]): boolean {
    return keywords.some((kw) => str.includes(kw));
}
