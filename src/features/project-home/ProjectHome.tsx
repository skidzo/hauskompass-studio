/**
 * ProjectHome — Startseite / Projektwähler
 *
 * Zeigt:
 *  1. Eingebaute Projekte aus /projects/index.json
 *  2. Gespeicherte Renovierungsprojekte aus localStorage
 *  3. "Neues Projekt anlegen" (nur Bayern und Baden-Württemberg)
 */

import { deleteProject, listProjects, loadProject, saveProject } from '@/features/project-store/projectStore';
import type { ImportedProject } from '@/features/project-store/types';
import { loadProjectHomeRecords } from '@/features/project-home/projectHomeRegistry';
import {
    createStudioBundlePreview,
    formatStudioBundleCountSummary,
    formatStudioBundleTransportLabel,
    type StudioBundlePreview,
} from '@/lib/studio-core/backup/helpers';
import {
    createRenovationBundlePayload,
    importRenovationBundle,
    inspectRenovationBundleImport,
    type RenovationBundleExport,
} from '@/features/renovation-planning/renovationBundle';
import {
    importWorkshopBundle,
    importWorkshopBundleZip,
    inspectWorkshopBundleImport,
    inspectWorkshopBundleZipFile,
    type WorkshopBundleExport,
    type WorkshopBundlePayload,
} from '@/features/workshop/db/workshopDb';
import { Building2, FolderOpen, Home, Layers, MapPin, Pencil, Plus, Trash2, Upload, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// ── Built-in pre-existing projects ──────────────────────────────────────────

export interface BuiltinProject {
    id: string;
    slug?: string;
    projectId?: string;
    siteId?: string;
    mediaManifestUrl?: string;
    title: string;
    subtitle: string;
    type: 'workshop' | 'renovation';
    location: string;
    description: string;
}

const BUILTIN_PROJECTS_FALLBACK: BuiltinProject[] = [];

const PROJECTS_INDEX_URL = '/projects/index.json';

function useBuiltinProjects(): BuiltinProject[] {
    const [projects, setProjects] = useState<BuiltinProject[]>(BUILTIN_PROJECTS_FALLBACK);
    useEffect(() => {
        fetch(PROJECTS_INDEX_URL)
            .then((r) => r.json())
            .then((data: BuiltinProject[]) => setProjects(data))
            .catch(() => { /* keep fallback */ });
    }, []);
    return projects;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ProjectHomeProps {
    onSelectBuiltin: (project: BuiltinProject) => void;
    onSelectRenovation: (slug: string) => void;
    onNewProject: () => void;
    onStartWorkshop: () => void;
    onImportBackup: (projectId: string, siteId: string, title: string) => void;
}

type PendingProjectImport =
    | { kind: 'workshop-json'; bundle: WorkshopBundleExport; preview: StudioBundlePreview }
    | { kind: 'workshop-zip'; file: File; preview: StudioBundlePreview }
    | { kind: 'renovation-bundle'; bundle: RenovationBundleExport; preview: StudioBundlePreview }
    | { kind: 'renovation-legacy'; project: ImportedProject; preview: StudioBundlePreview };

// ── Component ────────────────────────────────────────────────────────────────

const LS_OVERRIDES_KEY = 'hk_builtin_overrides';
const PROJECT_LIST_STORAGE_KEY = 'hk_project_list';

export function loadSavedRenovationProjects(): ImportedProject[] {
    return listProjects()
        .map((slug) => loadProject(slug))
        .filter((project): project is ImportedProject => project !== null);
}

export function ProjectHome({ onSelectBuiltin, onSelectRenovation, onNewProject, onStartWorkshop, onImportBackup }: ProjectHomeProps) {
    const builtinProjects = useBuiltinProjects();

    // ── Local metadata overrides (localStorage) ───────────────────────────────
    const [overrides, setOverrides] = useState<Record<string, Partial<BuiltinProject>>>(() => {
        try { return JSON.parse(localStorage.getItem(LS_OVERRIDES_KEY) ?? '{}'); }
        catch { return {}; }
    });

    function applyOverride(proj: BuiltinProject): BuiltinProject {
        return { ...proj, ...(overrides[proj.id] ?? {}) };
    }

    // ── Edit state ────────────────────────────────────────────────────────────
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editSubtitle, setEditSubtitle] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDescription, setEditDescription] = useState('');

    function openEdit(proj: BuiltinProject, e: React.MouseEvent) {
        e.stopPropagation();
        const eff = applyOverride(proj);
        setEditTitle(eff.title);
        setEditSubtitle(eff.subtitle);
        setEditLocation(eff.location);
        setEditDescription(eff.description);
        setEditingId(proj.id);
    }

    function saveEdit() {
        if (!editingId) return;
        const next = {
            ...overrides,
            [editingId]: { title: editTitle, subtitle: editSubtitle, location: editLocation, description: editDescription },
        };
        setOverrides(next);
        localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(next));
        setEditingId(null);
    }
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<PendingProjectImport | null>(null);

    const renovImportRef = useRef<HTMLInputElement>(null);
    const [renovImporting, setRenovImporting] = useState(false);
    const [renovImportError, setRenovImportError] = useState<string | null>(null);

    function isImportedProjectFile(value: unknown): value is ImportedProject {
        return !!value
            && typeof value === 'object'
            && 'slug' in value
            && 'address' in value
            && 'geocode' in value
            && 'candidates' in value
            && Array.isArray((value as ImportedProject).candidates);
    }

    function createLegacyRenovationPreview(project: ImportedProject): StudioBundlePreview {
        return {
            title: project.address,
            label: 'Renovierung-Backup · Legacy-JSON',
            transportLabel: 'Nur Metadaten',
            countSummary: `${project.candidates.length} Gebäude · ${project.confirmedIds.length} bestätigt`,
            exportedAtLabel: project.importedAt.replace('T', ' ').slice(0, 16),
            restorable: true,
            warnings: [],
            errors: [],
        };
    }

    function createLegacyWorkshopPreview(
        bundle: WorkshopBundleExport | WorkshopBundlePayload,
        inspection: ReturnType<typeof inspectWorkshopBundleImport>,
    ): StudioBundlePreview {
        const payload = bundle as WorkshopBundlePayload;
        return {
            title: inspection.title ?? payload.project?.title ?? payload.projectId,
            label: 'Workshop-Backup · Legacy-JSON/ZIP',
            transportLabel: formatStudioBundleTransportLabel(inspection.providedBlobCount && inspection.providedBlobCount > 0 ? 'external_blob_package' : 'inline_none'),
            countSummary: formatStudioBundleCountSummary({
                assets: payload.assets?.length ?? 0,
                zones: payload.zones?.length ?? 0,
                observations: payload.observations?.length ?? 0,
            }),
            exportedAtLabel: payload.project?.updatedAt?.replace('T', ' ').slice(0, 16) ?? 'Unbekannt',
            restorable: inspection.ok,
            warnings: inspection.warnings,
            errors: inspection.errors,
        };
    }

    async function handleRenovImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setRenovImporting(true);
        setRenovImportError(null);
        setPendingImport(null);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as ImportedProject | RenovationBundleExport;
            if (parsed && typeof parsed === 'object' && 'format' in parsed && 'projectMode' in parsed && parsed.projectMode === 'renovation') {
                const bundle = parsed as RenovationBundleExport;
                createRenovationBundlePayload(bundle);
                const inspection = inspectRenovationBundleImport(bundle);
                setPendingImport({
                    kind: 'renovation-bundle',
                    bundle,
                    preview: createStudioBundlePreview(bundle, inspection),
                });
            } else if (isImportedProjectFile(parsed)) {
                setPendingImport({
                    kind: 'renovation-legacy',
                    project: parsed,
                    preview: createLegacyRenovationPreview(parsed),
                });
            } else {
                throw new Error('Keine gültige Renovierungsprojekt-Datei. Bitte ein Hauskompass-Backup oder eine ältere Projekt-JSON verwenden.');
            }
        } catch (err) {
            setRenovImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
        } finally {
            setRenovImporting(false);
            if (renovImportRef.current) renovImportRef.current.value = '';
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportError(null);
        setPendingImport(null);
        try {
            if (file.name.endsWith('.zip')) {
                const { bundle, inspection } = await inspectWorkshopBundleZipFile(file);
                if (!inspection.projectId || !inspection.siteId || !inspection.title) {
                    throw new Error(inspection.errors.join(' ') || 'Keine gültige Backup-Datei.');
                }
                setPendingImport({
                    kind: 'workshop-zip',
                    file,
                    preview: bundle.projectRef
                        ? createStudioBundlePreview(bundle, inspection)
                        : createLegacyWorkshopPreview(bundle, inspection),
                });
            } else {
                const text = await file.text();
                const bundle = JSON.parse(text) as WorkshopBundleExport;
                const inspection = inspectWorkshopBundleImport(bundle);
                if (!inspection.projectId || !inspection.siteId || !inspection.title) {
                    throw new Error(inspection.errors.join(' ') || 'Keine gültige Backup-Datei.');
                }
                setPendingImport({
                    kind: 'workshop-json',
                    bundle,
                    preview: bundle.projectRef
                        ? createStudioBundlePreview(bundle, inspection)
                        : createLegacyWorkshopPreview(bundle, inspection),
                });
            }
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function confirmPendingImport() {
        if (!pendingImport) return;
        try {
            if (pendingImport.kind === 'workshop-json') {
                const inspection = inspectWorkshopBundleImport(pendingImport.bundle);
                if (!inspection.ok || !inspection.projectId || !inspection.siteId || !inspection.title) {
                    throw new Error(inspection.errors.join(' ') || 'Keine gültige Backup-Datei.');
                }
                await importWorkshopBundle(pendingImport.bundle);
                setPendingImport(null);
                onImportBackup(inspection.projectId, inspection.siteId, inspection.title);
                return;
            }
            if (pendingImport.kind === 'workshop-zip') {
                const result = await importWorkshopBundleZip(pendingImport.file);
                setPendingImport(null);
                onImportBackup(result.projectId, result.siteId, result.title);
                return;
            }
            if (pendingImport.kind === 'renovation-bundle') {
                const restored = importRenovationBundle(pendingImport.bundle);
                reloadSavedProjectList();
                setPendingImport(null);
                onSelectRenovation(restored.slug);
                return;
            }
            saveProject(pendingImport.project);
            reloadSavedProjectList();
            setPendingImport(null);
            onSelectRenovation(pendingImport.project.slug);
        } catch (err) {
            if (pendingImport.kind.startsWith('workshop')) {
                setImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
            } else {
                setRenovImportError(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
            }
        }
    }

    // ── Renovation project management ─────────────────────────────────────────
    const [savedProjectList, setSavedProjectList] = useState<ImportedProject[]>(loadSavedRenovationProjects);
    const [projectHomeRecords, setProjectHomeRecords] = useState(loadProjectHomeRecords);

    function reloadSavedProjectList() {
        setSavedProjectList(loadSavedRenovationProjects());
    }

    function reloadProjectHomeRecords() {
        setProjectHomeRecords(loadProjectHomeRecords());
    }

    useEffect(() => {
        function handleStorage(event: StorageEvent) {
            if (!event.key || event.key === PROJECT_LIST_STORAGE_KEY || event.key === 'hk_project_home_records' || event.key.startsWith('hk_project_')) {
                reloadSavedProjectList();
                reloadProjectHomeRecords();
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                reloadSavedProjectList();
                reloadProjectHomeRecords();
            }
        }

        window.addEventListener('storage', handleStorage);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('storage', handleStorage);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    function handleDeleteProject(slug: string, e: React.MouseEvent) {
        e.stopPropagation();
        if (!confirm(`Projekt "${slug}" wirklich löschen?`)) return;
        deleteProject(slug);
        reloadSavedProjectList();
    }

    const projectCards = useMemo(() => {
        type ProjectCard = {
            key: string;
            createdAt: number;
            order: number;
            node: JSX.Element;
        };

        const cards: ProjectCard[] = [];

        builtinProjects.forEach((proj, index) => {
            const eff = applyOverride(proj);
            cards.push({
                key: `builtin:${proj.id}`,
                createdAt: Number.NEGATIVE_INFINITY,
                order: index,
                node: (
                    <div key={`builtin:${proj.id}`} className="ph-project-card-wrap">
                        <button
                            className="ph-project-card ph-project-card-builtin"
                            onClick={() => onSelectBuiltin(eff)}
                            type="button"
                        >
                            <div className="ph-card-icon">
                                {eff.type === 'workshop' ? <Wrench size={22} /> : <Home size={22} />}
                            </div>
                            <div className="ph-card-body">
                                <span className="ph-card-label">
                                    {eff.type === 'workshop' ? 'Workshop-Projekt' : 'Renovierungsprojekt'}
                                </span>
                                <strong className="ph-card-title">{eff.title}</strong>
                                <span className="ph-card-sub">{eff.subtitle}</span>
                                <span className="ph-card-loc">
                                    <MapPin size={11} />
                                    {eff.location}
                                </span>
                                <p className="ph-card-desc">{eff.description}</p>
                            </div>
                        </button>
                        <button
                            className="ph-card-edit-btn"
                            onClick={(e) => openEdit(proj, e)}
                            type="button"
                            title="Metadaten bearbeiten"
                        >
                            <Pencil size={12} />
                        </button>
                    </div>
                ),
            });
        });

        projectHomeRecords.forEach((record, index) => {
            const savedAt = new Date(record.createdAt);
            cards.push({
                key: record.id,
                createdAt: Number.isNaN(savedAt.getTime()) ? 0 : savedAt.getTime(),
                order: 1000 + index,
                node: (
                    <div key={record.id} className="ph-project-card-wrap">
                        <button
                            className="ph-project-card ph-project-card-saved"
                            onClick={() => onImportBackup(record.projectId, record.siteId, record.title)}
                            type="button"
                        >
                            <div className="ph-card-icon">
                                <Wrench size={22} />
                            </div>
                            <div className="ph-card-body">
                                <span className="ph-card-label">Workshop-Projekt</span>
                                <strong className="ph-card-title">{record.title}</strong>
                                <span className="ph-card-sub">{record.subtitle}</span>
                                <span className="ph-card-loc">
                                    <MapPin size={11} />
                                    {record.location || 'Projekt aus Backup'}
                                </span>
                                <p className="ph-card-desc">{record.description}</p>
                                <p className="ph-card-desc">
                                    Gespeichert am {savedAt.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </button>
                    </div>
                ),
            });
        });

        savedProjectList.forEach((proj, index) => {
            const importedAt = new Date(proj.importedAt);
            cards.push({
                key: `renovation:${proj.slug}`,
                createdAt: Number.isNaN(importedAt.getTime()) ? 0 : importedAt.getTime(),
                order: 2000 + index,
                node: (
                    <div key={proj.slug} className="ph-project-card-wrap">
                        <button
                            className="ph-project-card ph-project-card-saved"
                            onClick={() => onSelectRenovation(proj.slug)}
                            type="button"
                        >
                            <div className="ph-card-icon">
                                <FolderOpen size={22} />
                            </div>
                            <div className="ph-card-body">
                                <span className="ph-card-label">Renovierungsprojekt</span>
                                <strong className="ph-card-title">{proj.address}</strong>
                                <span className="ph-card-sub">
                                    {proj.candidates.length} Gebäude
                                    {proj.confirmedIds.length > 0
                                        ? ` · ${proj.confirmedIds.length} bestätigt`
                                        : ''}
                                </span>
                                <span className="ph-card-loc">
                                    <MapPin size={11} />
                                    {proj.geocode.displayName.split(',').slice(-2).join(',').trim()}
                                </span>
                                <p className="ph-card-desc">
                                    Importiert am{' '}
                                    {importedAt.toLocaleDateString('de-DE', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        </button>
                        <button
                            className="ph-card-edit-btn ph-card-delete-btn"
                            onClick={(e) => handleDeleteProject(proj.slug, e)}
                            type="button"
                            title="Projekt löschen"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ),
            });
        });

        return cards
            .sort((a, b) => b.createdAt - a.createdAt || a.order - b.order)
            .map((card) => card.node);
    }, [builtinProjects, overrides, projectHomeRecords, savedProjectList]);

    return (
        <div className="ph-root">
            <header className="ph-hero">
                <h1 className="ph-wordmark">Hauskompass</h1>
                <p className="ph-tagline">
                    Workshop-Dokumentation &amp; Renovierungsplanung
                </p>

                {/* ── Quick-Start CTA für Workshop-Teilnehmer ── */}
                <div className="ph-quickstart-banner">
                    <div className="ph-quickstart-text">
                        <strong>Workshop dokumentieren?</strong>
                        <span>
                            Kein Setup, kein technisches Vorwissen — einfach loslegen.
                        </span>
                    </div>
                    <button
                        className="ph-quickstart-btn"
                        onClick={onStartWorkshop}
                        type="button"
                    >
                        <Layers size={18} />
                        Workshop starten
                    </button>
                </div>
            </header>

            <div className="ph-content">

                {/* ── Section: Pre-existing / built-in projects ── */}
                <section className="ph-section">
                    <h2 className="ph-section-title">Projekte</h2>
                    <div className="ph-project-grid" style={{ maxHeight: '48rem' }}>
                        {projectCards}
                        <button
                            className="ph-project-card ph-project-card-new"
                            onClick={onNewProject}
                            type="button"
                        >
                            <div className="ph-card-icon">
                                <Plus size={22} />
                            </div>
                            <div className="ph-card-body">
                                <span className="ph-card-label">Neues Projekt</span>
                                <strong className="ph-card-title">Adresse eingeben</strong>
                                <span className="ph-card-sub">Bayern · Baden-Württemberg</span>
                                <p className="ph-card-desc">
                                    Adresse eingeben → automatischer LoD2-Import →
                                    Gebäudehülle, Terrain und Renovierungsplanung.
                                </p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* ── Section: Backup import ── */}
                <section className="ph-section">
                    <h2 className="ph-section-title">Projekt aus Backup wiederherstellen</h2>
                    <p className="ph-import-hint">
                        Workshop-Backup (ZIP/JSON) oder Renovierungsprojekt (JSON) hier hochladen — alle Daten werden sofort wiederhergestellt.
                    </p>
                    <div className="ph-import-row">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip,.json,application/zip,application/json"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <button
                            className="ph-import-btn"
                            onClick={() => { setImportError(null); fileInputRef.current?.click(); }}
                            disabled={importing}
                            type="button"
                        >
                            <Upload size={16} />
                            {importing ? 'Wird importiert …' : 'Workshop-Backup (ZIP/JSON)'}
                        </button>
                        <input
                            ref={renovImportRef}
                            type="file"
                            accept=".json,application/json"
                            style={{ display: 'none' }}
                            onChange={handleRenovImport}
                        />
                        <button
                            className="ph-import-btn ph-import-btn-renov"
                            onClick={() => { setRenovImportError(null); renovImportRef.current?.click(); }}
                            disabled={renovImporting}
                            type="button"
                        >
                            <Upload size={16} />
                            {renovImporting ? 'Wird importiert …' : 'Renovierungsprojekt (JSON)'}
                        </button>
                    </div>
                    {importError && <p className="ph-import-error">{importError}</p>}
                    {renovImportError && <p className="ph-import-error">{renovImportError}</p>}
                    {pendingImport && (
                        <article className="ph-region-card" style={{ marginTop: '1rem', alignItems: 'flex-start' }}>
                            <strong>Wiederherstellung prüfen</strong>
                            <span>{pendingImport.preview.title}</span>
                            <span>{pendingImport.preview.label}</span>
                            <span>{pendingImport.preview.transportLabel}</span>
                            <span>{pendingImport.preview.countSummary}</span>
                            <span>Exportiert: {pendingImport.preview.exportedAtLabel}</span>
                            {pendingImport.preview.warnings.map((warning) => (
                                <span key={warning}>Warnung: {warning}</span>
                            ))}
                            {pendingImport.preview.errors.map((error) => (
                                <span key={error}>Fehler: {error}</span>
                            ))}
                            <div className="ph-import-row" style={{ marginTop: '0.75rem' }}>
                                <button
                                    className="ph-import-btn"
                                    disabled={!pendingImport.preview.restorable || pendingImport.preview.errors.length > 0}
                                    onClick={() => { void confirmPendingImport(); }}
                                    type="button"
                                >
                                    Jetzt wiederherstellen
                                </button>
                                <button
                                    className="ph-import-btn ph-import-btn-renov"
                                    onClick={() => setPendingImport(null)}
                                    type="button"
                                >
                                    Verwerfen
                                </button>
                            </div>
                        </article>
                    )}
                </section>

                {/* ── Section: Supported regions info ── */}
                <section className="ph-section ph-section-info">
                    <h2 className="ph-section-title">Unterstützte Bundesländer</h2>
                    <div className="ph-region-grid">
                        <div className="ph-region-card">
                            <Building2 size={18} />
                            <strong>Bayern</strong>
                            <span>LoD2 via LDBV · Open Data</span>
                        </div>
                        <div className="ph-region-card">
                            <Building2 size={18} />
                            <strong>Baden-Württemberg</strong>
                            <span>LoD2 via LGL BW · Open Data</span>
                        </div>
                        <div className="ph-region-card ph-region-card-soon">
                            <Building2 size={18} />
                            <strong>Weitere Länder</strong>
                            <span>In Vorbereitung</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* ── Edit metadata overlay ── */}
            {editingId && (
                <div className="ph-edit-overlay" role="dialog" aria-modal="true">
                    <div className="ph-edit-dialog">
                        <header className="ph-edit-header">
                            <span>Projektmetadaten bearbeiten</span>
                            <button className="ph-edit-close" onClick={() => setEditingId(null)} type="button">
                                <X size={16} />
                            </button>
                        </header>
                        <div className="ph-edit-fields">
                            <label className="ph-edit-label">Titel
                                <input className="ph-edit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            </label>
                            <label className="ph-edit-label">Untertitel
                                <input className="ph-edit-input" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} />
                            </label>
                            <label className="ph-edit-label">Standort
                                <input className="ph-edit-input" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                            </label>
                            <label className="ph-edit-label">Beschreibung
                                <textarea className="ph-edit-input ph-edit-textarea" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                            </label>
                        </div>
                        <footer className="ph-edit-footer">
                            <button className="ph-edit-cancel" onClick={() => setEditingId(null)} type="button">Abbrechen</button>
                            <button className="ph-edit-save" onClick={saveEdit} type="button">Speichern</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
