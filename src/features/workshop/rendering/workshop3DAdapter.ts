import type { SpatialScene } from '@/domain/spatial/types';

export type LayerKey = 'terrain' | 'buildingHulls' | 'vegetation';
export type LayerState = Record<LayerKey, boolean>;
export type SpatialSceneObject =
  | SpatialScene['terrain'][number]
  | SpatialScene['buildingHulls'][number]
  | SpatialScene['vegetation'][number];

export const WORKSHOP_3D_CONFIDENCE_LABEL: Record<string, string> = {
  rough: 'grob',
  inferred: 'abgeleitet',
  imported: 'importiert',
  workshop_sketch: 'Workshop-Skizze',
  measured: 'gemessen',
  verified: 'verifiziert',
};

export const WORKSHOP_3D_VERIFICATION_LABEL: Record<string, string> = {
  verified_geometry: 'Geometrie: verifiziert',
  inferred_geometry: 'Geometrie: abgeleitet (LOD2)',
  placeholder_geometry: 'Geometrie: Platzhalter',
  unknown_geometry: 'Geometrie: unbekannt',
};

export const WORKSHOP_3D_LAYER_LABEL: Record<LayerKey, string> = {
  terrain: 'Gelände',
  buildingHulls: 'Hüllen',
  vegetation: 'Vegetation',
};

export function getSpatialObjectZoneId(object: SpatialSceneObject | undefined): string | undefined {
  return object && 'zoneId' in object ? object.zoneId : undefined;
}

export function getSpatialSceneObjectsForZone(
  sceneData: SpatialScene | null,
  selectedZoneId: string | null,
): SpatialSceneObject[] {
  if (!selectedZoneId || !sceneData) return [];
  return [
    ...sceneData.buildingHulls.filter((item) => item.zoneId === selectedZoneId),
    ...sceneData.vegetation.filter((item) => item.zoneId === selectedZoneId),
  ];
}

export function findSpatialSceneObjectById(
  sceneData: SpatialScene | null,
  activeObjectId: string | null,
): SpatialSceneObject | undefined {
  if (!sceneData || !activeObjectId) return undefined;
  return [
    ...sceneData.terrain,
    ...sceneData.buildingHulls,
    ...sceneData.vegetation,
  ].find((item) => item.id === activeObjectId);
}

export function buildWorkshop3DObjectMeta(args: {
  object: SpatialSceneObject;
  sourceLabel?: string;
  zoneName?: string;
  linkedAssetCount?: number;
}): string[] {
  const lines = [
    `Confidence: ${WORKSHOP_3D_CONFIDENCE_LABEL[args.object.confidence] ?? args.object.confidence}`,
    'verificationStatus' in args.object && args.object.verificationStatus
      ? WORKSHOP_3D_VERIFICATION_LABEL[args.object.verificationStatus] ?? args.object.verificationStatus
      : null,
    'sourceId' in args.object && args.object.sourceId
      ? `Source: ${args.sourceLabel ?? args.object.sourceId}`
      : null,
    'role' in args.object && args.object.role ? `Role: ${args.object.role}` : null,
    'historicalStatus' in args.object && args.object.historicalStatus ? `Status: ${args.object.historicalStatus}` : null,
    args.zoneName ? `Zone: ${args.zoneName}` : null,
    typeof args.linkedAssetCount === 'number' ? `Direct media links: ${args.linkedAssetCount}` : null,
  ];
  return lines.filter((line): line is string => Boolean(line));
}

export function buildWorkshopAssetEyebrow(
  asset: {
    assetType: string;
    spatialAnchorType?: string;
    bearingConfidence?: string;
    targetZoneId?: string;
  },
  activeZone?: { id: string; name: string } | undefined,
): string {
  return [
    asset.assetType,
    asset.spatialAnchorType,
    asset.bearingConfidence,
    asset.targetZoneId && activeZone && asset.targetZoneId !== activeZone.id ? `target:${asset.targetZoneId}` : null,
  ].filter(Boolean).join(' · ');
}
