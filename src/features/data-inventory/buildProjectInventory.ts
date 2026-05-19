import type { DataInventoryItem } from '@/domain/AddressProject';
import type { ImportedTerrainData } from '@/features/lod2-derived/fetchTerrainProfile';
import type { ImportedProject } from '@/features/project-store/types';

/**
 * Builds a data inventory for an imported project from its actual runtime state.
 * Statuses and confidence values are derived from what has genuinely been loaded —
 * not from hardcoded seed data.
 */
export function buildProjectInventory(
    project: ImportedProject,
    terrainData: ImportedTerrainData | null,
    lod2GeneratedFor: string | null,
): DataInventoryItem[] {
    const hasLoD2 = project.candidates.length > 0;
    const hasConfirmed = project.confirmedIds.length > 0;
    const hasTerrain = terrainData !== null;
    const hasIfc = lod2GeneratedFor !== null;
    const now = new Date().toISOString().slice(0, 10);

    return [
        {
            id: 'geocoding',
            label: 'Adress-Geocoding',
            sourceName: 'Nominatim / OpenStreetMap',
            sourceUrl: 'https://nominatim.openstreetmap.org/',
            status: 'available',
            confidence: 'high',
            lastCheckedAt: now,
            notes: project.geocode.displayName,
        },
        {
            id: 'lod2',
            label: 'LoD2 Gebäudemodell',
            sourceName: project.sourceTile ?? 'LDBV / LGL',
            status: hasLoD2 ? 'imported' : 'candidate',
            confidence: hasLoD2 ? 'medium' : 'unknown',
            lastCheckedAt: hasLoD2 ? now : undefined,
            notes: hasLoD2
                ? `Kachel ${project.geocode.tileId} · ${project.candidates.length} Kandidaten · ${project.confirmedIds.length} bestätigt`
                : 'Noch nicht importiert',
        },
        {
            id: 'confirmed-parts',
            label: 'Bestätigte Gebäudeteile',
            sourceName: 'Nutzer-Auswahl aus LoD2',
            status: hasConfirmed ? 'available' : 'candidate',
            confidence: hasConfirmed ? 'medium' : 'unknown',
            notes: hasConfirmed
                ? `${project.confirmedIds.length} Gebäudete${project.confirmedIds.length === 1 ? 'il' : 'ile'} bestätigt`
                : 'Noch keine Bestätigung',
        },
        {
            id: 'dgm1',
            label: 'DGM1 Geländemodell',
            sourceName: 'LDBV / LGL BW / Landesvermessung',
            status: hasTerrain ? 'downloaded' : 'candidate',
            confidence: hasTerrain ? 'high' : 'unknown',
            lastCheckedAt: hasTerrain ? now : undefined,
            notes: hasTerrain
                ? `N–S: ${terrainData.nsProfile.length} Punkte · O–W: ${terrainData.ewProfile.length} Punkte`
                : 'Gelände-Tab → Daten laden',
        },
        {
            id: 'ifc-lod2',
            label: 'IFC-Modell (aus LoD2)',
            sourceName: 'LoD2 → IFC-Generator (lokal)',
            status: hasIfc ? 'available' : 'needs-manual-action',
            confidence: hasIfc ? 'medium' : 'unknown',
            lastCheckedAt: hasIfc ? now : undefined,
            notes: hasIfc
                ? `Generiert für Kandidat ${lod2GeneratedFor}`
                : 'Gebäude-Tab → IFC generieren',
        },
        {
            id: 'osm-tiles',
            label: 'Straßen- & Gebäudekarten',
            sourceName: 'OpenStreetMap / OpenFreeMap',
            sourceUrl: 'https://openfreemap.org/',
            status: 'available',
            confidence: 'medium',
            notes: 'Wird über MapLibre-Tiles live geladen',
        },
    ];
}
