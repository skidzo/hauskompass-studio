import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEmptyRenovationPhotoPlacementState,
  createRenovationPhotoRegistration,
  loadRenovationPhotoPlacementState,
  saveRenovationPhotoPlacementState,
  storageKeyForRenovationPhotoPlacement,
  upsertRenovationPhotoPlacementState,
} from '../src/features/renovation-planning/renovationPhotoPlacementStore';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    get length() {
      return store.size;
    },
  };
}

describe('renovation photo placement', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: createLocalStorageMock() },
      configurable: true,
    });
  });

  it('registers a photo imported from another device with EXIF-based placement metadata', () => {
    const bundle = createRenovationPhotoRegistration({
      projectSlug: 'house-a',
      title: 'Kitchen wall before opening',
      fileName: 'IMG_1001.JPG',
      mimeType: 'image/jpeg',
      importSource: 'imported_from_other_device',
      isHistorical: false,
      exif: {
        lat: 48.123456,
        lon: 11.654321,
        capturedAt: '2026-05-20T08:30:00.000Z',
        bearing: 91,
      },
      roomId: 'kitchen',
    });

    expect(bundle.photo.importSource).toBe('imported_from_other_device');
    expect(bundle.photo.exifGpsLat).toBeCloseTo(48.123456, 6);
    expect(bundle.placement.mapPoint).toEqual({ lat: 48.123456, lon: 11.654321 });
    expect(bundle.placement.placementSource).toBe('exif');
    expect(bundle.placement.placementConfidence).toBe('likely');
    expect(bundle.placement.orientationConfidence).toBe('likely');
    expect(bundle.placement.roomId).toBe('kitchen');
  });

  it('supports manual room assignment and manual orientation when GPS is missing', () => {
    const bundle = createRenovationPhotoRegistration({
      projectSlug: 'house-a',
      title: 'Cellar corner',
      importSource: 'imported_from_other_device',
      isHistorical: false,
      roomId: 'cellar-west',
      buildingElementId: 'wall-west',
      surfaceId: 'plaster-west',
      placementSource: 'manual',
      placementConfidence: 'approximate',
      viewDirectionLabel: 'towards_window',
      viewDirectionDegrees: 245,
      orientationConfidence: 'verified',
    });

    expect(bundle.placement.mapPoint).toBeUndefined();
    expect(bundle.placement.roomId).toBe('cellar-west');
    expect(bundle.placement.buildingElementId).toBe('wall-west');
    expect(bundle.placement.surfaceId).toBe('plaster-west');
    expect(bundle.placement.placementSource).toBe('manual');
    expect(bundle.placement.placementConfidence).toBe('approximate');
    expect(bundle.placement.viewDirectionLabel).toBe('towards_window');
    expect(bundle.placement.viewDirectionDegrees).toBe(245);
    expect(bundle.placement.orientationConfidence).toBe('verified');
  });

  it('creates historical metadata and an evidence-bound observation from a historical photo', () => {
    const bundle = createRenovationPhotoRegistration({
      projectSlug: 'house-a',
      title: 'Open wall archive photo',
      importSource: 'historical_archive',
      isHistorical: true,
      estimatedDate: '1998-06-01',
      shownState: 'before',
      whatIsVisible: 'Open wall with visible pipe run near stair landing.',
      whatMayHaveChanged: 'Wall may have been closed and rerouted later.',
      sourceDescription: 'Scanned family archive print.',
      decisionUsefulness: 'high',
      evidenceNoteKind: 'observation',
      evidenceNoteText: 'Historical photo suggests a vertical pipe route before later finishes.',
      relatedToHiddenInfrastructure: true,
      relatedUtilityLineIds: ['utility-line-water-east'],
    });

    expect(bundle.historicalMetadata).toBeDefined();
    expect(bundle.historicalMetadata?.isHistorical).toBe(true);
    expect(bundle.historicalMetadata?.shownState).toBe('before');
    expect(bundle.historicalMetadata?.dateConfidence).toBe('estimated');
    expect(bundle.historicalMetadata?.decisionUsefulness).toBe('high');
    expect(bundle.historicalMetadata?.relatedUtilityLineIds).toEqual(['utility-line-water-east']);
    expect(bundle.evidenceNote?.kind).toBe('observation');
    expect(bundle.evidenceNote?.relatedToHiddenInfrastructure).toBe(true);
  });

  it('does not mark hidden utility evidence as verified by default', () => {
    const bundle = createRenovationPhotoRegistration({
      projectSlug: 'house-a',
      title: 'Possible cable route',
      importSource: 'historical_archive',
      isHistorical: true,
      whatIsVisible: 'Ceiling opening with a possible cable crossing.',
      evidenceNoteKind: 'question',
      evidenceNoteText: 'Confirm cable route before drilling this ceiling bay.',
      relatedToHiddenInfrastructure: true,
    });

    expect(bundle.evidenceNote?.hiddenInfrastructureStatus).toBe('unknown');
  });

  it('persists photo placement state per project slug', () => {
    const houseA = createEmptyRenovationPhotoPlacementState('house-a');
    const houseB = createEmptyRenovationPhotoPlacementState('house-b');
    const bundle = createRenovationPhotoRegistration({
      projectSlug: 'house-a',
      title: 'Hallway overview',
      importSource: 'current_device',
      isHistorical: false,
      roomId: 'hallway',
    });

    saveRenovationPhotoPlacementState(upsertRenovationPhotoPlacementState(houseA, bundle));
    saveRenovationPhotoPlacementState(houseB);

    const loadedA = loadRenovationPhotoPlacementState('house-a');
    const loadedB = loadRenovationPhotoPlacementState('house-b');

    expect(loadedA.photos).toHaveLength(1);
    expect(loadedA.placements[0].roomId).toBe('hallway');
    expect(loadedB.photos).toHaveLength(0);
    expect(storageKeyForRenovationPhotoPlacement('house-a')).not.toBe(storageKeyForRenovationPhotoPlacement('house-b'));
  });
});
