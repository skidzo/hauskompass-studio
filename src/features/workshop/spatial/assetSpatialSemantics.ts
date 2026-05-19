import type { Asset, AssetBearingConfidence, AssetSpatialAnchorType } from '@/domain/workshop/types';

type SpatialAssetInput = Pick<
    Asset,
    'assetType' | 'zoneId' | 'targetZoneId' | 'gpsLat' | 'gpsLon' | 'gpsBearing' | 'spatialAnchorType' | 'bearingConfidence'
>;

export interface AssetSpatialSemantics {
    spatialAnchorType?: AssetSpatialAnchorType;
    targetZoneId?: string;
    bearingConfidence?: AssetBearingConfidence;
}

export function inferAssetSpatialSemantics(asset: SpatialAssetInput): AssetSpatialSemantics {
    const spatialAnchorType = asset.spatialAnchorType
        ?? inferAnchorType(asset);
    const targetZoneId = asset.targetZoneId
        ?? inferTargetZoneId(asset, spatialAnchorType);
    const bearingConfidence = asset.bearingConfidence
        ?? (typeof asset.gpsBearing === 'number' ? 'exif' : undefined);

    return {
        spatialAnchorType,
        targetZoneId,
        bearingConfidence,
    };
}

function inferAnchorType(asset: SpatialAssetInput): AssetSpatialAnchorType | undefined {
    const hasGpsPosition = typeof asset.gpsLat === 'number' && typeof asset.gpsLon === 'number';
    if (asset.assetType === 'photo' && hasGpsPosition) return 'viewpoint';
    if (asset.zoneId) return 'zone_reference';
    return undefined;
}

function inferTargetZoneId(
    asset: SpatialAssetInput,
    spatialAnchorType?: AssetSpatialAnchorType,
): string | undefined {
    if (!asset.zoneId) return undefined;
    if (spatialAnchorType === 'viewpoint' || spatialAnchorType === 'zone_reference') {
        return asset.zoneId;
    }
    return undefined;
}

