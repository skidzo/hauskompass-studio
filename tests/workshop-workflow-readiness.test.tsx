// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/workshop/db/seedLoader', () => ({
  seedProject: vi.fn(async () => undefined),
}));

vi.mock('../src/features/workshop/hooks/useWorkshopData', () => ({
  useZones: vi.fn(() => []),
  useZoneAssetCounts: vi.fn(() => ({})),
  useZoneObservationCounts: vi.fn(() => ({})),
  useZoneInterpretationCounts: vi.fn(() => ({})),
  useWorkshopScenes: vi.fn(() => []),
  useEventPhases: vi.fn(() => []),
  useAllQuestions: vi.fn(() => []),
  useZone: vi.fn(() => null),
  useZoneDetail: vi.fn(() => null),
  useObservations: vi.fn(() => []),
  useInterpretations: vi.fn(() => []),
  useMemories: vi.fn(() => []),
}));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_fn: unknown, _deps: unknown, fallback: unknown) => fallback,
}));

vi.mock('../src/features/workshop/db/workshopDb', async () => {
  const actual = await vi.importActual('../src/features/workshop/db/workshopDb');
  return {
    ...actual,
    workshopDb: {
      assets: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) },
      observations: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) },
      claims: { where: () => ({ equals: () => ({ toArray: async () => [] }) }) },
      questions: { toArray: async () => [] },
    },
  };
});

import { WorkshopRoute } from '../src/features/workshop/WorkshopRoute';

describe('Workshop workflow readiness', () => {
  it('reaches Workshop-Szenen and opens the real scene editor', async () => {
    render(<WorkshopRoute projectId="ws-pascal" siteId="site-pascal" />);

    expect(await screen.findByRole('button', { name: 'Workshop-Szenen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Workshop-Szenen' }));

    expect(screen.getByText('Keine Workshop-Szenen vorhanden.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Neue Szene/i }));

    expect(await screen.findByText('Neue Workshop-Szene')).toBeInTheDocument();
    expect(screen.getByText('Kuratiert eine Arbeitsansicht. Neue öffentliche Freigaben bleiben prüfpflichtig.')).toBeInTheDocument();
    expect(screen.getByLabelText('Titel')).toBeInTheDocument();
    expect(screen.getByLabelText('Leitfrage')).toBeInTheDocument();
  });
});
