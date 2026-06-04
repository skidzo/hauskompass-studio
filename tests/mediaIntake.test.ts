import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/studio-core/media/exif', () => ({
  readExifData: vi.fn(async (file: File) => {
    if (file.name === 'IMG_1001.JPG') {
      return {
        lat: 48.123456,
        lon: 11.654321,
        capturedAt: '2026-05-20T08:30:00.000Z',
        bearing: 91,
      };
    }
    return null;
  }),
}));

import {
  createStudioMediaSelectionId,
  mediaTitleFromFileName,
  prepareStudioMediaSelection,
  releaseStudioMediaSelection,
} from '../src/lib/studio-core/media/intake';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('studio-core media intake helpers', () => {
  it('normalizes a file batch into shared media selections', async () => {
    const createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
    const revokeObjectURL = vi.fn();
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      configurable: true,
    });

    const items = await prepareStudioMediaSelection([
      new File(['a'], 'IMG_1001.JPG', { type: 'image/jpeg' }),
      new File(['b'], 'historic_scan.png', { type: 'image/png' }),
    ], {
      idPrefix: 'pending',
      includePreviewUrl: true,
      inferOrigin: (file) => file.name.includes('historic') ? 'historical_archive' : 'imported_from_other_device',
    });

    expect(items).toHaveLength(2);
    expect(items[0].id.startsWith('pending-')).toBe(true);
    expect(items[0].title).toBe('IMG 1001');
    expect(items[0].capturedAt).toBe('2026-05-20');
    expect(items[0].exifData?.bearing).toBe(91);
    expect(items[0].previewUrl).toBe('blob:IMG_1001.JPG');
    expect(items[1].origin).toBe('historical_archive');

    releaseStudioMediaSelection(items);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:IMG_1001.JPG');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:historic_scan.png');
  });

  it('keeps media ids and titles deterministic enough for local sessions', () => {
    expect(createStudioMediaSelectionId('A')).toMatch(/^A-/);
    expect(mediaTitleFromFileName('historic_scan-01.png')).toBe('historic scan 01');
  });
});
