import { Building2, CheckCircle2, ChevronRight, CloudDownload, FileCode2, Loader2, MapPin, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveProject } from '../project-store/projectStore';
import type { ImportedProject, Lod2Candidate, ProjectGeocodeResult } from '../project-store/types';
import { geocodeAddress } from './geocode';
import { parseCityGml } from './gmlParser';

type Step = 'address' | 'gml' | 'candidates' | 'done';

interface Props {
    onClose: () => void;
    onProjectActivated: (slug: string) => void;
}

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function todaySlug(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 2km-Kachel-Name für BW: E ungerade runden, N gerade runden */
function bwZipTile(tileId: string): { zipE: number; zipN: number; gmlName: string } {
    const [tileE, tileN] = tileId.split('_').map(Number);
    const zipE = tileE % 2 === 1 ? tileE : tileE - 1;
    const zipN = tileN % 2 === 0 ? tileN : tileN - 1;
    return { zipE, zipN, gmlName: `LoD2_32_${tileE}_${tileN}_1_BW.gml` };
}

function lglBwDownloadUrl(tileId: string): string {
    const { zipE, zipN } = bwZipTile(tileId);
    return `https://opengeodata.lgl-bw.de/data/lod2/LoD2_32_${zipE}_${zipN}_2_bw.zip?customerGroup=keine-angabe`;
}

function stateFromTile(tileId: string): 'Bayern' | 'BW' | 'NRW' | 'außerhalb' | 'unbekannt' {
    const [e, n] = tileId.split('_').map(Number);
    // UTM32N-Bereich Deutschland: E ≈ 280–920, N ≈ 5230–6110 (in km)
    if (e < 280 || e > 920 || n < 5230 || n > 6110) return 'außerhalb';
    // Bayern: lon 9.9°–13.9°E → UTM32 E 555–840km, N 5249–5625km
    if (e >= 555 && e <= 840 && n >= 5249 && n <= 5625) return 'Bayern';
    // Baden-Württemberg: lon 7.5°–10.5°E → UTM32 E 400–595km, N 5249–5515km
    // Westgrenze 400 statt 420, um Freiburg (E≈414km) einzuschließen
    if (e >= 400 && e <= 595 && n >= 5249 && n <= 5515) return 'BW';
    // NRW: E 290–470, N 5620–5810
    if (e >= 290 && e <= 470 && n >= 5620 && n <= 5810) return 'NRW';
    return 'unbekannt';
}

/** Prüft ob ein Bundesland-Name (aus Nominatim) erlaubt ist. */
function isAllowedState(nominatimState: string | undefined): boolean {
    if (!nominatimState) return false;
    const s = nominatimState.toLowerCase();
    return s.includes('bayern') || s.includes('bavaria') ||
        s.includes('baden') || s.includes('württemberg') || s.includes('wuerttemberg');
}

/** Kombinierte Prüfung: Nominatim-State zuerst, UTM-Tile als Fallback. */
function checkAddressAllowed(result: { tileId: string; nominatimState?: string }): 'allowed' | 'outside_de' | 'unsupported_state' {
    // Nominatim-State hat Priorität (zuverlässiger als Tile-Schätzung)
    if (result.nominatimState !== undefined) {
        if (isAllowedState(result.nominatimState)) return 'allowed';
        // Wenn Nominatim einen deutschen Staat zurückgibt → unsupported
        // Wenn kein Staat → kein Land erkannt
        const s = result.nominatimState.toLowerCase();
        if (!s) return 'outside_de';
        return 'unsupported_state';
    }
    // Fallback: UTM-Tile-basierte Schätzung
    const state = stateFromTile(result.tileId);
    if (state === 'Bayern' || state === 'BW') return 'allowed';
    if (state === 'außerhalb') return 'outside_de';
    return 'unsupported_state';
}

function ldbvBayernUrl(): string {
    return 'https://www.ldbv.bayern.de/vermessung/zshh/lod2-de.html';
}

export function NewProjectWizard({ onClose, onProjectActivated }: Props) {
    const [step, setStep] = useState<Step>('address');
    const [address, setAddress] = useState('');
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState('');
    const [geocodeResult, setGeocodeResult] = useState<ProjectGeocodeResult | null>(null);
    const [gmlParseError, setGmlParseError] = useState('');
    const [candidates, setCandidates] = useState<Lod2Candidate[]>([]);
    const [sourceTile, setSourceTile] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [parsedFileName, setParsedFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleGeocode = async () => {
        if (!address.trim()) return;
        setGeocoding(true);
        setGeocodeError('');
        try {
            const result = await geocodeAddress(address.trim());
            const check = checkAddressAllowed(result);
            if (check === 'outside_de') {
                setGeocodeError('Die Adresse liegt außerhalb Deutschlands. Bitte eine Adresse in Deutschland eingeben.');
                return;
            }
            if (check === 'unsupported_state') {
                setGeocodeError('Derzeit werden nur Adressen in Bayern und Baden-Württemberg unterstützt. Weitere Bundesländer folgen.');
                return;
            }
            setGeocodeResult(result);
            setStep('gml');
        } catch (err) {
            setGeocodeError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setGeocoding(false);
        }
    };

    const handleGmlFile = useCallback(
        async (file: File) => {
            if (!geocodeResult) return;
            setGmlParseError('');
            try {
                const text = await file.text();
                const result = parseCityGml(text, file.name, geocodeResult.utm32);
                if (result.candidates.length === 0) {
                    setGmlParseError('Keine Gebäude im GML gefunden. Falsches Tile oder leere Datei.');
                    return;
                }
                const nearestDist = result.candidates[0]?.bboxDistanceToGeocodeM ?? Infinity;
                if (nearestDist > 5000) {
                    setGmlParseError(
                        `Tile-Mismatch: Das nächste Gebäude ist ${(nearestDist / 1000).toFixed(1)} km von der Adresse entfernt. ` +
                        `Bitte die Kachel für Tile ${geocodeResult.tileId} hochladen.`,
                    );
                    return;
                }
                setCandidates(result.candidates);
                setSourceTile(result.sourceTile);
                setParsedFileName(file.name);
                // Auto-select top candidate
                setSelectedIds(new Set([result.candidates[0].id]));
                setStep('candidates');
            } catch (err) {
                setGmlParseError(err instanceof Error ? err.message : 'Parse-Fehler');
            }
        },
        [geocodeResult],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleGmlFile(file);
        },
        [handleGmlFile],
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) void handleGmlFile(file);
        },
        [handleGmlFile],
    );

    const toggleCandidate = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const [activateError, setActivateError] = useState('');

    const handleActivate = () => {
        if (!geocodeResult) return;
        setActivateError('');
        const slug = `retrieval_${todaySlug()}_${slugify(address)}`;
        const project: ImportedProject = {
            slug,
            address,
            geocode: geocodeResult,
            sourceTile,
            candidates,
            confirmedIds: Array.from(selectedIds),
            importedAt: new Date().toISOString(),
        };
        try {
            saveProject(project);
        } catch (err) {
            setActivateError(err instanceof Error ? err.message : 'Speicherfehler');
            return;
        }
        setStep('done');
        onProjectActivated(slug);
    };

    const state = geocodeResult ? stateFromTile(geocodeResult.tileId) : null;

    return (
        <div className="welcome-root" role="dialog" aria-modal="true" aria-label="Neues Projekt anlegen">
            <div className="welcome-inner wizard-inner">
                {/* Header */}
                <header className="welcome-header">
                    <div className="welcome-header-row">
                        <Building2 size={22} className="welcome-icon" />
                        <h1 className="welcome-title">Neues Projekt anlegen</h1>
                        <button aria-label="Schließen" className="welcome-close-btn" onClick={onClose} type="button">
                            <X size={18} />
                        </button>
                    </div>
                    {/* Step indicator */}
                    <div className="wizard-steps">
                        {(['address', 'gml', 'candidates', 'done'] as Step[]).map((s, i) => (
                            <div
                                key={s}
                                className={`wizard-step ${step === s ? 'wizard-step-active' : ''} ${['address', 'gml', 'candidates', 'done'].indexOf(step) > i ? 'wizard-step-done' : ''
                                    }`}
                            >
                                <span className="wizard-step-num">{i + 1}</span>
                                <span className="wizard-step-label">
                                    {s === 'address' ? 'Adresse' : s === 'gml' ? 'GML-Datei' : s === 'candidates' ? 'Gebäude' : 'Aktiviert'}
                                </span>
                                {i < 3 && <ChevronRight size={12} className="wizard-step-sep" />}
                            </div>
                        ))}
                    </div>
                </header>

                {/* ── Step 1: Address ── */}
                {step === 'address' && (
                    <div className="wizard-step-body">
                        <label className="wizard-field-label">
                            <MapPin size={14} />
                            Adresse des Gebäudes
                        </label>
                        <input
                            autoFocus
                            className="wizard-input"
                            onChange={(e) => setAddress(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleGeocode();
                            }}
                            placeholder="z.B. Büsnauer Str. 29, 70563 Stuttgart"
                            type="text"
                            value={address}
                        />
                        {geocodeError && <p className="wizard-error">{geocodeError}</p>}
                        <button
                            className="wizard-btn-primary"
                            disabled={!address.trim() || geocoding}
                            onClick={() => void handleGeocode()}
                            type="button"
                        >
                            {geocoding ? (
                                <>
                                    <Loader2 size={15} className="wizard-spin" />
                                    Geocodiere…
                                </>
                            ) : (
                                <>
                                    <MapPin size={15} />
                                    Adresse geocodieren
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* ── Step 2: GML Upload ── */}
                {step === 'gml' && geocodeResult && (
                    <div className="wizard-step-body">
                        <div className="wizard-geocode-result">
                            <MapPin size={14} />
                            <div>
                                <strong>{geocodeResult.displayName.split(',').slice(0, 3).join(',')}</strong>
                                <span>
                                    E {geocodeResult.utm32.easting.toFixed(0)} / N {geocodeResult.utm32.northing.toFixed(0)} · Tile{' '}
                                    <code>{geocodeResult.tileId}</code> · {state}
                                </span>
                            </div>
                        </div>

                        <div className="wizard-download-hint">
                            <CloudDownload size={14} />
                            <div>
                                <strong>LoD2 CityGML herunterladen</strong>
                                {state === 'Bayern' && (
                                    <span>
                                        LDBV Bayern:{' '}
                                        <a href={ldbvBayernUrl()} rel="noreferrer" target="_blank">
                                            ldbv.bayern.de → LoD2
                                        </a>{' '}
                                        — Tile <code>{geocodeResult.tileId}.gml</code>
                                    </span>
                                )}
                                {state === 'BW' && (() => {
                                    const bw = bwZipTile(geocodeResult.tileId);
                                    const dlUrl = lglBwDownloadUrl(geocodeResult.tileId);
                                    const [tileE, tileN] = geocodeResult.tileId.split('_').map(Number);
                                    const adjName = `LoD2_32_${tileE}_${tileN - 1}_1_BW.gml`;
                                    return (
                                        <span>
                                            LGL Baden-Württemberg:{' '}
                                            <a href={dlUrl} rel="noreferrer" target="_blank">
                                                ZIP herunterladen
                                            </a>{' '}
                                            — darin <code>{bw.gmlName}</code> hochladen
                                            <br />
                                            <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                                                Liegt die Adresse auf einer Kachelgrenze? Die ZIP enthält auch{' '}
                                                <code>{adjName}</code> — bei Gebäudemangel beide versuchen.
                                            </span>
                                        </span>
                                    );
                                })()}
                                {state !== 'Bayern' && state !== 'BW' && (
                                    <span>
                                        Bundesland-Geoportal aufrufen und Tile <code>{geocodeResult.tileId}.gml</code> herunterladen
                                    </span>
                                )}
                            </div>
                        </div>

                        <div
                            className={`wizard-dropzone ${isDragging ? 'wizard-dropzone-drag' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragLeave={() => setIsDragging(false)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDrop={handleDrop}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') fileInputRef.current?.click();
                            }}
                        >
                            <Upload size={28} />
                            <strong>GML-Datei hier ablegen</strong>
                            <span>oder klicken zum Auswählen · .gml · .xml</span>
                            <input
                                accept=".gml,.xml"
                                onChange={handleFileInput}
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                type="file"
                            />
                        </div>
                        {gmlParseError && <p className="wizard-error">{gmlParseError}</p>}
                    </div>
                )}

                {/* ── Step 3: Candidate selection ── */}
                {step === 'candidates' && (() => {
                    const nearestDist = candidates[0]?.bboxDistanceToGeocodeM ?? 0;
                    return (
                        <div className="wizard-step-body">
                            <p className="wizard-hint">
                                <FileCode2 size={13} />
                                {parsedFileName} · {candidates.length} Gebäude gefunden · Bestätige das Objekt des Interesses:
                            </p>
                            {nearestDist > 30 && (
                                <p className="wizard-hint" style={{ color: 'var(--color-warning, #b45309)' }}>
                                    Nächstes Gebäude {nearestDist.toFixed(0)} m entfernt — Adresspunkt liegt evtl. auf Kachelgrenze oder Campus-Einfahrt. Richtige Pavillons wählen.
                                </p>
                            )}
                            <div className="wizard-candidate-list">
                                {candidates.slice(0, 20).map((c) => {
                                    const selected = selectedIds.has(c.id);
                                    const sizeE = Math.round(c.bboxUtm32.maxE - c.bboxUtm32.minE);
                                    const sizeN = Math.round(c.bboxUtm32.maxN - c.bboxUtm32.minN);
                                    return (
                                        <button
                                            className={`wizard-candidate ${selected ? 'wizard-candidate-selected' : ''}`}
                                            key={c.id}
                                            onClick={() => toggleCandidate(c.id)}
                                            type="button"
                                        >
                                            <div className="wizard-candidate-top">
                                                <span className="wizard-candidate-id">{c.id}</span>
                                                <span className="wizard-candidate-dist">{c.bboxDistanceToGeocodeM.toFixed(0)} m</span>
                                            </div>
                                            <div className="wizard-candidate-meta">
                                                {c.measuredHeightM.toFixed(1)} m · {sizeE}&thinsp;×&thinsp;{sizeN} m · {c.surfaces.roof.length} Dach · {c.surfaces.wall.length} Wand
                                            </div>
                                            {selected && <CheckCircle2 size={14} className="wizard-candidate-check" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                className="wizard-btn-primary"
                                disabled={selectedIds.size === 0}
                                onClick={handleActivate}
                                type="button"
                            >
                                <CheckCircle2 size={15} />
                                Projekt aktivieren ({selectedIds.size} Gebäude)
                            </button>
                            {activateError && <p className="wizard-error">{activateError}</p>}
                        </div>
                    );
                })()}

                {/* ── Step 4: Done ── */}
                {step === 'done' && (
                    <div className="wizard-step-body wizard-done">
                        <CheckCircle2 size={40} className="wizard-done-icon" />
                        <h2>Projekt aktiviert</h2>
                        <p>{address}</p>
                        <p className="wizard-hint">
                            {selectedIds.size} Gebäude importiert · {candidates.length} Kandidaten
                        </p>
                        <button className="wizard-btn-primary" onClick={onClose} type="button">
                            Zur Projektansicht
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
