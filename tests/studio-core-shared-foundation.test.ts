import { describe, expect, it } from 'vitest';

import {
  assertStudioBundleCompatibility,
  buildStudioBundleFilename,
  createStudioBundleEnvelope,
  createStudioBundlePreview,
  formatStudioBundleCountSummary,
  formatStudioBundleLabel,
  formatStudioBundleTransportLabel,
  inspectStudioBundleImport,
  isBundleIntentRestorable,
} from '../src/lib/studio-core/backup/helpers';
import {
  hasResolvableSourceReference,
  isEvidenceLinkComplete,
  type EvidenceLink,
} from '../src/lib/studio-core/evidence/types';
import {
  deriveExifEvidenceTrustLevel,
  deriveOrientationConfidence,
  derivePlacementConfidence,
  derivePlacementSource,
  hasMeaningfulPlacement,
  normalizeDegrees,
} from '../src/lib/studio-core/spatial-reference/helpers';
import {
  bearingLabel,
  formatBearingSummary,
  formatCaptureDate,
  formatExifEvidenceSummary,
  formatGpsPoint,
} from '../src/lib/studio-core/spatial-reference/presentation';

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

  it('raises default trust when coordinates, bearing and capture date are all present', () => {
    const exif = { lat: 48.1, lon: 11.5, bearing: 182, capturedAt: '2026-05-20T08:30:00.000Z' };
    expect(deriveExifEvidenceTrustLevel(exif)).toBe('high');
    expect(derivePlacementConfidence('exif', exif)).toBe('verified');
    expect(deriveOrientationConfidence(exif)).toBe('verified');
  });

  it('keeps partial EXIF evidence at likely instead of verified', () => {
    const exif = { lat: 48.1, lon: 11.5, bearing: 182 };
    expect(deriveExifEvidenceTrustLevel(exif)).toBe('medium');
    expect(derivePlacementConfidence('exif', exif)).toBe('likely');
    expect(deriveOrientationConfidence(exif)).toBe('likely');
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

describe('studio-core spatial presentation helpers', () => {
  it('formats GPS coordinates, bearing and capture date consistently', () => {
    expect(formatGpsPoint(48.123456, 11.654321)).toBe('48.123456, 11.654321');
    expect(bearingLabel(90)).toBe('O');
    expect(formatBearingSummary(90)).toBe('90° O');
    expect(formatCaptureDate('2026-05-20T08:30:00.000Z')).toBeTruthy();
  });

  it('summarizes EXIF evidence conservatively', () => {
    expect(formatExifEvidenceSummary(null)).toEqual(['Keine nutzbaren EXIF-Lagedaten']);
    const summary = formatExifEvidenceSummary({
      lat: 48.123456,
      lon: 11.654321,
      capturedAt: '2026-05-20T08:30:00.000Z',
      bearing: 91,
    }).join(' · ');
    expect(summary).toContain('EXIF vollständig');
    expect(summary).toContain('GPS 48.123456, 11.654321');
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

describe('studio-core backup helpers', () => {
  it('creates a restorable full-backup envelope', () => {
    const envelope = createStudioBundleEnvelope({
      bundleIntent: 'full_backup',
      exportedAt: '2026-05-21T12:00:00.000Z',
      projectRef: { projectId: 'ws-1', projectSlug: 'test-workshop', title: 'Test Workshop' },
      projectMode: 'workshop',
      payloadType: 'workshop_bundle',
      counts: { assets: 2 },
    });

    expect(envelope.format).toBe('hauskompass.bundle');
    expect(envelope.restorable).toBe(true);
    expect(envelope.bundleId).toContain('ws-1-bundle-20260521120000');
  });

  it('marks public export as non-restorable', () => {
    expect(isBundleIntentRestorable('public_export')).toBe(false);
  });

  it('builds professional shared filenames and labels from the envelope', () => {
    const envelope = createStudioBundleEnvelope({
      bundleIntent: 'full_backup',
      exportedAt: '2026-05-21T12:00:00.000Z',
      projectRef: { projectId: 'ren-1', projectSlug: 'altes-haus', title: 'Altes Haus' },
      projectMode: 'renovation',
      payloadType: 'renovation_bundle',
      mediaTransport: 'inline_none',
      counts: { photos: 8, placements: 5, siteVisitImports: 1 },
    });

    expect(buildStudioBundleFilename(envelope, 'json')).toBe('altes-haus-renovation-backup-meta-only-20260521-120000.json');
    expect(formatStudioBundleLabel(envelope)).toContain('Renovierung-Backup');
    expect(formatStudioBundleTransportLabel(envelope.mediaTransport)).toBe('Nur Metadaten');
    expect(formatStudioBundleCountSummary(envelope.counts)).toBe('8 Fotos · 5 Platzierungen · 1 Begehungsimport');
    expect(createStudioBundlePreview(envelope).exportedAtLabel).toBe('2026-05-21 12:00');
  });

  it('rejects incompatible bundle mode/payload combinations', () => {
    const envelope = createStudioBundleEnvelope({
      bundleIntent: 'full_backup',
      projectRef: { projectId: 'ws-1' },
      projectMode: 'workshop',
      payloadType: 'workshop_bundle',
    });

    expect(() => assertStudioBundleCompatibility(envelope, 'renovation', 'workshop_bundle')).toThrow();
    expect(() => assertStudioBundleCompatibility(envelope, 'workshop', 'renovation_bundle')).toThrow();
  });

  it('blocks non-restorable public export bundles from import', () => {
    const envelope = createStudioBundleEnvelope({
      bundleIntent: 'public_export',
      projectRef: { projectId: 'ws-1' },
      projectMode: 'workshop',
      payloadType: 'workshop_bundle',
    });

    const check = inspectStudioBundleImport(envelope, 'workshop', 'workshop_bundle');
    expect(check.ok).toBe(false);
    expect(check.restorable).toBe(false);
    expect(check.errors.join(' ')).toContain('intent=public_export');
  });

  it('blocks validation-state errors from import', () => {
    const envelope = createStudioBundleEnvelope({
      bundleIntent: 'full_backup',
      projectRef: { projectId: 'ren-1' },
      projectMode: 'renovation',
      payloadType: 'renovation_bundle',
      validation: {
        state: 'blocked',
        payloadValid: false,
        errors: ['payload invalid'],
      },
    });

    const check = inspectStudioBundleImport(envelope, 'renovation', 'renovation_bundle');
    expect(check.ok).toBe(false);
    expect(check.errors).toContain('payload invalid');
    expect(check.errors.join(' ')).toContain('Bundle-Validierung blockiert den Import.');
  });
});
