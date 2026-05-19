import type { WorkshopScene } from '@/domain/workshop/types';
import type { AssetRecord } from './db/workshopDb';

type AssetPublicationInfo = Pick<AssetRecord, 'id' | 'sensitivityLevel' | 'publicationStatus'>;

export function isAssetPubliclyExportable(asset: AssetPublicationInfo): boolean {
    return asset.sensitivityLevel === 'public' && asset.publicationStatus === 'publishable';
}

export function hasOnlyPubliclyExportableAssets(
    selectedAssetIds: string[],
    assets: AssetPublicationInfo[],
): boolean {
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    return selectedAssetIds.every((id) => {
        const asset = assetsById.get(id);
        return asset ? isAssetPubliclyExportable(asset) : false;
    });
}

export function normalizeScenePublicationForAssets(
    scene: WorkshopScene,
    assets: AssetPublicationInfo[],
): WorkshopScene {
    const requestsPublicUse = scene.visibility === 'public' || scene.publicationStatus === 'publishable';
    if (!requestsPublicUse || scene.selectedAssetIds.length === 0) return scene;
    if (hasOnlyPubliclyExportableAssets(scene.selectedAssetIds, assets)) return scene;

    return {
        ...scene,
        visibility: 'internal',
        publicationStatus: 'needs_review',
        exportStatus: scene.exportStatus === 'ready' ? 'draft' : scene.exportStatus,
    };
}
