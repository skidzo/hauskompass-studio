// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/studio-core/media/exif', () => ({
  readExifData: vi.fn(async (file: File) => {
    if (file.name === 'IMG_2001.JPG') {
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

const hoisted = vi.hoisted(() => ({
  saveAsset: vi.fn(async () => undefined),
}));

vi.mock('../src/features/workshop/ingest/thumbnailGenerator', () => ({
  generateThumbnail: vi.fn(async (file: File) => `thumb:${file.name}`),
  formatFileSize: vi.fn((size: number) => `${size} B`),
}));

vi.mock('../src/features/workshop/db/workshopDb', () => ({
  saveAsset: hoisted.saveAsset,
}));

import { AssetIngestPanel } from '../src/features/workshop/components/AssetIngestPanel';

afterEach(() => {
  cleanup();
});

describe('Workshop asset ingest readiness', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
        revokeObjectURL: vi.fn(),
      },
      configurable: true,
    });
    hoisted.saveAsset.mockClear();
  });

  it('loads a photo batch into the real review list and can save it', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <AssetIngestPanel zoneId="zone-a" projectId="ws-pascal" onClose={onClose} />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const fileInput = inputs[0] as HTMLInputElement | undefined;
    expect(fileInput).toBeTruthy();

    const first = new File(['abc'], 'IMG_2001.JPG', { type: 'image/jpeg' });
    const second = new File(['def'], 'scan_note.png', { type: 'image/png' });

    fireEvent.change(fileInput!, {
      target: { files: [first, second] },
    });

    expect(await screen.findByDisplayValue('IMG 2001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('scan note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-05-20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 Dateien speichern/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /2 Dateien speichern/i }));

    await waitFor(() => {
      expect(hoisted.saveAsset).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });


  it('keeps the panel open and shows an error when one workshop media save fails', async () => {
    hoisted.saveAsset
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk full'));
    const onClose = vi.fn();
    const { container } = render(
      <AssetIngestPanel zoneId="zone-a" projectId="ws-pascal" onClose={onClose} />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const fileInput = inputs[0] as HTMLInputElement | undefined;
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput!, {
      target: {
        files: [
          new File(['abc'], 'IMG_2001.JPG', { type: 'image/jpeg' }),
          new File(['def'], 'scan_note.png', { type: 'image/png' }),
        ],
      },
    });

    expect(await screen.findByDisplayValue('IMG 2001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2 Dateien speichern/i }));

    expect(await screen.findByText(/Fehler: disk full/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

});
