import { useCallback, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkshopSection = 'map' | 'zones' | '3d' | 'import';
export type RenovationSection = 'site' | 'building' | 'assessment' | 'planning' | 'data';

export type Route =
    | { mode: 'home' }
    | { mode: 'workshop'; section: WorkshopSection }
    | { mode: 'renovation'; slug: string; section: RenovationSection };

// ── Parser ────────────────────────────────────────────────────────────────────

const WORKSHOP_SECTIONS: WorkshopSection[] = ['map', 'zones', '3d', 'import'];
const RENOVATION_SECTIONS: RenovationSection[] = ['site', 'building', 'assessment', 'planning', 'data'];

function toWorkshopSection(s: string | undefined): WorkshopSection {
    return WORKSHOP_SECTIONS.includes(s as WorkshopSection)
        ? (s as WorkshopSection)
        : 'map';
}

function toRenovationSection(s: string | undefined): RenovationSection {
    return RENOVATION_SECTIONS.includes(s as RenovationSection)
        ? (s as RenovationSection)
        : 'site';
}

export function parseHash(hash: string | undefined | null): Route {
    // Guard: jsdom / SSR may have no hash
    if (!hash) return { mode: 'home' };
    // Strip leading '#' and optional '/'
    const clean = hash.replace(/^#\/?/, '').trim();
    if (!clean) return { mode: 'home' };

    const [seg0, seg1, seg2] = clean.split('/');

    if (seg0 === 'workshop') {
        return { mode: 'workshop', section: toWorkshopSection(seg1) };
    }
    if (seg0 === 'renovation' && seg1) {
        return { mode: 'renovation', slug: decodeURIComponent(seg1), section: toRenovationSection(seg2) };
    }
    return { mode: 'home' };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface HashRouterReturn {
    route: Route;
    navigate: (path: string) => void;
    /** Replace current history entry instead of pushing */
    replace: (path: string) => void;
}

export function useHashRouter(): HashRouterReturn {
    const [route, setRoute] = useState<Route>(() =>
        parseHash(typeof window !== 'undefined' ? window.location.hash : ''),
    );

    useEffect(() => {
        const handler = () => setRoute(parseHash(window.location.hash));
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const navigate = useCallback((path: string) => {
        const normalised = path.startsWith('/') ? path : `/${path}`;
        window.location.hash = normalised;
        setRoute(parseHash(`#${normalised}`));
    }, []);

    const replace = useCallback((path: string) => {
        const normalised = path.startsWith('/') ? path : `/${path}`;
        if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
            history.replaceState(null, '', `#${normalised}`);
        } else {
            window.location.hash = normalised;
        }
        setRoute(parseHash(`#${normalised}`));
    }, []);

    return { route, navigate, replace };
}

// ── Path builders (typed, avoids hand-written strings) ───────────────────────

export const routePath = {
    home: () => '/',
    workshop: (section: WorkshopSection = 'map') => `/workshop/${section}`,
    renovation: (slug: string, section: RenovationSection = 'site') =>
        `/renovation/${encodeURIComponent(slug)}/${section}`,
} as const;
