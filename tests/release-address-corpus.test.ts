import { describe, expect, it } from 'vitest';

import corpus from './fixtures/address-corpus.json';
import { checkAddressAllowed } from '../src/features/new-project/addressSupport';

interface AddressFixture {
  address: string;
  mode: 'workshop' | 'renovation' | 'unsupported';
  entry: 'builtin' | 'wizard';
  region: string;
  status: 'supported' | 'unsupported_state' | 'outside_de';
  tileId: string;
  nominatimState: string;
}

const fixtures = corpus as AddressFixture[];

describe('release smoke: fixed address corpus', () => {
  it('keeps the intended address-to-mode matrix stable', () => {
    expect(fixtures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: 'Workshop-Campus Demo, 70569 Stuttgart', mode: 'workshop', entry: 'builtin' }),
        expect.objectContaining({ address: 'Demohaus BW 29, 70563 Stuttgart', mode: 'renovation', entry: 'wizard' }),
        expect.objectContaining({ address: 'Demohaus BY 31, 92526 Beispielstadt', mode: 'renovation', entry: 'wizard' }),
      ]),
    );
  });

  it('classifies wizard-driven addresses according to the corpus', () => {
    fixtures
      .filter((fixture) => fixture.entry === 'wizard')
      .forEach((fixture) => {
        expect(
          checkAddressAllowed({
            tileId: fixture.tileId,
            nominatimState: fixture.nominatimState,
          }),
          fixture.address,
        ).toBe(fixture.status === 'supported' ? 'allowed' : fixture.status);
      });
  });
});
