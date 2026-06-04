// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { saveProject } from '../src/features/project-store/projectStore';
import type { ImportedProject } from '../src/features/project-store/types';

function createQuotaThrowingStorage() {
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
      if (key.startsWith('hk_project_')) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      store.set(key, value);
    },
    get length() {
      return store.size;
    },
  };
}

const TEST_PROJECT: ImportedProject = {
  slug: 'house-a',
  address: 'Test House A',
  geocode: {
    lat: 48.1,
    lon: 11.5,
    displayName: 'Test House A, Sampletown',
    utm32: { easting: 691000, northing: 5331000 },
    tileId: '514_5403',
  },
  sourceTile: '514_5403',
  candidates: [],
  confirmedIds: [],
  importedAt: '2026-05-21T10:00:00.000Z',
};

describe('projectStore failure handling', () => {
  beforeEach(() => {
    const localStorage = createQuotaThrowingStorage();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorage,
      configurable: true,
    });
  });

  it('maps browser quota failures to a user-facing storage error', () => {
    expect(() => saveProject(TEST_PROJECT)).toThrow(
      'Browserspeicher voll. Bitte löschen Sie alte Projekte, um Platz zu schaffen.',
    );
  });
});
