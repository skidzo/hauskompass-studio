import { strFromU8, unzipSync } from 'fflate';
import { Building2, CheckCircle2, ChevronRight, CloudDownload, FileCode2, Loader2, MapPin, RefreshCw, Target, Upload, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ImportedSiteMapPanel } from '../map-view/ImportedSiteMapPanel';
import { saveProject } from '../project-store/projectStore';
import type { ImportedProject, Lod2Candidate, ProjectGeocodeResult } from '../project-store/types';
import { checkAddressAllowed, stateFromTile } from './addressSupport';
import { geocodeAddress } from './geocode';
import { parseCityGml } from './gmlParser';

type Step = 'address' | 'gml' | 'candidates' | 'done';

interface Props {
    onClose: () => void;
    onProjectActivated: (slug: string) => void;
}

interface CandidateSourceFile {
    fileName: string;
    sourceTile: string;
    candidates: Lod2Candidate[];
    nearestDist: number;
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
    const path = `/data/lod2/LoD2_32_${zipE}_${zipN}_2_bw.zip?customerGroup=keine-angabe`;
    // In Dev: Vite-Proxy leitet weiter → CORS-Header werden korrekt gesetzt.
    // In Prod: direkter Aufruf (CORS-Block führt zum manuellen Fallback).
    if (import.meta.env.DEV) {
        return `/api/lgl-bw${path}`;
    }
    return `https://opengeodata.lgl-bw.de${path}`;
}

function ldbvBayernUrl(): string {
    return 'https://www.ldbv.bayern.de/vermessung/zshh/lod2-de.html';
}

function sortCandidateFiles(entries: CandidateSourceFile[]) {
    return [...entries].sort((a, b) => a.nearestDist - b.nearestDist || a.fileName.localeCompare(b.fileName));
}

function ensureCandidateNames(candidates: Lod2Candidate[], previous: Record<string, string>) {
    const next = { ...previous };
    // Only pre-name the first (nearest) candidate as the default main building.
    // All other candidates are considered context geometry until the user names them explicitly.
    const first = candidates[0];
    if (first && !next[first.id]) {
        next[first.id] = 'Hauptgebäude';
    }
    return next;
}

async function fetchBwCandidateFiles(geocodeResult: ProjectGeocodeResult): Promise<CandidateSourceFile[]> {
    const response = await fetch(lglBwDownloadUrl(geocodeResult.tileId));
    if (!response.ok) {
        throw new Error(`BW LoD2 Download fehlgeschlagen: HTTP ${response.status}`);
    }

    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const parsed = Object.entries(archive)
        .filter(([name]) => name.toLowerCase().endsWith('.gml'))
        .map(([name, data]) => {
            const result = parseCityGml(strFromU8(data), name, geocodeResult.utm32);
            return {
                fileName: name,
                sourceTile: result.sourceTile,
                candidates: result.candidates,
                nearestDist: result.candidates[0]?.bboxDistanceToGeocodeM ?? Number.POSITIVE_INFINITY,
            } satisfies CandidateSourceFile;
        })
        .filter((entry) => entry.candidates.length > 0);

    if (parsed.length === 0) {
        throw new Error('Die BW-Download-Datei enthält keine auswertbaren GML-Gebäude.');
    }

    const sorted = sortCandidateFiles(parsed);
    if (sorted[0].nearestDist > 5000) {
        throw new Error(
            `Tile-Mismatch: Das nächste Gebäude ist ${(sorted[0].nearestDist / 1000).toFixed(1)} km von der Adresse entfernt. ` +
            `Bitte die Kachel für Tile ${geocodeResult.tileId} prüfen.`,
        );
    }

    return sorted;
}

