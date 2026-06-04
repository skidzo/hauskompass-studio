export type MediaOriginKind =
  | 'current_device'
  | 'imported_from_other_device'
  | 'imported_folder'
  | 'historical_archive'
  | 'unknown';

export type PlaceholderMediaState = 'none' | 'expected' | 'missing';

export type MediaAssetKind = 'photo' | 'video' | 'audio' | 'document' | 'scan' | 'other';

/** Mode-neutral sensitivity classification for any captured media or document. */
export type SensitivityLevel =
  | 'public'              // no restrictions
  | 'internal'            // project members only
  | 'sensitive_personal'  // personal data, handle with care
  | 'restricted'          // named individuals only
  | 'unknown';            // not yet classified

export interface MediaAssetReference {
  assetId: string;
  mediaType: MediaAssetKind;
  origin: MediaOriginKind;
  isHistorical?: boolean;
  placeholderState?: PlaceholderMediaState;
  fileName?: string;
  mimeType?: string;
  capturedAt?: string;
}
