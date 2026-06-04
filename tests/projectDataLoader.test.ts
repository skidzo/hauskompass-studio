import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveRuntimeProjectConfig } from '../src/features/project-data/projectDataLoader';

describe('projectDataLoader runtime fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('missing projects index')));
  });

  it('keeps the Eiermann workshop runtime ids resolvable without a projects index', async () => {
    await expect(resolveRuntimeProjectConfig('ws-pascal')).resolves.toEqual({
      projectId: 'ws-pascal',
      siteId: 'site-pascal',
      slug: 'workshop-campus-demo',
      mediaManifestUrl: '/local-media/workshop-campus-demo/media-manifest.json',
    });

    await expect(resolveRuntimeProjectConfig('proj-eiermann-campus')).resolves.toEqual({
      projectId: 'proj-eiermann-campus',
      siteId: 'site-eiermann-campus',
      slug: 'workshop-campus-demo',
      mediaManifestUrl: '/local-media/workshop-campus-demo/media-manifest.json',
    });
  });
});