export function NewProjectWizard({ onClose, onProjectActivated }: Props) {
    const [step, setStep] = useState<Step>('address');
    const [address, setAddress] = useState('');
    const [geocoding, setGeocoding] = useState(false);
    const [autoLoadingGml, setAutoLoadingGml] = useState(false);
    const [geocodeError, setGeocodeError] = useState('');
    const [geocodeResult, setGeocodeResult] = useState<ProjectGeocodeResult | null>(null);
    const [gmlParseError, setGmlParseError] = useState('');
    const [candidates, setCandidates] = useState<Lod2Candidate[]>([]);
    const [sourceTile, setSourceTile] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [focusedCandidateId, setFocusedCandidateId] = useState('');
    const [candidateNames, setCandidateNames] = useState<Record<string, string>>({});
    const [discoveredFiles, setDiscoveredFiles] = useState<CandidateSourceFile[]>([]);
    const [activeFileName, setActiveFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [parsedFileName, setParsedFileName] = useState('');
    const [radiusM, setRadiusM] = useState(100);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const applyCandidateSource = useCallback((entry: CandidateSourceFile) => {
        setCandidates(entry.candidates);
        setSourceTile(entry.sourceTile);
        setParsedFileName(entry.fileName);
        setActiveFileName(entry.fileName);
        setSelectedIds(new Set(entry.candidates[0] ? [entry.candidates[0].id] : []));
        setFocusedCandidateId(entry.candidates[0]?.id ?? '');
        setCandidateNames((previous) => ensureCandidateNames(entry.candidates, previous));
        setStep('candidates');
    }, []);

    const reloadBwCandidateFiles = useCallback(async () => {
        if (!geocodeResult) return;
        setAutoLoadingGml(true);
        setGmlParseError('');
        try {
            const files = await fetchBwCandidateFiles(geocodeResult);
            setDiscoveredFiles(files);
            applyCandidateSource(files[0]);
        } catch (autoErr) {
            setGmlParseError(
                autoErr instanceof Error
                    ? `${autoErr.message} Automatischer Abruf fehlgeschlagen. Bitte LoD2 GML manuell hochladen.`
                    : 'Automatischer Abruf fehlgeschlagen. Bitte LoD2 GML manuell hochladen.',
            );
            setStep('gml');
        } finally {
            setAutoLoadingGml(false);
        }
    }, [applyCandidateSource, geocodeResult]);

    const handleGeocode = async () => {
        if (!address.trim()) return;
        setGeocoding(true);
        setGeocodeError('');
        setGmlParseError('');
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
            setDiscoveredFiles([]);
            setCandidateNames({});
            if (stateFromTile(result.tileId) === 'BW') {
                setAutoLoadingGml(true);
                try {
                    const files = await fetchBwCandidateFiles(result);
                    setDiscoveredFiles(files);
                    applyCandidateSource(files[0]);
                } catch (autoErr) {
                    setGmlParseError(
                        autoErr instanceof Error
                            ? `${autoErr.message} Automatischer Abruf fehlgeschlagen. Bitte LoD2 GML manuell hochladen.`
                            : 'Automatischer Abruf fehlgeschlagen. Bitte LoD2 GML manuell hochladen.',
                    );
                    setStep('gml');
                } finally {
                    setAutoLoadingGml(false);
                }
            } else {
                setStep('gml');
            }
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
                const files = sortCandidateFiles([
                    {
                        fileName: file.name,
                        sourceTile: result.sourceTile,
                        candidates: result.candidates,
                        nearestDist,
                    },
                ]);
                setDiscoveredFiles(files);
                applyCandidateSource(files[0]);
            } catch (err) {
                setGmlParseError(err instanceof Error ? err.message : 'Parse-Fehler');
            }
        },
        [applyCandidateSource, geocodeResult],
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
        setFocusedCandidateId(id);
        setCandidateNames((previous) => ({
            ...previous,
            [id]: previous[id] || `Gebäude ${Object.keys(previous).length + 1}`,
        }));
    };

    const selectByRadius = (radius: number) => {
        const inRadius = candidates.filter((c) => c.bboxDistanceToGeocodeM <= radius);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const c of inRadius) next.add(c.id);
            return next;
        });
        // Context buildings added via radius are intentionally left unnamed —
        // only the main building (toggled manually) gets a name.
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setCandidateNames({});
    };

    const selectedCandidates = useMemo(
        () => candidates.filter((candidate) => selectedIds.has(candidate.id)),
        [candidates, selectedIds],
    );

    const previewProject = useMemo<ImportedProject | null>(() => {
        if (!geocodeResult) return null;
        return {
            slug: `wizard-preview-${geocodeResult.tileId}`,
            address,
            geocode: geocodeResult,
            sourceTile,
            candidates,
            confirmedIds: Array.from(selectedIds),
            candidateNames,
            importedAt: new Date().toISOString(),
        };
    }, [address, candidateNames, candidates, geocodeResult, selectedIds, sourceTile]);

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
            candidateNames: Object.fromEntries(
                Object.entries(candidateNames).filter(([candidateId, value]) => selectedIds.has(candidateId) && value.trim().length > 0),
            ),
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
                <header className="welcome-header">
                    <div className="welcome-header-row">
                        <Building2 size={22} className="welcome-icon" />
                        <h1 className="welcome-title">Neues Projekt anlegen</h1>
                        <button aria-label="Schließen" className="welcome-close-btn" onClick={onClose} type="button">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="wizard-steps">
                        {(['address', 'gml', 'candidates', 'done'] as Step[]).map((s, i) => (
                            <div
                                key={s}
                                className={`wizard-step ${step === s ? 'wizard-step-active' : ''} ${['address', 'gml', 'candidates', 'done'].indexOf(step) > i ? 'wizard-step-done' : ''}`}
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
                            placeholder="z.B. Demohaus BW 29, 70563 Stuttgart"
                            type="text"
                            value={address}
                        />
                        {geocodeError && <p className="wizard-error">{geocodeError}</p>}
                        <button
                            className="wizard-btn-primary"
                            disabled={!address.trim() || geocoding || autoLoadingGml}
                            onClick={() => void handleGeocode()}
                            type="button"
                        >
                            {geocoding ? (
                                <>
                                    <Loader2 size={15} className="wizard-spin" />
                                    Geocodiere…
                                </>
                            ) : autoLoadingGml ? (
                                <>
                                    <Loader2 size={15} className="wizard-spin" />
                                    Lade gefundene Dateien…
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

                {step === 'gml' && geocodeResult && (
                    <div className="wizard-step-body">
                        <div className="wizard-geocode-result">
                            <MapPin size={14} />
                            <div>
                                <strong>{geocodeResult.displayName.split(',').slice(0, 3).join(',')}</strong>
                                <span>
                                    E {geocodeResult.utm32.easting.toFixed(0)} / N {geocodeResult.utm32.northing.toFixed(0)} · Tile <code>{geocodeResult.tileId}</code> · {state}
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
                                                Liegt die Adresse auf einer Kachelgrenze? Die ZIP enthält auch <code>{adjName}</code> — bei Gebäudemangel beide versuchen.
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

                {step === 'candidates' && geocodeResult && previewProject && (() => {
                    const nearestDist = candidates[0]?.bboxDistanceToGeocodeM ?? 0;
                    const isBw = state === 'BW';
                    return (
                        <div className="wizard-step-body">
                            <p className="wizard-hint">
                                <FileCode2 size={13} />
                                {parsedFileName} · {candidates.length} Gebäude gefunden · Formen prüfen, Gebäude auswählen und benennen.
                            </p>
                            {nearestDist > 30 && (
                                <p className="wizard-hint" style={{ color: 'var(--color-warning, #b45309)' }}>
                                    Nächstes Gebäude {nearestDist.toFixed(0)} m entfernt — Adresspunkt liegt evtl. auf Kachelgrenze oder Campus-Einfahrt. Richtige Gebäudeformen wählen.
                                </p>
                            )}

                            <div className="wizard-review-actions">
                                {isBw && (
                                    <button className="wizard-btn-secondary" disabled={autoLoadingGml} onClick={() => void reloadBwCandidateFiles()} type="button">
                                        <RefreshCw size={14} className={autoLoadingGml ? 'wizard-spin' : ''} />
                                        Dateien für Adresse neu laden
                                    </button>
                                )}
                                <button className="wizard-btn-secondary" onClick={() => setStep('gml')} type="button">
                                    <Upload size={14} />
                                    Andere GML-Datei wählen
                                </button>
                            </div>

                            <div className="wizard-source-files">
                                <span className="wizard-source-files-label">Dateien für diese Adresse</span>
                                <div className="wizard-source-files-list">
                                    {discoveredFiles.map((entry) => (
                                        <button
                                            key={entry.fileName}
                                            className={`wizard-source-file ${entry.fileName === activeFileName ? 'wizard-source-file-active' : ''}`}
                                            onClick={() => applyCandidateSource(entry)}
                                            type="button"
                                        >
                                            <strong>{entry.fileName}</strong>
                                            <span>{entry.candidates.length} Gebäude · {entry.nearestDist.toFixed(0)} m zum nächsten</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="wizard-review-layout">
                                <div className="wizard-review-map">
                                    <ImportedSiteMapPanel
                                        project={previewProject}
                                        terrainData={null}
                                        selectedId={focusedCandidateId}
                                        onSelectCandidate={setFocusedCandidateId}
                                        onUpdateProject={(nextProject) => {
                                            setSelectedIds(new Set(nextProject.confirmedIds));
                                        }}
                                    />
                                </div>
                                <div className="wizard-review-sidebar">
                                    <div className="wizard-radius-bar">
                                        <Target size={13} className="wizard-radius-icon" />
                                        <label className="wizard-radius-label">
                                            Umkreis
                                            <select
                                                className="wizard-radius-select"
                                                value={radiusM}
                                                onChange={(e) => setRadiusM(Number(e.target.value))}
                                            >
                                                <option value={50}>50 m</option>
                                                <option value={100}>100 m</option>
                                                <option value={200}>200 m</option>
                                                <option value={300}>300 m</option>
                                                <option value={500}>500 m</option>
                                                <option value={1000}>1000 m</option>
                                            </select>
                                        </label>
                                        <button
                                            type="button"
                                            className="wizard-btn-secondary wizard-btn-xs"
                                            onClick={() => selectByRadius(radiusM)}
                                        >
                                            {(() => {
                                                const total = candidates.filter((c) => c.bboxDistanceToGeocodeM <= radiusM).length;
                                                const newCount = candidates.filter((c) => c.bboxDistanceToGeocodeM <= radiusM && !selectedIds.has(c.id)).length;
                                                return newCount > 0 ? `+ ${newCount} hinzufügen (${total} im Umkreis)` : `✓ Alle ${total} im Umkreis ausgewählt`;
                                            })()}
                                        </button>
                                        {selectedIds.size > 0 && (
                                            <button
                                                type="button"
                                                className="wizard-btn-secondary wizard-btn-xs"
                                                onClick={clearSelection}
                                            >
                                                <XCircle size={12} />
                                                leeren
                                            </button>
                                        )}
                                    </div>
                                    <div className="wizard-candidate-list">
                                        {candidates.map((candidate) => {
                                            const selected = selectedIds.has(candidate.id);
                                            const active = candidate.id === focusedCandidateId;
                                            const sizeE = Math.round(candidate.bboxUtm32.maxE - candidate.bboxUtm32.minE);
                                            const sizeN = Math.round(candidate.bboxUtm32.maxN - candidate.bboxUtm32.minN);
                                            return (
                                                <div key={candidate.id} className={`wizard-candidate ${active ? 'wizard-candidate-active' : ''} ${selected ? 'wizard-candidate-selected' : ''}`}>
                                                    <button className="wizard-candidate-main" onClick={() => setFocusedCandidateId(candidate.id)} type="button">
                                                        <div className="wizard-candidate-top">
                                                            <span className="wizard-candidate-id">{candidate.id}</span>
                                                            <span className="wizard-candidate-dist">{candidate.bboxDistanceToGeocodeM.toFixed(0)} m</span>
                                                        </div>
                                                        <div className="wizard-candidate-meta">
                                                            {candidate.measuredHeightM.toFixed(1)} m · {sizeE}&thinsp;×&thinsp;{sizeN} m · {candidate.surfaces.roof.length} Dach · {candidate.surfaces.wall.length} Wand
                                                        </div>
                                                    </button>
                                                    <button
                                                        aria-label={`${selected ? 'Abwählen' : 'Auswählen'} ${candidate.id}`}
                                                        className={`wizard-candidate-toggle ${selected ? 'wizard-candidate-toggle-selected' : ''}`}
                                                        onClick={() => toggleCandidate(candidate.id)}
                                                        type="button"
                                                    >
                                                        {selected ? <CheckCircle2 size={14} /> : 'Auswählen'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="wizard-naming-panel">
                                        <div className="wizard-naming-header">
                                            <strong>Ausgewählte Gebäude benennen</strong>
                                            <span>{selectedCandidates.length} ausgewählt</span>
                                        </div>
                                        {selectedCandidates.length === 0 && (
                                            <p className="wizard-hint">Auf der Karte oder in der Liste Gebäude auswählen, dann Namen vergeben.</p>
                                        )}
                                        {(() => {
                                            const named = selectedCandidates.filter((c) => candidateNames[c.id]?.trim());
                                            const unnamedCount = selectedCandidates.length - named.length;
                                            return (
                                                <>
                                                    {named.map((candidate, index) => (
                                                        <label key={candidate.id} className="wizard-name-field">
                                                            <span>{candidate.id}</span>
                                                            <input
                                                                aria-label={`Name für ${candidate.id}`}
                                                                className="wizard-input"
                                                                onChange={(event) => setCandidateNames((previous) => ({
                                                                    ...previous,
                                                                    [candidate.id]: event.target.value,
                                                                }))}
                                                                placeholder={`z. B. Gebäude ${index + 1}`}
                                                                type="text"
                                                                value={candidateNames[candidate.id] ?? ''}
                                                            />
                                                        </label>
                                                    ))}
                                                    {unnamedCount > 0 && (
                                                        <p className="wizard-hint wizard-context-hint">
                                                            {unnamedCount} Kontextgebäude ohne Namen — werden als Umgebungsgeometrie gespeichert.
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
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
