import type { DataConfidence } from './DataConfidence';

export type DataInventoryStatus =
  | 'unchecked'
  | 'candidate'
  | 'available'
  | 'downloaded'
  | 'imported'
  | 'not-available'
  | 'blocked'
  | 'needs-manual-action';

export type DataInventoryItem = {
  id: string;
  label: string;
  sourceName: string;
  sourceUrl?: string;
  status: DataInventoryStatus;
  licenseHint?: string;
  lastCheckedAt?: string;
  localCacheRef?: string;
  confidence: DataConfidence;
  notes?: string;
};

export type AddressProject = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  location: {
    lat?: number;
    lon?: number;
    source: 'manual' | 'nominatim' | 'photon' | 'imported' | 'unset';
    confidence: DataConfidence;
  };
  privacy: {
    exactAddressStoredLocallyOnly: boolean;
    gitSafe: boolean;
  };
  dataInventory: DataInventoryItem[];
};
