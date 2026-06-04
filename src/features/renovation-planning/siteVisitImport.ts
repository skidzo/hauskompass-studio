export type ShotId =
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05'
  | 'S06' | 'S07' | 'S08' | 'S09' | 'S10'
  | 'S11' | 'S12' | 'S13' | 'S14' | 'S15'
  | 'S16' | 'S17' | 'S18' | 'S19' | 'S20';

export type LaserMeasurement = {
  referencePoint: string;
  distanceM: number;
  stationDescription: string;
  cameraHeightM?: number;
};

export type SiteVisitShotBlock = {
  id: ShotId;
  photoFiles: string[];
  laserMeasurements: LaserMeasurement[];
  notes: string;
  importedAt?: string;
};

export type SiteVisitImport = {
  visitId: string;
  visitDate: string;
  device: string;
  cameraSettings: string;
  blocks: SiteVisitShotBlock[];
};

export const allowedShotIds: ShotId[] = [
  'S01', 'S02', 'S03', 'S04', 'S05',
  'S06', 'S07', 'S08', 'S09', 'S10',
  'S11', 'S12', 'S13', 'S14', 'S15',
  'S16', 'S17', 'S18', 'S19', 'S20',
];

const STORAGE_KEY = 'hauskompass.siteVisitImports.v1';

export const siteVisitTemplate: SiteVisitImport = {
  visitId: 'local-visit-YYYY-MM-DD',
  visitDate: 'YYYY-MM-DD',
  device: 'Fairphone Gen 6',
  cameraSettings: '4:3, main camera 1x, grid on, flash off, no digital zoom',
  blocks: [
    {
      id: 'S07',
      photoFiles: ['YYYY-MM-DD_S07_ostansicht_eingang_01.jpg'],
      laserMeasurements: [
        {
          referencePoint: 'Lower outside corner of EG entrance threshold left of Wintergarten',
          distanceM: 0,
          stationDescription: 'Describe photo position',
          cameraHeightM: 1.5,
        },
      ],
      notes: 'Replace this example with local-only field data.',
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function validateSiteVisitImport(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['import must be an object'];
  if (typeof value.visitId !== 'string' || value.visitId.length < 3) errors.push('visitId is required');
  if (typeof value.visitDate !== 'string' || value.visitDate.length < 8) errors.push('visitDate is required');
  if (typeof value.device !== 'string' || value.device.length < 3) errors.push('device is required');
  if (!Array.isArray(value.blocks)) errors.push('blocks must be an array');

  const seen = new Set<string>();
  (Array.isArray(value.blocks) ? value.blocks : []).forEach((block, index) => {
    if (!isRecord(block)) {
      errors.push(`blocks[${index}] must be an object`);
      return;
    }
    if (!allowedShotIds.includes(block.id as ShotId)) errors.push(`blocks[${index}].id must be S01-S20`);
    if (typeof block.id === 'string' && seen.has(block.id)) errors.push(`blocks[${index}].id duplicates ${block.id}`);
    if (typeof block.id === 'string') seen.add(block.id);
    if (!Array.isArray(block.photoFiles) || block.photoFiles.length === 0) errors.push(`blocks[${index}].photoFiles needs at least one file`);
    if (!Array.isArray(block.laserMeasurements) || block.laserMeasurements.length === 0) {
      errors.push(`blocks[${index}].laserMeasurements needs at least one measurement`);
    }
    (Array.isArray(block.laserMeasurements) ? block.laserMeasurements : []).forEach((measurement, measurementIndex) => {
      if (!isRecord(measurement)) {
        errors.push(`blocks[${index}].laserMeasurements[${measurementIndex}] must be an object`);
        return;
      }
      if (typeof measurement.referencePoint !== 'string' || measurement.referencePoint.length < 3) {
        errors.push(`blocks[${index}].laserMeasurements[${measurementIndex}].referencePoint is required`);
      }
      if (typeof measurement.stationDescription !== 'string' || measurement.stationDescription.length < 3) {
        errors.push(`blocks[${index}].laserMeasurements[${measurementIndex}].stationDescription is required`);
      }
      if (typeof measurement.distanceM !== 'number' || measurement.distanceM <= 0) {
        errors.push(`blocks[${index}].laserMeasurements[${measurementIndex}].distanceM must be > 0`);
      }
    });
  });
  return errors;
}

export function parseSiteVisitImportDraft(draft: string) {
  try {
    const parsed = JSON.parse(draft);
    const errors = validateSiteVisitImport(parsed);
    return { importData: errors.length === 0 ? (parsed as SiteVisitImport) : null, errors };
  } catch (error) {
    return { importData: null, errors: [`invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`] };
  }
}

export function summarizeSiteVisitImport(importData: SiteVisitImport) {
  const photoCount = importData.blocks.reduce((sum, block) => sum + block.photoFiles.length, 0);
  const measurementCount = importData.blocks.reduce((sum, block) => sum + block.laserMeasurements.length, 0);
  return {
    blockCount: importData.blocks.length,
    photoCount,
    measurementCount,
    missingBlocks: allowedShotIds.filter((id) => !importData.blocks.some((block) => block.id === id)),
  };
}

export function parseStoredSiteVisitImports(raw: string | null): SiteVisitImport[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSiteVisitImports(): SiteVisitImport[] {
  if (typeof window === 'undefined') return [];
  return parseStoredSiteVisitImports(window.localStorage.getItem(STORAGE_KEY));
}

export function saveSiteVisitImports(imports: SiteVisitImport[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imports, null, 2));
}
