import { Building2, ClipboardCopy, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function slugFromAddress(addr: string): string {
    return addr
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function todaySlug(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function buildConfigTemplate(address: string): string {
    const slug = `retrieval_${todaySlug()}_${slugFromAddress(address)}`;
    return JSON.stringify(
        {
            _comment: 'Per-project constants for the data generation pipeline. Replace all fields for a new property.',
            cacheSlug: slug,
            dgmTile: '<TILE_ID, e.g. 748_5484>',
            targetEasting: '<UTM32 easting from geocode>',
            targetNorthing: '<UTM32 northing from geocode>',
            mapElevationM: '<approx terrain elevation at address>',
            confirmedLod2Ids: ['<BUILDING_ID_FROM_GML>'],
            referenceLod2Ids: ['<NEIGHBOR_ID_1>', '<NEIGHBOR_ID_2>'],
            ifc: {
                part1RoofSurfaceIds: { eastMain: '<SURFACE_ID>', westMain: '<SURFACE_ID>', erker: '<SURFACE_ID>' },
                part2RoofSurfaceIds: { westLow1: '<SURFACE_ID>', westLow2: '<SURFACE_ID>', westMain: '<SURFACE_ID>', eastMain: '<SURFACE_ID>' },
            },
        },
        null,
        2,
    );
}

interface Props {
    onClose: () => void;
}

export function WelcomeScreen({ onClose }: Props) {
    const [address, setAddress] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const configTemplate = address.trim() ? buildConfigTemplate(address.trim()) : null;
    const cacheSlug = address.trim() ? `retrieval_${todaySlug()}_${slugFromAddress(address.trim())}` : '';

    function copyConfig() {
        if (!configTemplate) return;
        navigator.clipboard.writeText(configTemplate).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="welcome-root" role="dialog" aria-modal="true" aria-label="Neues Projekt anlegen">
            <div className="welcome-inner">
                <header className="welcome-header">
                    <div className="welcome-header-row">
                        <Building2 size={24} className="welcome-icon" />
                        <h1 className="welcome-title">Neues Projekt anlegen</h1>
                        <button
                            aria-label="Schließen"
                            className="welcome-close-btn"
                            onClick={onClose}
                            type="button"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <p className="welcome-subtitle">
                        Eigene Adresse eingeben und Pipeline-Anleitung für die Datengenerierung erhalten.
                        Das aktuell geladene Projekt bleibt unberührt.
                    </p>
                </header>

                <div className="welcome-new-project">
                    <label className="welcome-input-label" htmlFor="welcome-address">
                        Adresse des Gebäudes
                    </label>
                    <input
                        autoFocus
                        className="welcome-input"
                        id="welcome-address"
                        onChange={(e) => { setAddress(e.target.value); setShowGuide(false); }}
                        placeholder="z.B. Büsnauer Str. 29, 70563 Stuttgart"
                        type="text"
                        value={address}
                    />

                    {address.trim() && (
                        <button
                            className="welcome-btn-secondary"
                            onClick={() => setShowGuide((s) => !s)}
                            style={{ marginTop: '0.75rem' }}
                            type="button"
                        >
                            {showGuide ? '▲ Pipeline-Anleitung verbergen' : '▼ Pipeline-Anleitung anzeigen'}
                        </button>
                    )}

                    {showGuide && configTemplate && (
                        <div className="welcome-guide">
                            <p className="welcome-guide-intro">
                                Cache-Pfad wird: <code className="welcome-code">{cacheSlug}</code>
                            </p>
                            <ol className="welcome-guide-steps">
                                <li>
                                    <strong>Geodaten beschaffen</strong>
                                    <ul>
                                        <li>LoD2 CityGML vom Landesvermessungsamt (LDBV Bayern / LGL BW / ...)</li>
                                        <li>DGM1 GeoTIFF (1 m Rasterdaten) vom selben Dienst</li>
                                        <li>
                                            OSM-Kontext via Overpass API → speichern als{' '}
                                            <code className="welcome-code">cache/osm/overpass_180m_roads_buildings.json</code>
                                        </li>
                                    </ul>
                                    <p>Ablegen unter: <code className="welcome-code">cache/{cacheSlug}/lod2/</code> und <code className="welcome-code">cache/{cacheSlug}/dgm1/</code></p>
                                </li>
                                <li>
                                    <strong>project.config.json anpassen</strong>
                                    <p>Koordinaten (UTM32), LoD2-IDs und Dachflächen-IDs aus dem GML eintragen und im lokalen Projektordner speichern:</p>
                                    <div className="welcome-config-preview">
                                        <button
                                            className={`welcome-copy-btn${copied ? ' welcome-copy-btn-done' : ''}`}
                                            onClick={copyConfig}
                                            title="In Zwischenablage kopieren"
                                            type="button"
                                        >
                                            <ClipboardCopy size={14} />
                                            {copied ? 'Kopiert!' : 'Template kopieren'}
                                        </button>
                                        <pre className="welcome-config-code">{configTemplate}</pre>
                                    </div>
                                </li>
                                <li>
                                    <strong>Generierungs-Pipeline ausführen</strong>
                                    <pre className="welcome-code-block">{`source .venv/bin/activate
export HAUSKOMPASS_PROJECT_CONFIG=$HOME/projekte/<mein-projekt>/project.config.json
python scripts/extract_lod2_candidates.py
python scripts/generate_site_context_data.py
python scripts/generate_assessment_data.py
python utils/export_ifc.py`}</pre>
                                </li>
                                <li>
                                    <strong>App neu starten</strong>
                                    <pre className="welcome-code-block">npm run dev</pre>
                                </li>
                            </ol>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
