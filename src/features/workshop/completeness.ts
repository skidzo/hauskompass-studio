/**
 * completeness.ts — pure functions for field-readiness assessment.
 *
 * These functions have no side effects and do not access Dexie directly,
 * making them trivial to test without a DB setup.
 */

import type { AssetRecord } from '@/features/workshop/db/workshopDb';

// ---------------------------------------------------------------------------
// Zone documentation level
// ---------------------------------------------------------------------------

/**
 * Four-level documentation status for a zone, computed from actual data counts.
 *
 * - `empty`:       no assets registered at all
 * - `assets_only`: assets present but no observations yet
 * - `observed`:    observations present but no interpretations yet
 * - `interpreted`: at least one interpretation exists
 */
export type ZoneDocLevel = 'empty' | 'assets_only' | 'observed' | 'interpreted';

export function computeZoneDocLevel(
    assetCount: number,
    obsCount: number,
    interpCount: number,
): ZoneDocLevel {
    if (interpCount > 0) return 'interpreted';
    if (obsCount > 0) return 'observed';
    if (assetCount > 0) return 'assets_only';
    return 'empty';
}

export const ZONE_DOC_LEVEL_LABEL: Record<ZoneDocLevel, string> = {
    empty: 'Keine Erfassung',
    assets_only: 'Medien, keine Beobachtungen',
    observed: 'Beobachtet',
    interpreted: 'Interpretiert',
};

export const ZONE_DOC_LEVEL_COLOR: Record<ZoneDocLevel, string> = {
    empty: '#ef5350',       // red
    assets_only: '#ffa726', // amber
    observed: '#1565c0',    // blue
    interpreted: '#2e7d32', // green
};

// ---------------------------------------------------------------------------
// Asset completeness warnings
// ---------------------------------------------------------------------------

export type AssetCompletenessWarning =
    | 'missing_title'
    | 'missing_zone'
    | 'missing_sensitivity'
    | 'missing_publication'
    | 'no_media';

/**
 * Returns a list of completeness warnings for a given asset.
 *
 * @param asset    - the asset metadata record
 * @param hasBlob  - whether a binary blob is stored for this asset
 */
export function computeAssetCompleteness(
    asset: Pick<AssetRecord, 'title' | 'zoneId' | 'sensitivityLevel' | 'publicationStatus'>,
    hasBlob: boolean,
): AssetCompletenessWarning[] {
    const warnings: AssetCompletenessWarning[] = [];
    if (!asset.title || asset.title.trim() === '') warnings.push('missing_title');
    if (!asset.zoneId) warnings.push('missing_zone');
    if (!asset.sensitivityLevel || asset.sensitivityLevel === 'unknown') warnings.push('missing_sensitivity');
    if (!asset.publicationStatus || asset.publicationStatus === 'needs_review') warnings.push('missing_publication');
    if (!hasBlob) warnings.push('no_media');
    return warnings;
}

export const ASSET_WARNING_LABEL: Record<AssetCompletenessWarning, string> = {
    missing_title: 'Kein Titel',
    missing_zone: 'Keine Zone',
    missing_sensitivity: 'Sensitivität unbekannt',
    missing_publication: 'Publikationsstatus unklar',
    no_media: 'Kein Medium (Platzhalter)',
};
