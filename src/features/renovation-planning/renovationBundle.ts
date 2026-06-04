import {
  assertStudioBundleCompatibility,
  createStudioBundleEnvelope,
  createValueSummary,
  inspectStudioBundleImport,
  isStudioBundleEnvelope,
} from '@/lib/studio-core/backup/helpers';
import type { StudioBundleEnvelope, StudioBundleImportCheck } from '@/lib/studio-core/backup/types';
import type { ImportedProject } from '@/features/project-store/types';
import { saveProject } from '@/features/project-store/projectStore';
import {
  loadLocalPlanningRegisters,
  saveLocalPlanningRegisters,
  type LocalPlanningRegisters,
} from './localPlanningRegisters';
import {
  loadRenovationPhotoPlacementState,
  saveRenovationPhotoPlacementState,
} from './renovationPhotoPlacementStore';
import type { RenovationPhotoPlacementState } from './renovationPhotoPlacementTypes';
import {
  loadSiteVisitImports,
  saveSiteVisitImports,
  type SiteVisitImport,
} from './siteVisitImport';

export interface RenovationBundlePayload {
  project: ImportedProject;
  localRegisters: LocalPlanningRegisters;
  photoPlacementState: RenovationPhotoPlacementState;
  siteVisitImports: SiteVisitImport[];
}

export interface RenovationBundleExport extends StudioBundleEnvelope, RenovationBundlePayload {}

export function inspectRenovationBundleImport(bundle: RenovationBundleExport): StudioBundleImportCheck {
  return inspectStudioBundleImport(bundle, 'renovation', 'renovation_bundle');
}

export function exportRenovationBundle(project: ImportedProject): RenovationBundleExport {
  const localRegisters = loadLocalPlanningRegisters();
  const photoPlacementState = loadRenovationPhotoPlacementState(project.slug);
  const siteVisitImports = loadSiteVisitImports();

  const sensitivitySummary = createValueSummary({
    internal: 1,
    historical_notes: photoPlacementState.historicalMetadata.length,
    hidden_infrastructure_notes: photoPlacementState.evidenceNotes.filter((note) => note.relatedToHiddenInfrastructure).length,
  });

  return {
    ...createStudioBundleEnvelope({
      bundleIntent: 'full_backup',
      sourceAppVersion: '0.1.0',
      projectRef: {
        projectId: project.slug,
        projectSlug: project.slug,
        title: project.address,
      },
      projectMode: 'renovation',
      payloadType: 'renovation_bundle',
      payloadVersion: 1,
      sensitivitySummary,
      publicationSummary: createValueSummary({ internal_only: 1 }),
      counts: {
        projectCandidates: project.candidates.length,
        confirmedCandidates: project.confirmedIds.length,
        buildingFacts: localRegisters.buildingFacts.length,
        assumptions: localRegisters.assumptions.length,
        measurementNeeds: localRegisters.measurementNeeds.length,
        renovationDecisions: localRegisters.renovationDecisions.length,
        photos: photoPlacementState.photos.length,
        placements: photoPlacementState.placements.length,
        historicalMetadata: photoPlacementState.historicalMetadata.length,
        evidenceNotes: photoPlacementState.evidenceNotes.length,
        siteVisitImports: siteVisitImports.length,
      },
      warnings: photoPlacementState.photos.length === 0 ? ['no_photo_evidence'] : [],
      mediaTransport: 'inline_none',
    }),
    project,
    localRegisters,
    photoPlacementState,
    siteVisitImports,
  };
}

export function importRenovationBundle(bundle: RenovationBundleExport): ImportedProject {
  if (isStudioBundleEnvelope(bundle)) {
    assertStudioBundleCompatibility(bundle, 'renovation', 'renovation_bundle');
  }

  const payload = createRenovationBundlePayload(bundle);
  saveProject(payload.project);
  saveLocalPlanningRegisters(payload.localRegisters);
  saveRenovationPhotoPlacementState(payload.photoPlacementState);
  saveSiteVisitImports(payload.siteVisitImports);
  return payload.project;
}

export function createRenovationBundlePayload(bundle: RenovationBundleExport | RenovationBundlePayload): RenovationBundlePayload {
  if ('project' in bundle && 'localRegisters' in bundle && 'photoPlacementState' in bundle && 'siteVisitImports' in bundle) {
    return {
      project: bundle.project,
      localRegisters: bundle.localRegisters,
      photoPlacementState: bundle.photoPlacementState,
      siteVisitImports: bundle.siteVisitImports,
    };
  }
  throw new Error('Ungültiges Renovierungs-Backup: Nutzdaten fehlen.');
}
