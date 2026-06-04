// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import corpus from './fixtures/address-corpus.json';
import { ProjectHome } from '../src/features/project-home/ProjectHome';

const workshopFixture = (corpus as Array<{ address: string; mode: string }>).find(
  (entry) => entry.address === 'Workshop-Campus Demo, 70569 Stuttgart',
);

describe('ProjectHome workshop entry smoke', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ([
        {
          id: 'pascal-workshop',
          title: 'Workshop-Campus Demo',
          subtitle: 'Fixe Release-Adresse',
          type: 'workshop',
          location: workshopFixture?.address ?? 'Workshop-Campus Demo, 70569 Stuttgart',
          description: 'Workshop smoke fixture',
          projectId: 'ws-pascal',
          siteId: 'site-pascal',
        },
      ]),
    }));
  });

  it('opens the Workshop start path for the fixed workshop fixture address', async () => {
    const onSelectBuiltin = vi.fn();
    render(
      <ProjectHome
        onSelectBuiltin={onSelectBuiltin}
        onSelectRenovation={vi.fn()}
        onNewProject={vi.fn()}
        onStartWorkshop={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    expect(await screen.findByText('Workshop-Campus Demo')).toBeInTheDocument();
    expect(screen.getByText(workshopFixture?.address ?? 'Workshop-Campus Demo, 70569 Stuttgart')).toBeInTheDocument();
    expect(screen.getByText('Workshop-Projekt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Workshop-Campus Demo/i }));

    await waitFor(() => {
      expect(onSelectBuiltin).toHaveBeenCalledWith(expect.objectContaining({
        type: 'workshop',
        location: workshopFixture?.address ?? 'Workshop-Campus Demo, 70569 Stuttgart',
      }));
    });
  });
});
