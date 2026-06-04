import type {
  StudioBundleEnvelope,
  StudioBundleImportCheck,
  StudioBundleIntent,
  StudioBundleProjectRef,
  StudioBundleValidation,
  StudioBundleValueSummary,
  StudioMediaTransport,
  StudioProjectMode,
} from './types';

export interface CreateStudioBundleEnvelopeInput {
  bundleIntent: StudioBundleIntent;
  exportedAt?: string;
  sourceApp?: string;
  sourceAppVersion?: string;
  projectRef: StudioBundleProjectRef;
  projectMode: StudioProjectMode;
  payloadType: string;
  payloadVersion?: number;
  validation?: Partial<StudioBundleValidation>;
  sensitivitySummary?: StudioBundleValueSummary;
  publicationSummary?: StudioBundleValueSummary;
  counts?: Record<string, number>;
  warnings?: string[];
  mediaTransport?: StudioMediaTransport;
}

export interface StudioBundleDownloadTarget {
  projectRef: StudioBundleProjectRef;
  projectMode: StudioProjectMode;
  bundleIntent: StudioBundleIntent;
  exportedAt: string;
  mediaTransport?: StudioMediaTransport;
}

export interface StudioBundlePreview {
  title: string;
  label: string;
  transportLabel: string;
  countSummary: string;
  exportedAtLabel: string;
  restorable: boolean;
  warnings: string[];
  errors: string[];
}

export function createStudioBundleEnvelope(input: CreateStudioBundleEnvelopeInput): StudioBundleEnvelope {
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  return {
    format: 'hauskompass.bundle',
    formatVersion: 1,
    bundleIntent: input.bundleIntent,
    bundleId: createBundleId(input.projectRef.projectId, exportedAt),
    exportedAt,
    sourceApp: input.sourceApp ?? 'hauskompass-studio',
    sourceAppVersion: input.sourceAppVersion ?? '0.1.0',
    projectRef: input.projectRef,
    projectMode: input.projectMode,
    payloadType: input.payloadType,
    payloadVersion: input.payloadVersion ?? 1,
    restorable: isBundleIntentRestorable(input.bundleIntent),
    validation: createBundleValidation(input.validation),
    sensitivitySummary: input.sensitivitySummary ?? createValueSummary(),
    publicationSummary: input.publicationSummary ?? createValueSummary(),
    counts: input.counts ?? {},
    warnings: input.warnings ?? [],
    mediaTransport: input.mediaTransport ?? 'inline_none',
  };
}

export function isBundleIntentRestorable(intent: StudioBundleIntent): boolean {
  return intent === 'full_backup';
}

export function createBundleValidation(partial?: Partial<StudioBundleValidation>): StudioBundleValidation {
  return {
    state: partial?.state ?? 'valid',
    envelopeValid: partial?.envelopeValid ?? true,
    payloadValid: partial?.payloadValid ?? true,
    mediaComplete: partial?.mediaComplete ?? true,
    warnings: partial?.warnings ?? [],
    errors: partial?.errors ?? [],
  };
}

export function createValueSummary(values?: Record<string, number>): StudioBundleValueSummary {
  const counts = values ?? {};
  return {
    counts,
    hasRestrictedValues: Object.entries(counts).some(([key, count]) => count > 0 && key !== 'public' && key !== 'publishable'),
  };
}

export function countStringValues<T, K extends keyof T>(items: T[], key: K): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const raw = item[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    counts[raw] = (counts[raw] ?? 0) + 1;
  }
  return counts;
}

export function isStudioBundleEnvelope(value: unknown): value is StudioBundleEnvelope {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StudioBundleEnvelope>;
  return record.format === 'hauskompass.bundle'
    && record.formatVersion === 1
    && typeof record.bundleId === 'string'
    && typeof record.projectMode === 'string'
    && typeof record.payloadType === 'string';
}

export function inspectStudioBundleImport(
  value: unknown,
  expectedMode: StudioProjectMode,
  expectedPayloadType: string,
): StudioBundleImportCheck {
  if (!isStudioBundleEnvelope(value)) {
    return {
      ok: false,
      envelopeValid: false,
      restorable: false,
      warnings: [],
      errors: ['Ungültiges Hauskompass-Bundle: Metadatenhülle fehlt oder ist beschädigt.'],
    };
  }

  const warnings = [...value.warnings, ...value.validation.warnings];
  const errors = [...value.validation.errors];

  if (value.projectMode !== expectedMode) {
    errors.push(`Bundle-Modus passt nicht: erwartet ${expectedMode}, erhalten ${value.projectMode}.`);
  }
  if (value.payloadType !== expectedPayloadType) {
    errors.push(`Bundle-Typ passt nicht: erwartet ${expectedPayloadType}, erhalten ${value.payloadType}.`);
  }
  if (!value.restorable) {
    errors.push(`Bundle ist für Import nicht freigegeben: intent=${value.bundleIntent}.`);
  }
  if (value.validation.state === 'blocked' || !value.validation.envelopeValid || !value.validation.payloadValid) {
    errors.push('Bundle-Validierung blockiert den Import.');
  }

  return {
    ok: errors.length === 0,
    envelopeValid: value.validation.envelopeValid,
    restorable: value.restorable,
    warnings,
    errors,
  };
}

