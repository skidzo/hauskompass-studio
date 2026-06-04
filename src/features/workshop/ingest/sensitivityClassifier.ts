// Re-export shared classification from studio-core.
// @deprecated Import classifyAssetSensitivity directly from '@/lib/studio-core/media/sensitivity'.
export { classifyAssetSensitivity } from '@/lib/studio-core/media/sensitivity';
export type { ClassificationResult } from '@/lib/studio-core/media/sensitivity';

// inferAssetType remains workshop-specific (returns AssetType from workshop domain).
import type { AssetType } from '@/domain/workshop/types';

export function inferAssetType(mimeType: string, fileName: string): AssetType {
    const mime = mimeType.toLowerCase();
    const name = fileName.toLowerCase();
    if (mime.startsWith('image/')) return 'photo';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf') return 'document';
    if (mime.includes('document') || mime.includes('text/')) return 'document';
    if (name.endsWith('.ifc') || name.endsWith('.step') || name.endsWith('.stp') || name.endsWith('.fcstd')) return 'model';
    if (name.endsWith('.geojson') || name.endsWith('.kml') || name.endsWith('.gpx')) return 'map';
    return 'other';
}
