import { fetchProjectJson } from '@/features/project-data/projectDataLoader';
import type { Site, WorkshopProject, Zone } from '@/domain/workshop/types';
import type { SpatialScene } from '@/domain/spatial/types';
import { getZonesBySite, workshopDb } from '../db/workshopDb';

const STORAGE_PREFIX = 'hk_workshop_spatial_scene_';

function isRoughFallbackScene(scene: SpatialScene): boolean {
  if (!scene.sources.some((source) => source.kind === 'derived')) return false;
  const roughHulls = scene.buildingHulls.length > 0 && scene.buildingHulls.every((hull) => hull.levelOfDetail === 'workshop_sketch' && hull.verificationStatus === 'placeholder_geometry');
  const roughTerrain = scene.terrain.length > 0 && scene.terrain.every((terrain) => terrain.verificationStatus === 'placeholder_geometry');
  return roughHulls && roughTerrain;
}

export function storageKeyForWorkshopSpatialScene(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function loadStoredWorkshopSpatialScene(projectId: string): SpatialScene | null {
  try {
    const raw = window.localStorage.getItem(storageKeyForWorkshopSpatialScene(projectId));
    return raw ? (JSON.parse(raw) as SpatialScene) : null;
  } catch {
    return null;
  }
}

export function saveStoredWorkshopSpatialScene(projectId: string, scene: SpatialScene): void {
  try {
    window.localStorage.setItem(storageKeyForWorkshopSpatialScene(projectId), JSON.stringify(scene, null, 2));
  } catch {
    // Ignore storage failures; the scene can still be used for the current session.
  }
}

export function buildRoughWorkshopSpatialScene(project: WorkshopProject, site: Site, zones: Zone[]): SpatialScene {
  const sourceId = `rough-workshop-${project.id}`;
  const zoneSpacing = 20;
  const buildingHulls = zones.map((zone, index) => {
    const centerX = (index - (zones.length - 1) / 2) * zoneSpacing;
    const depth = 10 + (index % 2) * 2;
    const width = 14 + (index % 3) * 2;
    const halfW = width / 2;
    const halfD = depth / 2;
    return {
      id: `rough-hull-${zone.id}`,
      label: zone.name,
      zoneId: zone.id,
      sourceId,
      confidence: 'rough' as const,
      verificationStatus: 'placeholder_geometry' as const,
      levelOfDetail: 'workshop_sketch' as const,
      footprint: [
        { x: centerX - halfW, y: 0, z: -halfD },
        { x: centerX + halfW, y: 0, z: -halfD },
        { x: centerX + halfW, y: 0, z: halfD },
        { x: centerX - halfW, y: 0, z: halfD },
      ],
      baseElevation: 0,
      height: 7 + (index % 3) * 1.5,
      historicalStatus: 'unknown' as const,
      modelingRule: 'Generated from imported Workshop backup metadata because spatial_context.json was missing.',
    };
  });

  const extent = Math.max(40, zones.length * zoneSpacing * 0.75);
  const terrain = [{
    id: `rough-terrain-${project.id}`,
    label: `Grobe Gelände-Basis · ${site.address ?? project.title}`,
    sourceId,
    confidence: 'rough' as const,
    verificationStatus: 'placeholder_geometry' as const,
    bounds: {
      min: { x: -extent, y: -1.25, z: -extent },
      max: { x: extent, y: 0, z: extent },
    },
    verticalExaggeration: 1,
    vertices: [
      { x: -extent, y: -1.25, z: -extent },
      { x: extent, y: -1.25, z: -extent },
      { x: extent, y: -1.25, z: extent },
      { x: -extent, y: -1.25, z: extent },
    ],
    faces: [[0, 1, 2], [0, 2, 3]] as [number, number, number][],
  }];

  return {
    id: `rough-workshop-scene-${project.id}`,
    projectId: project.id,
    siteId: site.id,
    label: `Grobe 3D-Szene · ${project.title}`,
    ...(site.geocode ? { mapAnchor: { lon: site.geocode.lon, lat: site.geocode.lat } } : {}),
    sources: [{
      id: sourceId,
      label: 'Imported Workshop backup fallback',
      kind: 'derived',
      note: 'Generated from project metadata because no spatial_context.json was bundled.',
    }],
    terrain,
    buildingHulls,
    vegetation: [],
    evidenceLinks: [],
  };
}

export async function loadWorkshopSpatialScene(projectId: string): Promise<SpatialScene | null> {
  const stored = loadStoredWorkshopSpatialScene(projectId);
  if (stored && !isRoughFallbackScene(stored)) return stored;

  try {
    const fetched = await fetchProjectJson<SpatialScene>(projectId, 'spatial_context.json');
    if (fetched) {
      saveStoredWorkshopSpatialScene(projectId, fetched);
      return fetched;
    }
  } catch {
    // fall through to built-in or DB-derived fallback
  }

  const project = await workshopDb.projects.get(projectId);
  const site = project ? await workshopDb.sites.get(project.siteId) ?? null : null;

  if (stored) return stored;
  if (!project || !site) return null;

  const zones = await getZonesBySite(site.id);
  if (!zones.length) return null;
  const fallback = buildRoughWorkshopSpatialScene(project, site, zones);
  saveStoredWorkshopSpatialScene(projectId, fallback);
  return fallback;
}
