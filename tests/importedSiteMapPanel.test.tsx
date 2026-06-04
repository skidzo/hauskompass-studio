// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import type { ImportedProject } from '../src/features/project-store/types';
import { ImportedSiteMapPanel } from '../src/features/map-view/ImportedSiteMapPanel';

const mapState = {
  sources: new Map<string, unknown>(),
  layers: new Map<string, unknown>(),
  addSource: vi.fn((id: string, source: unknown) => {
    mapState.sources.set(id, source);
  }),
  addLayer: vi.fn((layer: { id: string }) => {
    mapState.layers.set(layer.id, layer);
  }),
  getSource: vi.fn((id: string) => mapState.sources.get(id)),
  getLayer: vi.fn((id: string) => mapState.layers.get(id)),
  removeSource: vi.fn((id: string) => {
    mapState.sources.delete(id);
  }),
  removeLayer: vi.fn((id: string) => {
    mapState.layers.delete(id);
  }),
  resize: vi.fn(),
  fitBounds: vi.fn(),
};

vi.mock('react-map-gl/maplibre', () => {
  const Map = React.forwardRef<any, any>((props, ref) => {
    React.useImperativeHandle(ref, () => ({ getMap: () => mapState }), []);
    React.useEffect(() => {
      props.onLoad?.();
    }, [props]);
    return (
      <div>
        <button
          type="button"
          onClick={() => props.onClick?.({ features: [{ properties: { id: 'cand-2', confirmed: 0 } }] })}
        >
          map-click-cand-2
        </button>
        <div>MockMap</div>
        {props.children}
      </div>
    );
  });
  const Marker = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    __esModule: true,
    default: Map,
    Marker,
    NavigationControl: () => null,
    ScaleControl: () => null,
  };
});

function makeProject(): ImportedProject {
  return {
    slug: 'test-proj',
    address: 'Demohaus BY 31, 92526 Beispielstadt',
    sourceTile: '750_5480',
    importedAt: '2026-05-22T10:00:00.000Z',
    geocode: {
      lat: 49.477,
      lon: 12.418,
      displayName: 'Demohaus BY 31, 92526 Beispielstadt',
      utm32: { easting: 604000, northing: 5480000 },
      tileId: '750_5480',
      nominatimState: 'Bayern',
    },
    confirmedIds: ['cand-1'],
    candidates: [
      {
        id: 'cand-1',
        functionCode: '1000',
        roofTypeCode: '1000',
        measuredHeightM: 8,
        bboxUtm32: { minE: 603990, maxE: 604010, minN: 5479990, maxN: 5480010, minZ: 0, maxZ: 8 },
        centroidUtm32: { easting: 604000, northing: 5480000 },
        bboxDistanceToGeocodeM: 5,
        centroidDistanceToGeocodeM: 2,
        surfaces: {
          ground: [{
            id: 'ground-1',
            kind: 'ground',
            areaM2: 400,
            pitchDeg: 0,
            azimuthDeg: 0,
            points: [
              { e: 603990, n: 5479990, z: 0 },
              { e: 604010, n: 5479990, z: 0 },
              { e: 604010, n: 5480010, z: 0 },
              { e: 603990, n: 5480010, z: 0 },
            ],
          }],
          wall: [],
          roof: [],
        },
      },
      {
        id: 'cand-2',
        functionCode: '1000',
        roofTypeCode: '1000',
        measuredHeightM: 7,
        bboxUtm32: { minE: 604020, maxE: 604040, minN: 5479990, maxN: 5480010, minZ: 0, maxZ: 7 },
        centroidUtm32: { easting: 604030, northing: 5480000 },
        bboxDistanceToGeocodeM: 18,
        centroidDistanceToGeocodeM: 15,
        surfaces: {
          ground: [{
            id: 'ground-2',
            kind: 'ground',
            areaM2: 400,
            pitchDeg: 0,
            azimuthDeg: 0,
            points: [
              { e: 604020, n: 5479990, z: 0 },
              { e: 604040, n: 5479990, z: 0 },
              { e: 604040, n: 5480010, z: 0 },
              { e: 604020, n: 5480010, z: 0 },
            ],
          }],
          wall: [],
          roof: [],
        },
      },
    ],
  };
}

describe('ImportedSiteMapPanel', () => {
  beforeEach(() => {
    mapState.sources.clear();
    mapState.layers.clear();
    mapState.addSource.mockClear();
    mapState.addLayer.mockClear();
    mapState.getSource.mockClear();
    mapState.getLayer.mockClear();
    mapState.removeSource.mockClear();
    mapState.removeLayer.mockClear();
    mapState.resize.mockClear();
    mapState.fitBounds.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Lage metadata, creates building layers, and toggles confirmation through the map click path', async () => {
    const onUpdateProject = vi.fn();
    render(
      <ImportedSiteMapPanel
        project={makeProject()}
        terrainData={null}
        selectedId="cand-1"
        onSelectCandidate={vi.fn()}
        onUpdateProject={onUpdateProject}
      />,
    );

    expect(screen.getByText('Demohaus BY 31, 92526 Beispielstadt')).toBeInTheDocument();
    expect(screen.getByText(/2 Gebäude · 1 ausgewählt/)).toBeInTheDocument();

    await waitFor(() => {
      expect(mapState.addSource).toHaveBeenCalledWith(
        'buildings',
        expect.objectContaining({
          type: 'geojson',
          promoteId: 'id',
          data: expect.objectContaining({
            type: 'FeatureCollection',
            features: expect.arrayContaining([
              expect.objectContaining({ properties: expect.objectContaining({ id: 'cand-1', confirmed: 1, selected: 1 }) }),
              expect.objectContaining({ properties: expect.objectContaining({ id: 'cand-2', confirmed: 0, selected: 0 }) }),
            ]),
          }),
        }),
      );
    });

    expect(mapState.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'buildings-fill' }));
    expect(mapState.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'buildings-outline' }));
    expect(screen.getByRole('button', { name: 'T1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'map-click-cand-2' }));

    expect(onUpdateProject).toHaveBeenCalledWith(expect.objectContaining({ confirmedIds: ['cand-1', 'cand-2'] }));
  });
});
