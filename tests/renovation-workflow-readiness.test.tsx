// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { RenovationPlanningPanel } from '../src/features/renovation-planning/RenovationPlanningPanel';
import type { ImportedProject } from '../src/features/project-store/types';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    clear() { store.clear(); },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
    key(index: number) { return Array.from(store.keys())[index] ?? null; },
    removeItem(key: string) { store.delete(key); },
    setItem(key: string, value: string) { store.set(key, value); },
    get length() { return store.size; },
  };
}

function makeProject(): ImportedProject {
  return {
    slug: 'renovation-demo_20260522',
    address: 'Demohaus BY 31, 92526 Beispielstadt',
    geocode: {
      lat: 49.428,
      lon: 12.418,
      displayName: 'Demohaus BY 31, 92526 Beispielstadt',
      utm32: { easting: 750000, northing: 5480000 },
      tileId: '750_5480',
      nominatimState: 'Bayern',
    },
    sourceTile: '750_5480',
    candidates: [
      {
        id: 'c1',
        functionCode: '1000',
        roofTypeCode: 'flat',
        measuredHeightM: 8,
        bboxUtm32: { minE: 1, maxE: 2, minN: 3, maxN: 4, minZ: 0, maxZ: 8 },
        centroidUtm32: { easting: 1.5, northing: 3.5 },
        bboxDistanceToGeocodeM: 5,
        centroidDistanceToGeocodeM: 5,
        surfaces: { ground: [], wall: [], roof: [] },
      },
    ],
    confirmedIds: ['c1'],
    importedAt: '2026-05-22T09:00:00.000Z',
  };
}

describe('Renovation workflow readiness', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });
  });

  it('reaches the real Fotos intake surface for a saved renovation project', async () => {
    render(<RenovationPlanningPanel project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fotos' }));

    expect(await screen.findByText('Foto-Platzierung & historische Bild-Evidenz')).toBeInTheDocument();
    expect(screen.getByText('Stapelimport mit sichtbarer Bildpruefung')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Fotos im aktuellen Stapel')).toBeInTheDocument();
    expect(screen.getByText('Lade mehrere Bilder gleichzeitig. Danach bleibt immer ein grosses Foto sichtbar, waehrend du Raum, Blickrichtung und Unsicherheit daneben pflegst.')).toBeInTheDocument();
  });
});
