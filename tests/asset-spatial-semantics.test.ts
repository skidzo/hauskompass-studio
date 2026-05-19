import { describe, expect, it } from 'vitest';
import { inferAssetSpatialSemantics } from '../src/features/workshop/spatial/assetSpatialSemantics';

describe('inferAssetSpatialSemantics', () => {
    it('marks GPS photos as viewpoint assets with EXIF bearing confidence', () => {
        expect(inferAssetSpatialSemantics({
            assetType: 'photo',
            zoneId: 'z-kantine-gemeinschaft',
            gpsLat: 48.7269,
            gpsLon: 9.0759,
            gpsBearing: 182,
        })).toEqual({
            spatialAnchorType: 'viewpoint',
            targetZoneId: 'z-kantine-gemeinschaft',
            bearingConfidence: 'exif',
        });
    });

    it('falls back to zone_reference when no GPS position exists', () => {
        expect(inferAssetSpatialSemantics({
            assetType: 'document',
            zoneId: 'z-pavillon-1',
        })).toEqual({
            spatialAnchorType: 'zone_reference',
            targetZoneId: 'z-pavillon-1',
            bearingConfidence: undefined,
        });
    });

    it('preserves explicit spatial semantics', () => {
        expect(inferAssetSpatialSemantics({
            assetType: 'photo',
            zoneId: 'z-pavillon-2',
            targetZoneId: 'z-kantine-gemeinschaft',
            spatialAnchorType: 'overview',
            bearingConfidence: 'verified',
            gpsLat: 48.7269,
            gpsLon: 9.0759,
            gpsBearing: 45,
        })).toEqual({
            spatialAnchorType: 'overview',
            targetZoneId: 'z-kantine-gemeinschaft',
            bearingConfidence: 'verified',
        });
    });
});

