// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { zipSync, strToU8 } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NewProjectWizard } from '../src/features/new-project/NewProjectWizard';

vi.mock('../src/features/map-view/ImportedSiteMapPanel', () => ({
  ImportedSiteMapPanel: ({ project, onSelectCandidate, onUpdateProject, selectedId }: any) => (
    <div>
      <div>MapPreview:{project.candidates.length}:{project.confirmedIds.length}:{selectedId}</div>
      <button type="button" onClick={() => onSelectCandidate?.(project.candidates[0]?.id)}>
        focus-first-shape
      </button>
      <button
        type="button"
        onClick={() => {
          const id = project.candidates[1]?.id;
          if (!id) return;
          const confirmedIds = project.confirmedIds.includes(id)
            ? project.confirmedIds.filter((candidateId: string) => candidateId !== id)
            : [...project.confirmedIds, id];
          onUpdateProject?.({ ...project, confirmedIds });
        }}
      >
        toggle-second-shape
      </button>
    </div>
  ),
}));

vi.mock('../src/features/new-project/geocode', () => ({
  geocodeAddress: vi.fn(async () => ({
    lat: 48.775,
    lon: 9.182,
    displayName: 'Demohaus BW 29, 70563 Stuttgart, Deutschland',
    utm32: { easting: 513005, northing: 5403005 },
    tileId: '513_5403',
    nominatimState: 'Baden-Württemberg',
  })),
}));

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

const TEST_GML_A = `<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel xmlns:core="http://www.opengis.net/citygml/1.0" xmlns:bldg="http://www.opengis.net/citygml/building/1.0" xmlns:gml="http://www.opengis.net/gml">
  <core:cityObjectMember>
    <bldg:Building gml:id="DEBW_test_1">
      <bldg:measuredHeight>10</bldg:measuredHeight>
      <bldg:GroundSurface gml:id="ground-1">
        <gml:Polygon gml:id="poly-1">
          <gml:posList>
            513000 5403000 0
            513010 5403000 0
            513010 5403010 0
            513000 5403010 0
            513000 5403000 0
          </gml:posList>
        </gml:Polygon>
      </bldg:GroundSurface>
    </bldg:Building>
  </core:cityObjectMember>
</core:CityModel>`;

const TEST_GML_B = `<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel xmlns:core="http://www.opengis.net/citygml/1.0" xmlns:bldg="http://www.opengis.net/citygml/building/1.0" xmlns:gml="http://www.opengis.net/gml">
  <core:cityObjectMember>
    <bldg:Building gml:id="DEBW_test_2">
      <bldg:measuredHeight>11</bldg:measuredHeight>
      <bldg:GroundSurface gml:id="ground-2">
        <gml:Polygon gml:id="poly-2">
          <gml:posList>
            513020 5403000 0
            513032 5403000 0
            513032 5403012 0
            513020 5403012 0
            513020 5403000 0
          </gml:posList>
        </gml:Polygon>
      </bldg:GroundSurface>
    </bldg:Building>
  </core:cityObjectMember>
</core:CityModel>`;

describe('NewProjectWizard', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => zipSync({
        'LoD2_32_513_5403_1_BW.gml': strToU8(TEST_GML_A),
        'LoD2_32_513_5402_1_BW.gml': strToU8(TEST_GML_B),
      }).buffer,
    })));
  });

  it('reloads all found BW files, lets the user review/select a shape, name it, and saves the chosen building names', async () => {
    const onProjectActivated = vi.fn();
    render(
      <NewProjectWizard
        onClose={vi.fn()}
        onProjectActivated={onProjectActivated}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Demohaus BW 29, 70563 Stuttgart' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Adresse geocodieren/i }));

    expect(await screen.findByText(/Dateien für diese Adresse/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LoD2_32_513_5403_1_BW\.gml/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LoD2_32_513_5402_1_BW\.gml/i })).toBeInTheDocument();
    expect(screen.getByText(/MapPreview:1:1:DEBW_test_1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /LoD2_32_513_5402_1_BW\.gml/i }));
    expect(await screen.findByText(/MapPreview:1:1:DEBW_test_2/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /Name für DEBW_test_2/i }), {
      target: { value: 'Pavillon Süd' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Projekt aktivieren \(1 Gebäude\)/i }));

    await waitFor(() => {
      expect(onProjectActivated).toHaveBeenCalledTimes(1);
    });
    const slugs = JSON.parse(window.localStorage.getItem('hk_project_list') ?? '[]') as string[];
    expect(slugs).toHaveLength(1);
    const saved = JSON.parse(window.localStorage.getItem(`hk_project_${slugs[0]}`) ?? '{}');
    expect(saved.confirmedIds).toEqual(['DEBW_test_2']);
    expect(saved.candidateNames).toEqual({ DEBW_test_2: 'Pavillon Süd' });
    expect(saved.sourceTile).toBe('513_5402');
  });
});
