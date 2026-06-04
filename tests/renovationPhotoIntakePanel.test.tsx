// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { RenovationPhotoPlacementPanel } from '../src/features/renovation-planning/RenovationPhotoPlacementPanel';
import type { ImportedProject, Lod2Candidate } from '../src/features/project-store/types';

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

function createCandidate(id: string): Lod2Candidate {
  return {
    id,
    functionCode: '1000',
    roofTypeCode: '2100',
    measuredHeightM: 8.5,
    bboxUtm32: { minE: 746000, maxE: 746010, minN: 5479000, maxN: 5479012, minZ: 420, maxZ: 428 },
    centroidUtm32: { easting: 746005, northing: 5479006 },
    bboxDistanceToGeocodeM: 3,
    centroidDistanceToGeocodeM: 5,
    surfaces: { ground: [], wall: [], roof: [] },
  };
}

const TEST_PROJECT: ImportedProject = {
  slug: 'house-a',
  address: 'Demohaus BY 31, 92526 Beispielstadt',
  geocode: {
    lat: 49.4292,
    lon: 12.4218,
    displayName: 'Demohaus BY 31, 92526 Beispielstadt',
    utm32: { easting: 746000, northing: 5479000 },
    tileId: 'sample',
  },
  sourceTile: 'sample',
  candidates: [createCandidate('lod2-main'), createCandidate('lod2-barn')],
  confirmedIds: ['lod2-main'],
  importedAt: '2026-05-21T10:00:00.000Z',
};

afterEach(() => {
  cleanup();
});

describe('RenovationPhotoPlacementPanel', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
        revokeObjectURL: vi.fn(),
      },
      configurable: true,
    });
  });

  it('loads multiple photos into a visible queue with a large active preview and side metadata', async () => {
    const { container } = render(<RenovationPhotoPlacementPanel project={TEST_PROJECT} />);
    const input = container.querySelector('#renovation-photo-file') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const first = new File(['a'], 'IMG_1001.JPG', { type: 'image/jpeg' });
    const second = new File(['b'], 'historic_scan.png', { type: 'image/png' });

    fireEvent.change(input!, {
      target: { files: [first, second] },
    });

    await waitFor(() => {
      expect(screen.getByText('2 Fotos geladen. 1 mit EXIF-Hinweisen. Bitte Raum und Blickrichtung fachlich prüfen.')).toBeInTheDocument();
    });

    expect(screen.getByText('Stapelimport mit sichtbarer Bildpruefung')).toBeInTheDocument();
    expect(screen.getByText('Metadaten neben dem Bild')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IMG 1001')).toBeInTheDocument();
    expect(screen.getByText('Raumzuordnung fehlt')).toBeInTheDocument();
    expect(screen.getByText('historic scan')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /IMG 1001|historic scan/i }).length).toBeGreaterThan(1);
  });

  it('saves the active pending renovation photo into the local evidence list', async () => {
    const { container } = render(<RenovationPhotoPlacementPanel project={TEST_PROJECT} />);
    const input = container.querySelector('#renovation-photo-file') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const first = new File(['a'], 'IMG_1001.JPG', { type: 'image/jpeg' });

    fireEvent.change(input!, {
      target: { files: [first] },
    });

    expect(await screen.findByText('1 Fotos geladen. 1 mit EXIF-Hinweisen. Bitte Raum und Blickrichtung fachlich prüfen.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Speichern & weiter/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/lokal gespeichert\./i)).toBeInTheDocument();
    });
    expect(screen.getByText('Offene und gespeicherte Foto-Evidenz')).toBeInTheDocument();
    expect(screen.getByText('IMG 1001')).toBeInTheDocument();
    expect(screen.getByText(/Raum unbekannt/)).toBeInTheDocument();
    expect(screen.getByText(/Quelle: exif/)).toBeInTheDocument();
  });
});
