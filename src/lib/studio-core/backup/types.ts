export type StudioProjectMode = 'workshop' | 'renovation';

export type StudioBundleIntent = 'full_backup' | 'internal_review' | 'public_export';

export type StudioBundleValidationState = 'valid' | 'valid_with_warnings' | 'blocked';

export type StudioMediaTransport = 'inline_none' | 'manifest_only' | 'external_blob_package';

export interface StudioBundleProjectRef {
  projectId: string;
  projectSlug?: string;
  title?: string;
}

export interface StudioBundleValidation {
  state: StudioBundleValidationState;
  envelopeValid: boolean;
  payloadValid: boolean;
  mediaComplete: boolean;
  warnings: string[];
  errors: string[];
}

export interface StudioBundleValueSummary {
  counts: Record<string, number>;
  hasRestrictedValues: boolean;
}

export interface StudioBundleEnvelope {
  format: 'hauskompass.bundle';
  formatVersion: 1;
  bundleIntent: StudioBundleIntent;
  bundleId: string;
  exportedAt: string;
  sourceApp: string;
  sourceAppVersion: string;
  projectRef: StudioBundleProjectRef;
  projectMode: StudioProjectMode;
  payloadType: string;
  payloadVersion: number;
  restorable: boolean;
  validation: StudioBundleValidation;
  sensitivitySummary: StudioBundleValueSummary;
  publicationSummary: StudioBundleValueSummary;
  counts: Record<string, number>;
  warnings: string[];
  mediaTransport: StudioMediaTransport;
}

export interface StudioBundleImportCheck {
  ok: boolean;
  envelopeValid: boolean;
  restorable: boolean;
  warnings: string[];
  errors: string[];
}
