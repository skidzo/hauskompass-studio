export type MediaOriginKind =
  | 'current_device'
  | 'imported_from_other_device'
  | 'imported_folder'
  | 'historical_archive'
  | 'unknown';

export type PlaceholderMediaState = 'none' | 'expected' | 'missing';

export type MediaAssetKind = 'photo' | 'video' | 'audio' | 'document' | 'scan' | 'other';

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
