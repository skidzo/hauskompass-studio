import { describe, expect, it } from 'vitest';

import {
  hasResolvableSourceReference,
  isEvidenceLinkComplete,
  type EvidenceLink,
} from '../src/lib/studio-core/evidence/types';
import {
  deriveOrientationConfidence,
  derivePlacementConfidence,
  derivePlacementSource,
  hasMeaningfulPlacement,
  normalizeDegrees,
} from '../src/lib/studio-core/spatial-reference/helpers';

describe('studio-core spatial-reference helpers', () => {
  it('prefers EXIF placement source when coordinates exist', () => {
    expect(derivePlacementSource('imported_from_other_device', { lat: 48.1, lon: 11.5 })).toBe('exif');
  });

  it('keeps imported-from-other-device when EXIF coordinates are missing', () => {
    expect(derivePlacementSource('imported_from_other_device', null)).toBe('imported_from_other_device');
  });

  it('defaults manual placement confidence to approximate', () => {
    expect(derivePlacementConfidence('manual', null)).toBe('approximate');
  });

  it('defaults EXIF orientation confidence to likely when bearing exists', () => {
    expect(deriveOrientationConfidence({ lat: 48.1, lon: 11.5, bearing: 182 })).toBe('likely');
  });

  it('keeps unknown placement when no source evidence is present', () => {
    expect(derivePlacementConfidence('unknown', null)).toBe('unknown');
    expect(hasMeaningfulPlacement({})).toBe(false);
  });

  it('normalizes degrees into the 0-360 range', () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
  });
});

describe('studio-core evidence helpers', () => {
  const validLink: EvidenceLink = {
    id: 'link-1',
    source: { kind: 'asset', refId: 'asset-1', confidence: 'likely' },
    targetKind: 'observation',
    targetId: 'obs-1',
    relation: 'documents',
  };

  it('accepts source references with an id', () => {
    expect(hasResolvableSourceReference(validLink.source)).toBe(true);
  });

  it('accepts complete evidence links', () => {
    expect(isEvidenceLinkComplete(validLink)).toBe(true);
  });

  it('rejects unresolved evidence links', () => {
    expect(isEvidenceLinkComplete({
      ...validLink,
      source: { kind: 'unknown' },
    })).toBe(false);
  });
});