export function assertStudioBundleCompatibility(
  value: unknown,
  expectedMode: StudioProjectMode,
  expectedPayloadType: string,
): asserts value is StudioBundleEnvelope {
  const check = inspectStudioBundleImport(value, expectedMode, expectedPayloadType);
  if (!check.ok) {
    throw new Error(check.errors.join(' '));
  }
}

export function buildStudioBundleFilename(
  target: StudioBundleDownloadTarget,
  extension: 'json' | 'zip',
): string {
  const stem = sanitizeFilenamePart(target.projectRef.projectSlug || target.projectRef.title || target.projectRef.projectId || 'hauskompass');
  const mode = target.projectMode === 'workshop' ? 'workshop' : 'renovation';
  const transport = target.mediaTransport === 'external_blob_package' ? 'with-media' : 'meta-only';
  const ts = target.exportedAt.replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${stem}-${mode}-backup-${transport}-${ts}.${extension}`;
}

export function formatStudioBundleLabel(target: Pick<StudioBundleDownloadTarget, 'projectMode' | 'bundleIntent' | 'mediaTransport'>): string {
  const mode = target.projectMode === 'workshop' ? 'Workshop' : 'Renovierung';
  const scope = target.bundleIntent === 'full_backup' ? 'Backup' : target.bundleIntent === 'internal_review' ? 'Interne Mappe' : 'Öffentliche Mappe';
  const media = target.mediaTransport === 'external_blob_package' ? 'mit Medien' : 'nur Metadaten';
  return `${mode}-${scope} · ${media}`;
}

export function formatStudioBundleTransportLabel(mediaTransport: StudioMediaTransport | undefined): string {
  if (mediaTransport === 'external_blob_package') return 'Mit eingebetteten Mediendateien';
  if (mediaTransport === 'manifest_only') return 'Mit Medienmanifest, ohne eingebettete Dateien';
  return 'Nur Metadaten';
}

export function formatStudioBundleCountSummary(counts: Record<string, number> | undefined): string {
  if (!counts) return 'Keine Objektzählung verfügbar';
  const preferredKeys = ['assets', 'photos', 'zones', 'placements', 'observations', 'siteVisitImports'];
  const picked = preferredKeys
    .filter((key) => typeof counts[key] === 'number' && counts[key] > 0)
    .slice(0, 3)
    .map((key) => `${counts[key]} ${formatCountLabel(key, counts[key])}`);

  if (picked.length > 0) return picked.join(' · ');

  const fallback = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .slice(0, 3)
    .map(([key, count]) => `${count} ${formatCountLabel(key, count)}`);

  return fallback.length > 0 ? fallback.join(' · ') : 'Keine erfassten Inhalte';
}

export function createStudioBundlePreview(
  bundle: Pick<StudioBundleEnvelope, 'projectRef' | 'projectMode' | 'bundleIntent' | 'mediaTransport' | 'counts' | 'exportedAt' | 'restorable'>,
  check?: Partial<StudioBundleImportCheck>,
): StudioBundlePreview {
  return {
    title: bundle.projectRef.title || bundle.projectRef.projectSlug || bundle.projectRef.projectId,
    label: formatStudioBundleLabel(bundle),
    transportLabel: formatStudioBundleTransportLabel(bundle.mediaTransport),
    countSummary: formatStudioBundleCountSummary(bundle.counts),
    exportedAtLabel: formatIsoDateTimeLabel(bundle.exportedAt),
    restorable: check?.restorable ?? bundle.restorable,
    warnings: check?.warnings ?? [],
    errors: check?.errors ?? [],
  };
}

function createBundleId(projectId: string, exportedAt: string): string {
  const compactTs = exportedAt.replace(/[-:.TZ]/g, '').slice(0, 14);
  const normalizedProject = projectId.trim() || 'project';
  return `${normalizedProject}-bundle-${compactTs}`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'hauskompass';
}

function formatIsoDateTimeLabel(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}

function formatCountLabel(key: string, count: number): string {
  const singular: Record<string, string> = {
    assets: 'Medium',
    photos: 'Foto',
    zones: 'Zone',
    placements: 'Platzierung',
    observations: 'Beobachtung',
    siteVisitImports: 'Begehungsimport',
  };
  const plural: Record<string, string> = {
    assets: 'Medien',
    photos: 'Fotos',
    zones: 'Zonen',
    placements: 'Platzierungen',
    observations: 'Beobachtungen',
    siteVisitImports: 'Begehungsimporte',
  };
  if (count === 1) return singular[key] ?? key;
  return plural[key] ?? key;
}
