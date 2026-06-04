import { describe, expect, it } from 'vitest';

import type { SpatialScene } from '@/domain/spatial/types';
import type { Zone } from '@/features/workshop/db/workshopDb';
import {
  buildFallbackWorkshopCampusLocations,
  buildFallbackWorkshopZoneGeometry,
  buildWorkshopCameraFrustumCollection,
  buildWorkshopZoneFeatureCollection,
  deriveWorkshopMapAnchor,
  findWorkshopZoneCentroid,
  hasMatchingWorkshopCampusLocations,
  hasMatchingWorkshopZoneGeometry,
} from '@/features/workshop/rendering/workshopMapAdapter';
import {
  WORKSHOP_3D_CONFIDENCE_LABEL,
  buildWorkshop3DObjectMeta,
  buildWorkshopAssetEyebrow,
  findSpatialSceneObjectById,
  getSpatialObjectZoneId,
  getSpatialSceneObjectsForZone,
} from '@/features/workshop/rendering/workshop3DAdapter';
import { buildViewConeFeature, polygonCentroid } from '@/lib/studio-core/spatial-rendering/helpers';

describe('spatial rendering adapters', () => {
  it('builds a render-neutral view cone polygon from a map point and bearing', () => {
    const feature = buildViewConeFeature({
      id: 'asset-1',
      origin: { lat: 48.726961, lon: 9.075894 },
      bearing: 90,
      properties: { title: 'Camera', bearing: 90 },
    });

    expect(feature.geometry.coordinates[0]).toHaveLength(4);
    expect(feature.geometry.coordinates[0][0]).toEqual([9.075894, 48.726961]);
    expect(feature.properties.bearing).toBe(90);
  });

  it('enriches workshop zone geometry without leaving MapLibre-specific logic in the component', () => {
    const zones: Zone[] = [{
      id: 'z-1',
      siteId: 's-1',
      name: 'Pavillon 1',
      description: 'Test zone',
      documentationStatus: 'partial',
      documentationPriority: 'high',
      openQuestionIds: [],
      linkedAssetIds: [],
      linkedAssessmentIds: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'internal_only',
    }];

    const geojson = buildWorkshopZoneFeatureCollection(zones, 'z-1', {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { zoneId: 'z-1', name: 'Legacy Name' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[9, 48], [10, 48], [10, 49], [9, 48]]],
        },
      }],
    });

    expect(geojson.features[0].properties.label).toBe('Pavillon 1');
    expect(geojson.features[0].properties.selected).toBe(1);
    expect(findWorkshopZoneCentroid(geojson, 'z-1')).toEqual([9.666666666666666, 48.333333333333336]);
  });

  it('derives fallback workshop map geometry and labels from the spatial scene', () => {
    const zones: Zone[] = [{
      id: 'zone-1',
      siteId: 'site-1',
      name: 'Pavillon 1',
      description: 'Fallback zone',
      documentationStatus: 'partial',
      documentationPriority: 'high',
      openQuestionIds: [],
      linkedAssetIds: [],
      linkedAssessmentIds: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'internal_only',
    }];

    const sceneData: SpatialScene = {
      id: 'scene-1',
      projectId: 'project-1',
      siteId: 'site-1',
      label: 'Fallback scene',
      sources: [{ id: 'source-1', label: 'Survey', kind: 'manual_seed' }],
      terrain: [],
      buildingHulls: [{
        id: 'hull-1',
        label: 'Pavillon 1 Hull',
        zoneId: 'zone-1',
        footprint: [
          { x: -10, y: 0, z: -5 },
          { x: 10, y: 0, z: -5 },
          { x: 10, y: 0, z: 5 },
          { x: -10, y: 0, z: 5 },
        ],
        baseElevation: 0,
        height: 8,
        confidence: 'verified',
        verificationStatus: 'verified_geometry',
        historicalStatus: 'original_phase',
        levelOfDetail: 'lod2',
        sourceId: 'source-1',
      }],
      vegetation: [],
      evidenceLinks: [],
    };

    const anchor = deriveWorkshopMapAnchor([{
      id: 'asset-1',
      title: 'Anchor photo',
      lat: 48.726961,
      lon: 9.075894,
    }], { lat: 0, lon: 0 });
    const geojson = buildFallbackWorkshopZoneGeometry(sceneData, zones, anchor);
    const locations = buildFallbackWorkshopCampusLocations(sceneData, zones, anchor);

    expect(anchor).toEqual({ lat: 48.726961, lon: 9.075894 });
    expect(geojson?.features).toHaveLength(1);
    expect(geojson?.features[0].properties.zoneId).toBe('zone-1');
    expect(geojson?.features[0].geometry.coordinates[0]).toHaveLength(5);
    expect(locations).toEqual([expect.objectContaining({
      zoneId: 'zone-1',
      label: 'Pavillon 1',
      kind: 'pavilion',
      source: 'spatial_scene_fallback',
    })]);
    expect(Math.abs(locations[0].lat - anchor.lat)).toBeLessThan(0.0001);
    expect(Math.abs(locations[0].lon - anchor.lon)).toBeLessThan(0.0001);
  });

  it('ignores mismatched static workshop geometry instead of placing labels on the wrong project', () => {
    const zones: Zone[] = [{
      id: 'z-pavillon-1',
      siteId: 'site-1',
      name: 'Pavillon 1',
      description: 'Eiermann zone',
      documentationStatus: 'partial',
      documentationPriority: 'high',
      openQuestionIds: [],
      linkedAssetIds: [],
      linkedAssessmentIds: [],
      sensitivityLevel: 'internal',
      publicationStatus: 'internal_only',
    }];

    const genericGeometry = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: { zoneId: 'z-entry', name: 'Generic core' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [9, 48] as [number, number],
            [10, 48] as [number, number],
            [10, 49] as [number, number],
            [9, 48] as [number, number],
          ]],
        },
      }],
    };

    expect(hasMatchingWorkshopZoneGeometry(zones, genericGeometry)).toBe(false);
    expect(hasMatchingWorkshopCampusLocations(zones, [{
      id: 'loc-1',
      zoneId: 'z-entry',
      label: 'Generic core',
      kind: 'pavilion',
      lat: 48.1,
      lon: 9.1,
      source: 'static',
    }])).toBe(false);
    expect(buildWorkshopZoneFeatureCollection(zones, null, genericGeometry).features).toHaveLength(0);
  });

  it('builds workshop camera frustums from asset markers', () => {
    const frustums = buildWorkshopCameraFrustumCollection([{
      id: 'asset-1',
      title: 'Photo',
      lat: 48.726961,
      lon: 9.075894,
      bearing: 135,
    }]);

    expect(frustums.features).toHaveLength(1);
    expect(frustums.features[0].properties.title).toBe('Photo');
  });

  it('derives workshop 3D object selection and metadata outside the Three.js component', () => {
    const sceneData: SpatialScene = {
      id: 'scene-1',
      projectId: 'project-1',
      siteId: 'site-1',
      label: 'Scene',
      sources: [{ id: 'source-1', label: 'Survey', kind: 'manual_seed' }],
      terrain: [{
        id: 'terrain-1',
        label: 'Terrain',
        sourceId: 'source-1',
        confidence: 'rough',
        verificationStatus: 'placeholder_geometry',
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 1, z: 1 },
        },
        vertices: [],
        faces: [],
      }],
      buildingHulls: [{
        id: 'hull-1',
        label: 'Hull',
        zoneId: 'zone-1',
        footprint: [],
        baseElevation: 0,
        height: 10,
        confidence: 'verified',
        verificationStatus: 'verified_geometry',
        historicalStatus: 'original_phase',
        levelOfDetail: 'lod2',
        sourceId: 'source-1',
      }],
      vegetation: [{
        id: 'veg-1',
        label: 'Vegetation',
        zoneId: 'zone-1',
        sourceId: 'source-1',
        kind: 'tree',
        position: { x: 0, y: 0, z: 0 },
        radius: 1,
        height: 2,
        confidence: 'inferred',
        verificationStatus: 'placeholder_geometry',
      }],
      evidenceLinks: [],
    };

    const selected = getSpatialSceneObjectsForZone(sceneData, 'zone-1');
    const activeObject = findSpatialSceneObjectById(sceneData, 'hull-1');

    expect(selected).toHaveLength(2);
    expect(getSpatialObjectZoneId(activeObject)).toBe('zone-1');
    expect(WORKSHOP_3D_CONFIDENCE_LABEL[activeObject?.confidence ?? '']).toBe('verifiziert');
    expect(buildWorkshop3DObjectMeta({
      object: activeObject as SpatialScene['buildingHulls'][number],
      sourceLabel: 'Survey source',
      zoneName: 'Zone One',
      linkedAssetCount: 2,
    })).toContain('Direct media links: 2');
  });

  it('builds evidence eyebrows without leaking workshop component logic', () => {
    expect(buildWorkshopAssetEyebrow({
      assetType: 'photo',
      spatialAnchorType: 'viewpoint',
      bearingConfidence: 'exif',
      targetZoneId: 'zone-2',
    }, { id: 'zone-1', name: 'Zone One' })).toBe('photo · viewpoint · exif · target:zone-2');
  });

  it('computes polygon centroids defensively', () => {
    expect(polygonCentroid([[9, 48], [10, 48], [10, 49], [9, 48]])).toEqual([9.666666666666666, 48.333333333333336]);
    expect(polygonCentroid([[9, 48], [10, 48], [9, 48]])).toBeNull();
  });
});
