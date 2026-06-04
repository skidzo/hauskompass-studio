export type AddressSupportState = 'Bayern' | 'BW' | 'NRW' | 'außerhalb' | 'unbekannt';
export type AddressSupportResult = 'allowed' | 'outside_de' | 'unsupported_state';

export function stateFromTile(tileId: string): AddressSupportState {
    const [e, n] = tileId.split('_').map(Number);
    if (e < 280 || e > 920 || n < 5230 || n > 6110) return 'außerhalb';
    if (e >= 555 && e <= 840 && n >= 5249 && n <= 5625) return 'Bayern';
    if (e >= 400 && e <= 595 && n >= 5249 && n <= 5515) return 'BW';
    if (e >= 290 && e <= 470 && n >= 5620 && n <= 5810) return 'NRW';
    return 'unbekannt';
}

export function isAllowedState(nominatimState: string | undefined): boolean {
    if (!nominatimState) return false;
    const s = nominatimState.toLowerCase();
    return s.includes('bayern') || s.includes('bavaria')
        || s.includes('baden') || s.includes('württemberg') || s.includes('wuerttemberg');
}

export function checkAddressAllowed(result: { tileId: string; nominatimState?: string }): AddressSupportResult {
    if (result.nominatimState !== undefined) {
        if (isAllowedState(result.nominatimState)) return 'allowed';
        const s = result.nominatimState.toLowerCase();
        if (!s) return 'outside_de';
        return 'unsupported_state';
    }
    const state = stateFromTile(result.tileId);
    if (state === 'Bayern' || state === 'BW') return 'allowed';
    if (state === 'außerhalb') return 'outside_de';
    return 'unsupported_state';
}
